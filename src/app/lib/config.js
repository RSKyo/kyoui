export const config = {
  DEBUG:true,
  FIXED: true,
  DEFAULT_DECIMALS: 3,
  HIT_RADIUS: 10,
  PADDING_RATIO: 0.05,
  TOLERANCE: 0.01, // 0.01 UI 坐标对比；0.001~0.005 动画路径连接（如贝塞尔）；

  DEBOUNCE_DELAY: 300, // 防抖延迟时间（毫秒）
  THROTTLE_INTERVAL: 100, // 截流最小触发间隔（毫秒）

  constants: {
    AXIS: {
      DY: "dy",
      DX: "dx",
    },
  },
};
