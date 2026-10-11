import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  router,
  Stack,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen } from "../../src/components/ui";
import { DayPicker, localDay } from "../../src/components/DayPicker";
import {
  PregnancyArticleRow,
  PregnancyImage,
  openPregnancyArticle,
  p,
  pregnancyColors,
} from "../../src/components/PregnancyContent";
import {
  pregnancyArticles,
  pregnancySections,
  weeklyArticle,
} from "../../src/data/pregnancy";
import { pregnancyImageSources } from "../../src/data/pregnancy/imageSources";
import {
  formatPregnancyAge,
  pregnancyAge,
  pregnancyDayNumber,
} from "../../src/lib/pregnancy";
import { useApp } from "../../src/providers/AppProvider";
import { useCareHistory } from "../../src/lib/useCareHistory";
export { RecoverableError as ErrorBoundary } from "../../src/components/RecoverableError";

export default function PregnancyToday() {
  const { child } = useApp();
  return <PregnancyDashboard key={child?.id ?? "none"} />;
}
function PregnancyDashboard() {
  const { child } = useApp();
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(localDay(new Date()));
  const [today, setToday] = useState(localDay(new Date()));
  const [preview, setPreview] = useState<number | null>(null);
  const weeksRef = useRef<ScrollView>(null);
  const { entries } = useCareHistory();
  useEffect(() => {
    if (params.day && pregnancyDayNumber(params.day) !== null) {
      setDay(params.day);
      setPreview(null);
    }
  }, [params.day]);
  useFocusEffect(
    useCallback(() => {
      const tick = () => setToday(localDay(new Date()));
      tick();
      const timer = setInterval(tick, 60000);
      return () => clearInterval(timer);
    }, []),
  );
  const previousToday = useRef(today);
  useEffect(() => {
    if (day === previousToday.current) setDay(today);
    previousToday.current = today;
  }, [today, day]);
  const age = pregnancyAge(child?.due_date, day);
  const week = preview ?? age?.weeks ?? 0;
  const growth = weeklyArticle("growth", week);
  const body = weeklyArticle("body", week);
  const inside = pregnancyArticles.filter((a) => a.section === "inside");
  const insight = inside[week % inside.length]!;
  const records = entries.filter(
    (e) => e.details?.tool === "pregnancy-today" && e.details?.day === day,
  );
  useEffect(() => {
    weeksRef.current?.scrollTo({
      x: Math.max(0, week * 75 - 120),
      animated: false,
    });
  }, [week]);
  const diary = (group?: string) =>
    router.push({
      pathname: "/pregnancy/diary",
      params: { day, ...(group ? { group } : {}) },
    });
  const ready = child && child.due_date && !child.birthday;
  if (!ready)
    return (
      <Screen contentStyle={{ gap: 18 }} safeAreaStyle={p.root}>
        <Stack.Screen options={{ title: "Trạng thái hôm nay" }} />
        <MaterialCommunityIcons name="mother-heart" size={64} color="#DB607F" />
        <Text style={p.title}>Bắt đầu hành trình thai kỳ</Text>
        <Text style={p.body}>
          {child?.birthday
            ? "Hồ sơ hiện tại đã có ngày sinh. Hãy chọn hồ sơ đang mang thai ở tab Em bé để ghi nhật ký thai kỳ."
            : "Thêm ngày dự sinh vào hồ sơ để xem đúng tuần phát triển và đặt nhắc hằng ngày."}
        </Text>
        <Pressable
          style={p.action}
          onPress={() =>
            router.push(child?.birthday ? "/em-be" : "/child/edit")
          }
        >
          <Text style={p.actionText}>
            {child?.birthday ? "Chọn hồ sơ bé" : "Cập nhật ngày dự sinh"}
          </Text>
        </Pressable>
        <Pressable
          style={p.pill}
          onPress={() => router.push("/pregnancy/library")}
        >
          <Text style={p.pillText}>Đọc thư viện thai kỳ</Text>
        </Pressable>
      </Screen>
    );
  return (
    <Screen
      safeAreaStyle={p.root}
      contentStyle={{ padding: 0, gap: 0, paddingBottom: 28 }}
    >
      <Stack.Screen
        options={{
          title: "Trạng thái hôm nay",
          headerStyle: { backgroundColor: "#FFF8F2" },
          headerBackground: () => (
            <View style={{ flex: 1, backgroundColor: "#FFF8F2" }} />
          ),
          headerTintColor: pregnancyColors.ink,
          headerTitleStyle: { fontSize: 18, fontWeight: "600" },
        }}
      />
      <LinearGradient colors={["#FFF3E5", "#FFDCC7", "#FFF4EF"]} style={s.hero}>
        <View style={s.topline}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>HÀNH TRÌNH CỦA GIA ĐÌNH</Text>
            <Text style={p.heading}>{child.nickname || child.name}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nhắc thai kỳ cục bộ"
            onPress={() => router.push("/pregnancy/notifications")}
            style={s.bell}
          >
            <Ionicons name="notifications-outline" size={24} color="#8D534C" />
          </Pressable>
        </View>
        <DayPicker
          value={day}
          onChange={(value) => {
            setDay(value);
            setPreview(null);
          }}
        />
        <View style={s.age}>
          <Text style={s.ageTitle}>
            {age ? formatPregnancyAge(age) : "Ngoài khoảng dữ liệu 0–42 tuần"}
          </Text>
          <Text style={s.ageSubtitle}>
            {day === today ? "Tuổi thai hôm nay" : "Tuổi thai tại ngày đã chọn"}
            {age
              ? age.daysUntilDue >= 0
                ? ` · Còn ${age.daysUntilDue} ngày đến ngày dự sinh`
                : ` · Sau ngày dự sinh ${-age.daysUntilDue} ngày`
              : ""}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem sự phát triển đủ ${week} tuần`}
          onPress={() => growth && openPregnancyArticle(growth.id)}
          style={s.heroImage}
        >
          <PregnancyImage
            imageKey={growth?.images[0]}
            label={`Minh họa đủ ${week} tuần`}
            height={225}
            zoom={false}
          />
        </Pressable>
        <Text style={s.caption}>
          Đang xem: đủ {week} tuần · Hình minh họa, không phải siêu âm
        </Text>
        <ScrollView
          ref={weeksRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.weeks}
          onContentSizeChange={() =>
            weeksRef.current?.scrollTo({
              x: Math.max(0, week * 75 - 120),
              animated: false,
            })
          }
        >
          {Array.from({ length: 43 }, (_, i) => (
            <Pressable
              key={i}
              accessibilityLabel={`Xem đủ ${i} tuần`}
              accessibilityState={{ selected: week === i }}
              aria-selected={week === i}
              onPress={() => setPreview(i)}
              style={[s.week, week === i && { backgroundColor: "#fff" }]}
            >
              <Text
                style={[
                  s.weekText,
                  week === i && { color: "#A35B44", fontWeight: "700" },
                ]}
              >
                {i} tuần
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {preview !== null && (
          <Pressable style={{ padding: 12 }} onPress={() => setPreview(null)}>
            <Text
              style={{
                color: "#9C594C",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Về tuần của ngày đã chọn
            </Text>
          </Pressable>
        )}
        <View style={s.quick}>
          {(
            [
              [
                "Chi tiết",
                "baby-face-outline",
                () => growth && openPregnancyArticle(growth.id),
              ],
              ["Triệu chứng", "plus", () => diary("symptoms")],
              ["Tình dục", "heart-outline", () => diary("sex")],
              ["Cân nặng", "scale-bathroom", () => diary("weight")],
            ] as const
          ).map(([title, icon, action], i) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              onPress={action}
              style={s.quickButton}
            >
              <View
                style={[s.quickIcon, i === 0 && { backgroundColor: "#E66E8D" }]}
              >
                <MaterialCommunityIcons
                  name={icon}
                  size={26}
                  color={i === 0 ? "#fff" : "#46363D"}
                />
              </View>
              <Text style={s.quickText}>{title}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>
      <View style={s.section}>
        <View style={s.sectionHeading}>
          <Text style={[p.heading, { flex: 1 }]}>Thông tin hằng ngày</Text>
          <Text style={p.muted}>
            {preview !== null
              ? `Đủ ${week} tuần`
              : day === today
                ? "Hôm nay"
                : "Ngày đã chọn"}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
        >
          {[growth, body, insight]
            .filter((a) => !!a)
            .map((article) => (
              <Pressable
                key={article.id}
                accessibilityRole="button"
                accessibilityLabel={article.title}
                onPress={() => openPregnancyArticle(article.id)}
                style={[
                  s.story,
                  {
                    backgroundColor: {
                      growth: "#FCE2D6",
                      body: "#EADFF2",
                      inside: "#DEEEEA",
                    }[article.section],
                  },
                ]}
              >
                <Text style={s.storyCategory}>
                  {
                    {
                      growth: "BÉ LỚN MỖI NGÀY",
                      body: "CƠ THỂ CỦA MẸ",
                      inside: "BÉ TRONG BỤNG",
                    }[article.section]
                  }
                </Text>
                {article.images[0] ? (
                  <Image
                    source={pregnancyImageSources[article.images[0]]}
                    style={s.storyImage}
                    resizeMode="contain"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="baby-face-outline"
                    size={54}
                    color="#B6786F"
                    style={{ alignSelf: "center", marginVertical: 16 }}
                  />
                )}
                <Text style={s.storyTitle} numberOfLines={3}>
                  {article.title}
                </Text>
              </Pressable>
            ))}
        </ScrollView>
      </View>
      <View style={[p.card, s.panel]}>
        <Text style={p.heading}>Điều gì đang diễn ra ở tuần {week}?</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {pregnancySections.map((section) => (
            <Pressable
              key={section.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/pregnancy/library",
                  params: { section: section.id, week: String(week) },
                })
              }
              style={s.category}
            >
              <MaterialCommunityIcons
                name={section.icon}
                size={35}
                color={section.color}
              />
              <Text style={s.categoryTitle}>{section.title}</Text>
            </Pressable>
          ))}
        </View>
        {growth && <PregnancyArticleRow article={growth} />}
        {body ? (
          <PregnancyArticleRow article={body} />
        ) : (
          <Text style={p.muted}>
            Nhóm thay đổi cơ thể mẹ bắt đầu từ đủ 3 tuần trong bộ dữ liệu này.
          </Text>
        )}
      </View>
      <View style={[p.card, s.panel]}>
        <View style={s.sectionHeading}>
          <Text style={[p.heading, { flex: 1 }]}>Mẹ hôm nay thế nào?</Text>
          <Ionicons name="heart-outline" size={22} color="#DB607F" />
        </View>
        <Text style={p.muted}>
          Ghi lại cảm giác của mẹ để hai người cùng theo dõi. Những gì bạn ghi
          sẽ được chia sẻ trong gia đình.
        </Text>
        {records.map((record) => (
          <Pressable
            key={record.id}
            onPress={() =>
              router.push({
                pathname: "/pregnancy/diary",
                params: { id: record.id },
              })
            }
            style={s.diaryPreview}
          >
            <Text style={p.rowTitle}>{record.created_by_name}</Text>
            <Text style={p.muted} numberOfLines={3}>
              {record.details?.summary || record.note || "Đã ghi nhật ký"}
            </Text>
            <Text style={s.saved}>
              {record.sync_state === "synced"
                ? "Đã đồng bộ"
                : "Đã lưu trên máy · chờ đồng bộ"}
            </Text>
          </Pressable>
        ))}
        <Pressable
          testID="pregnancy-log"
          style={p.action}
          onPress={() => diary()}
        >
          <Text style={p.actionText}>
            {records.length ? "Xem / ghi nhật ký" : "Ghi lại hôm nay"}
          </Text>
        </Pressable>
      </View>
      <View style={[p.card, s.panel]}>
        <Text style={p.heading}>Hiểu thêm về bé</Text>
        {[insight, inside[(week + 1) % inside.length]!].map((article) => (
          <PregnancyArticleRow key={article.id} article={article} />
        ))}
        <Pressable
          style={p.pill}
          onPress={() => router.push("/pregnancy/library")}
        >
          <Text style={p.pillText}>Khám phá 92 bài viết ngoại tuyến</Text>
        </Pressable>
      </View>
      <Text style={[p.muted, { margin: 20 }]}>
        Tuổi thai ước tính từ ngày dự sinh (mốc 40 tuần); lịch khám và kết luận
        của bác sĩ được ưu tiên. Bài đọc chỉ để tham khảo, không chẩn đoán tình
        trạng của mẹ hoặc bé.
      </Text>
    </Screen>
  );
}
const s = StyleSheet.create({
  hero: { padding: 18, paddingBottom: 20 },
  topline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 10,
  },
  eyebrow: {
    color: "#9A7667",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  bell: { padding: 12, backgroundColor: "#FFFFFF99", borderRadius: 26 },
  age: { alignItems: "center", gap: 7, marginTop: 22 },
  ageTitle: { fontSize: 25, fontWeight: "700", color: "#96583F" },
  ageSubtitle: {
    fontSize: 12,
    color: "#9C766A",
    textAlign: "center",
    lineHeight: 18,
  },
  heroImage: {
    marginTop: 12,
    padding: 10,
    borderRadius: 28,
    backgroundColor: "#FFFFFF66",
  },
  caption: {
    textAlign: "center",
    color: "#AB8778",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  weeks: { gap: 7, paddingVertical: 16 },
  week: {
    width: 68,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 22,
  },
  weekText: { fontSize: 14, color: "#AA7966" },
  quick: { flexDirection: "row", gap: 6, marginTop: 8 },
  quickButton: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { fontSize: 12, color: "#685050", textAlign: "center" },
  section: { padding: 18, gap: 14 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  story: {
    width: 148,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFCACB",
    minHeight: 200,
  },
  storyCategory: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#775354",
  },
  storyImage: {
    width: "100%",
    height: 95,
    marginVertical: 9,
    borderRadius: 12,
  },
  storyTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#543D42",
    fontWeight: "600",
  },
  panel: { marginHorizontal: 18, marginBottom: 16 },
  category: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 10 },
  categoryTitle: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#625057",
  },
  diaryPreview: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#FFF6F4",
    gap: 5,
  },
  saved: { fontSize: 11, color: "#9B6C7A" },
});
