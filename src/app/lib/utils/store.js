import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useGlobalMap = create(
  persist(
    (set, get) => ({
      globalMap: {},

      setGlobalMap: (key, value) => {
        const oldValue = get().globalMap[key];
        if (!Object.is(oldValue, value)) {
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
    }),
    {
      name: "globalMap-storage", // localStorage key
      partialize: (state) => ({ globalMap: state.globalMap }), // 可选，只存 globalMap
    }
  )
);
