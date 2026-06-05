/**
 * Database helper for storing and retrieving uploaded binary File objects in IndexedDB.
 * This ensures that when the browser is refreshed, original high-resolution files
 * are fully restored and session preview URLs are rebuilt.
 */
export class PhotoDB {
  private static dbName = "PassportPhotoDB";
  private static storeName = "photos";
  private static version = 2;

  private static open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(PhotoDB.dbName, PhotoDB.version);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PhotoDB.storeName)) {
          db.createObjectStore(PhotoDB.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public static async saveFile(id: string, file: File): Promise<void> {
    const db = await PhotoDB.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PhotoDB.storeName, "readwrite");
      const store = transaction.objectStore(PhotoDB.storeName);
      const request = store.put({ id, file });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public static async getFile(id: string): Promise<File | null> {
    const db = await PhotoDB.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PhotoDB.storeName, "readonly");
      const store = transaction.objectStore(PhotoDB.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result?.file || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public static async deleteFile(id: string): Promise<void> {
    const db = await PhotoDB.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PhotoDB.storeName, "readwrite");
      const store = transaction.objectStore(PhotoDB.storeName);
      const request = store.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public static async clear(): Promise<void> {
    const db = await PhotoDB.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PhotoDB.storeName, "readwrite");
      const store = transaction.objectStore(PhotoDB.storeName);
      const request = store.clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}
