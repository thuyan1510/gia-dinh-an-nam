import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Screen } from "../../src/components/ui";
import { FormInput } from "../../src/components/FormInput";
import { PregnancyArticleRow, p } from "../../src/components/PregnancyContent";
import {
  pregnancyArticles,
  pregnancySections,
  type PregnancySection,
} from "../../src/data/pregnancy";
import { readPregnancyBookmarks } from "../../src/services/pregnancyBookmarks";

export default function PregnancyLibrary() {
  const params = useLocalSearchParams<{ section?: string; week?: string }>();
  const [section, setSection] = useState<PregnancySection>(
    pregnancySections.some((s) => s.id === params.section)
      ? (params.section as PregnancySection)
      : "growth",
  );
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      readPregnancyBookmarks()
        .then((values) => {
          if (active) {
            setSaved(values);
            setError("");
          }
        })
        .catch(() => {
          if (active) setError("Chưa đọc được danh sách đã lưu trên máy.");
        });
      return () => {
        active = false;
      };
    }, []),
  );
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  const articles = pregnancyArticles.filter(
    (a) =>
      a.section === section &&
      (!savedOnly || saved.includes(a.id)) &&
      normalize(a.title + " " + (a.week ?? "")).includes(normalize(query)),
  );
  const featured =
    !query && !savedOnly && params.week !== undefined
      ? articles.find((a) => a.week === Number(params.week))
      : undefined;
  return (
    <Screen safeAreaStyle={p.root} contentStyle={{ gap: 18 }}>
      <Stack.Screen options={{ title: "Thư viện thai kỳ" }} />
      <Text style={p.title}>Hiểu mẹ, hiểu bé</Text>
      <Text style={p.muted}>
        92 bài đã lưu trong ứng dụng. Đọc bài và xem ảnh không cần mạng hoặc tài
        khoản Flo.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {pregnancySections.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityState={{ selected: section === s.id }}
            aria-selected={section === s.id}
            onPress={() => setSection(s.id)}
            style={[p.pill, section === s.id && p.pillSelected]}
          >
            <Text style={[p.pillText, section === s.id && { color: "white" }]}>
              {s.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={p.muted}>
        {pregnancySections.find((s) => s.id === section)?.description}
      </Text>
      <FormInput
        accessibilityLabel="Tìm bài thai kỳ"
        placeholder="Tìm theo chủ đề hoặc số tuần…"
        value={query}
        onChangeText={setQuery}
        style={{
          padding: 15,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: "#EFE2E3",
          backgroundColor: "white",
          fontSize: 16,
          color: "#342D32",
        }}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: savedOnly }}
        aria-checked={savedOnly}
        onPress={() => setSavedOnly(!savedOnly)}
        style={p.pill}
      >
        <Text style={p.pillText}>
          {savedOnly ? "✓ Chỉ xem bài đã lưu" : "♡ Xem bài đã lưu trên máy"}
        </Text>
      </Pressable>
      {!!error && <Text style={p.muted}>{error}</Text>}
      {featured && (
        <View style={p.card}>
          <Text style={p.heading}>Tuần bạn đang xem</Text>
          <PregnancyArticleRow article={featured} />
        </View>
      )}
      <View style={p.card}>
        <Text style={p.heading}>{articles.length} bài viết</Text>
        {articles.map((a) => (
          <PregnancyArticleRow key={a.id} article={a} />
        ))}
        {!articles.length && (
          <Text style={p.muted}>
            Chưa có bài phù hợp. Thử chủ đề khác hoặc bỏ bộ lọc đã lưu.
          </Text>
        )}
      </View>
      <Text style={p.muted}>
        Nội dung từ bộ dữ liệu Flo bạn cung cấp. Các bản dịch được đánh dấu
        trong bài; thông tin tham khảo không thay thế chăm sóc y tế.
      </Text>
    </Screen>
  );
}
