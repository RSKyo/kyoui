function safeDiv(a, b, fixed = 3) {
  return b === 0 ? 0 : +(a / b).toFixed(fixed);
}

function mirrorPoint(p, anchor) {
  return {
    x: anchor.x * 2 - p.x,
    y: anchor.y * 2 - p.y,
  };
}

function evaluateBezier(p0, p1, p2, p3, t, fixed = 3) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = +(
    uuu * p0.x +
    3 * uu * t * p1.x +
    3 * u * tt * p2.x +
    ttt * p3.x
  ).toFixed(fixed);

  const y = +(
    uuu * p0.y +
    3 * uu * t * p1.y +
    3 * u * tt * p2.y +
    ttt * p3.y
  ).toFixed(fixed);

  return { x, y };
}

function sampleBezier(p0, p1, p2, p3, count, options = {}) {
  const { origin = p0, offset = 0, total = count, fixed = 3 } = options;
  const skip = offset > 0 ? 1 : 0;
  const denom = count - 1;
  const totalDenom = total - 1;

  return Array.from({ length: count - skip }, (_, i) => {
    const t = safeDiv(i + skip, denom);
    const progress = safeDiv(offset + i, totalDenom);
    const { x, y } = evaluateBezier(p0, p1, p2, p3, t, fixed);
    const dx = x - origin.x;
    const dy = origin.y - y;

    return { progress, x, y, dx, dy };
  });
}

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
    return sampleBezier(P0, P1, P2, P3, count, {
      origin,
      offset,
      total,
    });
  });
}

export function sampleBezierTimedValues(beziers, segments, options = {}) {
  const {
    minValue = 1,
    maxValue = 50,
    valueJitterRatio = 0.3,
    interval = 100,
    intervalJitterRatio = 0.2,
    direct = "y",
    defaultSegmentSamples = 10,
    fixed = 3,
  } = options;

  const points = sampleBezierPoints(beziers, segments, {
    defaultSegmentSamples,
  });

  const key = direct === "y" ? "dy" : "dx";
  const max = Math.max(...points.map((p) => Math.abs(p[key])));
  const randJitter = (r) => r * (Math.random() * 2 - 1);
  const dv = maxValue - minValue;

  return points.map((p, i) => {
    const valueBase = minValue + dv * safeDiv(p[key], max, fixed);
    const jitteredValue = valueBase * (1 + randJitter(valueJitterRatio));
    const value = Math.max(minValue, Math.round(jitteredValue));

    const timeBase = i * interval;
    const jitteredTime = timeBase + interval * randJitter(intervalJitterRatio);
    const time = Math.max(0, Math.round(jitteredTime));

    return { progress: p.progress, time, value };
  });
}

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
