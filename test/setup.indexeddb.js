/**
 * test/setup.indexeddb.js — Polyfill IndexedDB in-memory (fake-indexeddb)
 * khusus untuk project `pos`, karena `apps/pos/src/lib/db.js` memakai Dexie
 * (IndexedDB wrapper) untuk cache offline. jsdom TIDAK mengimplementasikan
 * IndexedDB, jadi tanpa polyfill ini setiap import `lib/db.js` akan langsung
 * gagal.
 *
 * `fake-indexeddb/auto` mendaftarkan `globalThis.indexedDB` dan
 * `globalThis.IDBKeyRange` secara otomatis — TIDAK menyentuh/mengubah
 * `lib/db.js`, `lib/sync.js`, atau `hooks/useProducts.js` sama sekali
 * (additive only, sesuai arahan Denny).
 */
import "fake-indexeddb/auto";
