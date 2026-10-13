import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FamilyText as Text } from "../../src/components/FamilyText";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import {
  MediaViewer,
  type ViewableMedia,
} from "../../src/components/MediaViewer";
import { useApp } from "../../src/providers/AppProvider";
import {
  pickChatMedia,
  uploadChatMedia,
  readChat,
  sendChatMessage,
} from "../../src/services/chat";
import { webPushAction } from "../../src/services/webPush";
import { makeId } from "../../src/lib/ids";
import { messageAttachments } from "../../src/lib/messageMedia";
import type {
  FamilyMessage,
  MessageAttachment,
  Reminder,
} from "../../src/types";
import { colors } from "../../src/theme";

type Draft = {
  body: string;
  attachments: MessageAttachment[];
  requestId?: string;
};
const blank: Draft = { body: "", attachments: [] };
const dateLabel = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export default function ConversationScreen() {
  const {
    family,
    currentUserId,
    messages,
    reminders,
    syncNow,
    refresh,
    syncMessage,
  } = useApp();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{
    messageId?: string;
    reminderId?: string;
  }>();
  const paired = !!family && !family.id.startsWith("family_local");
  const [rows, setRows] = useState<FamilyMessage[]>([]),
    [limit, setLimit] = useState(60);
  const [draft, setDraft] = useState<Draft>(blank),
    [loadedKey, setLoadedKey] = useState("");
  const [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false),
    [status, setStatus] = useState("");
  const [viewer, setViewer] = useState<ViewableMedia | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [focusEpoch, setFocusEpoch] = useState(0);
  const scrolledTarget = useRef(""),
    loadSequence = useRef(0);
  const list = useRef<FlatList<FamilyMessage>>(null),
    lock = useRef(false),
    ackLock = useRef(false);
  const attentionId = useRef(makeId("attention"));
  const key = `conversation-draft:${family?.id}:${currentUserId}`;
  const activeKey = useRef(key);
  activeKey.current = key;
  const ready = loadedKey === key && paired;
  useEffect(() => {
    let active = true;
    setDraft(blank);
    setLoadedKey("");
    setRows([]);
    setStatus("");
    setLimit(60);
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setDraft({
              body:
                typeof parsed.body === "string"
                  ? parsed.body.slice(0, 2000)
                  : "",
              attachments: messageAttachments(parsed.attachments),
              ...(typeof parsed.requestId === "string" &&
              /^chat_[a-zA-Z0-9_-]{8,100}$/.test(parsed.requestId)
                ? { requestId: parsed.requestId }
                : {}),
            });
          } catch {
            /* An invalid local draft is never submitted. */
          }
        }
        setLoadedKey(key);
      })
      .catch(() => {
        if (active) setStatus("Chưa đọc được bản nháp. Hãy mở lại tab.");
      });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (loadedKey !== key) return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(key, JSON.stringify(draft)).catch(() =>
        setStatus("Chưa lưu được bản nháp trên máy."),
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [draft, loadedKey, key]);
  const reload = useCallback(async () => {
    if (!family) return;
    const turn = ++loadSequence.current;
    const forKey = activeKey.current;
    const data = await readChat(db, family.id, limit);
    if (activeKey.current === forKey && turn === loadSequence.current)
      setRows(data.filter((r) => r.sync_state !== "pending"));
  }, [db, family?.id, limit]);
  useEffect(() => {
    void reload().catch(() => setStatus("Chưa tải được cuộc trò chuyện."));
  }, [reload, messages, reminders]);
  useFocusEffect(
    useCallback(() => {
      if (!paired) return;
      scrolledTarget.current = "";
      setFocusEpoch((v) => v + 1);
      void syncNow();
      const timer = setInterval(() => {
        if (AppState.currentState === "active") void syncNow();
      }, 15000);
      return () => clearInterval(timer);
    }, [paired, syncNow]),
  );
  const pending = useMemo(
    () =>
      reminders.filter(
        (r) =>
          r.sync_state === "pending" &&
          !rows.some((m) => m.reminder_id === r.id),
      ),
    [reminders, rows],
  );
  const targetIndex = rows.findIndex((r) =>
    params.messageId
      ? r.id === params.messageId
      : params.reminderId
        ? r.reminder_id === params.reminderId
        : false,
  );
  useEffect(() => {
    const target = `${params.messageId ?? ""}:${params.reminderId ?? ""}`;
    if (target === ":" || scrolledTarget.current === target) return;
    if (targetIndex >= 0) {
      const timer = setTimeout(() => {
        list.current?.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewPosition: 0.5,
        });
        scrolledTarget.current = target;
      }, 250);
      return () => clearTimeout(timer);
    }
    if (rows.length >= limit) setLimit((n) => n + 60);
  }, [
    targetIndex,
    params.messageId,
    params.reminderId,
    rows.length,
    limit,
    focusEpoch,
  ]);

  const send = async () => {
    if (
      lock.current ||
      !ready ||
      (!draft.body.trim() && !draft.attachments.length)
    )
      return;
    lock.current = true;
    setBusy(true);
    setStatus("");
    const outgoing = { ...draft, requestId: draft.requestId ?? makeId("chat") },
      sendKey = key;
    setDraft(outgoing);
    try {
      // Persist the immutable retry payload BEFORE the request may reach Supabase.
      await AsyncStorage.setItem(sendKey, JSON.stringify(outgoing));
      await sendChatMessage(
        outgoing.requestId,
        outgoing.body,
        outgoing.attachments,
        family!.id,
      );
      await AsyncStorage.removeItem(sendKey);
      if (activeKey.current === sendKey) {
        setDraft(blank);
        setStatus("Đã gửi");
        list.current?.scrollToOffset({ offset: 0, animated: true });
      }
      await syncNow();
    } catch (e) {
      if (activeKey.current === sendKey)
        setStatus(
          e instanceof Error ? e.message : "Chưa gửi được. Hãy thử lại.",
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const attach = async (kind: "image" | "video") => {
    if (lock.current || !ready || draft.requestId) return;
    if (draft.attachments.length >= 4) {
      Alert.alert("Mỗi tin nhắn tối đa 4 ảnh/video");
      return;
    }
    lock.current = true;
    setBusy(true);
    setMenu(false);
    const mediaKey = key;
    try {
      const asset = await pickChatMedia(kind);
      if (!asset) return;
      setStatus("Đang tải tệp…");
      const media = await uploadChatMedia(asset);
      if (activeKey.current === mediaKey) {
        setDraft((d) => ({ ...d, attachments: [...d.attachments, media] }));
        setStatus("");
      }
    } catch (e) {
      if (activeKey.current === mediaKey)
        setStatus(e instanceof Error ? e.message : "Chưa tải được tệp.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const attention = async () => {
    if (lock.current || !ready) return;
    lock.current = true;
    setBusy(true);
    setMenu(false);
    try {
      await webPushAction("attention", { request_id: attentionId.current });
      attentionId.current = makeId("attention");
      setStatus("Đã gửi báo người nhà. Nếu khẩn cấp, hãy gọi điện trực tiếp.");
      await syncNow();
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Chưa gửi được báo người nhà.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const acknowledge = async (r: Reminder) => {
    if (ackLock.current) return;
    ackLock.current = true;
    setAcknowledging(r.id);
    try {
      await webPushAction("acknowledge", {
        id: r.id,
        revision: r.schedule_version ?? 1,
      });
      await syncNow();
      await refresh();
    } catch (e) {
      Alert.alert(
        "Chưa xác nhận được",
        e instanceof Error ? e.message : "Hãy thử lại.",
      );
    } finally {
      ackLock.current = false;
      setAcknowledging(null);
    }
  };
  const renderMessage = ({ item }: { item: FamilyMessage }) => {
    const own = item.created_by === currentUserId;
    const reminder = reminders.find((r) => r.id === item.reminder_id);
    const card = ["reminder", "rescheduled"].includes(item.message_kind ?? "");
    const selected =
      item.id === params.messageId ||
      (!!params.reminderId && item.reminder_id === params.reminderId);
    return (
      <View style={[s.messageRow, own && s.ownRow]}>
        <View
          style={[
            s.bubble,
            own && s.ownBubble,
            card && s.reminderBubble,
            selected && s.highlight,
          ]}
        >
          <Text style={s.author}>{item.created_by_name}</Text>
          {item.message_kind === "attention" && (
            <Ionicons name="notifications-circle" size={32} color="#CE7530" />
          )}
          <Text selectable style={s.body}>
            {card ? (reminder?.title ?? item.body) : item.body}
          </Text>
          {card && reminder && (
            <>
              <Text style={s.due}>◷ {dateLabel(reminder.due_at)}</Text>
              {!!reminder.details && (
                <Text selectable style={s.body}>
                  {reminder.details}
                </Text>
              )}
              <Text style={s.state}>
                {reminder.completed_at
                  ? "✓ Đã hoàn thành"
                  : reminder.acknowledged_at
                    ? "✓ Người nhà đã xác nhận"
                    : reminder.sync_state === "pending"
                      ? "Đang chờ đồng bộ"
                      : "Chờ người nhà xác nhận"}
              </Text>
              {!reminder.completed_at &&
                !reminder.acknowledged_at &&
                reminder.created_by !== currentUserId && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      !!acknowledging || reminder.sync_state === "pending"
                    }
                    onPress={() => void acknowledge(reminder)}
                    style={s.ack}
                  >
                    <Text style={s.ackText}>
                      {acknowledging === reminder.id
                        ? "Đang xác nhận…"
                        : "Xác nhận"}
                    </Text>
                  </Pressable>
                )}
              {reminder.created_by === currentUserId &&
                !reminder.completed_at && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/reminder/new",
                        params: { id: reminder.id },
                      })
                    }
                    style={s.edit}
                  >
                    <Text style={s.state}>Sửa lời nhắc</Text>
                  </Pressable>
                )}
            </>
          )}
          {messageAttachments(item.attachments).map((media) =>
            media.type === "image" ? (
              <FamilyPhoto
                key={media.path}
                path={media.path}
                fullImage
                zoomable
                style={{ width: 224, borderRadius: 12, marginTop: 8 }}
              />
            ) : (
              <Pressable
                key={media.path}
                accessibilityLabel="Xem video"
                style={s.video}
                onPress={() => setViewer(media)}
              >
                <Ionicons name="play-circle" color={colors.primary} size={44} />
                <Text style={s.state}>Video · Chạm để xem</Text>
              </Pressable>
            ),
          )}
          <Text style={s.timestamp}>{dateLabel(item.created_at)}</Text>
        </View>
      </View>
    );
  };
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.heading}>
        <View>
          <Text style={s.title}>Trao đổi</Text>
          <Text style={s.subtitle}>
            {family?.name ?? "Bố mẹ cùng chăm con"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Cài đặt thông báo"
          style={s.icon}
          onPress={() => router.push("/notifications")}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={colors.primary}
          />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {!paired ? (
          <View style={s.empty}>
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={colors.primary}
            />
            <Text style={s.emptyText}>
              Ghép gia đình để nhắn tin với người nhà.
            </Text>
            <Pressable
              style={s.ack}
              onPress={() => router.push("/family/connect")}
            >
              <Text style={s.ackText}>Ghép hai thiết bị</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={list}
            data={rows}
            renderItem={renderMessage}
            keyExtractor={(r) => r.id}
            inverted
            style={s.flex}
            contentContainerStyle={s.history}
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              list.current?.scrollToOffset({
                offset: index * averageItemLength,
                animated: false,
              });
              setTimeout(
                () =>
                  list.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.5,
                  }),
                350,
              );
            }}
            ListEmptyComponent={
              <View style={[s.empty, { transform: [{ scaleY: -1 }] }]}>
                <Text style={s.emptyText}>
                  Một nơi riêng để bố mẹ trò chuyện và nhắc nhau.
                </Text>
              </View>
            }
            ListFooterComponent={
              rows.length >= limit ? (
                <Pressable
                  style={s.load}
                  onPress={() => setLimit((n) => n + 60)}
                >
                  <Text style={s.state}>Xem tin nhắn trước</Text>
                </Pressable>
              ) : null
            }
            ListHeaderComponent={
              pending.length ? (
                <View style={s.pending}>
                  {pending.map((r) => (
                    <Text key={r.id} style={s.state}>
                      ◷ {r.title} · đang chờ đồng bộ
                    </Text>
                  ))}
                </View>
              ) : null
            }
          />
        )}
        {!!status && (
          <Text accessibilityRole="alert" style={s.status}>
            {status}
          </Text>
        )}
        {!!syncMessage && /chưa|lỗi|không thể/i.test(syncMessage) && (
          <Pressable onPress={() => void syncNow()} style={s.pending}>
            <Text style={s.state}>{syncMessage} · Chạm để thử lại</Text>
          </Pressable>
        )}
        {menu && (
          <View style={s.menu}>
            <Pressable
              style={s.menuItem}
              onPress={() => {
                setMenu(false);
                Keyboard.dismiss();
                router.push("/reminder/new");
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={25}
                color={colors.primary}
              />
              <Text style={s.body}>Tạo lời nhắc</Text>
            </Pressable>
            <Pressable
              style={s.menuItem}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Báo người nhà",
                  "Gửi “Cần bạn hỗ trợ ngay” qua PWA. Khi khẩn cấp, hãy gọi trực tiếp.",
                  [
                    { text: "Hủy", style: "cancel" },
                    { text: "Gửi", onPress: () => void attention() },
                  ],
                )
              }
            >
              <Ionicons
                name="notifications-outline"
                size={25}
                color="#CE7530"
              />
              <Text style={s.body}>Báo người nhà</Text>
            </Pressable>
          </View>
        )}
        {!!draft.attachments.length && (
          <View style={s.attachments}>
            {draft.attachments.map((media, i) => (
              <Pressable
                key={media.path}
                accessibilityLabel={`Bỏ ${media.type === "image" ? "ảnh" : "video"} ${i + 1}`}
                disabled={busy || !!draft.requestId}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    attachments: d.attachments.filter(
                      (a) => a.path !== media.path,
                    ),
                  }))
                }
                style={s.attachment}
              >
                <Ionicons
                  name={
                    media.type === "image"
                      ? "image-outline"
                      : "videocam-outline"
                  }
                  size={21}
                  color={colors.primary}
                />
                <Text style={s.state}>{i + 1}　×</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!!draft.requestId && (
          <Text style={s.status}>
            Tin nhắn đang chờ kiểm tra kết quả. Gửi lại sẽ không tạo tin trùng.
          </Text>
        )}
        <View style={s.composer}>
          <Pressable
            accessibilityLabel="Thêm chức năng"
            style={s.icon}
            disabled={!ready || busy}
            onPress={() => {
              Keyboard.dismiss();
              setMenu((v) => !v);
            }}
          >
            <Ionicons
              name={menu ? "close-circle-outline" : "add-circle-outline"}
              size={29}
              color={colors.primary}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Gửi ảnh hoặc video"
            style={s.icon}
            disabled={!ready || busy || !!draft.requestId}
            onPress={() =>
              Alert.alert("Gửi ảnh/video", "", [
                { text: "Ảnh", onPress: () => void attach("image") },
                { text: "Video", onPress: () => void attach("video") },
                { text: "Hủy", style: "cancel" },
              ])
            }
          >
            <Ionicons name="image-outline" size={25} color={colors.primary} />
          </Pressable>
          <TextInput
            accessibilityLabel="Soạn tin nhắn"
            placeholder="Tin nhắn…"
            placeholderTextColor="#94909C"
            style={s.input}
            multiline
            maxLength={2000}
            value={draft.body}
            editable={ready && !busy && !draft.requestId}
            onFocus={() => setMenu(false)}
            onChangeText={(body) => setDraft((d) => ({ ...d, body }))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              draft.requestId ? "Thử gửi lại" : "Gửi tin nhắn"
            }
            disabled={
              !ready ||
              busy ||
              (!draft.body.trim() && !draft.attachments.length)
            }
            onPress={() => void send()}
            style={[
              s.send,
              (!ready ||
                busy ||
                (!draft.body.trim() && !draft.attachments.length)) && {
                opacity: 0.4,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="arrow-up" color="white" size={23} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <MediaViewer media={viewer} onClose={() => setViewer(null)} />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAF8FD" },
  flex: { flex: 1 },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#EEE8F4",
  },
  title: { fontSize: 25, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
  history: { padding: 12, gap: 10 },
  messageRow: { flexDirection: "row" },
  ownRow: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "86%",
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    padding: 13,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#EDE7F2",
    gap: 5,
  },
  ownBubble: {
    backgroundColor: "#EDE5F8",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
  },
  reminderBubble: {
    minWidth: 250,
    backgroundColor: "#FFFDF7",
    borderColor: "#EBDAC0",
  },
  highlight: { borderColor: colors.primary, borderWidth: 2 },
  author: { color: "#736288", fontSize: 12, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  timestamp: {
    fontSize: 10,
    color: "#82788D",
    textAlign: "right",
    marginTop: 4,
  },
  due: { color: "#9B6A26", fontSize: 14 },
  state: { fontSize: 13, color: colors.primary },
  ack: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  ackText: { color: "white", fontWeight: "700", fontSize: 15 },
  edit: { paddingVertical: 8 },
  video: {
    width: 224,
    minHeight: 135,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5DCF1",
    borderRadius: 12,
    gap: 8,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    gap: 16,
  },
  emptyText: {
    textAlign: "center",
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 7,
    paddingTop: 9,
    paddingBottom: 12,
    gap: 2,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#EEE8F4",
  },
  icon: {
    width: 42,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 126,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 11,
    backgroundColor: "#F6F3F9",
    borderColor: "#E4DCEB",
    borderWidth: 1,
    borderRadius: 21,
    fontSize: 16,
    color: colors.ink,
  },
  send: {
    width: 40,
    height: 40,
    marginLeft: 4,
    marginBottom: 2,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  status: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    fontSize: 12,
    color: "#786784",
    backgroundColor: "#F3EDF8",
  },
  menu: {
    backgroundColor: "white",
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4DCEB",
  },
  menuItem: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    padding: 14,
  },
  attachments: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
    backgroundColor: "white",
  },
  attachment: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#EEE8F6",
    flexDirection: "row",
    alignItems: "center",
  },
  pending: { padding: 10, gap: 5 },
  load: { padding: 16, alignItems: "center" },
});
