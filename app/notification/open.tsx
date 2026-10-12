import { useCallback, useRef, useState } from "react";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { Text } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import {
  Card,
  LinkButton,
  PrimaryButton,
  Screen,
} from "../../src/components/ui";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import { formStyles as s } from "../../src/components/forms";
import { parseNotificationTarget } from "../../src/lib/notificationTarget";
import { webPushAction } from "../../src/services/webPush";
import { supabase } from "../../src/lib/supabase";
import { useApp } from "../../src/providers/AppProvider";
type RecordData = {
  id: string;
  family_id?: string;
  title?: string;
  body?: string;
  details?: string | Record<string, string>;
  note?: string;
  due_at?: string;
  occurred_at?: string;
  amount?: number;
  unit?: string;
  child_id?: string;
  post_id?: string;
  image_paths?: string[];
  schedule_version?: number;
  acknowledged_at?: string;
  created_by?: string;
  completed_at?: string;
  deleted_at?: string;
};
export default function NotificationOpen() {
  const params = useLocalSearchParams(),
    target = parseNotificationTarget(params);
  const { loading, family, currentUserId, children, selectChild, syncNow } =
      useApp(),
    db = useSQLiteContext();
  const [record, setRecord] = useState<RecordData | null>(null),
    [message, setMessage] = useState("Đang tải nội dung…"),
    [offline, setOffline] = useState(false);
  const sequence = useRef(0),
    opened = useRef("");
  const key = JSON.stringify(target);
  const load = useCallback(async () => {
    if (loading) return;
    const turn = ++sequence.current;
    setRecord(null);
    setOffline(false);
    if (!target) {
      setMessage("Liên kết thông báo không hợp lệ.");
      return;
    }
    // Local reminders must remain usable before a family is paired with Supabase.
    // A remote notification ID must never enter this local-only branch.
    if (
      !target.notificationId &&
      target.type === "reminder" &&
      family?.id.startsWith("family_local")
    ) {
      try {
        const saved = await db.getFirstAsync<RecordData>(
          "SELECT * FROM reminders WHERE id=? AND family_id=?",
          target.id,
          family.id,
        );
        if (turn !== sequence.current) return;
        if (!saved) {
          setMessage("Lời nhắc không còn trên điện thoại này.");
          return;
        }
        setRecord(saved);
        setOffline(true);
        setMessage("Lời nhắc lưu cục bộ trên điện thoại này.");
      } catch {
        if (turn === sequence.current)
          setMessage("Chưa đọc được lời nhắc trên máy. Hãy thử tải lại.");
      }
      return;
    }
    if (
      !family ||
      family.id.startsWith("family_local") ||
      !supabase ||
      !currentUserId
    ) {
      setMessage(
        "Hãy đăng nhập và đồng bộ gia đình, sau đó quay lại thông báo này.",
      );
      return;
    }
    const tables = {
      reminder: "reminders",
      post: "family_posts",
      comment: "post_comments",
      care: "care_entries",
      pregnancy: "care_entries",
      test: "test",
    } as const;
    const table = tables[target.type];
    try {
      let row: RecordData;
      if (target.notificationId) {
        const result = await webPushAction<{
          type: string;
          eventId: string;
          record: RecordData;
        }>("content", { notificationId: target.notificationId });
        if (result.type !== target.type || result.eventId !== target.id)
          throw new Error("Mục tiêu thông báo không khớp.");
        row = result.record;
      } else {
        if (table === "test")
          throw new Error("Thông báo thử thiếu mã sự kiện.");
        // RLS + explicit family constraint; never treat an arbitrary deep-link ID as authorization.
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("id", target.id)
          .eq("family_id", family.id)
          .maybeSingle();
        if (error) throw error;
        if (!data || data.deleted_at)
          throw new Error("Nội dung đã xóa hoặc không có quyền truy cập.");
        row = data;
      }
      if (turn !== sequence.current) return;
      setRecord(row);
      setMessage("");
      if (row.child_id && children.some((c) => c.id === row.child_id))
        await selectChild(row.child_id);
      if (
        target.notificationId &&
        opened.current !== target.notificationId &&
        turn === sequence.current
      ) {
        opened.current = target.notificationId;
        // Emit only after real content was verified and this screen rendered it.
        requestAnimationFrame(() => {
          if (turn === sequence.current)
            void webPushAction("opened", {
              notificationId: target.notificationId,
            }).catch(() => {
              opened.current = "";
            });
        });
      }
    } catch (e) {
      if (turn !== sequence.current) return;
      // Only known offline/network errors may fall back to the current user's family cache.
      // Permission/deletion/target mismatch errors never reveal stale cached content.
      const text = e instanceof Error ? e.message : "Không tải được nội dung.";
      const networkFailure = /network|fetch|mạng|kết nối|Network request/i.test(
        text,
      );
      try {
        if (networkFailure && ["reminders", "care_entries"].includes(table)) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user.id === currentUserId) {
            const cached = await db.getFirstAsync<RecordData>(
              `SELECT * FROM ${table} WHERE id=? AND family_id=?`,
              target.id,
              family.id,
            );
            if (cached && !cached.deleted_at && turn === sequence.current) {
              setRecord(cached);
              setOffline(true);
              setMessage(
                "Đang xem dữ liệu đã lưu trên máy. Kết nối lại để kiểm tra thay đổi mới nhất.",
              );
              return;
            }
          }
        }
      } catch {
        /* Failed cache/auth recovery must not reject an unobserved focus effect. */
      }
      if (turn === sequence.current) setMessage(text);
    }
  }, [key, loading, family?.id, currentUserId, db]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        sequence.current++;
      };
    }, [load]),
  );
  let details = record?.details;
  if (typeof details === "string" && target?.type !== "reminder") {
    try {
      details = JSON.parse(details);
    } catch {
      details = undefined;
    }
  }
  const title = {
    reminder: "Lời nhắc",
    post: "Bài đăng",
    comment: "Bình luận",
    care: "Nhật ký chăm bé",
    pregnancy: "Trạng thái thai kỳ",
    test: "Kiểm tra điều hướng",
  }[target?.type ?? "test"];
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Text style={s.title}>{record?.title || title}</Text>
      {!!message && (
        <Text style={s.body} accessibilityRole="alert">
          {message}
        </Text>
      )}
      {record && (
        <Card style={s.gap}>
          {(record.due_at || record.occurred_at) && (
            <Text style={s.label}>
              {new Date(record.due_at || record.occurred_at!).toLocaleString(
                "vi-VN",
              )}
            </Text>
          )}
          {!!record.body && <Text style={s.body}>{record.body}</Text>}
          {!!record.note && <Text style={s.body}>{record.note}</Text>}
          {typeof details === "string" && <Text style={s.body}>{details}</Text>}
          {typeof details === "object" && details && (
            <Text style={s.body}>
              {details.summary ||
                [
                  details.weight ? `Cân nặng: ${details.weight} kg` : "",
                  details.day || "",
                ]
                  .filter(Boolean)
                  .join("\n")}
            </Text>
          )}
          {record.amount != null && (
            <Text style={s.body}>
              {record.amount} {record.unit}
            </Text>
          )}
          {record.image_paths?.map((path) => (
            <FamilyPhoto
              key={path}
              path={path}
              style={{ width: "100%" }}
              fullImage
              zoomable
            />
          ))}
          {target?.type === "test" && (
            <Text style={s.body}>
              IPA đã nhận liên kết và tải đúng sự kiện thử từ gia đình của bạn.
            </Text>
          )}
          {target?.type === "reminder" && (
            <>
              <Text style={s.hint}>
                {record.completed_at
                  ? "Đã hoàn thành"
                  : record.acknowledged_at
                    ? "Người nhà đã xác nhận nhận"
                    : "Chưa xác nhận nhận"}
              </Text>
              {!offline &&
                !record.completed_at &&
                !record.acknowledged_at &&
                record.created_by !== currentUserId && (
                  <PrimaryButton
                    title="Tôi đã nhận lời nhắc"
                    onPress={() => {
                      void webPushAction("acknowledge", {
                        id: record.id,
                        revision: record.schedule_version,
                      })
                        .then(async () => {
                          await syncNow();
                          await load();
                        })
                        .catch((e) => setMessage(e.message));
                    }}
                  />
                )}
            </>
          )}
          {target?.type === "pregnancy" && (
            <LinkButton
              title="Mở nhật ký thai kỳ này"
              onPress={() => {
                void (async () => {
                  if (record.child_id) await selectChild(record.child_id);
                  await syncNow();
                  router.navigate({
                    pathname: "/pregnancy/diary",
                    params: { id: record.id },
                  });
                })().catch((e) => setMessage(e.message));
              }}
            />
          )}
          {target?.type === "comment" && record.post_id && (
            <LinkButton
              title="Mở bài đăng có bình luận"
              onPress={() =>
                router.replace({
                  pathname: "/notification/open",
                  params: { type: "post", id: record.post_id! },
                })
              }
            />
          )}
        </Card>
      )}
      <LinkButton
        title="Tải lại nội dung"
        onPress={() => {
          void load();
        }}
      />
      {!record && (
        <LinkButton
          title="Tài khoản / khôi phục đăng nhập"
          onPress={() =>
            router.push({ pathname: "/account", params: target ?? {} })
          }
        />
      )}
      <LinkButton
        title="Hộp thông báo"
        onPress={() => router.replace("/notifications/inbox")}
      />
    </Screen>
  );
}
