// 安全除法函数，避免除数为 0 导致 NaN 或 Infinity
function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

// 计算对称点
function mirrorPoint(p, anchor) {
  return {
    x: anchor.x * 2 - p.x,
    y: anchor.y * 2 - p.y,
  };
}

function getPointsBounds(points) {
  const flatPoints = points.flat();
  const allX = flatPoints.map((p) => p.x);
  const allY = flatPoints.map((p) => p.y);

  const isSegmented = Array.isArray(points[0]);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const minRange = Math.max(rangeX, rangeY) || 1;
  const maxRange = Math.max(rangeX, rangeY) || 1;

  return {
    isSegmented,
    minX,
    maxX,
    minY,
    maxY,
    rangeX,
    rangeY,
    minRange,
    maxRange,
  };
}

function getCanvasScaleFromBounds(
  width,
  height,
  bounds,
  { marginRatio = 0 } = {}
) {
  const { rangeX, rangeY } = bounds;
  const scaleX = (width * (1 - 2 * marginRatio)) / rangeX;
  const scaleY = (height * (1 - 2 * marginRatio)) / rangeY;
  const minScale = Math.min(scaleX, scaleY);
  const maxScale = Math.max(scaleX, scaleY);
  const marginX = width * marginRatio;
  const marginY = height * marginRatio;

  return {
    scaleX,
    scaleY,
    minScale,
    maxScale,
    marginX,
    marginY,
  };
}

// 计算三次 Bézier 曲线在 t 时刻对应的点
function evaluateBezier(P0, P1, P2, P3, t) {
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
function sampleSingleBezier(P0, P1, P2, P3, samples, options = {}) {
  const { origin = P0, gIdx = 0, gCount = samples } = options;
  const dedupe = gIdx > 0;
  const totalSamples = dedupe ? samples + 1 : samples;

  const points = [];
  let [minX, maxX, maxAbsRelX, minY, maxY, maxAbsRelY] = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < totalSamples; i++) {
    if (dedupe && i === 0) continue;
    // progress
    const localIndex = gIdx + dedupe ? i - 1 : i;
    const progress = safeDiv(localIndex, gCount - 1);
    // x, y
    const t = safeDiv(i, totalSamples - 1);
    const { x, y } = evaluateBezier(P0, P1, P2, P3, t, { origin });
    // relX, relY
    const relX = x - origin.x;
    const relY = origin.y - y;

    // minY, maxY, maxAbsRelY
    minX = x < minX ? x : minX;
    maxX = y > maxX ? x : maxX;
    maxAbsRelX = Math.abs(relX) > maxAbsRelX ? Math.abs(relX) : maxAbsRelX;
    minY = y < minY ? y : minY;
    maxY = y > maxY ? y : maxY;
    maxAbsRelY = Math.abs(relY) > maxAbsRelY ? Math.abs(relY) : maxAbsRelY;

    points.push({ progress, x, y, relX, relY });
  }

  const rangeY = maxY - minY;
  return points.map((p) => {
    const normX = safeDiv(p.x - minX, rangeX);
    const relNormX = safeDiv(p.relX, maxAbsRelX);
    const normY = safeDiv(p.y - minY, rangeY);
    const relNormY = safeDiv(p.relY, maxAbsRelY);
    return {
      ...p,
      normX,
      relNormX,
      normY,
      relNormY,
    };
  });
}

export function normalizePoints(points) {
  const { isSegmented, minX, minY, maxRange } = getPointsBounds(points);
  const normalize = (p) => ({
    ...p,
    x: safeDiv(p.x - minX, maxRange),
    y: safeDiv(p.y - minY, maxRange),
  });

  return isSegmented
    ? points.map((segment) => segment.map(normalize))
    : points.map(normalize);
}

export function mapPointsToCanvas(
  points,
  canvasWidth,
  canvasHeight,
  marginRatio = 0.05
) {
  const bounds = getPointsBounds(points);
  const { isSegmented, minX, minY } = bounds;
  const { minScale, marginX, marginY } = getCanvasScaleFromBounds(
    canvasWidth,
    canvasHeight,
    bounds,
    { marginRatio }
  );

  const project = (p) => ({
    ...p,
    x: marginX + (p.x - minX) * minScale,
    y: marginY + (p.y - minY) * minScale,
  });

  return isSegmented
    ? points.map((segment) => segment.map(project))
    : points.map(project);
}

export function sampleBezierPoints(
  beziers,
  samples,
  { defaultSegmentSamples = 10 } = {}
) {
  const isMulti = Array.isArray(beziers[0][0]);
  const segments = isMulti ? beziers : [beziers];
  const origin = segments[0][0];

  const isNumber = typeof samples === "number";
  const samplesArray = segments.map((_, i) =>
    isNumber ? samples : samples[i] ?? defaultSegmentSamples
  );
  const gCount = samplesArray.reduce((sum, s) => sum + s, 0);

  return segments.flatMap((seg, i) => {
    const [P0, P1, P2, P3] = seg;
    const segmentSamples = samplesArray[i];
    const dedupe = i !== 0;
    const gIdx = samplesArray.slice(0, i).reduce((sum, s) => sum + s, 0);
    return sampleSingleBezier(P0, P1, P2, P3, segmentSamples, {
      origin,
      dedupe,
      gIdx,
      gCount,
    });
  });
}

function getTimedValuesFromSampledBezierPoints(points, options = {}) {
  const {
    valueMin = 1,
    valueMax = 50,
    valueJitter = 0.3,
    intervalMs = 100,
    intervalJitter = 0.2,
    normMode = "relNormY", // normX, relNormX, normY, relNormY
  } = options;

  return points.map((p, i) => {
    const baseTime = i * intervalMs;
    const jitterTime = intervalMs * intervalJitter * (Math.random() * 2 - 1);
    const time = Math.max(0, Math.round(baseTime + jitterTime));

    let norm;
    switch (normMode) {
      case "normX":
        norm = p.normX;
        break;
      case "relNormX":
        norm = p.relNormX;
        break;
      case "normY":
        norm = p.normY;
        break;
      case "relNormY":
      default:
        norm = p.relNormY;
        break;
    }
    const baseValue = norm * (valueMax - valueMin) + valueMin;
    const jitterValue = baseValue * valueJitter * (Math.random() * 2 - 1);
    const value = Math.max(valueMin, Math.round(baseValue + jitterValue));

    return { progress: p.progress, time, value };
  });
}

export function sampleBezierTimedValues(beziers, segments, options = {}) {
  const points = sampleBezierPoints(beziers, segments, options);
  return getTimedValuesFromSampledBezierPoints(points, options);
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
