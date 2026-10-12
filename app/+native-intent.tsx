import { notificationSystemPath } from "../src/lib/notificationTarget";
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  return notificationSystemPath(path);
}
