function isSamePoint(p1, p2, { tolerance = 0.01, euclidean = false } = {}) {
  return euclidean
    ? Math.hypot(p1.x - p2.x, p1.y - p2.y) < tolerance
    : Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}

export function isBezierSegment(seg) {
  if (!Array.isArray(seg) || seg.length !== 4) return false;
  return seg.every(
    (p) =>
      p &&
      typeof p === "object" &&
      !Array.isArray(p) &&
      typeof p.x === "number" &&
      typeof p.y === "number"
  );
}

export function isBezierSegmentArray(beziers) {
  return (
    Array.isArray(beziers) &&
    beziers.length > 0 &&
    beziers.every(isBezierSegment)
  );
}

// 标准化为二维结构，统一处理格式。
// 返回 null 表示格式非法（非一条或多条合法曲线段）
export function toBezierSegments(beziers) {
  if (!Array.isArray(beziers) || beziers.length === 0) return null;
  if (isBezierSegment(beziers)) return [beziers];
  if (isBezierSegmentArray(beziers)) return beziers;
  return null;
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
// tolerance 通常 0.01 为 UI 坐标对比；0.001~0.005 为动画路径连接（如贝塞尔）；
export function getSegmentFlags(segs, i, options = {}) {
  const { tolerance = 0.01, euclidean = false } = options;

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
// tolerance 通常 0.01 为 UI 坐标对比；0.001~0.005 为动画路径连接（如贝塞尔）；
export function mapSegmentsToFlags(segs, options = {}) {
  const { tolerance = 0.01, euclidean = false } = options;

  return segs.map((_, i) => getSegmentFlags(segs, i, { tolerance, euclidean }));
}
