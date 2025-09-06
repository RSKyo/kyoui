import { config } from "../config";
import {
  isPrimitive,
  isArray,
  isPlainObject,
  isMap,
  isSet,
  isDate,
  isRegExp,
} from "../utils/is";

// 判断两个点是否近似相等（坐标差值小于容差）
export function isSamePoint(a, b, options = {}) {
  const { tolerance = 0.01, euclidean = false } = options;

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
function clonePlain(value, seen = new WeakMap()) {
  if (isPrimitive(value)) return value;

  if (isArray(value)) return points.map((child) => clonePoints(child));
  if (isPlainObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [clonePlain(k), clonePoints(v)])
    );
  if (isMap(value)) {
    return new Map([...value].map(([k, v]) => [clonePlain(k), clonePlain(v)]));
  }
  if (isSet(value)) {
    return new Set([...value].map((v) => clonePlain(v)));
  }
  if (isDate(value)) {
    return new Date(date.getTime());
  }
  if (isRegExp(value)) {
    return new RegExp(re.source, re.flags);
  }

  return value;
}
export function clonePoints(points) {
  return clonePlain(points);
}

export function locateHitPoint(points, x, y, options = {}) {
  const { hitRadius = config.HIT_RADIUS ?? 10 } = options;
  const target = { x, y };
  const opts = { tolerance: hitRadius, euclidean: true };
  const segs = toBezierSegments(points);

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
