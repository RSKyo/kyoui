import { config } from "@/app/lib/config";
import {
  safeDiv,
  getSegments,
  applyJitter,
  isSamePoint,
  mirrorPoint,
} from "@/app/lib/utils";

// 计算三次贝塞尔曲线在参数 t (0~1) 下的坐标点
function evaluateCoords(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

  return { x, y };
}

function evaluateArcLength(p0, p1, p2, p3, precision = 10) {
  let length = 0;
  let prev = evaluateCoords(p0, p1, p2, p3, 0);
  for (let i = 1; i <= precision; i++) {
    const t = i / precision;
    const curr = evaluateCoords(p0, p1, p2, p3, t);
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    length += Math.sqrt(dx * dx + dy * dy);
    prev = curr;
  }
  return length;
}

// 对单条贝塞尔曲线进行采样，生成包含位移与归一化信息的点
function sampleBezier(p0, p1, p2, p3, count, options = {}) {
  const {
    origin = p0,
    offset = 0,
    total = count,
    isLinkedToPrev = false,
  } = options;
  const skip = isLinkedToPrev ? 1 : 0;
  const denom = count - 1;
  const totalDenom = total - 1;

  return Array.from({ length: count - skip }, (_, i) => {
    const t = safeDiv(i + skip, denom);
    let progress = safeDiv(offset + i, totalDenom);
    let { x, y } = evaluateCoords(p0, p1, p2, p3, t);
    let dx = x - origin.x;
    let dy = origin.y - y;

    if (config.FIXED) {
      progress = +progress.toFixed(config.DEFAULT_DECIMALS);
      x = +x.toFixed(config.DEFAULT_DECIMALS);
      y = +y.toFixed(config.DEFAULT_DECIMALS);
      dx = +dx.toFixed(config.DEFAULT_DECIMALS);
      dy = +dy.toFixed(config.DEFAULT_DECIMALS);
    }

    return {
      progress,
      x,
      y,
      dx,
      dy,
    };
  });
}

// 返回指定段曲线的连接元信息，如 isHead、isChained、isTail、isIsolated
function getBezierLinks(beziers, i) {
  const curr = beziers[i];
  const prev = beziers[i - 1];
  const next = beziers[i + 1];

  const notLinkedToPrev = !prev || !isSamePoint(curr[0], prev[3]);
  const notLinkedToNext = !next || !isSamePoint(curr[3], next[0]);

  return {
    isHead: notLinkedToPrev && !notLinkedToNext,
    isLinkedToPrev: !notLinkedToPrev,
    isTail: !notLinkedToPrev && notLinkedToNext,
    isIsolated: notLinkedToPrev && notLinkedToNext,
  };
}

// 计算采样过程中的偏移量、数量、起点等元数据
function getSamplingMeta(beziers, samples) {
  const segs = getSegments(beziers);
  const origin = { ...segs[0][0] };

  let total = 0;
  const meta = segs.map((_, i) => {
    const links = getBezierLinks(segs, i);
    const base = Math.floor(samples / segs.length) || 1;
    const extra = links.isHead || links.isLinkedToPrev ? 1 : 0;
    const count = base + extra;
    const offset = total;
    total += count - (links.isLinkedToPrev ? 1 : 0);

    return { origin, ...links, count, offset, total };
  });

  meta.forEach((m) => {
    m.total = total;
  });

  return meta;
}

/**
 * 对多段贝塞尔曲线进行采样，返回带标准化信息的点列表。
 *
 * @param {Array<Array<{x: number, y: number}>>} beziers - 贝塞尔曲线段集合，二维数组形式。
 * @param {number|number[]} samples - 每段采样点数量（可为数字或数组）。
 * @param {Object} [options]
 * @returns {Array<Object>} - 包含 progress、x/y、dx/dy 等字段的采样点列表。
 */
export function sampleBezierPoints(beziers, samples) {
  const segs = getSegments(beziers);
  const meta = getSamplingMeta(beziers, samples);

  return segs.flatMap((seg, i) => {
    const [p0, p1, p2, p3] = seg;
    return sampleBezier(p0, p1, p2, p3, meta[i].count, meta[i]);
  });
}

/**
 * 基于采样点生成带时间和值的帧序列，适用于动画。
 *
 * @param {Array<Array<{x: number, y: number}>>} beziers - 贝塞尔曲线集合。
 * @param {number|number[]} samples - 每段采样点数量。
 * @param {Object} [options]
 * @param {number} [options.minValue=1] - 最小值。
 * @param {number} [options.maxValue=50] - 最大值。
 * @param {number} [options.valueJitterRatio=0.3] - 值的抖动比例。
 * @param {number} [options.interval=100] - 每帧时间间隔（毫秒）。
 * @param {number} [options.intervalJitterRatio=0.2] - 时间抖动比例。
 * @param {string} [options.axis="dy"] - 归一化参考轴（dx 或 dy）。
 * @returns {Array<{progress: number, time: number, value: number}>} - 包含动画时间和值的点列表。
 */
export function sampleBezierTimedValues(beziers, samples, options = {}) {
  const {
    minValue = 1,
    maxValue = 50,
    valueJitterRatio = 0.3,
    interval = 100,
    intervalJitterRatio = 0.2,
    axis = config.AXIS.DY,
  } = options;

  const points = sampleBezierPoints(beziers, samples);
  const max = Math.max(...points.map((p) => Math.abs(p[axis])));
  const dv = maxValue - minValue;

  return points.map((p, i) => {
    const valueBase = minValue + dv * safeDiv(p[axis], max);
    const jitteredValue = applyJitter(valueBase, valueJitterRatio);
    const value = Math.max(minValue, Math.round(jitteredValue));

    const timeBase = i * interval;
    const jitteredTime = applyJitter(timeBase, intervalJitterRatio, interval);
    const time = Math.max(0, Math.round(jitteredTime));

    return { progress: p.progress, x: p.x, y: p.y, time, value };
  });
}

// 更新起点 P0，同时联动前段末尾控制点和当前段控制点 P1
function updatedP0(beziers, segmentIdx, x, y, dx, dy, links, set) {
  if (links.isLinkedToPrev) {
    // update curr p1
    const p1 = beziers[segmentIdx][1];
    const newP1 = {
      ...p1,
      x: p1.x + dx,
      y: p1.y + dy,
    };
    set(segmentIdx, 1, newP1);

    // update prev p2/p3
    const prevIdx = segmentIdx - 1;
    const p2 = beziers[prevIdx][2];
    const p3 = beziers[prevIdx][3];
    const newP2 = {
      ...p2,
      ...mirrorPoint(newP1, { x, y }),
    };
    const newP3 = {
      ...p3,
      x,
      y,
    };
    set(prevIdx, 2, newP2);
    set(prevIdx, 3, newP3);
  }
}

// 更新控制点 P1，同时联动前段控制点 P2 的镜像
function updatedP1(beziers, segmentIdx, x, y, dx, dy, links, set) {
  // update prev p2
  if (links.isLinkedToPrev) {
    const p0 = beziers[segmentIdx][0];
    const prevIdx = segmentIdx - 1;
    const p2 = beziers[prevIdx][2];
    const newP2 = {
      ...p2,
      ...mirrorPoint({ x, y }, p0),
    };
    set(prevIdx, 2, newP2);
  }
}

// 更新控制点 P2，同时联动后段控制点 P1 的镜像
function updatedP2(beziers, segmentIdx, x, y, dx, dy, links, set) {
  // update next p1
  if ((links.isHead || links.isLinkedToPrev) && !links.isTail) {
    const p3 = beziers[segmentIdx][3];
    const nextIdx = segmentIdx + 1;
    const p1 = beziers[nextIdx][1];
    const newP1 = {
      ...p1,
      ...mirrorPoint({ x, y }, p3),
    };
    set(nextIdx, 1, newP1);
  }
}

// 更新终点 P3，同时联动后段起点 P0 和控制点 P1
function updatedP3(beziers, segmentIdx, x, y, dx, dy, links, set) {
  if ((links.isHead || links.isLinkedToPrev) && !links.isTail) {
    // update curr p2
    const p2 = beziers[segmentIdx][2];
    const newP2 = {
      ...p2,
      x: p2.x + dx,
      y: p2.y + dy,
    };
    set(segmentIdx, 2, newP2);

    // update next p0/p1
    const nextIdx = segmentIdx + 1;
    const p0 = beziers[nextIdx][0];
    const p1 = beziers[nextIdx][1];
    const newP0 = {
      ...p0,
      x,
      y,
    };
    const newP1 = {
      ...p1,
      ...mirrorPoint(newP2, { x, y }),
    };
    set(nextIdx, 0, newP0);
    set(nextIdx, 1, newP1);
  }
}

const bezierUpdaters = {
  0: updatedP0,
  1: updatedP1,
  2: updatedP2,
  3: updatedP3,
};

/**
 * 更新贝塞尔曲线中的一个控制点，同时自动联动调整相邻段的相关控制点。
 *
 * @param {Array<Array<{x: number, y: number}>>} beziers - 贝塞尔曲线段集合，二维数组形式。
 * @param {number} segmentIdx - 要更新的段索引。
 * @param {number} pointIdx - 要更新的点索引（0 表示起点，1/2 为控制点，3 为终点）。
 * @param {{x: number, y: number}} newPoint - 新的点坐标。
 * @returns {Array<Array<{x: number, y: number}>>} - 返回已更新的贝塞尔段集合。
 */
export function updateBezier(beziers, segmentIdx, pointIdx, newPoint) {
  const target = beziers[segmentIdx][pointIdx];
  const { x, y } = newPoint;

  const changes = {};
  const set = (i, j, p) => {
    (changes[i] ||= {})[j] = p;
  };
  set(segmentIdx, pointIdx, { ...target, x, y });

  const dx = x - target.x;
  const dy = y - target.y;
  const links = getBezierLinks(beziers, segmentIdx);
  bezierUpdaters[pointIdx]?.(beziers, segmentIdx, x, y, dx, dy, links, set);

  if (!changes) return beziers;

  return getSegments(beziers).map((seg, i) => {
    return changes[i] ? seg.map((p, j) => changes[i][j] || p) : seg;
  });
}
