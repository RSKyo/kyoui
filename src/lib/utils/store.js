import { create } from "zustand";
import { persist } from "zustand/middleware";
import { log } from "./logger";

const filterEntries = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(k, v)));

const update = (obj, get, set) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;

  const updated = filterEntries(
    obj,
    (key, value) => !Object.is(value, get().data[key])
  );

  if (Object.keys(updated).length > 0)
    set((state) => {
      const merged = { ...state.data, ...updated };
      return { data: merged };
    });
};

const has = (key, get) => Object.prototype.hasOwnProperty.call(get().data, key);

const remove = (key, get, set) => {
  if (!has(key, get)) return;

  set((state) => {
    const updated = { ...state.data };
    delete updated[key];
    return { data: updated };
  });
};

const clear = (get, set) => {
  if (Object.keys(get().data).length > 0) {
    set({ data: {} });
  }
};

const createState =
  (initial = {}) =>
  (set, get) => ({
    data: { ...initial },
    has: (key) => has(key, get),
    set: (newData) => update(newData, get, set),
    remove: (key) => remove(key, get, set),
    clear: () => clear(get, set),
  });

const createPersistOptions = (name) => ({
  name,
  partialize: (state) => {
    const filtered = filterEntries(
      state.data,
      (key) => !key.startsWith("_temp_")
    );
    return { data: filtered };
  },
});

const storeMap = new Map();

export const registerStore = (
  key,
  { initial = {}, isPersist = false, hydrate = false } = {}
) => {
  if (storeMap.has(key)) return storeMap.get(key);

  const persistKey = `ZUSTAND_${key.toUpperCase()}_DATA`;
  const store = isPersist
    ? create(persist(createState(initial), createPersistOptions(persistKey)))
    : create(createState(initial));

  if (hydrate) {
    queueMicrotask(() => {
      const persistValue = localStorage.getItem(persistKey);
      try {
        const parsed = JSON.parse(persistValue);
        const restored = parsed?.state?.data;
        if (restored) store().set(restored);
      } catch (e) {
        log.warn("Failed to restore persisted data:", e);
      }
    });
  }

  storeMap.set(key, store);
  return store;
};

export const getStore = (key) => {
  if (!storeMap.has(key))
    log.warn(
      `Store "${key}" has not been registered.`,
      new Error().stack.split("\n").slice(1, 2).join().trim()
    );

  return storeMap.get(key);
};

export const clearStores = () => {
  storeMap.clear();

  // 同时清除 localStorage 中的持久化数据
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("ZUSTAND_")) {
      localStorage.removeItem(key);
    }
  });
};
