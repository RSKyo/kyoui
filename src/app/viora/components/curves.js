// 安全除法函数，避免除数为 0 导致 NaN 或 Infinity
function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

// 根据任意点数组 或 分段 Bézier 控制点数组，返回全局坐标范围信息（用于归一化）
// 支持：
// - 普通点数组：[p0, p1, p2, ...]
// - Bézier 段控制点数组：[[p0, p1, p2, p3], [p3, p4, p5, p6], ...]
export function getPointsBounds(points) {
  const flatPoints = points.flat();
  const allX = flatPoints.map((p) => p.x);
  const allY = flatPoints.map((p) => p.y);

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const maxRange = Math.max(maxX - minX, maxY - minY) || 1;
  const dx = flatPoints.at(-1).x - flatPoints[0].x || 1;

  return { minX, maxX, minY, maxY, maxRange, dx };
}

// 根据任意点数组 或 分段 Bézier 控制点数组、模式，进行归一化，返回 [0,1] 坐标值
// 支持：
// - 普通点数组：[p0, p1, p2, ...]
// - Bézier 段控制点数组：[[p0, p1, p2, p3], [p3, p4, p5, p6], ...]
// mode 可选值：
// - 'bounds'：以整体范围 max(maxX - minX, maxY - minY) 缩放（保持长宽比）
// - 'endpoints'：以首尾点水平距离缩放（适合时间轴类横向场景）
export function getPointsNormalized(points, options = {}) {
  const flatPoints = points.flat();
  if (flatPoints.length < 2) return [];

  const { mode = "bounds", bounds = null } = options;
  const { minX, minY, maxRange, dx } = bounds || getPointsBounds(points);

  return points.map((p) => ({
    x:
      mode === "bounds"
        ? safeDiv(p.x - minX, maxRange)
        : safeDiv(p.x - flatPoints[0].x, dx),
    y:
      mode === "bounds"
        ? safeDiv(p.y - minY, maxRange)
        : safeDiv(flatPoints[0].y - p.y, dx),
  }));
}

// 计算三次 Bézier 曲线在 t 时刻对应的点
export function getBezierPoint(P0, P1, P2, P3, t) {
  const x =
    (1 - t) ** 3 * P0.x +
    3 * (1 - t) ** 2 * t * P1.x +
    3 * (1 - t) * t ** 2 * P2.x +
    t ** 3 * P3.x;

  const y =
    (1 - t) ** 3 * P0.y +
    3 * (1 - t) ** 2 * t * P1.y +
    3 * (1 - t) * t ** 2 * P2.y +
    t ** 3 * P3.y;

  return { x, y };
}

// 生成单段 Bézier 曲线的采样点
// - P0, P1, P2, P3: Bézier 曲线的四个控制点
// - samples: 采样点数量（除非 dedupe=true，否则将生成该数量的点）
// - options: 用于多段拼接
//   - origin: 用于计算 relX 和 relY 的原点（默认使用 P0）
//   - dedupe: 是否跳过第一个采样点（通常用于多段拼接时避免重复连接点）
//   - gIdx: 当前段的全局起始采样索引，用于 progress 归一化
//   - gCount: 全部段落的总采样数，用于归一化 progress
export function getBezierPoints(
  P0,
  P1,
  P2,
  P3,
  samples,
  { origin = P0, dedupe = false, gIdx = 0, gCount = samples } = {}
) {
  const points = [];
  samples = dedupe ? samples + 1 : samples;
  for (let i = 0; i < samples; i++) {
    if (dedupe && i == 0) continue;
    const t = samples > 1 ? i / (samples - 1) : 0;
    const { x, y } = getBezierPoint(P0, P1, P2, P3, t);
    const relX = x - origin.x;
    const relY = origin.y - y;
    points.push({
      progress: (gIdx + (dedupe ? i - 1 : i)) / (gCount - 1),
      x,
      y,
      relX,
      relY,
    });
  }

  return points;
}

// 多段 Bézier 曲线统一采样（支持每段不同采样数）
// - beziers: 每段 Bézier 曲线的控制点数组（每项为 [P0, P1, P2, P3]）
// - samples: 每段采样数，可为统一 number，也可为数组 [5, 10, 15, ...]
// - defaultPerSamples: 若 samples 为数组且某段缺省，用此默认值补足
export function getMultiBezierPoints(
  beziers,
  samples,
  { defaultPerSamples = 10 }
) {
  const origin = beziers[0][0];
  const isNumber = typeof samples === "number";
  // 每段采样数数组：统一数量或按段分别指定
  const samplesArray = beziers.map((_, i) =>
    isNumber ? samples : samples[i] ?? defaultPerSamples
  );
  // 全局采样总数（用于 progress 归一化）
  const gCount = samplesArray.reduce((sum, segs) => sum + segs, 0);

  // 分段采样并拼接，去重连接点
  return beziers.flatMap((bezier, i) => {
    const [P0, P1, P2, P3] = bezier;
    const perSamples = samplesArray[i];
    const dedupe = i !== 0;
    const gIdx = samplesArray.slice(0, i).reduce((sum, segs) => sum + segs, 0);
    return getBezierPoints(P0, P1, P2, P3, perSamples, {
      origin,
      dedupe,
      gIdx,
      gCount,
    });
  });
}

// 将 Bézier 采样点转换为时间 + 值（支持扰动、归一化 relY 映射为 value）
function mapPointsToTimedValues(points, options = {}) {
  const {
    valueMin = 1,
    valueMax = 50,
    valueJitter = 0.3,
    intervalMs = 100,
    intervalJitter = 0.2,
  } = options;

  const maxAbsRelY = Math.max(...points.map((p) => Math.abs(p.relY))) || 1;

  return points.map((p, i) => {
    const baseTime = i * intervalMs;
    const jitterTime = intervalMs * intervalJitter * (Math.random() * 2 - 1);
    const time = Math.max(0, Math.round(baseTime + jitterTime));

    const norm = Math.abs(p.relY) / maxAbsRelY;
    const baseValue = norm * (valueMax - valueMin) + valueMin;
    const jitterValue = baseValue * valueJitter * (Math.random() * 2 - 1);
    const value = Math.max(valueMin, Math.round(baseValue + jitterValue));

    return { progress: p.progress, time, value };
  });
}

// 单段 Bézier 曲线生成时间-值点
export function generateBezierTimedValues(
  P0,
  P1,
  P2,
  P3,
  segments,
  options = {}
) {
  if (segments < 1 || !Number.isInteger(segments)) return [];
  const points = getBezierPoints(P0, P1, P2, P3, segments);
  return mapPointsToTimedValues(points, options);
}

// 多段 Bézier 曲线生成连续时间-值点
export function generateMultiBezierTimedValues(
  bezierSegments,
  segmentsPerCurve,
  options = {}
) {
  const points = getMultiBezierPoints(bezierSegments, segmentsPerCurve);
  return mapPointsToTimedValues(points, options);
}

// 接收多个归一化 Bézier 段控制点数组，统一映射到 Canvas 坐标系
export function mapPointsToCanvas(bezierSegments, canvasWidth, canvasHeight) {
  const allPoints = bezierSegments.flat();

  const marginRatio = 0.1;
  const marginX = canvasWidth * marginRatio;
  const marginY = canvasHeight * marginRatio;
  const drawWidth = canvasWidth - 2 * marginX;
  const drawHeight = canvasHeight - 2 * marginY;

  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scaleX = drawWidth / rangeX;
  const scaleY = drawHeight / rangeY;
  const scale = Math.min(scaleX, scaleY);

  return bezierSegments.map((segment) =>
    segment.map((p) => ({
      x: marginX + (p.x - minX) * scale,
      y: canvasHeight - marginY - (p.y - minY) * scale,
    }))
  );
}

// 更新首尾相连 Bézier 曲线中某个点的坐标，并自动调整相邻控制点
export function updateLinkedBezierPoint(
  beziers,
  segmentIdx,
  pointIdx,
  newPoint
) {
  // 深拷贝防止修改原数组（使用 JSON 方法替代 structuredClone 以兼容旧浏览器）
  const updated = JSON.parse(JSON.stringify(beziers));
  const current = updated[segmentIdx]; // 当前曲线段
  const dx = newPoint.x - current[pointIdx].x;
  const dy = newPoint.y - current[pointIdx].y;

  // 更新当前目标点
  current[pointIdx] = { ...newPoint };

  // 同步更新相邻控制点，保持曲线连续与平滑

  // 若更新的是 p0：
  // - 向量方向相同地移动 p1
  // - 同步更新上一段的 p3 = 当前 p0
  // - 上一段的 p2 镜像自当前 p1 关于 p0
  if (pointIdx === 0) {
    const p0 = current[pointIdx];
    const p1 = current[pointIdx + 1];
    const movedP1 = (current[pointIdx + 1] = { x: p1.x + dx, y: p1.y + dy });
    const prev = updated[segmentIdx - 1];
    if (prev) {
      prev[3] = { ...p0 };
      prev[2] = mirrorPoint(movedP1, p0);
    }
  }
  // 若更新的是 p1：
  // - 上一段的 p2 镜像自当前 p1 关于 p0
  else if (pointIdx === 1) {
    const p1 = current[pointIdx];
    const p0 = current[pointIdx - 1];
    const prev = updated[segmentIdx - 1];
    if (prev) {
      prev[2] = mirrorPoint(p1, p0);
    }
  }
  // 若更新的是 p2：
  // - 下一段的 p1 镜像自当前 p2 关于 p3
  else if (pointIdx === 2) {
    const p2 = current[pointIdx];
    const p3 = current[pointIdx + 1];
    const next = updated[segmentIdx + 1];
    if (next) {
      next[1] = mirrorPoint(p2, p3);
    }
  }
  // 若更新的是 p3：
  // - 向量方向相同地移动 p2
  // - 同步更新下一段的 p0 = 当前 p3
  // - 下一段的 p1 镜像自当前 p2 关于 p3
  else if (pointIdx === 3) {
    const p3 = current[pointIdx];
    const p2 = current[pointIdx - 1];
    const movedP2 = (current[pointIdx - 1] = { x: p2.x + dx, y: p2.y + dy });
    const next = updated[segmentIdx + 1];
    if (next) {
      next[0] = { ...p3 };
      next[1] = mirrorPoint(movedP2, p3);
    }
  }

  return updated;
}

// 计算对称点
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
