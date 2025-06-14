/**
 * 安全除法，避免除以 0
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

/**
 * 判断是否为二维数组结构的点集
 * @param {Array} points
 * @returns {boolean}
 */
function isSegmented(points) {
  return Array.isArray(points[0]);
}

/**
 * 映射一组点（支持一维或二维结构）
 * @template T
 * @param {T[] | T[][]} points
 * @param {(point: T) => T} fn
 * @returns {T[] | T[][]}
 */
function mapPoints(points, fn) {
  return isSegmented(points)
    ? points.map((segment) => segment.map(fn))
    : points.map(fn);
}

/**
 * 计算点集的边界范围信息
 * @param {{x: number, y: number}[] | {x: number, y: number}[][]} points
 * @returns {{minX: number, maxX: number, minY: number, maxY: number, rangeX: number, rangeY: number}}
 */
function getBounds(points) {
  const flat = points.flat(Infinity);

  const { minX, maxX, minY, maxY } = flat.reduce(
    (acc, { x, y }) => ({
      minX: Math.min(acc.minX, x),
      maxX: Math.max(acc.maxX, x),
      minY: Math.min(acc.minY, y),
      maxY: Math.max(acc.maxY, y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return {
    minX,
    maxX,
    minY,
    maxY,
    rangeX,
    rangeY,
  };
}

/**
 * 根据边界和画布尺寸计算缩放比例及偏移信息
 * @param {number} width
 * @param {number} height
 * @param {{ rangeX: number, rangeY: number }} bounds
 * @param {{ paddingRatio?: number }} [options]
 * @returns {{ scale: number, ox: number, oy: number }}
 */
function getFitScale(width, height, bounds, { paddingRatio = 0 } = {}) {
  const { rangeX, rangeY } = bounds;
  const scale = Math.min(safeDiv(width, rangeX), safeDiv(height, rangeY));
  // contentScale: scale after padding, reserved for future layout use
  // const contentScale = scale * (1 - 2 * paddingRatio);

  const px = width * paddingRatio;
  const py = height * paddingRatio;
  const ox = (width - 2 * px - rangeX * scale) / 2;
  const oy = (height - 2 * py - rangeY * scale) / 2;

  return { scale, ox, oy };
}

/**
 * 将点集归一化到 0~1 空间
 * @param {{x: number, y: number}[] | {x: number, y: number}[][]} points
 * @returns {{x: number, y: number}[] | {x: number, y: number}[][]}
 */
export function normalizePoints(points) {
  const segmented = isSegmented(points);
  const { minX, minY, rangeX, rangeY } = getBounds(points);
  const range = Math.max(rangeX, rangeY);

  const normalize = (p) => ({
    ...p,
    x: safeDiv(p.x - minX, range),
    y: safeDiv(p.y - minY, range),
  });

  return mapPoints(points, normalize);
}

/**
 * 将点集映射到画布坐标系
 * @param {{x: number, y: number}[] | {x: number, y: number}[][]} points
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {{ paddingRatio?: number }} [options]
 * @returns {{x: number, y: number}[] | {x: number, y: number}[][]}
 */
export function mapToCanvas(
  points,
  canvasWidth,
  canvasHeight,
  { paddingRatio = 0.05 } = {}
) {
  const bounds = getBounds(points);
  const { minX, minY } = bounds;
  const { scale, ox, oy } = getFitScale(canvasWidth, canvasHeight, bounds, {
    paddingRatio,
  });

  const project = (p) => ({
    ...p,
    x: (p.x - minX) * scale + ox,
    y: (p.y - minY) * scale + oy,
  });

  return mapPoints(points, project);
}
