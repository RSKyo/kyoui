import { flattenArray, roundFixed, applyJitter, safeDiv } from "../utils";
import { getSegments, evaluateBezierPoint, getSegmentFlags } from "./core";

// 构建每段的采样偏移量、数量、连接信息等元数据
function buildSamplingMeta(segs, samples) {
  const baseSamples = Math.floor(samples / segs.length) || 2;

  let totalSamples = 0;
  const meta = segs.map((_, i) => {
    const offset = totalSamples;
    const flags = getSegmentFlags(segs, i);
    const segSamples =
      baseSamples + (flags.isHead || flags.isLinkedToPrev ? 1 : 0);
    const dedupe = flags.isLinkedToPrev ? 1 : 0;
    totalSamples += segSamples - dedupe;

    return { offset, samples: segSamples, dedupe, flags };
  });

  return { meta, totalSamples };
}

// 对单条贝塞尔曲线进行采样，生成包含位移与归一化信息的点
function sampleBezier(p0, p1, p2, p3, samples, options = {}) {
  const { origin = p0, offset = 0, dedupe = 0, total = samples } = options;

  return Array.from({ length: samples - dedupe }, (_, i) => {
    const progress = safeDiv(offset + i, total - 1);
    const t = safeDiv(i + dedupe, samples - 1);
    const { x, y } = evaluateBezierPoint(p0, p1, p2, p3, t);
    const dx = x - origin.x;
    const dy = origin.y - y;

    return {
      progress: roundFixed(progress),
      x: roundFixed(x),
      y: roundFixed(y),
      dx: roundFixed(dx),
      dy: roundFixed(dy),
    };
  });
}

export function sampleBezierPoints(beziers, samples) {
  const segs = getSegments(beziers);
  const origin = { ...segs[0][0] };
  const { meta, totalSamples } = buildSamplingMeta(segs, samples);
  let [maxAbsDX, maxAbsDY] = [-Infinity, -Infinity];

  const points = segs.map((seg, i) => {
    const [p0, p1, p2, p3] = seg;
    const { offset, samples: segSamples, dedupe } = meta[i];

    const segPoints = sampleBezier(p0, p1, p2, p3, segSamples, {
      origin,
      offset,
      dedupe,
      totalSamples,
    });

    for (const { dx, dy } of segPoints) {
      const absDX = Math.abs(dx);
      const absDY = Math.abs(dy);
      if (absDX > maxAbsDX) maxAbsDX = absDX;
      if (absDY > maxAbsDY) maxAbsDY = absDY;
    }

    return segPoints;
  });

  const flatPoints = [...flattenArray(points)];
  return { points: flatPoints, maxAbsDX, maxAbsDY };
}

export function sampleBezierTimedValues(beziers, samples, options = {}) {
  const {
    minValue = 0,
    maxValue = 100,
    valueJitterRatio = 0,
    minTime = 0,
    maxTime = 1000,
    timeJitterRatio = 0,
  } = options;

  const { points, maxAbsDX, maxAbsDY } = sampleBezierPoints(beziers, samples);

  return points.map(({ progress, x, y, dx, dy }, i) => {
    const value = minValue + (maxValue - minValue) * safeDiv(dy, maxAbsDY);
    let jitteredValue = undefined;
    if (valueJitterRatio) {
      jitteredValue = applyJitter(value, valueJitterRatio);
      if (minValue) jitteredValue = Math.max(minValue, jitteredValue);
      jitteredValue = roundFixed(jitteredValue);
    }

    const time = minTime + (maxTime - minTime) * safeDiv(dx, maxAbsDX);
    let jitteredTime = undefined;
    if (timeJitterRatio) {
      jitteredTime = applyJitter(time, timeJitterRatio);
      if (minTime) jitteredTime = Math.max(minTime, jitteredTime);
      jitteredTime = roundFixed(jitteredTime);
    }

    return {
      progress,
      x,
      y,
      dx,
      dy,
      time: roundFixed(time),
      ...(jitteredTime ? { jitteredTime } : {}),
      value: roundFixed(value),
      ...(jitteredValue ? { jitteredValue } : {}),
    };
  });
}
