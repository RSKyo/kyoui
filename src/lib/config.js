export const config = {
  DEBUG:true,
  FIXED_DIGITS: 3,

  DEFAULT_DECIMALS: 3,
  HIT_RADIUS: 10,
  PADDING_RATIO: 0.05,

  DEBOUNCE_DELAY: 300, // 防抖延迟时间（毫秒）
  THROTTLE_INTERVAL: 100, // 截流最小触发间隔（毫秒）

  ZUSTAND_PERSIST_STORE_KEY: "ZUSTAND_PERSIST_DATA",

  constants: {
    AXIS: {
      DY: "dy",
      DX: "dx",
    },
  },
};
