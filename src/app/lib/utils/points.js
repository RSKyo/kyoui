

import { config } from "@/app/lib/config";
import { mapNested } from "@/app/lib/utils/common";

// 判断是否为分段结构（二维点数组）
export function isSegmented(points) {
  return Array.isArray(points[0]);
}

// 标准化为二维结构，统一处理格式
export function getSegments(points) {
  return isSegmented(points) ? points : [points];
}

// 判断两个点是否近似相等（坐标差值小于容差）
export function isSamePoint(a, b, options = {}) {
  const { tolerance = config.TOLERANCE ?? 0.01, euclidean = false } = options;

  return euclidean
    ? Math.hypot(a.x - b.x, a.y - b.y) < tolerance
    : Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}

// 获取一个点相对于 anchor 的镜像点（保持原属性）
export function mirrorPoint(point, anchor) {
  return {
    ...point,
    x: anchor.x * 2 - point.x,
    y: anchor.y * 2 - point.y,
  };
}

// 深度克隆
export function deepClone(points) {
  return mapNested(points, (p) => ({ ...p }));
}

export function locateHitPoint(points, x, y, options = {}) {
  const { hitRadius = config.HIT_RADIUS ?? 10 } = options;
  const target = { x, y };
  const opts = { tolerance: hitRadius, euclidean: true };
  const segs = getSegments(points);

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    for (let j = 0; j < seg.length; j++) {
      const p = seg[j];
      if (isSamePoint(p, target, opts)) {
        return { segmentIndex: i, pointIndex: j };
      }
    }
  }

  return null;
}


