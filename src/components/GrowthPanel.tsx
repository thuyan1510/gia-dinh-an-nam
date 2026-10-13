import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { CareEntry, Child } from "../types";
import {
  growthAge,
  growthDomain,
  growthMetrics,
  type GrowthSex,
  type GrowthStage,
} from "../lib/growth";
import { GrowthChart } from "./GrowthChart";
export function GrowthPanel({
  child,
  entries,
  stage,
}: {
  child: Child | null;
  entries: CareEntry[];
  stage: GrowthStage;
}) {
  const [sex, setSex] = useState<GrowthSex>(
    child?.gender === "female" ? "female" : "male",
  );
  const [range, setRange] = useState<[number, number] | null>(null);
  useEffect(() => {
    setSex(child?.gender === "female" ? "female" : "male");
    setRange(null);
  }, [child?.id, child?.gender, stage]);
  const domain =
    range ?? growthDomain(stage, growthAge(child, stage, new Date()));
  return (
    <View style={s.root}>
      <View style={s.heading}>
        <Text style={s.title}>Đồ thị chỉ số của bé</Text>
        <Pressable
          accessibilityLabel="Chỉ số tiêu chuẩn"
          onPress={() =>
            router.push({ pathname: "/child/standards", params: { stage } })
          }
        >
          <Text style={s.link}>Bảng chuẩn ›</Text>
        </Pressable>
      </View>
      {stage === "born" && (
        <>
          <View style={s.row}>
            {(["male", "female"] as const).map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: v === sex }}
                style={[s.chip, v === sex && s.active]}
                onPress={() => setSex(v)}
              >
                <Text>{v === "male" ? "Bé trai" : "Bé gái"}</Text>
              </Pressable>
            ))}
          </View>
          {!["male", "female"].includes(child?.gender ?? "") && (
            <Text style={s.note}>
              Chưa có giới tính trong hồ sơ. Đang xem bảng tham khảo{" "}
              {sex === "male" ? "bé trai" : "bé gái"}; lựa chọn này không đổi hồ
              sơ.
            </Text>
          )}
          <View style={s.row}>
            {[
              [0, 6],
              [0, 12],
              [0, 24],
              [24, 60],
            ].map(([a, b]) => (
              <Pressable
                key={b}
                style={[s.chip, domain[0] === a && domain[1] === b && s.active]}
                onPress={() => setRange([a!, b!])}
              >
                <Text style={s.small}>
                  {a}–{b} tháng
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {growthMetrics.map((metric) => (
        <View key={metric} style={s.chart}>
          <GrowthChart
            child={child}
            entries={entries}
            stage={stage}
            metric={metric}
            sex={sex}
            domain={domain}
          />
        </View>
      ))}
      <Text style={s.note}>
        {stage === "born"
          ? "WHO: cân nặng, chiều dài nằm (0–24 tháng), chiều cao đứng (24–60 tháng), vòng đầu. Vùng −2 đến +2 SD là tham chiếu thống kê, không phải chẩn đoán. Trẻ sinh non cần bác sĩ hướng dẫn hiệu chỉnh tuổi."
          : "Các mốc thai nhi giữ từ Bé của mẹ, chưa phải chuẩn chẩn đoán. Không dựng vùng “bình thường ±20%” của app cũ. Bảng chiều dài đổi cách biểu diễn giữa tuần 20 và 21 nên được tách đường; không so sánh trực tiếp với chiều dài xương đùi trên siêu âm. Vòng đầu chỉ vẽ số đo, chưa có bảng chuẩn."}
      </Text>
      <Pressable
        style={s.add}
        onPress={() =>
          router.push(
            stage === "born"
              ? "/child/measure"
              : {
                  pathname: "/record/new",
                  params: { kind: "activity", tool: "fetal" },
                },
          )
        }
      >
        <Text style={s.link}>＋ Thêm số đo</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  root: { gap: 14, padding: 18, backgroundColor: "#fff" },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  title: { fontSize: 19, fontFamily: "QuicksandSemiBold", color: "#343341" },
  link: {
    color: "#8E70CA",
    fontFamily: "QuicksandSemiBold",
    paddingVertical: 8,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "#F4F1F7",
  },
  active: { backgroundColor: "#E5DBF4" },
  small: { fontSize: 12, color: "#5E5869" },
  note: { fontSize: 12, lineHeight: 19, color: "#87818F" },
  chart: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDF3",
  },
  add: { alignItems: "center", borderRadius: 14, backgroundColor: "#F4EDF9" },
});
