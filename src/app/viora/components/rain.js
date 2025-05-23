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
    easeInOutQuad: (p) => p < 0.5
      ? 2 * p * p
      : 1 - Math.pow(-2 * p + 2, 2) / 2,

    // 缓入缓出（三次方）—— 开头结尾慢，中间快
    easeInOutCubic: (p) =>
      p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2,

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
    easeInExpo: (p) => p === 0 ? 0 : Math.pow(2, 10 * p - 10),

    // 缓入（略带反弹感）
    easeInBack: (p) => {
      const c1 = 1.70158;
      return p * p * ((c1 + 1) * p - c1);
    },

    // 缓出（三次方）—— 迅速启动然后缓慢停止
    easeOutCubic: (p) => 1 - Math.pow(1 - p, 3),

    // 缓出（指数）—— 快速启动后迅速减速
    easeOutExpo: (p) => p === 1 ? 1 : 1 - Math.pow(2, -10 * p),

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

/**
 * 生成模拟雨量随时间变化的数据序列。
 * 每一个数据点包含时间戳和对应的雨量，模拟自然降雨中的强弱波动与节奏变化。
 *
 * @param {number} timelinePoints - 时间线上的雨滴事件总数（数据点数量）
 * @param {number} rainMax - 单次最大雨量（峰值）
 * @param {number} rainJitterRatio - 雨量扰动比例（如 0.3 表示最大雨量的±30%）
 * @param {number} intervalMin - 两个雨滴事件之间的最小间隔时间（毫秒）
 * @param {number} intervalMax - 最大间隔时间（毫秒）
 * @param {number} intervalJitterRatio - 间隔扰动比例（如 0.2 表示间隔时间的±20%）
 *
 * @returns {Array<{time: number, amount: number}>} 时间点组成的数组，每个点包含 time 和雨量 amount
 */
export function rainfallTimeline(
  timelinePoints = 100,
  rainMax = 50,
  rainJitterRatio = 0.3,
  intervalMin = 100,
  intervalMax = 1000,
  intervalJitterRatio = 0.2
) {
  const data = [];
  let time = 0;

  for (let i = 0; i < timelinePoints; i++) {
    const progress = i / (timelinePoints - 1);
    // const sineFactor = Math.sin(Math.pow(progress,2) * Math.PI);
    // Math.sin(progress * Math.PI)	// 快速起伏	标准正弦起伏
    // Math.sin(Math.pow(progress, 2) * Math.PI)	// 起伏更缓	更慢的启动，回落更平滑
    // let sineFactor = (1 - Math.cos(Math.PI * progress)) / 2	// 缓入缓出	平滑的波浪感
    // ease-in-out
    const x = progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
    const sineFactor = (1 - Math.cos(Math.PI * x)) / 2;

    // 基础雨量曲线：由小到大再到小（正弦）
    const baseAmount = (sineFactor < 0.1 ? 0.1 : sineFactor) * rainMax; // 0 → 1 → 0

    // 添加雨量扰动：让雨量不那么规律
    const rainJitter = (Math.random() * 2 - 1) * baseAmount * rainJitterRatio;
    let rainAmount = Math.max(0, baseAmount + rainJitter);
    // rainAmount=rainAmount<5?(Math.floor(Math.random() * 5) + 1):rainAmount;

    // 基础间隔曲线：从长到短再到长（倒正弦）
    const intervalFactor = 1 - sineFactor; // 0 → 1 → 0 的倒转
    const rainInterval =
      intervalMin + intervalFactor * (intervalMax - intervalMin);

    // 添加间隔扰动
    const intervalJitter =
      (Math.random() * 2 - 1) * rainInterval * intervalJitterRatio;
    time += Math.max(0, rainInterval + intervalJitter);

    data.push({
      progress: progress, // 进度
      sineFactor: sineFactor, // 正弦因子
      time: time, // 毫秒
      amount: rainAmount, // 雨量
    });
  }

  return data;
}

export function rainBloom(
  rainData,
  width,
  height,
  maxRadius = 10,
  radiusJitterRatio = 0.3,
  maxGrowthRatio = 1.5,
  lifeTime,
  color = "rgb(0, 0, 0)"
) {
  const randIn = (max) => Math.random() * max;
  const minRadius = 3;
  const points = [];

  rainData.forEach((d) => {
    // 基础雨点半径：由小到大再到小（正弦）
    const baseRadius = d.sineFactor * maxRadius;

    for (let i = 0; i < d.amount; i++) {
      // 添加半径扰动：让雨量不那么规律
      const radiusJitter =
        (Math.random() * 2 - 1) * baseRadius * radiusJitterRatio;
      let radius = Math.max(0, baseRadius + radiusJitter);
      radius = radius < minRadius ? minRadius : radius;
      points.push({
        x: randIn(width),
        y: randIn(height),
        createAt: d.time, // 出现时间（毫秒）
        lifeTime: lifeTime, // 生存时长（用于控制透明度或大小衰减）
        radius: radius, // 半径
        maxGrowthRatio: maxGrowthRatio, // 涟漪增长比例
        color: color, // 可选
      });
    }
  });

  return points;
}
