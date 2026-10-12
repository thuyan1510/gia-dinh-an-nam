import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { PregnancyHero } from "../../src/components/PregnancyHero";
import { useSQLiteContext } from "expo-sqlite";
import { activatePregnancyReminders } from "../../src/services/pregnancyNotifications";
import {
  router,
  Stack,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Screen } from "../../src/components/ui";
import { localDay } from "../../src/components/DayPicker";
import { PregnancyWeekStrip } from "../../src/components/PregnancyWeekStrip";
import visualData from "../../src/data/pregnancy/visuals.json";
import { pregnancyVisualSources } from "../../src/data/pregnancy/visualSources";
import {
  PregnancyArticleRow,
  openPregnancyArticle,
  p,
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
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const [reminderError, setReminderError] = useState("");
  useEffect(() => {
    if (child?.id && child.due_date && !child.birthday) {
      void activatePregnancyReminders(db, child.id).catch(() =>
        setReminderError(
          "Chưa đặt được lời nhắc. Chạm chuông để kiểm tra quyền thông báo.",
        ),
      );
    }
  }, [db, child?.id, child?.due_date, child?.birthday]);
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(localDay(new Date()));
  const [today, setToday] = useState(localDay(new Date()));
  const [preview, setPreview] = useState<number | null>(null);
  const [showWeeks, setShowWeeks] = useState(false);
  const weeksRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const backgroundColor = scrollY.interpolate({
    inputRange: [0, 300, 560],
    outputRange: ["#FFC4A6", "#FFE4D6", "#FFFBF9"],
    extrapolate: "clamp",
  });
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
  const visualId = visualData.weeks.find(
    (w) => w.completedWeek === week,
  )?.visualId;
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
    <View style={{ flex: 1 }}>
      <Animated.View
        pointerEvents="none"
        testID="pregnancy-scroll-background"
        style={[StyleSheet.absoluteFill, { backgroundColor }]}
      />
      <Screen
        safeAreaStyle={{ flex: 1, backgroundColor: "transparent" }}
        contentStyle={{ padding: 0, gap: 0, paddingBottom: 28 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
      >
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={s.hero}>
          <View style={s.topline}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Về tab Em bé"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/em-be")
              }
              style={s.back}
            >
              <Ionicons name="chevron-back" size={24} color="#5E382B" />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={s.eyebrow}>TRẠNG THÁI HÔM NAY</Text>
              <Text
                testID="pregnancy-profile"
                style={s.profile}
                numberOfLines={1}
              >
                {child.nickname || child.name}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nhắc thai kỳ cục bộ"
              onPress={() => router.push("/pregnancy/notifications")}
              style={s.bell}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#5E382B"
              />
            </Pressable>
          </View>
          {!!reminderError && <Text style={p.muted}>{reminderError}</Text>}
          <PregnancyWeekStrip
            day={day}
            today={today}
            recordedDays={entries
              .filter((e) => e.details?.tool === "pregnancy-today")
              .map((e) => e.details?.day ?? "")}
            onChange={(value) => {
              setDay(value);
              setPreview(null);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem sự phát triển đủ ${week} tuần`}
            onPress={() => growth && openPregnancyArticle(growth.id)}
            style={[s.heroImage, { height: Math.min(width * 0.65, 270) }]}
          >
            {visualId && (
              <Animated.View
                testID={`pregnancy-visual-${visualId}`}
                accessibilityLabel={`Minh họa bé ở ${week} tuần`}
                style={[
                  StyleSheet.absoluteFill,
                  {
                    width: "100%",
                    height: "100%",
                    transform: [
                      {
                        translateY: scrollY.interpolate({
                          inputRange: [0, 400],
                          outputRange: [0, 12],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
                ]}
              >
                <PregnancyHero
                  source={pregnancyVisualSources[visualId]!}
                  week={week}
                />
              </Animated.View>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn tuần thai"
            onPress={() => setShowWeeks((v) => !v)}
            style={s.age}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
            >
              <Text style={s.ageTitle}>
                {preview !== null
                  ? `${week} tuần · xem trước`
                  : age
                    ? formatPregnancyAge(age)
                    : "Chưa xác định tuổi thai"}
              </Text>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color="#A65521"
              />
            </View>
            {showWeeks && (
              <Text style={s.ageSubtitle}>
                Ước tính từ ngày dự sinh · Chọn tuần để đọc trước
              </Text>
            )}
          </Pressable>
          {showWeeks && (
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
          )}
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
                  "baby",
                  () => growth && openPregnancyArticle(growth.id),
                ],
                ["Triệu chứng", "plus", () => diary("symptoms")],
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
                  style={[
                    s.quickIcon,
                    i === 0 && { backgroundColor: "#FC568A" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={29}
                    color={i === 0 ? "#fff" : "#46363D"}
                  />
                </View>
                <Text style={s.quickText}>{title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.section}>
          <View style={s.sectionHeading}>
            <Text style={[s.sectionTitle, { flex: 1 }]}>
              Thông tin hằng ngày
            </Text>
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
                  <View style={s.storyHeading}>
                    <Text style={s.storyTitle} numberOfLines={3}>
                      {article.title}
                    </Text>
                  </View>
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
          Tuổi thai ước tính từ ngày dự sinh (mốc 40 tuần); lịch khám và kết
          luận của bác sĩ được ưu tiên. Bài đọc chỉ để tham khảo, không chẩn
          đoán tình trạng của mẹ hoặc bé.
        </Text>
      </Screen>
    </View>
  );
}
const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  topline: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    gap: 10,
  },
  eyebrow: {
    color: "#86563E",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 3,
  },
  profile: { fontSize: 16, fontWeight: "600", color: "#5E382B" },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  bell: { padding: 10, borderRadius: 26 },
  age: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 46,
  },
  ageTitle: { fontSize: 24, fontWeight: "700", color: "#A65521" },
  ageSubtitle: {
    fontSize: 12,
    color: "#9C766A",
    textAlign: "center",
    lineHeight: 18,
  },
  heroImage: {
    marginTop: 0,
    width: "100%",
    overflow: "hidden",
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
  quick: { flexDirection: "row", gap: 6, marginTop: 18, marginBottom: 6 },
  quickButton: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { fontSize: 13, color: "#372820", textAlign: "center" },
  section: { padding: 16, paddingTop: 4, gap: 10 },
  sectionTitle: { fontSize: 19, color: "#302421", fontWeight: "700" },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  story: {
    width: 124,
    padding: 3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F27998",
    overflow: "hidden",
    height: 156,
  },
  storyCategory: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#775354",
  },
  storyImage: {
    width: "100%",
    flex: 1,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  storyTitle: {
    fontSize: 12,
    lineHeight: 15,
    color: "#34272B",
    fontWeight: "600",
  },
  storyHeading: { height: 57, padding: 6, flexShrink: 0 },
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
