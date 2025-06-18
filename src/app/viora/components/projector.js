import { safeDiv, mapNested } from "@/app/shared/utils";

// 计算点集的边界范围信息
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
 * 计算画布缩放与偏移参数，使数学点集适配指定画布尺寸
 * @param {{ minX: number, minY: number, rangeX: number, rangeY: number }} bounds - 点集的边界信息
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {{ paddingRatio?: number }} [options] - 可选，边缘填充比例，默认 0
 * @returns {{ scale: number, ox: number, oy: number, ...bounds }} - 缩放比例和偏移量
 */
export function getCanvasTransform(
  points,
  width,
  height,
  { paddingRatio = 0 } = {}
) {
  const bounds = getBounds(points);
  const { rangeX, rangeY } = bounds;
  const scale =
    Math.min(safeDiv(width, rangeX), safeDiv(height, rangeY)) *
    (1 - 2 * paddingRatio);

  const px = width * paddingRatio;
  const py = height * paddingRatio;
  const ox = (width - 2 * px - rangeX * scale) / 2;
  const oy = (height - 2 * py - rangeY * scale) / 2;

  return { ...bounds, scale, ox, oy, px, py };
}

/**
 * 将画布坐标点映射到实际画布渲染位置（根据缩放和偏移）。
 * @param {Array|Array[]} points - 一维或二维画布坐标点集
 * @param {{ minX: number, minY: number, scale: number, ox: number, oy: number }} transform - 缩放与偏移信息
 * @returns {Array|Array[]} - 应用于画布的最终坐标点集
 */
export function mapToCanvas(points, transform) {
  const { minX, minY, scale, ox, oy, px, py } = transform;

  const project = (p) => ({
    ...p,
    x: (p.x - minX) * scale + px + ox,
    y: (p.y - minY) * scale + px + oy,
  });

  return mapNested(points, project);
}

/**
 * 将画布坐标点反转换为数学坐标
 * @param {Array|Array[]} points - 一维或二维点集
 * @param {{ minX: number, minY: number, scale: number, ox: number, oy: number }} transform - 缩放与偏移信息
 * @returns {Array|Array[]} - 还原后的数学坐标点集
 */
export function mapFromCanvas(points, transform) {
  const { minX, minY, scale, ox, oy } = transform;

  const unproject = (p) => ({
    ...p,
    x: safeDiv(p.x - ox, scale) + minX,
    y: safeDiv(p.y - oy, scale) + minY,
  });

  return mapNested(points, unproject);
}

/**
 * 将数学坐标系的点转换为画布坐标系（左上为原点，y 向下）
 * 自动平移原点并反转 y 轴方向
 * @param {Array|Array[]} points - 一维或二维点集
 * @returns {Array|Array[]} - 映射后的画布坐标点集
 */
export function toCanvasCoords(points) {
  const flat = points.flat(Infinity);
  const { minX, maxY } = flat.reduce(
    (acc, { x, y }) => ({
      minX: Math.min(acc.minX, x),
      maxY: Math.max(acc.maxY, y),
    }),
    { minX: Infinity, maxY: -Infinity }
  );

  const project = (p) => ({
    ...p,
    x: p.x - minX,
    y: maxY - p.y,
  });

  return mapNested(points, project);
}

/**
 * 将画布坐标系的点转换回数学坐标系（默认以某一点为原点，y 向上）
 * 反转 y 轴方向，并平移原点
 * @param {Array|Array[]} points - 一维或二维点集
 * @param {{ x?: number, y?: number }} [origin={}] - 可选原点坐标
 * @returns {Array|Array[]} - 转换后的数学坐标点集
 */
export function toMathCoords(points, origin = {}) {
  const { x = 0, y = 0 } = origin;
  const project = (p) => ({
    ...p,
    x: p.x - x,
    y: y - p.y, // y 反转
  });

  return mapNested(points, project);
}
