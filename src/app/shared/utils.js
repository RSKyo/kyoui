import { config } from "@/app/shared/config";

// 安全除法，避免除以 0，保留默认小数位数
export function safeDiv(a, b) {
  return +(b === 0 ? 0 : a / b).toFixed(config.DEFAULT_DECIMALS);
}

// 判断是否为分段结构（二维点数组）
export function isSegmented(points) {
  return Array.isArray(points[0]);
}

// 标准化为二维结构，统一处理格式
export function getSegments(points) {
  return isSegmented(points) ? points : [points];
}

// 对一维或二维点数组执行映射操作
export function mapNested(points, fn) {
  return isSegmented(points)
    ? points.map((segment) => segment.map(fn))
    : points.map(fn);
}

// 对数值添加抖动扰动（以 base 为基础，在 ±jitterBase * ratio 范围内变动）
export function applyJitter(base, ratio, jitterBase = base) {
  return base + jitterBase * (Math.random() * 2 - 1) * ratio;
}

// 判断两个点是否近似相等（坐标差值小于容差）
export function isSamePoint(a, b) {
  return (
    Math.abs(a?.x - b?.x) < config.TOLERANCE &&
    Math.abs(a?.y - b?.y) < config.TOLERANCE
  );
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
