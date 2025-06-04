// 安全除法函数，避免除数为 0 导致 NaN 或 Infinity
function safeDiv(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

// 计算三次 Bézier 曲线在 t 时刻对应的点
export function getBezierPoint(P0, P1, P2, P3, t) {
  const x =
    (1 - t) * (1 - t) * (1 - t) * P0.x +
    3 * (1 - t) * (1 - t) * t * P1.x +
    3 * (1 - t) * t * t * P2.x +
    t * t * t * P3.x;

  const y =
    (1 - t) * (1 - t) * (1 - t) * P0.y +
    3 * (1 - t) * (1 - t) * t * P1.y +
    3 * (1 - t) * t * t * P2.y +
    t * t * t * P3.y;

  return { x, y };
}

// 生成 Bézier 曲线上的离散点数组
// 每个点包含：绝对坐标、相对坐标、归一比例、时间和值（支持扰动）
export function getBezierPoints(P0, P1, P2, P3, segments, options = {}) {
  const {
    valueMax = 50,         // 值最大值上限
    valueJitter = 0.3,     // 值扰动比例
    intervalMs = 100,      // 每段时间间隔（ms）
    intervalJitter = 0.2,  // 时间扰动比例
    ratioMode = 'endpoints', // 比例计算方式：'endpoints' 或 'bounds'
  } = options;

  const points = [];

  // 采样 Bézier 曲线
  for (let i = 0; i < segments; i++) {
    const t = segments > 1 ? i / (segments - 1) : 0;
    const { x, y } = getBezierPoint(P0, P1, P2, P3, t);

    const relX = x - P0.x;
    const relY = P0.y - y; // 以 P0 为中心，上为正，下为负

    points.push({ progress: t, x, y, relX, relY });
  }

  // 准备比例计算所需数据
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const maxRange = Math.max(maxX - minX, maxY - minY); // 用于 bounds 模式
  const dx = P3.x - P0.x; // 用于 endpoints 模式

  // 计算归一化比例（保持方向性）
  for (const p of points) {
    if (ratioMode === 'bounds') {
      p.ratioX = safeDiv(p.relX, maxRange);
      p.ratioY = safeDiv(p.relY, maxRange);
    } else {
      p.ratioX = safeDiv(p.relX, dx);
      p.ratioY = safeDiv(p.relY, dx);
    }
  }

  // 计算 relY 的最大绝对值，用于 value 归一化
  const maxAbsRelY = Math.max(...points.map(p => Math.abs(p.relY))) || 1;

  // 添加时间与值字段，支持扰动
  for (let i = 0; i < segments; i++) {
    const point = points[i];

    const baseTime = i * intervalMs;
    const timeJitter = intervalMs * intervalJitter * (Math.random() * 2 - 1);

    const baseValue = (Math.abs(point.relY) / maxAbsRelY) * valueMax;
    const valueJitterOffset = baseValue * valueJitter * (Math.random() * 2 - 1);

    point.time = Math.max(0, Math.round(baseTime + timeJitter));
    point.value = Math.max(0, Math.min(valueMax, Math.round(baseValue + valueJitterOffset)));
  }

  return points;
}

// 支持多段 Bézier 曲线拼接采样（避免重复首尾点）
export function getMultiBezierPoints(bezierSegments, segmentsPerCurve, options = {}) {
  const allPoints = [];
  let offsetTime = 0;

  for (let i = 0; i < bezierSegments.length; i++) {
    const [P0, P1, P2, P3] = bezierSegments[i];
    const segmentCount = i === 0 ? segmentsPerCurve : segmentsPerCurve + 1; // 后续段多一个点，方便去重
    const segmentPoints = getBezierPoints(P0, P1, P2, P3, segmentCount, options);

    // 去重起点：除了第一段，其它段去掉第一个点（即前一段终点）
    const usablePoints = i === 0 ? segmentPoints : segmentPoints.slice(1);

    // 时间递增叠加（防止所有段 time 重叠）
    for (const p of usablePoints) {
      p.time += offsetTime;
    }

    offsetTime = usablePoints.at(-1)?.time ?? offsetTime;
    allPoints.push(...usablePoints);
  }

  return allPoints;
}

// 接收多个归一化 Bézier 段控制点数组，统一映射到 Canvas 坐标系
export function mapPointsToCanvas(bezierSegments, canvasWidth, canvasHeight) {
  const allPoints = bezierSegments.flat();

  const marginRatio = 0.1;
  const marginX = canvasWidth * marginRatio;
  const marginY = canvasHeight * marginRatio;
  const drawWidth = canvasWidth - 2 * marginX;
  const drawHeight = canvasHeight - 2 * marginY;

  const xs = allPoints.map(p => p.x);
  const ys = allPoints.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scaleX = drawWidth / rangeX;
  const scaleY = drawHeight / rangeY;
  const scale = Math.min(scaleX, scaleY);

  return bezierSegments.map(segment =>
    segment.map(p => ({
      x: marginX + (p.x - minX) * scale,
      y: canvasHeight - marginY - (p.y - minY) * scale,
    }))
  );
}


// 更新首尾相连 Bézier 曲线中某个点的坐标，并自动调整相邻控制点
export function updateLinkedBezierPoint(segments, segmentIndex, pointIndex, newPos) {
  const updated = structuredClone(segments); // 深拷贝
  const current = updated[segmentIndex];
  const [P0, P1, P2, P3] = current;

  // 更新当前段中的指定点
  current[pointIndex] = { ...current[pointIndex], ...newPos };

  // === 共用锚点变更时，调整相邻控制点使其保持一线 ===
  if (pointIndex === 0 && segmentIndex > 0) {
    // P0 是当前段起点，也是前一段终点
    const prev = updated[segmentIndex - 1];
    prev[3] = { ...newPos }; // 同步 P3
    // 调整 P2 - [P3==P0] - P1 成一直线
    const p2 = prev[2];
    const mirroredP1 = mirrorPoint(p2, newPos);
    current[1] = mirroredP1;
  }

  if (pointIndex === 3 && segmentIndex < updated.length - 1) {
    // P3 是当前段终点，也是下一段起点
    const next = updated[segmentIndex + 1];
    next[0] = { ...newPos }; // 同步 P0
    // 调整 P2 - [P3==P0] - P1 成一直线
    const p1 = next[1];
    const mirroredP2 = mirrorPoint(p1, newPos);
    current[2] = mirroredP2;
  }

  // === 控制点镜像 ===
  if (pointIndex === 2 && segmentIndex < updated.length - 1) {
    const anchor = current[3];
    updated[segmentIndex + 1][1] = mirrorPoint(newPos, anchor);
  }

  if (pointIndex === 1 && segmentIndex > 0) {
    const anchor = current[0];
    updated[segmentIndex - 1][2] = mirrorPoint(newPos, anchor);
  }

  return updated;
}

// 计算以 anchor 为中心对称的点
function mirrorPoint(p, anchor) {
  return {
    x: anchor.x * 2 - p.x,
    y: anchor.y * 2 - p.y,
  };
}





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
