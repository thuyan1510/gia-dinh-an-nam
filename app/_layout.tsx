import { router, Stack, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { pregnancyArticles } from "../src/data/pregnancy";
import { pregnancyDayNumber } from "../src/lib/pregnancy";
import { localDay } from "../src/components/DayPicker";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../src/providers/AppProvider";
import { migrateDatabase } from "../src/lib/database";
import { colors } from "../src/theme";
import { setDiagnosticScreen } from "../src/lib/crashReporting";
export { RecoverableError as ErrorBoundary } from "../src/components/RecoverableError";

function NotificationNavigation() {
  const { reminders, completeReminder, loading, children, selectChild } =
    useApp();
  const state = useRef({ reminders, completeReminder, children, selectChild });
  state.current = { reminders, completeReminder, children, selectChild };
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (loading || Platform.OS === "web") return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handled.current === key) return;
      handled.current = key;
      const reminder = state.current.reminders.find(
        (r) => r.id === response.notification.request.content.data?.reminderId,
      );
      if (response.actionIdentifier === "DONE" && reminder)
        void state.current.completeReminder(reminder).catch(() => undefined);
      if (
        response.notification.request.content.data?.reminderId &&
        typeof response.notification.request.content.data.reminderId ===
          "string"
      ) {
        router.navigate({
          pathname: "/notification/open",
          params: {
            type: "reminder",
            id: response.notification.request.content.data.reminderId,
          },
        });
        void Notifications.clearLastNotificationResponseAsync().catch(
          () => undefined,
        );
        return;
      }
      const route = response.notification.request.content.data?.route;
      const data = response.notification.request.content.data;
      if (route === "/pregnancy" && data?.scope === "pregnancy-v1") {
        const target = state.current.children.find(
          (c) => c.id === data.childId,
        );
        if (target) {
          void state.current
            .selectChild(target.id)
            .then(() => {
              if (
                data.kind === "info" &&
                typeof data.articleId === "string" &&
                pregnancyArticles.some((a) => a.id === data.articleId)
              ) {
                router.push({
                  pathname: "/pregnancy/article/[id]",
                  params: { id: data.articleId },
                });
              } else {
                const day =
                  data.repeatsDaily === true
                    ? localDay(new Date())
                    : typeof data.day === "string" &&
                        pregnancyDayNumber(data.day) !== null
                      ? data.day
                      : undefined;
                router.push({
                  pathname: "/pregnancy",
                  params: day ? { day } : {},
                });
              }
            })
            .catch(() =>
              Alert.alert(
                "Chưa mở được hồ sơ bé",
                "Hãy chọn bé trong tab Em bé rồi thử lại.",
              ),
            );
        } else
          Alert.alert(
            "Hồ sơ không còn trên máy",
            "Thông báo thuộc hồ sơ đã đổi hoặc không nằm trong gia đình hiện tại.",
          );
      }
      if (
        typeof route === "string" &&
        [
          "/",
          "/gia-dinh",
          "/theo-doi",
          "/em-be",
          "/family/message",
          "/cai-dat",
        ].includes(route)
      ) {
        router.push(route as never);
      }
      void Notifications.clearLastNotificationResponseAsync().catch(
        () => undefined,
      );
    };
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => undefined);
    return () => subscription.remove();
  }, [loading]);
  return null;
}

export default function RootLayout() {
  const segments = useSegments();
  useEffect(() => {
    setDiagnosticScreen(segments.join("/"));
  }, [segments]);
  const [fontsLoaded, fontError] = useFonts({
    Quicksand: require("../assets/legacy/Quicksand-Medium.ttf"),
    QuicksandSemiBold: require("../assets/legacy/Quicksand-SemiBold.ttf"),
    QuicksandBold: require("../assets/legacy/Quicksand-Bold.ttf"),
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SQLiteProvider databaseName="gia-dinh-an-nam.db" onInit={migrateDatabase}>
      <AppProvider>
        <NotificationNavigation />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerBackground: () => (
              <LinearGradient
                colors={["#7771BC", "#9875CD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
              />
            ),
            headerShadowVisible: false,
            headerTintColor: "#fff",
            headerTitleStyle: { fontFamily: "QuicksandSemiBold", fontSize: 19 },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="pregnancy/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="notification/open"
            dangerouslySingular={() => "notification-detail"}
            options={{ title: "Thông báo" }}
          />
          <Stack.Screen
            name="record/new"
            options={{ title: "Ghi nhanh", presentation: "modal" }}
          />
          <Stack.Screen
            name="family/message"
            options={{ title: "Lời nhắc gia đình" }}
          />
          <Stack.Screen
            name="family/connect"
            options={{ title: "Ghép hai thiết bị", presentation: "modal" }}
          />
          <Stack.Screen
            name="reminder/new"
            options={{ title: "Tạo nhắc việc", presentation: "modal" }}
          />
          <Stack.Screen
            name="vaccine/[id]"
            options={{ title: "Chi tiết lịch tiêm" }}
          />
          <Stack.Screen name="easy/[id]" options={{ title: "Lịch E.A.S.Y" }} />
          <Stack.Screen name="account" options={{ title: "Tài khoản" }} />
          <Stack.Screen
            name="family/telegram"
            options={{ title: "Telegram" }}
          />
          <Stack.Screen
            name="family/attention"
            options={{ title: "Báo cần hỗ trợ" }}
          />
          <Stack.Screen
            name="widgets"
            options={{ title: "Tiện ích màn hình" }}
          />
          <Stack.Screen name="child/edit" options={{ title: "Hồ sơ bé" }} />
          <Stack.Screen
            name="child/measure"
            options={{ title: "Thêm chỉ số cho bé" }}
          />
          <Stack.Screen
            name="child/vaccinations"
            options={{ title: "Lịch tiêm phòng" }}
          />
          <Stack.Screen name="assistant/[tool]" options={{ title: "Trợ lí" }} />
          <Stack.Screen
            name="child/statistics"
            options={{ title: "Thống kê năm" }}
          />
          <Stack.Screen
            name="child/weeks"
            options={{ title: "Phát triển theo tuần" }}
          />
          <Stack.Screen
            name="child/growth"
            options={{ title: "Tăng trưởng" }}
          />
          <Stack.Screen name="handbook/[id]" options={{ title: "Cẩm nang" }} />
        </Stack>
      </AppProvider>
    </SQLiteProvider>
  );
}
