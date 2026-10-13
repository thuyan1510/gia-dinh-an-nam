import { Text, View } from "react-native";
import Svg, {
  Circle,
  Line,
  Polygon,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import type { CareEntry, Child } from "../types";
import {
  growthLabel,
  growthUnit,
  growthPoints,
  growthReferences,
  type GrowthMetric,
  type GrowthSex,
  type GrowthStage,
} from "../lib/growth";
export function GrowthChart({
  child,
  entries,
  metric,
  stage,
  sex,
  domain,
}: {
  child: Child | null;
  entries: CareEntry[];
  metric: GrowthMetric;
  stage: GrowthStage;
  sex: GrowthSex;
  domain: [number, number];
}) {
  const all = growthPoints(child, entries, metric, stage);
  const points = all.filter((p) => p.age >= domain[0] && p.age <= domain[1]);
  const refs = growthReferences(stage, metric, sex)
    .map((s) => ({
      ...s,
      points: s.points.filter((p) => p.age >= domain[0] && p.age <= domain[1]),
    }))
    .filter((s) => s.points.length);
  const values = [
    ...points.map((p) => p.value),
    ...refs.flatMap((s) =>
      s.points.flatMap((p) => [p.low ?? p.median, p.high ?? p.median]),
    ),
  ];
  const low = Math.max(
    0,
    Math.min(...values, values.length ? Infinity : 0) * 0.9,
  );
  const high = Math.max(low + 1, Math.max(...values, 1) * 1.08);
  const x = (age: number) =>
    42 + ((age - domain[0]) / (domain[1] - domain[0])) * 292;
  const y = (value: number) => 195 - ((value - low) / (high - low)) * 165;
  const title = growthLabel(metric, stage),
    unit = growthUnit(metric, stage);
  return (
    <View style={{ gap: 10 }} testID={`growth-${stage}-${metric}`}>
      <Text
        style={{
          fontFamily: "QuicksandSemiBold",
          fontSize: 19,
          color: "#303B46",
        }}
      >
        {title} <Text style={{ fontSize: 13, color: "#86838E" }}>({unit})</Text>
      </Text>
      <Svg
        width="100%"
        height={232}
        viewBox="0 0 350 232"
        accessibilityLabel={`Đồ thị ${title}: ${points.length} số đo, ${refs.length ? "có đường tham chiếu" : "chưa có đường tham chiếu"}`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Line
            key={`h${i}`}
            x1={42}
            x2={334}
            y1={30 + i * 41.25}
            y2={30 + i * 41.25}
            stroke="#EEEAF3"
          />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <SvgText
            key={`y${i}`}
            x={36}
            y={199 - i * 41.25}
            textAnchor="end"
            fontSize={10}
            fill="#85818C"
          >
            {(low + ((high - low) * i) / 4).toFixed(
              metric === "weight" && stage === "born" ? 1 : 0,
            )}
          </SvgText>
        ))}
        {refs.map((s, i) => (
          <ViewReference key={i} points={s.points} x={x} y={y} />
        ))}
        {points.length > 1 && (
          <Polyline
            points={points.map((p) => `${x(p.age)},${y(p.value)}`).join(" ")}
            fill="none"
            stroke="#E677A0"
            strokeWidth={2.5}
          />
        )}
        {points.map((p) => (
          <Circle
            key={p.entry.id}
            cx={x(p.age)}
            cy={y(p.value)}
            r={4}
            fill="#E677A0"
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <SvgText
            key={`x${i}`}
            x={42 + i * 73}
            y={215}
            textAnchor="middle"
            fontSize={10}
            fill="#85818C"
          >
            {+(domain[0] + ((domain[1] - domain[0]) * i) / 4).toFixed(1)}
          </SvgText>
        ))}
        <SvgText x={334} y={230} textAnchor="end" fontSize={10} fill="#85818C">
          {stage === "pregnancy" ? "Tuần thai" : "Tháng tuổi"}
        </SvgText>
      </Svg>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Text style={{ fontSize: 11, color: "#A55277" }}>● Số đo của bé</Text>
        {refs.length > 0 && (
          <Text style={{ fontSize: 11, color: "#659A95" }}>
            {stage === "born"
              ? "━━ Trung vị WHO · vùng −2 đến +2 SD"
              : "┄ Mốc tham khảo từ app gốc"}
          </Text>
        )}
      </View>
      {!points.length && (
        <Text style={{ fontSize: 12, color: "#817B88" }}>
          {all.length
            ? "Không có số đo trong khoảng đang xem."
            : "Chưa có số đo. Đường tham chiếu không phải số đo của bé."}
        </Text>
      )}
      {!refs.length && (
        <Text style={{ fontSize: 12, color: "#817B88" }}>
          Chưa có bảng tham chiếu cho chỉ số / độ tuổi này.
        </Text>
      )}
    </View>
  );
}
function ViewReference({
  points,
  x,
  y,
}: {
  points: ReturnType<typeof growthReferences>[number]["points"];
  x: (v: number) => number;
  y: (v: number) => number;
}) {
  const hasBand = points.every((p) => p.low !== null && p.high !== null);
  return (
    <>
      {hasBand && (
        <Polygon
          points={[
            ...points.map((p) => `${x(p.age)},${y(p.high!)}`),
            ...points
              .slice()
              .reverse()
              .map((p) => `${x(p.age)},${y(p.low!)}`),
          ].join(" ")}
          fill="#ECF5EF"
        />
      )}
      {hasBand &&
        (["low", "high"] as const).map((k) => (
          <Polyline
            key={k}
            points={points.map((p) => `${x(p.age)},${y(p[k]!)}`).join(" ")}
            fill="none"
            stroke="#AACBB6"
            strokeWidth={1}
          />
        ))}
      <Polyline
        points={points.map((p) => `${x(p.age)},${y(p.median)}`).join(" ")}
        fill="none"
        stroke="#659A95"
        strokeWidth={1.6}
        strokeDasharray={hasBand ? undefined : "4 3"}
      />
    </>
  );
}
