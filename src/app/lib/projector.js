import { config } from "@/app/lib/config";
import { safeDiv, mapNested } from "@/app/lib/utils";

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

export function getCanvasTransform(points, width, height) {
  const bounds = getBounds(points);
  const { rangeX, rangeY } = bounds;
  const paddingRatio = config.PADDING_RATIO;
  const scale =
    Math.min(safeDiv(width, rangeX), safeDiv(height, rangeY)) *
    (1 - 2 * paddingRatio);

  const px = width * paddingRatio;
  const py = height * paddingRatio;
  const ox = (width - 2 * px - rangeX * scale) / 2;
  const oy = (height - 2 * py - rangeY * scale) / 2;

  return { bounds, scale, padding: { x: px, y: py }, offset: { x: ox, y: oy } };
}

export function mapToCanvas(points, canvasTransform) {
  const { bounds, scale, padding, offset } = canvasTransform;
  const { minX, minY } = bounds;
  const f = Math.pow(10, config.DEFAULT_DECIMALS);

  const project = (p) => {
    let x = (p.x - minX) * scale + padding.x + offset.x;
    let y = (p.y - minY) * scale + padding.y + offset.y;
    if (config.FIXED) {
      x = Math.round(x * f) / f;
      y = Math.round(y * f) / f;
    }
    return {
      ...p,
      x,
      y,
    };
  };

  return mapNested(points, project);
}

export function mapFromCanvas(points, canvasTransform) {
  const { bounds, scale, padding, offset } = canvasTransform;
  const { minX, minY } = bounds;
  const f = Math.pow(10, config.DEFAULT_DECIMALS);

  const unproject = (p) => {
    let x = safeDiv(p.x - padding.x - offset.x, scale) + minX;
    let y = safeDiv(p.y - padding.y - offset.y, scale) + minY;
    if (config.FIXED) {
      x = Math.round(x * f) / f;
      y = Math.round(y * f) / f;
    }
    return {
      ...p,
      x,
      y,
    };
  };

  const newPoints = mapNested(points, unproject);
  const newBounds = getBounds(newPoints);
  const move = (p) => {
    p.x = Math.round((p.x - newBounds.minX) * f) / f;
    p.y = Math.round((p.y - newBounds.minY) * f) / f;
    return p;
  };
  const aaa = mapNested(newPoints, move);
  return aaa;
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
