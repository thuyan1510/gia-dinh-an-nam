// Only return field names/errors to clients, never secret values.
export function telegramConfig(get: (name: string) => string | undefined) {
  const username = (get("TELEGRAM_BOT_USERNAME") ?? "").trim()
    .replace(/^https?:\/\/(?:www\.)?t\.me\//i, "")
    .replace(/^@/, "").replace(/\/$/, "");
  const errors: string[] = [];
  if (!get("TELEGRAM_BOT_TOKEN")?.trim()) errors.push("Thiếu TELEGRAM_BOT_TOKEN.");
  if (!username) errors.push("Thiếu TELEGRAM_BOT_USERNAME.");
  else if (!/^[a-zA-Z0-9_]{5,32}$/.test(username) || !/bot$/i.test(username))
    errors.push("TELEGRAM_BOT_USERNAME phải là username bot kết thúc bằng bot, không phải tên hiển thị.");
  return { username, errors, ready: errors.length === 0 };
}
