/**
 * test/helpers/supabaseMock.js — Mock generik untuk client Supabase
 * (`@deera/shared/lib/supabase`), dipakai di SEMUA test `api.js` di seluruh
 * monorepo (pola query-nya identik: `supabase.from(table).select()...`).
 *
 * Pemakaian umum di sebuah file test:
 *
 *   import { vi } from "vitest";
 *   import { createSupabaseMock, makeBuilder } from "../../../../../test/helpers/supabaseMock";
 *
 *   const supabaseMock = createSupabaseMock();
 *   vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));
 *
 *   // di tiap test:
 *   supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [...], error: null }));
 *   const result = await fetchFoo();
 *   expect(supabaseMock.from).toHaveBeenCalledWith("foo");
 */
import { vi } from "vitest";

const CHAIN_METHODS = [
  "select", "insert", "update", "upsert", "delete",
  "eq", "neq", "is", "in", "order", "limit", "gte", "lte", "gt", "lt",
  "like", "ilike", "not", "or", "range", "match", "contains", "filter",
];

/**
 * Builder chainable yang meniru `PostgrestFilterBuilder` supabase-js v2.
 * Bisa langsung di-`await` (thenable) ATAU diakhiri `.single()`/
 * `.maybeSingle()`/`.throwOnError()` — sama seperti pola asli di api.js.
 */
export function makeBuilder(result = { data: null, error: null }) {
  const builder = {};
  CHAIN_METHODS.forEach((m) => {
    builder[m] = vi.fn(() => builder);
  });
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.throwOnError = vi.fn(() => {
    if (result.error) {
      return { ...builder, then: (res, rej) => Promise.reject(result.error).then(res, rej) };
    }
    return builder;
  });
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  builder.catch = (reject) => Promise.resolve(result).catch(reject);
  builder.finally = (cb) => Promise.resolve(result).finally(cb);
  return builder;
}

/** Mock untuk `supabase.channel(name)` (Realtime). */
export function makeChannel() {
  const channel = {};
  channel.on = vi.fn(() => channel);
  channel.subscribe = vi.fn(() => channel);
  channel.unsubscribe = vi.fn();
  return channel;
}

/** Bikin objek `supabase` mock lengkap (from/auth/channel/rpc/storage). */
export function createSupabaseMock() {
  return {
    from: vi.fn(() => makeBuilder()),
    channel: vi.fn(() => makeChannel()),
    removeChannel: vi.fn(),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  };
}

/** Reset semua mock fn di objek supabase mock — panggil di `beforeEach`. */
export function resetSupabaseMock(supabaseMock) {
  supabaseMock.from.mockReset().mockImplementation(() => makeBuilder());
  supabaseMock.channel.mockReset().mockImplementation(() => makeChannel());
  supabaseMock.removeChannel.mockReset();
  supabaseMock.rpc.mockReset().mockImplementation(() => Promise.resolve({ data: null, error: null }));
  Object.values(supabaseMock.auth).forEach((fn) => fn.mockReset?.());
  supabaseMock.functions.invoke
    .mockReset()
    .mockImplementation(() => Promise.resolve({ data: null, error: null }));
}
