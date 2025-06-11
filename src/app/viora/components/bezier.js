// 安全除法函数，避免除数为 0 导致 NaN 或 Infinity
function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

// 计算点 p 相对于锚点 anchor 的镜像点（对称点）
function mirrorPoint(p, anchor) {
  return {
    x: anchor.x * 2 - p.x,
    y: anchor.y * 2 - p.y,
  };
}

// 计算一组点（支持嵌套）在 x/y 维度上的边界和范围信息
function getPointsBounds(points) {
  // 将所有点展平成一个数组（支持二维嵌套）
  const flatPoints = points.flat(Infinity);
  const allX = flatPoints.map((p) => p.x); // 提取所有 x 坐标
  const allY = flatPoints.map((p) => p.y); // 提取所有 y 坐标

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

// 根据 bounds 计算画布缩放比例和边距偏移
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

// 使用三次 Bézier 曲线公式计算给定 t 值对应的点
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

// 采样单段 Bézier 曲线上的多个点，并计算每个点的归一化与相对信息
function sampleSingleBezier(P0, P1, P2, P3, samples, options = {}) {
  const { origin = P0, gIdx = 0, gCount = samples } = options;
  const dedupe = gIdx > 0;
  const totalSamples = dedupe ? samples + 1 : samples;

  const points = [];
  let [minX, maxX, maxAbsRelX, minY, maxY, maxAbsRelY] = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < totalSamples; i++) {
    if (dedupe && i === 0) continue;
    const localIndex = dedupe ? i - 1 : i;
    const progress = safeDiv(gIdx + localIndex, gCount - 1);
    const t = safeDiv(i, totalSamples - 1); // 归一化当前样本在曲线中的位置
    const { x, y } = evaluateBezier(P0, P1, P2, P3, t); // 计算曲线点位置
    const relX = x - origin.x;
    const relY = origin.y - y;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    maxAbsRelX = Math.max(maxAbsRelX, Math.abs(relX));
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    maxAbsRelY = Math.max(maxAbsRelY, Math.abs(relY));

    points.push({ progress, x, y, relX, relY });
  }

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  return points.map((p) => {
    const normX = safeDiv(p.x - minX, rangeX);
    const relNormX = safeDiv(p.relX, maxAbsRelX);
    const normY = safeDiv(p.y - minY, rangeY);
    const relNormY = safeDiv(p.relY, maxAbsRelY);
    return { ...p, normX, relNormX, normY, relNormY };
  });
}

// 将曲线采样点映射为包含时间和值的序列（用于节奏控制、动画等）
function getTimedValuesFromSampledBezierPoints(points, options = {}) {
  const {
    valueMin = 1,
    valueMax = 50,
    valueJitter = 0.3,
    intervalMs = 100,
    intervalJitter = 0.2,
    normMode = "relNormY",
  } = options;

  return points.map((p, i) => {
    const baseTime = i * intervalMs;
    const jitterTime = intervalMs * intervalJitter * (Math.random() * 2 - 1);
    const time = Math.max(0, Math.round(baseTime + jitterTime));

    let norm; // 根据配置选择使用哪种归一化值
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

// 将点归一化到 0~1 空间（整体缩放）
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
  {
    marginRatio = 0.05,
    coordSystem = "canvas", // 坐标系 'canvas' 或 'math'
  } = {}
) {
  const bounds = getPointsBounds(points);
  const { isSegmented, minX, minY, maxY } = bounds;
  const { minScale, marginX, marginY } = getCanvasScaleFromBounds(
    canvasWidth,
    canvasHeight,
    bounds,
    { marginRatio }
  );

  const project = (p) => {
    const scaledX = (p.x - minX) * minScale;
    const scaledY =
      coordSystem === "canvas"
        ? (p.y - minY) * minScale // canvas 坐标系：正常
        : (maxY - p.y) * minScale; // math 坐标系：Y 反转

    const offsetX =
      marginX + (canvasWidth - 2 * marginX - bounds.rangeX * minScale) / 2;
    const offsetY =
      marginY + (canvasHeight - 2 * marginY - bounds.rangeY * minScale) / 2;

    return {
      ...p,
      x: offsetX + scaledX,
      y: offsetY + scaledY,
    };
  };

  return isSegmented
    ? points.map((segment) => segment.map(project))
    : points.map(project);
}

// 对多个 Bézier 曲线段采样，并合并点数据
export function sampleBezierPoints(
  beziers,
  samples,
  { defaultSegmentSamples = 10 } = {}
) {
  const isMulti = Array.isArray(beziers[0]);
  const segments = isMulti ? beziers : [beziers];
  const origin = segments[0][0];

  const isNumber = typeof samples === "number";
  let gCount = 0;
  const samplesArray = segments.map((_, i) => {
    const segmentSamples = isNumber
      ? samples
      : samples[i] ?? defaultSegmentSamples;
    gCount += segmentSamples;
    return segmentSamples;
  });

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

// 综合采样 Bézier 并生成时间值序列
export function sampleBezierTimedValues(beziers, segments, options = {}) {
  const points = sampleBezierPoints(beziers, segments, options);
  return getTimedValuesFromSampledBezierPoints(points, options);
}

// 更新 Bézier 段中某个点的位置，并自动调整相邻控制点，保持平滑连接
export function updateLinkedBezierPoint(
  beziers,
  segmentIdx,
  pointIdx,
  newPoint
) {
  // 创建深拷贝以避免修改原始数据
  const updated = JSON.parse(JSON.stringify(beziers));
  const current = updated[segmentIdx];

  // 计算位移差值
  const dx = newPoint.x - current[pointIdx].x;
  const dy = newPoint.y - current[pointIdx].y;

  // 应用新的坐标到目标点
  current[pointIdx] = { ...current[pointIdx], ...newPoint };

  // === 以下根据点的位置更新相关控制点 ===

  if (pointIdx === 0) {
    // 拖动的是起点 P0：连带移动控制点 P1，同步上一段的终点 P3 = P0，控制点 P2 镜像
    const p0 = current[pointIdx];
    const p1 = current[pointIdx + 1];
    const movedP1 = (current[pointIdx + 1] = {
      ...current[pointIdx + 1],
      x: p1.x + dx,
      y: p1.y + dy,
    });
    const prev = updated[segmentIdx - 1];
    if (prev) {
      prev[3] = { ...prev[3], x: p0.x, y: p0.y }; // 连接处同步
      prev[2] = { ...prev[2], ...mirrorPoint(movedP1, p0) }; // 保持控制对称性
    }
  } else if (pointIdx === 1) {
    // 拖动的是控制点 P1：更新上一段的控制点 P2 镜像
    const p1 = current[pointIdx];
    const p0 = current[pointIdx - 1];
    const prev = updated[segmentIdx - 1];
    if (prev) {
      prev[2] = { ...prev[2], ...mirrorPoint(p1, p0) };
    }
  } else if (pointIdx === 2) {
    // 拖动的是控制点 P2：更新下一段的控制点 P1 镜像
    const p2 = current[pointIdx];
    const p3 = current[pointIdx + 1];
    const next = updated[segmentIdx + 1];
    if (next) {
      next[1] = { ...next[1], ...mirrorPoint(p2, p3) };
    }
  } else if (pointIdx === 3) {
    // 拖动的是终点 P3：连带移动控制点 P2，同步下一段的起点 P0 = P3，控制点 P1 镜像
    const p3 = current[pointIdx];
    const p2 = current[pointIdx - 1];
    const movedP2 = (current[pointIdx - 1] = {
      ...current[pointIdx - 1],
      x: p2.x + dx,
      y: p2.y + dy,
    });
    const next = updated[segmentIdx + 1];
    if (next) {
      next[0] = { ...next[0], x: p3.x, y: p3.y }; // 连接处同步
      next[1] = { ...next[1], ...mirrorPoint(movedP2, p3) }; // 保持控制对称性
    }
  }

  return updated;
}

// 返回指定类型的贝塞尔曲线段（数学坐标），支持正弦、余弦和多种 easing 曲线
// 支持的类型包括：
// - "sin"：模拟正弦曲线
// - "cos"：模拟余弦曲线
// - "easeInOutSine"：缓入缓出，柔和自然
// - "easeInOutQuad"：缓入缓出，速度变化更明显
// - "easeInOutCubic"：缓入缓出（三次方）
// - "easeOutCubic"：缓出（三次方）
// - "easeInCubic"：缓入（三次方）
export function getTrigBezier(type = "sin") {
  if (type === "sin") {
    return [
      [
        { x: 0, y: 0 },
        { x: Math.PI / 3, y: 1 },
        { x: 2 * Math.PI / 3, y: 1 },
        { x: Math.PI, y: 0 },
      ],
      [
        { x: Math.PI, y: 0 },
        { x: 4 * Math.PI / 3, y: -1 },
        { x: 5 * Math.PI / 3, y: -1 },
        { x: 2 * Math.PI, y: 0 },
      ],
    ];
  }

  if (type === "cos") {
    return [
      [
        { x: 0, y: 1 },
        { x: Math.PI / 3, y: 1 },
        { x: 2 * Math.PI / 3, y: -1 },
        { x: Math.PI, y: -1 },
      ],
      [
        { x: Math.PI, y: -1 },
        { x: 4 * Math.PI / 3, y: -1 },
        { x: 5 * Math.PI / 3, y: 1 },
        { x: 2 * Math.PI, y: 1 },
      ],
    ];
  }

  const easing = {
    easeInOutSine: [
      [
        { x: 0, y: 0 },
        { x: 0.25, y: 0 },
        { x: 0.75, y: 1 },
        { x: 1, y: 1 },
      ],
    ],
    easeInOutQuad: [
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 0.5, y: 1 },
        { x: 1, y: 1 },
      ],
    ],
    easeInOutCubic: [
      [
        { x: 0, y: 0 },
        { x: 0.32, y: 0 },
        { x: 0.68, y: 1 },
        { x: 1, y: 1 },
      ],
    ],
    easeOutCubic: [
      [
        { x: 0, y: 0 },
        { x: 0.33, y: 0 },
        { x: 0.67, y: 1 },
        { x: 1, y: 1 },
      ],
    ],
    easeInCubic: [
      [
        { x: 0, y: 0 },
        { x: 0.33, y: 0 },
        { x: 0.67, y: 0 },
        { x: 1, y: 1 },
      ],
    ],
  };

  if (type in easing) return easing[type];

  throw new Error(`Unsupported type: ${type}`);
}