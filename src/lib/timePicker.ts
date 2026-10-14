export function timePickerDate(time: string, base = new Date()): Date {
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "07:00";
  const date = new Date(base);
  date.setHours(Number(valid.slice(0, 2)), Number(valid.slice(3)), 0, 0);
  return date;
}
export function timePickerValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
