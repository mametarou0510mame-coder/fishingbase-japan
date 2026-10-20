// マイ水族館の魚の写真（切り抜いたもの）を、端末のブラウザの IndexedDB に保存する。サーバーには送らない。
const DB = "tsuredoki-aquarium";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((ok, ng) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ng(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((ok, ng) => {
    const r = f(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ng(r.error);
  });
}
export const putPhoto = (id: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, id));
export const getPhoto = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id));
export const deletePhoto = (id: string) => tx("readwrite", (s) => s.delete(id));
export async function getAllPhotos(): Promise<Record<string, Blob>> {
  try {
    const db = await open();
    return await new Promise((ok, ng) => {
      const out: Record<string, Blob> = {};
      const r = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (!c) return ok(out);
        out[String(c.key)] = c.value as Blob;
        c.continue();
      };
      r.onerror = () => ng(r.error);
    });
  } catch {
    return {};
  }
}
export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((ok, ng) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result));
    fr.onerror = () => ng(fr.error);
    fr.readAsDataURL(b);
  });
