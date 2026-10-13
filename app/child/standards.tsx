import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Screen } from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
import {
  growthReferences,
  growthStage,
  growthLabel,
  growthUnit,
  type GrowthMetric,
} from "../../src/lib/growth";
export default function StandardsScreen() {
  const { child } = useApp();
  const { stage } = useLocalSearchParams<{ stage?: string }>();
  const [group, setGroup] = useState(
    stage === "pregnancy" || (!stage && growthStage(child) === "pregnancy")
      ? "pregnancy"
      : child?.gender === "female"
        ? "female"
        : "male",
  );
  const [metric, setMetric] = useState<GrowthMetric>("weight");
  const mode = group === "pregnancy" ? "pregnancy" : "born";
  const series = growthReferences(
    mode,
    metric,
    group === "female" ? "female" : "male",
  );
  return (
    <Screen>
      <Stack.Screen options={{ title: "Chỉ số tiêu chuẩn" }} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          ["pregnancy", "Thai nhi"],
          ["male", "Bé trai"],
          ["female", "Bé gái"],
        ].map(([id, title]) => (
          <Pressable
            key={id}
            onPress={() => setGroup(id!)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              backgroundColor: group === id ? "#E5DBF4" : "#F4F1F7",
            }}
          >
            <Text style={{ textAlign: "center" }}>{title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["weight", "height", "head"] as const).map((id) => (
          <Pressable
            key={id}
            onPress={() => setMetric(id)}
            style={{
              padding: 10,
              borderBottomWidth: metric === id ? 2 : 0,
              borderBottomColor: "#9975CD",
            }}
          >
            <Text>{growthLabel(id, mode)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: "#81778B", lineHeight: 21 }}>
        {mode === "born"
          ? "WHO · 0–60 tháng. Các cột −2 SD / Trung vị / +2 SD là tham chiếu thống kê, không dùng một số đo để chẩn đoán. Không tự hiệu chỉnh tuổi sinh non."
          : "Bảng gốc Bé của mẹ · 8–40 tuần, chưa thẩm định y khoa. Chỉ là mốc tham khảo; không phải giới hạn bình thường. Chiều dài có thay đổi cách biểu diễn giữa tuần 20 và 21, không phải chiều dài xương đùi."}
      </Text>
      {!series.length && (
        <Text>
          Chưa có bảng tham chiếu vòng đầu thai nhi. Hãy dùng kết luận trên
          phiếu siêu âm.
        </Text>
      )}
      {series.map((part, i) => (
        <View key={i} style={{ gap: 6 }}>
          <Text
            style={{ fontFamily: "QuicksandSemiBold", paddingVertical: 12 }}
          >
            {part.name} ({growthUnit(metric, mode)})
          </Text>
          {mode === "born" && (
            <Pressable onPress={() => void Linking.openURL(part.source)}>
              <Text style={{ color: "#8E70CA" }}>Nguồn WHO ↗</Text>
            </Pressable>
          )}
          <View
            style={{
              flexDirection: "row",
              padding: 12,
              backgroundColor: "#EEE8F5",
            }}
          >
            {[
              mode === "born" ? "Tháng" : "Tuần",
              ...(mode === "born"
                ? ["−2 SD", "Trung vị", "+2 SD"]
                : ["Mốc gốc"]),
            ].map((s) => (
              <Text
                key={s}
                style={{ flex: 1, textAlign: "center", fontSize: 12 }}
              >
                {s}
              </Text>
            ))}
          </View>
          {part.points.map((p) => (
            <View
              key={p.age}
              style={{
                flexDirection: "row",
                padding: 12,
                backgroundColor: p.age % 2 ? "#fff" : "#FAF8FC",
              }}
            >
              {[
                p.age,
                ...(mode === "born" ? [p.low, p.median, p.high] : [p.median]),
              ].map((v, k) => (
                <Text
                  key={k}
                  style={{ flex: 1, textAlign: "center", fontSize: 13 }}
                >
                  {v}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}
