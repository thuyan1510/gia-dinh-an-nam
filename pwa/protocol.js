(function (root) {
  const types = [
    "reminder",
    "post",
    "comment",
    "care",
    "pregnancy",
    "message",
    "test",
  ];
  function target(value) {
    if (
      !value ||
      !types.includes(value.type) ||
      typeof value.eventId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,120}$/.test(value.eventId) ||
      typeof value.notificationId !== "string" ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
        value.notificationId,
      )
    )
      return null;
    return {
      type: value.type,
      eventId: value.eventId,
      notificationId: value.notificationId,
    };
  }
  function query(value) {
    const t = target(value);
    return t
      ? new URLSearchParams({
          type: t.type,
          id: t.eventId,
          notificationId: t.notificationId,
        }).toString()
      : "";
  }
  function fromURL(raw) {
    try {
      const u = new URL(raw);
      if (
        ["type", "id", "notificationId"].some(
          (k) => u.searchParams.getAll(k).length !== 1,
        )
      )
        return null;
      return target({
        type: u.searchParams.get("type"),
        eventId: u.searchParams.get("id"),
        notificationId: u.searchParams.get("notificationId"),
      });
    } catch {
      return null;
    }
  }
  const api = {
    target,
    query,
    fromURL,
    nativeURL: (value) => {
      const q = query(value);
      return q
        ? `giadinhanam://notification/open?${q}`
        : "giadinhanam://notifications/inbox";
    },
    typeFor: (e) =>
      ({
        reminders: "reminder",
        family_posts: "post",
        family_messages: "message",
        post_comments: "comment",
        care_entries: e.kind === "pregnancy_status" ? "pregnancy" : "care",
      })[e.source_table] || "test",
  };
  root.AnNamProtocol = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
