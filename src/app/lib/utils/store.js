import { create } from "zustand";
import { jsonEqual } from "@/app/lib/utils/common";

export const useGlobalMap = create((set, get) => ({
  globalMap: {},

  getGlobalMap: (key) => get().globalMap[key],
  setGlobalMap: (key, value) => {
    const oldValue = get().globalMap[key];
    if (!jsonEqual(oldValue, value)) {
      set((state) => ({
        globalMap: {
          ...state.globalMap,
          [key]: value,
        },
      }));
    }
  },
  removeGlobalMap: (key) => {
    set((state) => {
      const updated = { ...state.globalMap };
      delete updated[key];
      return { globalMap: updated };
    });
  },
  clearGlobalMap: () => set({ globalMap: {} }),
}));
