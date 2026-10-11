import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui";
import {
  pregnancyArticles,
  pregnancySections,
} from "../../../src/data/pregnancy";
import {
  PregnancyArticleText,
  PregnancyImage,
  p,
} from "../../../src/components/PregnancyContent";
import {
  readPregnancyBookmarks,
  togglePregnancyBookmark,
} from "../../../src/services/pregnancyBookmarks";
import { pregnancyMovementSafety } from "../../../src/data/pregnancySafety";

export default function PregnancyArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Article key={id} id={id} />;
}
function Article({ id }: { id: string }) {
  const article = pregnancyArticles.find((a) => a.id === id);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [original, setOriginal] = useState(false);
  useEffect(() => {
    let active = true;
    readPregnancyBookmarks()
      .then((ids) => {
        if (active) setSaved(ids.includes(id));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id]);
  if (!article)
    return (
      <Screen>
        <Stack.Screen options={{ title: "Bài thai kỳ" }} />
        <Text style={p.heading}>
          Bài này chưa có trong bộ dữ liệu ngoại tuyến.
        </Text>
        <Text style={p.muted}>Ứng dụng không tải thêm từ Flo.</Text>
      </Screen>
    );
  const bookmark = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setSaved((await togglePregnancyBookmark(id)).includes(id));
    } catch {
      Alert.alert("Chưa lưu được", "Thử lại để đánh dấu bài đọc trên máy này.");
    } finally {
      setBusy(false);
    }
  };
  const week = article.week;
  const siblings = pregnancyArticles.filter(
    (a) => a.section === article.section,
  );
  const position = siblings.findIndex((a) => a.id === id);
  return (
    <Screen
      safeAreaStyle={p.root}
      contentStyle={{ gap: 20, paddingBottom: 32 }}
    >
      <Stack.Screen
        options={{
          title:
            pregnancySections.find((s) => s.id === article.section)?.title ??
            "Bài thai kỳ",
          headerRight: () => (
            <Pressable
              accessibilityLabel={saved ? "Bỏ lưu bài" : "Lưu bài để đọc lại"}
              disabled={busy}
              onPress={() => {
                void bookmark();
              }}
              style={{ padding: 10 }}
            >
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={23}
                color="white"
              />
            </Pressable>
          ),
        }}
      />
      <Text style={{ color: "#B75A73", fontSize: 12, fontWeight: "600" }}>
        {week !== null ? `ĐỦ ${week} TUẦN · ` : ""}ĐÃ CÓ NGOẠI TUYẾN
      </Text>
      <Text style={p.title}>
        {original && article.original ? article.original.title : article.title}
      </Text>
      {(article.id === "15_052_v21" ||
        article.id === "15_3401" ||
        (article.section === "growth" && (article.week ?? 0) >= 16)) && (
        <View
          style={{
            backgroundColor: "#FFF0ED",
            borderColor: "#EAC7BE",
            borderWidth: 1,
            borderRadius: 14,
            padding: 15,
            gap: 8,
          }}
        >
          <Text style={p.rowTitle}>{pregnancyMovementSafety.title}</Text>
          <Text style={p.muted}>{pregnancyMovementSafety.body}</Text>
          <PregnancyArticleText
            text={`[Đọc hướng dẫn NHS](${pregnancyMovementSafety.source}) · Ghi chú bổ sung của An Nam, không thuộc bản Flo.`}
          />
        </View>
      )}
      {!!article.reviewer.name && (
        <View
          style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
        >
          <Ionicons name="checkmark-circle-outline" size={25} color="#7A9D90" />
          <View style={{ flex: 1 }}>
            <Text style={p.muted}>Người duyệt được ghi trong bản nguồn</Text>
            <Text style={p.rowTitle}>{article.reviewer.name}</Text>
            <Text style={p.muted}>
              {original && article.original
                ? article.original.reviewerDescription
                : article.reviewer.description}
            </Text>
          </View>
        </View>
      )}
      {article.original && (
        <View
          style={{
            backgroundColor: "#FFF2D9",
            padding: 13,
            borderRadius: 12,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 12, lineHeight: 18, color: "#806744" }}>
            Bản dịch tự động từ tiếng Anh, chưa được thẩm định y khoa. Tên người
            duyệt phía trên thuộc bản nguồn, không xác nhận bản dịch.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOriginal(!original)}
          >
            <Text style={{ color: "#8E5B30", fontWeight: "700" }}>
              {original ? "Đọc bản tiếng Việt" : "Đối chiếu bản tiếng Anh"}
            </Text>
          </Pressable>
        </View>
      )}
      {article.images.map((key) => (
        <PregnancyImage key={key} imageKey={key} label={article.title} />
      ))}
      <PregnancyArticleText
        text={
          original && article.original ? article.original.body : article.body
        }
      />
      <View style={p.card}>
        <Text style={p.muted}>
          Nguồn: nội dung Flo trong tệp bạn cung cấp. Bản lưu không tự cập nhật
          theo nguồn. Nội dung chỉ để tham khảo, không dùng để tự chẩn đoán hoặc
          tự dùng thuốc; hãy trao đổi với người theo dõi thai kỳ khi có điều lo
          ngại.
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[-1, 1].map((offset) => {
          const target = siblings[position + offset];
          return (
            <Pressable
              key={offset}
              disabled={!target}
              style={[p.pill, { flex: 1, opacity: target ? 1 : 0.35 }]}
              onPress={() =>
                target &&
                router.replace({
                  pathname: "/pregnancy/article/[id]",
                  params: { id: target.id },
                })
              }
            >
              <Text style={p.pillText}>
                {offset < 0 ? "‹ Bài trước" : "Bài tiếp ›"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={p.pill}
        onPress={() =>
          router.push({
            pathname: "/pregnancy/library",
            params: { section: article.section },
          })
        }
      >
        <Text style={p.pillText}>Xem tất cả bài cùng chủ đề</Text>
      </Pressable>
    </Screen>
  );
}
