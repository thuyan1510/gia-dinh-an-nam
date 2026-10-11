import AsyncStorage from "@react-native-async-storage/async-storage";
const key = "pregnancy-offline-bookmarks-v1";
export async function readPregnancyBookmarks(): Promise<string[]> {
  const value: unknown = JSON.parse((await AsyncStorage.getItem(key)) || "[]");
  return Array.isArray(value)
    ? value.filter(
        (v): v is string => typeof v === "string" && /^15_[a-z0-9_]+$/i.test(v),
      )
    : [];
}
let queue = Promise.resolve<string[]>([]);
export function togglePregnancyBookmark(id: string) {
  queue = queue
    .catch(() => [])
    .then(async () => {
      const old = await readPregnancyBookmarks();
      const next = old.includes(id)
        ? old.filter((v) => v !== id)
        : [...old, id];
      await AsyncStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  return queue;
}
