import { config } from "@/app/lib/config";
import { flattenArray, roundFixed, applyJitter, safeDiv } from "@/app/lib/utils/common";
import {
  getSegments,
  evaluateBezierPoint,
  getSegmentFlags,
} from "@/app/lib/bezier/core";

// 构建每段的采样偏移量、数量、连接信息等元数据
function _buildSamplingMeta(segs, samples) {
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
function _sampleBezier(p0, p1, p2, p3, samples, options = {}) {
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

export function sampleBezierPoints(beziers, samples, { axis } = {}) {
  const segs = getSegments(beziers);
  const origin = { ...segs[0][0] };
  const { meta, totalSamples } = _buildSamplingMeta(segs, samples);
  let maxAxisAbs = 0;

  const points = segs.map((seg, i) => {
    const [p0, p1, p2, p3] = seg;
    const { offset, samples: segSamples, dedupe } = meta[i];

    const segPoints = _sampleBezier(p0, p1, p2, p3, segSamples, {
      origin,
      offset,
      dedupe,
      totalSamples,
    });

    if (axis) {
      for (const p of segPoints) {
        const val = Math.abs(p[axis]);
        if (val > maxAxisAbs) maxAxisAbs = val;
      }
    }

    return segPoints;
  });

  const flatPoints = [...flattenArray(points)];
  return axis ? { points:flatPoints, maxAxisAbs } : flatPoints;
}

export function sampleBezierTimedValues(beziers, samples, options = {}) {
  const {
    minValue = 1,
    maxValue = 50,
    valueJitterRatio = 0.3,
    interval = 100,
    intervalJitterRatio = 0.2,
    axis = config.constants.AXIS.DY,
    includeXY = false,
    includeDXY = false,
  } = options;

  const { points, maxAxisAbs } = sampleBezierPoints(beziers, samples, { axis });

  return points.map((p, i) => {
    const valueBase =
      minValue + (maxValue - minValue) * safeDiv(p[axis], maxAxisAbs);
    const jitteredValue = applyJitter(valueBase, valueJitterRatio);
    const value = Math.max(minValue, Math.round(jitteredValue));

    const timeBase = i * interval;
    const jitteredTime = applyJitter(timeBase, intervalJitterRatio, interval);
    const time = Math.max(0, Math.round(jitteredTime));

    const xy = includeXY ? { x: p.x, y: p.y } : {};
    const dxy = includeDXY ? { dx: p.dx, dy: p.dy } : {};

    return { progress: p.progress, time, value, ...xy, ...dxy };
  });
}
