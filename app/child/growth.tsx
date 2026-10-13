import { router, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Screen } from "../../src/components/ui";
import { GrowthPanel } from "../../src/components/GrowthPanel";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { growthStage } from "../../src/lib/growth";
export default function GrowthScreen() {
  const { stage: requested } = useLocalSearchParams<{ stage?: string }>();
  const { child, entries, error } = useCareHistory();
  const stage =
    requested === "pregnancy" || requested === "born"
      ? requested
      : growthStage(child);
  const history = entries.filter((e) =>
    stage === "pregnancy"
      ? e.details?.tool === "fetal"
      : e.kind === "growth" && e.details?.tool !== "fetal",
  );
  return (
    <Screen contentStyle={{ paddingHorizontal: 0, backgroundColor: "#fff" }}>
      <Stack.Screen options={{ title: "Chỉ số của bé" }} />
      {!!error && <Text>{error}</Text>}
      <GrowthPanel
        key={`${child?.id}:${stage}`}
        child={child}
        entries={entries}
        stage={stage}
      />
      <View style={{ padding: 18, gap: 12 }}>
        <Text style={{ fontSize: 19, fontFamily: "QuicksandSemiBold" }}>
          Tất cả số đo
        </Text>
        {!history.length && (
          <Text style={{ color: "#8B8392" }}>Chưa có số đo được lưu.</Text>
        )}
        {history.map((e) => (
          <Pressable
            key={e.id}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#F1ECF5",
            }}
            onPress={() =>
              router.push({
                pathname: "/record/new",
                params: { id: e.id, kind: e.kind, tool: e.details?.tool },
              })
            }
          >
            <Text style={{ fontFamily: "QuicksandSemiBold" }}>
              {e.details?.metric ?? (e.unit === "kg" ? "Cân nặng" : "Số đo")} ·{" "}
              {e.amount} {e.unit}
            </Text>
            <Text style={{ color: "#88808C", marginTop: 5 }}>
              {new Date(e.occurred_at).toLocaleDateString("vi-VN")} ·{" "}
              {e.created_by_name}　Sửa ›
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
