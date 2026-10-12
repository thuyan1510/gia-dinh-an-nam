(function (root) {
  const opened = new Promise((resolve, reject) => {
    const request = indexedDB.open("an-nam-notifications", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Không mở được bộ nhớ PWA."));
  });
  root.AnNamStore = {
    async get(key) {
      const db = await opened;
      return new Promise((resolve, reject) => {
        const request = db.transaction("state").objectStore("state").get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    async set(key, value) {
      const db = await opened;
      return new Promise((resolve, reject) => {
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async take(key, notificationId) {
      const db = await opened;
      return new Promise((resolve, reject) => {
        const tx = db.transaction("state", "readwrite"),
          store = tx.objectStore("state"),
          request = store.get(key);
        let value;
        request.onsuccess = () => {
          // Do not consume a newer click while an older page is still restoring.
          if (
            notificationId === undefined ||
            request.result?.notificationId === notificationId
          ) {
            value = request.result;
            store.delete(key);
          }
        };
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error);
      });
    },
  };
})(self);
