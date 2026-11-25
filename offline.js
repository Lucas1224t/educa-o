// Armazenamento local (IndexedDB) + fila de resultados com sincronizacao sem duplicados
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("educaplay", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("outbox", { keyPath: "clientId" }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(store, mode, fn) {
  const d = await idb();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode); const q = fn(t.objectStore(store));
    t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
  });
}
const kvSet = (k, v) => tx("kv", "readwrite", (s) => s.put(v, k));
const kvGet = (k) => tx("kv", "readonly", (s) => s.get(k));
const limparPerfil = () => tx("kv", "readwrite", (s) => s.delete("perfil"));
const pendentes = () => tx("outbox", "readonly", (s) => s.getAll());
let sincronizando = false;
async function sincronizar() {
  if (sincronizando || !navigator.onLine) return;
  sincronizando = true;
  try {
    for (;;) {
      const lista = (await pendentes()).slice(0, 50); if (!lista.length) break;
      const j = await call("POST", "student/results", { results: lista });
      if (!j.done.length) break;
      for (const id of j.done) await tx("outbox", "readwrite", (s) => s.delete(id));
    }
  } catch (e) { /* sem rede ou servidor fora: tenta de novo depois */ }
  sincronizando = false;
  window.dispatchEvent(new Event("sincronizado"));
}
// Os jogos chamam salvarResultado(): grava local primeiro, depois sincroniza
async function salvarResultado(r) {
  r.clientId = crypto.randomUUID(); r.playedAt = new Date().toISOString();
  await tx("outbox", "readwrite", (s) => s.put(r));
  sincronizar();
}
window.addEventListener("online", sincronizar);
