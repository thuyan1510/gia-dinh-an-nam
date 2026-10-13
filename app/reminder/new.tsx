import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import { Alert } from "react-native";
import { ReminderPopup } from "../../src/components/ReminderPopup";
import { useApp } from "../../src/providers/AppProvider";
import { enqueue } from "../../src/lib/database";
import { reconcileSyncedReminders } from "../../src/services/notifications";

export default function NewReminderScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    details?: string;
  }>();
  const { addReminder, reminders, refresh, syncNow } = useApp();
  const existing = reminders.find((r) => r.id === params.id);
  const initial = existing
    ? new Date(existing.due_at)
    : new Date(Date.now() + 3600000);
  initial.setSeconds(0, 0);
  const db = useSQLiteContext();
  const [title, setTitle] = useState(existing?.title ?? params.title ?? "");
  const [details, setDetails] = useState(
    existing?.details ?? params.details ?? "",
  );
  const [dueAt, setDueAt] = useState(initial);
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const save = async () => {
    if (locked.current || !title.trim()) return;
    if (params.id && !existing)
      return Alert.alert(
        "Lời nhắc chưa tải được hoặc không còn tồn tại. Hãy quay lại và đồng bộ.",
      );
    if (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now())
      return Alert.alert("Chọn ngày giờ trong tương lai");
    locked.current = true;
    setSaving(true);
    try {
      if (existing) {
        const payload = {
          id: existing.id,
          family_id: existing.family_id,
          title: title.trim(),
          details: details.trim() || null,
          due_at: dueAt.toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.withTransactionAsync(async () => {
          await db.runAsync(
            "UPDATE reminders SET title=?,details=?,due_at=?,updated_at=?,acknowledged_at=NULL,acknowledged_by=NULL,sync_state='pending' WHERE id=?",
            payload.title,
            payload.details,
            payload.due_at,
            payload.updated_at,
            existing.id,
          );
          await enqueue(
            db,
            existing.family_id,
            "reminders",
            existing.id,
            payload,
            "update",
          );
        });
        await reconcileSyncedReminders(db);
        await refresh();
        void syncNow();
      } else
        await addReminder({
          title: title.trim(),
          details: details.trim() || null,
          dueAt,
        });
      router.back();
    } catch (e) {
      Alert.alert(
        "Chưa lưu được",
        e instanceof Error ? e.message : "Hãy thử lại.",
      );
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };
  return (
    <ReminderPopup
      title={title}
      setTitle={setTitle}
      details={details}
      setDetails={setDetails}
      date={dueAt}
      setDate={setDueAt}
      saving={saving}
      editing={!!existing}
      onSave={() => void save()}
      onClose={() => router.back()}
    />
  );
}
