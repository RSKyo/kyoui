/**
 * Bezier core utilities
 *
 * 修改履历：
 * - 2025-07-01 初始创建 evaluateBezierPoint、estimateArcLength 等基本方法
 * - 2025-07-02 添加 getSegmentFlags、mapSegmentsToFlags 用于判断连接关系
 * - 2025-07-03 新增 buildSamplingMeta 方法，用于生成采样元数据结构
 * - 2025-07-04 移除冗余 index 字段；flags 默认始终参与计算并输出
 */

import { config } from "@/app/lib/config";

// 判断是否为分段结构（二维点数组）
export function isSegmented(points) {
  return Array.isArray(points[0]);
}

// 标准化为二维结构，统一处理格式
export function getSegments(points) {
  return isSegmented(points) ? points : [points];
}

// 计算三次贝塞尔曲线在参数 t (0~1) 下的坐标点
export function evaluateBezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

  return { x, y };
}

// 粗略估算贝塞尔曲线的长度
export function estimateArcLength(p0, p1, p2, p3, precision = 10) {
  let length = 0;
  let prev = evaluateBezierPoint(p0, p1, p2, p3, 0);
  for (let i = 1; i <= precision; i++) {
    const t = i / precision;
    const curr = evaluateBezierPoint(p0, p1, p2, p3, t);
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    length += Math.sqrt(dx * dx + dy * dy);
    prev = curr;
  }
  return length;
}

// 判断当前段与前后段的连接状态
export function getSegmentFlags(segs, i, options = {}) {
  const { tolerance = config.TOLERANCE ?? 0.01, euclidean = false } = options;

  const curr = segs[i];
  const prev = segs[i - 1];
  const next = segs[i + 1];

  const notLinkedToPrev =
    !prev ||
    !isSamePoint(curr[0], prev[prev.length - 1], { tolerance, euclidean });
  const notLinkedToNext =
    !next ||
    !isSamePoint(curr[curr.length - 1], next[0], { tolerance, euclidean });

  return {
    isHead: notLinkedToPrev && !notLinkedToNext,
    isLinkedToPrev: !notLinkedToPrev,
    isTail: !notLinkedToPrev && notLinkedToNext,
    isIsolated: notLinkedToPrev && notLinkedToNext,
  };
}

// 为所有段生成连接状态标签
export function mapSegmentsToFlags(segs, options = {}) {
  const { tolerance = config.TOLERANCE ?? 0.01, euclidean = false } = options;

  return segs.map((_, i) => getSegmentFlags(segs, i, { tolerance, euclidean }));
}


