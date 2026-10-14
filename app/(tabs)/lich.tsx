import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/ui";
import { FormInput } from "../../src/components/FormInput";
import { TabHeading } from "../../src/components/TabHeading";
import {
  handbookCategories,
  handbookItems,
  handbookStages,
  searchHandbook,
  type HandbookStage,
} from "../../src/data/handbookCatalog";
import { useApp } from "../../src/providers/AppProvider";
import { readPregnancyBookmarks } from "../../src/services/pregnancyBookmarks";

export default function ReferenceScreen() {
  const { child } = useApp();
  const params = useLocalSearchParams<{ section?: string }>();
  const [stage, setStage] = useState<HandbookStage>("mom");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    setStage(child?.due_date && !child.birthday ? "pregnant" : "mom");
    setCategory(null);
  }, [child?.id]);
  useEffect(() => {
    const mapping: Record<string, [HandbookStage, string]> = {
      pregnancy: ["pregnant", "14"],
      easy: ["mom", "easy"],
      vaccines: ["mom", "22"],
    };
    const selection = mapping[params.section ?? ""];
    if (selection) {
      setStage(selection[0]);
      setCategory(selection[1]);
      setSearch("");
      setOnlySaved(false);
    }
  }, [params.section, child?.id]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        AsyncStorage.multiGet(
          handbookItems.flatMap((a) => (a.bookmarkKey ? [a.bookmarkKey] : [])),
        ),
        readPregnancyBookmarks(),
      ])
        .then(([rows, pregnancy]) => {
          if (active)
            setSaved(
              handbookItems
                .filter((a) =>
                  a.bookmarkKey
                    ? rows.some(([k, v]) => k === a.bookmarkKey && v === "1")
                    : a.pregnancyId
                      ? pregnancy.includes(a.pregnancyId)
                      : false,
                )
                .map((a) => a.id),
            );
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );
  const chosen = handbookCategories.find((c) => c.id === category);
  const categories = handbookCategories.filter((c) => c.type === stage);
  const items = searchHandbook(search).filter((a) =>
    onlySaved
      ? saved.includes(a.id)
      : search.trim()
        ? true
        : category
          ? a.category === category
          : categories.some((c) => c.id === a.category),
  );
  return (
    <Screen
      stickyHeaderIndices={[0]}
      safeAreaStyle={{ backgroundColor: "#7771BC" }}
      contentStyle={{
        paddingHorizontal: 0,
        gap: 0,
        backgroundColor: "#fff",
        flexGrow: 1,
      }}
    >
      <View>
        <TabHeading title="Cẩm nang" />
        <View style={s.tabs}>
          {handbookStages.map((t) => (
            <Pressable
              key={t.id}
              testID={`handbook-tab-${t.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: stage === t.id }}
              onPress={() => {
                setStage(t.id);
                setCategory(null);
                setOnlySaved(false);
                setSearch("");
              }}
              style={[s.tab, stage === t.id && s.activeTab]}
            >
              <Text style={[s.tabText, stage === t.id && s.activeText]}>
                {t.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {!search.trim() && !onlySaved && (
        <View style={s.grid}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              testID={`handbook-category-${c.id}`}
              accessibilityLabel={c.label}
              accessibilityState={{ selected: category === c.id }}
              style={[s.tile, category === c.id && s.selectedTile]}
              onPress={() => {
                if (c.id === "18") {
                  router.push("/pregnancy/education" as never);
                  return;
                }
                setCategory(category === c.id ? null : c.id);
              }}
            >
              <Image source={c.image} style={s.icon} resizeMode="contain" />
              <Text style={s.label}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={21} color="#9C94A7" />
        <FormInput
          accessibilityLabel="Tìm trong cẩm nang"
          placeholder="Tìm trong cẩm nang…"
          value={search}
          onChangeText={setSearch}
          style={s.input}
        />
        <Pressable
          accessibilityLabel="Chỉ xem bài đã lưu"
          accessibilityState={{ selected: onlySaved }}
          onPress={() => setOnlySaved(!onlySaved)}
          style={{ padding: 10 }}
        >
          <Ionicons
            name={onlySaved ? "bookmark" : "bookmark-outline"}
            size={23}
            color="#9975CD"
          />
        </Pressable>
      </View>
      <View style={s.listHeading}>
        <Text style={s.heading}>
          {search.trim()
            ? "Kết quả tìm kiếm"
            : onlySaved
              ? "Bài đã lưu"
              : (chosen?.label ?? "Bài đọc & tiện ích")}
        </Text>
        <Text style={s.count}>{items.length} mục</Text>
      </View>
      {!items.length && (
        <Text style={s.empty}>
          {onlySaved
            ? "Chưa có bài được đánh dấu. Mở một bài và nhấn Lưu."
            : search.trim()
              ? "Không tìm thấy bài phù hợp."
              : "An Nam chưa có bản bài viết ngoại tuyến cho chuyên mục này. App gốc tải bài từ máy chủ, không lưu sẵn trong IPA; đây không có nghĩa là chuyên mục gốc không có bài."}
        </Text>
      )}
      {items.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => router.push(a.path as never)}
          style={s.article}
        >
          <Image
            source={handbookCategories.find((c) => c.id === a.category)?.image}
            style={s.articleIcon}
            resizeMode="contain"
          />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.articleTitle}>{a.title}</Text>
            <Text style={s.meta}>{a.summary}</Text>
            {a.legacy && (
              <Text style={s.legacy}>
                Dữ liệu gốc · cần đối chiếu khi áp dụng
              </Text>
            )}
          </View>
          <Ionicons
            name={saved.includes(a.id) ? "bookmark" : "chevron-forward"}
            size={18}
            color="#A295B6"
          />
        </Pressable>
      ))}
    </Screen>
  );
}
const s = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE9F1",
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#9975CD" },
  tabText: { fontFamily: "QuicksandSemiBold", fontSize: 13, color: "#77727C" },
  activeText: { color: "#8762B9" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  tile: {
    width: "33.3333%",
    paddingHorizontal: 8,
    paddingVertical: 18,
    alignItems: "center",
    gap: 12,
    minHeight: 126,
    borderRadius: 14,
  },
  selectedTile: { backgroundColor: "#F5EFFA" },
  icon: { width: 60, height: 60 },
  label: {
    fontFamily: "QuicksandSemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: "#403B48",
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingLeft: 14,
    borderRadius: 16,
    backgroundColor: "#F7F4FA",
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    gap: 8,
  },
  heading: {
    fontFamily: "QuicksandSemiBold",
    fontSize: 19,
    color: "#403B48",
    flex: 1,
  },
  count: { fontSize: 12, color: "#8C8496" },
  meta: { fontSize: 12, color: "#8C8595", lineHeight: 18 },
  empty: { padding: 24, color: "#8C8595", lineHeight: 22 },
  article: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F0ECF3",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  articleIcon: { width: 42, height: 42 },
  articleTitle: {
    fontFamily: "QuicksandSemiBold",
    fontSize: 16,
    lineHeight: 23,
    color: "#403B48",
  },
  legacy: { fontSize: 11, color: "#A38257" },
});
