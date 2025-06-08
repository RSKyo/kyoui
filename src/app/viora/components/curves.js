
/**
 * 生成周期正弦波或余弦波的采样数据。
 *
 * @param {number} cycles - 完整周期数（例如 0.5 表示半个周期，2 表示两个周期）
 * @param {number} points - 采样点数量（将 [0,1] 等分为多少段）
 * @param {string} type - 波形类型：'sin' 或 'cos'
 * @param {number} amplitude - 振幅（输出 y 的最大值绝对值）
 * @param {number} offset - 垂直偏移量（用于调整基线）
 * @returns {Array<{progress: number, x: number, y: number}>} - 采样点数组
 *   - progress: 归一化进度（从 0 到 1）
 *   - x: 输入值（弧度，用于绘图时的横坐标）
 *   - y: 输出值（振幅值，y = amplitude × wave + offset）
 */
export function generateWaveData(
  cycles = 0.5,
  points = 100,
  type = "sin",
  amplitude = 1,
  offset = 0
) {
  // 如果不是支持的类型，提前返回空数组
  if (!["sin", "cos"].includes(type)) return [];

  const data = [];
  const oneCycle = Math.PI * 2;

  // 内置波形函数（标准化为 y ∈ [-1, 1]）
  const builtinFuncs = {
    sin: (progress) => Math.sin(oneCycle * cycles * progress),
    cos: (progress) => Math.cos(oneCycle * cycles * progress),
  };

  // 校验类型
  const func = builtinFuncs[type];
  if (!func) {
    console.warn(
      `Unsupported easing type: "${type}". Supported types: ${Object.keys(
        builtinFuncs
      ).join(", ")}`
    );
    return [];
  }

  // 遍历采样点，生成数据
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1); // 归一化进度 ∈ [0, 1]
    const x = oneCycle * cycles * progress; // 弧度值，适用于绘图时的 x 坐标
    const raw = builtinFuncs[type](progress); // 原始波形输出 ∈ [-1, 1]
    const y = amplitude * raw + offset; // 应用振幅与偏移，生成最终 y 值

    data.push({ progress, x, y });
  }

  return data;
}

/**
 * 生成缓动（easing）函数的采样数据。
 *
 * @param {number} points - 采样点数量（通常为 100）
 * @param {string|function} type - 缓动类型字符串或自定义函数
 * @returns {Array<{progress: number, y: number}>} - 包含 progress 和缓动输出值 y 的数组
 */
export function generateEasingData(points = 100, type = "easeInOutSine") {
  const builtinFuncs = {
    // 缓入缓出，柔和自然（常用）
    easeInOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,

    // 缓入缓出，速度变化比 Sine 更明显
    easeInOutQuad: (p) =>
      p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2,

    // 缓入缓出（三次方）—— 开头结尾慢，中间快
    easeInOutCubic: (p) =>
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,

    // 缓入缓出（回拉感强）
    easeInOutBack: (p) => {
      const c1 = 1.70158;
      const c2 = c1 * 1.525;
      return p < 0.5
        ? (Math.pow(2 * p, 2) * ((c2 + 1) * 2 * p - c2)) / 2
        : (Math.pow(2 * p - 2, 2) * ((c2 + 1) * (p * 2 - 2) + c2) + 2) / 2;
    },

    // 缓入（三次方）—— 从静止开始加速
    easeInCubic: (p) => p * p * p,

    // 缓入（指数）—— 非常缓慢启动后迅速加速
    easeInExpo: (p) => (p === 0 ? 0 : Math.pow(2, 10 * p - 10)),

    // 缓入（略带反弹感）
    easeInBack: (p) => {
      const c1 = 1.70158;
      return p * p * ((c1 + 1) * p - c1);
    },

    // 缓出（三次方）—— 迅速启动然后缓慢停止
    easeOutCubic: (p) => 1 - Math.pow(1 - p, 3),

    // 缓出（指数）—— 快速启动后迅速减速
    easeOutExpo: (p) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)),

    // 缓出（略带反弹感）
    easeOutBack: (p) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    },
  };

  // 支持传入自定义 easing 函数
  const func = typeof type === "function" ? type : builtinFuncs[type];
  if (!func) {
    console.warn(`Unsupported easing type: "${type}".`);
    return [];
  }

  const data = [];
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const y = func(progress);
    data.push({ progress, y });
  }

  return data;
}
