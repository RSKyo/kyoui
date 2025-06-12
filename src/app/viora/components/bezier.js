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
function sampleSingleBezier(
  P0,
  P1,
  P2,
  P3,
  count,
  { origin = P0, offset = 0, total = count } = {}
) {
  const skipFirst = offset > 0;
  const denom = count - 1;
  const totalDenom = total - 1;

  const list = [];
  let maxDX = 0,
    maxDY = 0;

  for (let i = skipFirst ? 1 : 0; i < count; i++) {
    const local = skipFirst ? i - 1 : i;
    const t = safeDiv(i, denom);
    const progress = safeDiv(offset + local, totalDenom);
    const { x, y } = evaluateBezier(P0, P1, P2, P3, t);
    const dx = x - origin.x;
    const dy = origin.y - y;

    maxDX = Math.max(maxDX, Math.abs(dx));
    maxDY = Math.max(maxDY, Math.abs(dy));

    list.push({ progress, x, y, dx, dy });
  }

  return list.map((p) => ({
    progress: p.progress,
    x: +p.x.toFixed(3),
    y: +p.y.toFixed(3),
    dx: +p.dx.toFixed(3),
    dy: +p.dy.toFixed(3),
    ndx: +safeDiv(p.dx, maxDX).toFixed(3),
    ndy: +safeDiv(p.dy, maxDY).toFixed(3),
  }));
}

// 将曲线采样点映射为包含时间和值的序列（用于节奏控制、动画等）
function getTimedValues(points, opt = {}) {
  const {
    valueMin = 1,
    valueMax = 50,
    valueJitter = 0.3,
    intervalMs = 100,
    intervalJitter = 0.2,
    normMode = "ndy", // default to relative normalized Y
  } = opt;

  return points.map((p, i) => {
    const baseT = i * intervalMs;
    const tJitter = intervalMs * intervalJitter * (Math.random() * 2 - 1);
    const time = Math.max(0, Math.round(baseT + tJitter));

    const norm = normMode === "ndy" ? p.ndy : p.ndx;
    const baseV = norm * (valueMax - valueMin) + valueMin;
    const vJitter = baseV * valueJitter * (Math.random() * 2 - 1);
    const value = Math.max(valueMin, Math.round(baseV + vJitter));

    return { prog: p.prog, time, value };
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
  { marginRatio = 0.05 } = {}
) {
  const bounds = getPointsBounds(points);
  const { isSegmented, minX, minY } = bounds;
  const { minScale, marginX, marginY } = getCanvasScaleFromBounds(
    canvasWidth,
    canvasHeight,
    bounds,
    { marginRatio }
  );

  const project = (p) => {
    const scaledX = (p.x - minX) * minScale;
    const scaledY = (p.y - minY) * minScale;

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
  const segs = isMulti ? beziers : [beziers];
  const origin = segs[0][0];

  const isNumber = typeof samples === "number";
  const n = segs.length;
  const counts = [];
  const offsets = [0];
  let total = 0;

  for (let i = 0; i < n; i++) {
    const base = isNumber
      ? Math.floor(samples / n)
      : samples[i] ?? defaultSegmentSamples;
    const visual = base + (n > 1 ? 1 : 0);
    const logical = base + (i === 0 && n > 1 ? 1 : 0);

    counts.push(visual);
    total += logical;
    offsets.push(total);
  }

  return segs.flatMap((seg, i) => {
    const [P0, P1, P2, P3] = seg;
    const count = counts[i];
    const offset = offsets[i];
    return sampleSingleBezier(P0, P1, P2, P3, count, {
      origin,
      offset,
      total,
    });
  });
}

// 综合采样 Bézier 并生成时间值序列
export function sampleBezierTimedValues(beziers, segments, options = {}) {
  const points = sampleBezierPoints(beziers, segments, options);
  return getTimedValues(points, options);
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

export function getBezierPreset(type = "sin") {
  if (type in mathCurves)
    return convertMathToCanvasCoords(mathCurves[type].curves);
  throw new Error(`Unsupported type: ${type}`);
}

export function convertMathToCanvasCoords(beziers) {
  const isSegmented = Array.isArray(beziers[0]);
  let maxY = -Infinity;
  let minX = Infinity;

  const points = beziers.flat(Infinity);
  for (const { x, y } of points) {
    if (y > maxY) maxY = y;
    if (x < minX) minX = x;
  }

  const project = (p) => ({
    ...p,
    x: p.x - minX,
    y: maxY - p.y,
  });

  return isSegmented
    ? beziers.map((segment) => segment.map(project))
    : beziers.map(project);
}

export const mathCurves = {
  sin: {
    curves: [
      [
        { x: 0.0, y: 0.5 },
        { x: 0.167, y: 1.0 },
        { x: 0.333, y: 1.0 },
        { x: 0.5, y: 0.5 },
      ],
      [
        { x: 0.5, y: 0.5 },
        { x: 0.667, y: 0.0 },
        { x: 0.833, y: 0.0 },
        { x: 1.0, y: 0.5 },
      ],
    ],
    label: "正弦曲线",
    type: "math",
    desc: "正弦函数，用两段贝塞尔拟合 y = sin(x)，将 x ∈ [0, 2π] 和 y ∈ [-1, 1] 比例归一化到 [0, 1]，保持波形纵横比",
  },
  cos: {
    curves: [
      [
        { x: 0.0, y: 1.0 },
        { x: 0.167, y: 1.0 },
        { x: 0.333, y: 0.0 },
        { x: 0.5, y: 0.0 },
      ],
      [
        { x: 0.5, y: 0.0 },
        { x: 0.667, y: 0.0 },
        { x: 0.833, y: 1.0 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "余弦曲线",
    type: "math",
    desc: "余弦函数，用两段贝塞尔拟合 y = cos(x)，将 x ∈ [0, 2π] 和 y ∈ [-1, 1] 比例归一化到 [0, 1]，保持波形纵横比",
  },
  easeInSine: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.47, y: 0.0 },
        { x: 0.745, y: 0.715 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓入正弦",
    type: "easing",
    desc: "缓动开始，随时间加速（正弦前四分之一周期）",
  },
  easeOutSine: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.39, y: 0.575 },
        { x: 0.565, y: 1.0 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓出正弦",
    type: "easing",
    desc: "快速开始，随时间减速（正弦后四分之一周期）",
  },
  easeInOutSine: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.445, y: 0.05 },
        { x: 0.55, y: 0.95 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓入缓出正弦",
    type: "easing",
    desc: "缓动开始与结束，中间加速（正弦半周期）",
  },
  linear: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.25, y: 0.25 },
        { x: 0.75, y: 0.75 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "线性",
    type: "easing",
    desc: "线性过渡，匀速运动",
  },
  easeInQuad: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.55, y: 0.085 },
        { x: 0.68, y: 0.53 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓入二次",
    type: "easing",
    desc: "缓动开始，渐进加速（二次方缓动）",
  },
  easeOutQuad: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.25, y: 0.46 },
        { x: 0.45, y: 0.94 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓出二次",
    type: "easing",
    desc: "快速开始，缓慢结束（二次方缓动）",
  },
  easeInOutQuad: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.455, y: 0.03 },
        { x: 0.515, y: 0.955 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓入缓出二次",
    type: "easing",
    desc: "缓动开始与结束，中间快速（二次方缓动）",
  },
  easeInCubic: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.55, y: 0.055 },
        { x: 0.675, y: 0.19 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓入三次",
    type: "easing",
    desc: "三次缓动开始，缓慢进场更自然",
  },
  easeOutCubic: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.215, y: 0.61 },
        { x: 0.355, y: 1.0 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓出三次",
    type: "easing",
    desc: "三次缓动结束，自然减速退出",
  },
  easeInOutCubic: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.645, y: 0.045 },
        { x: 0.355, y: 1.0 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "缓入缓出三次",
    type: "easing",
    desc: "三次缓动，两端平滑，中间加速",
  },
  easeOutBack: {
    curves: [
      [
        { x: 0.0, y: 0.0 },
        { x: 0.34, y: 1.56 },
        { x: 0.64, y: 1.0 },
        { x: 1.0, y: 1.0 },
      ],
    ],
    label: "回弹缓出",
    type: "easing",
    desc: "回弹效果，超出后回落到目标值",
  },
};
