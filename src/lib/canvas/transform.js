import { config } from "../config";
import { flattenArrayGen, mapNested, toFixedNumber, safeDiv, clamp } from "../utils";


// 计算点数组（可嵌套）的边界值和范围
export function getBounds(points) {
  const iter = flattenArrayGen(points);
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];

  for (const { x, y } of iter) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return { minX, maxX, minY, maxY, rangeX, rangeY };
}

// 初始化 canvas 尺寸、缩放与上下文，并计算绘图区域和边距信息
export function initializeCanvas(canvas, options = {}) {
  if (!canvas) return null;
  const {
    width = 0,
    height = 0,
    paddingRatio = config.PADDING_RATIO ?? 0,
    contextType = "2d",
  } = options;

  const safePaddingRatio = clamp(paddingRatio, 0, 0.5);
  const dpr = window.devicePixelRatio || 1;

  // 先设置尺寸，再设置缩放
  // rect 是 DOM 的“快照”，就不会反映后续变化。
  const rect = canvas.getBoundingClientRect();
  const w = width > 0 ? width : rect.width;
  const h = height > 0 ? height : rect.height;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  // 先设置尺寸，再设置缩放
  // 虽然 ctx 是引用对象，但如果 canvas 的分辨率变了（即 .width 或 .height 变了），ctx 的绘图状态会被清除。
  // 清除所有绘图内容；
  // 清除 ctx 的样式（如 strokeStyle, lineWidth）；
  // 清除变换矩阵（如 scale, translate, rotate）；
  const ctx = canvas.getContext(contextType);
  if (ctx instanceof CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  const px = w * safePaddingRatio;
  const py = h * safePaddingRatio;
  const padding = {
    left: px,
    right: px,
    top: py,
    bottom: py,
  };

  const domRect = {
    width: w,
    height: h,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
  };

  const drawArea = {
    width: w - 2 * px,
    height: h - 2 * py,
    left: px,
    right: w - px,
    top: py,
    bottom: h - py,
  };

  const clear = () => {
    ctx.clearRect(0, 0, w, h);
  };

  return {
    canvas,
    ctx,
    width: w,
    height: h,
    padding,
    domRect,
    drawArea,
    clear,
  };
}

// 将鼠标事件坐标转换为 canvas 可绘区域中的位置（含边界裁剪）
export function getCanvasMouseInfo(e, canvasInfo) {
  const { left: l, top: t } = canvasInfo.domRect;
  const { left, top, right, bottom } = canvasInfo.drawArea;

  return {
    e,
    x: clamp(e.clientX - l, left, right),
    y: clamp(e.clientY - t, top, bottom),
  };
}

// 根据点集和画布信息计算缩放比例与绘制偏移量，用于逻辑坐标 → 画布坐标映射
export function getCanvasTransform(points, canvasInfo) {
  const bounds = getBounds(points);
  const { rangeX, rangeY } = bounds;
  const { width, height } = canvasInfo.drawArea;
  const { left: padX, top: padY } = canvasInfo.padding;

  // 缩放比例（基于可绘区域，保持原始比例）
  const scale = Math.min(safeDiv(width, rangeX), safeDiv(height, rangeY));

  const centerOffset = {
    x: (width - rangeX * scale) / 2,
    y: (height - rangeY * scale) / 2,
  };

  const drawOffset = {
    x: padX + centerOffset.x,
    y: padY + centerOffset.y,
  };

  return { bounds, scale, drawOffset };
}

// 将点集从逻辑坐标空间映射到 canvas 坐标空间（适配缩放与偏移）
export function mapToCanvas(points, transform) {
  const { bounds, scale, drawOffset } = transform;
  const { minX, minY } = bounds;

  const project = (p) => ({
    ...p,
    x: toFixedNumber((p.x - minX) * scale + drawOffset.x),
    y: toFixedNumber((p.y - minY) * scale + drawOffset.y),
  });

  return mapNested(points, project);
}

// 将点集从 canvas 坐标空间反映射为逻辑坐标，并可选对齐到原点
export function mapFromCanvas(points, transform, options = {}) {
  const { bounds, scale, drawOffset } = transform;
  const { minX, minY } = bounds;
  const { align = true, origin = { x: 0, y: 0 }, mutate = true } = options;

  const unproject = (p) => ({
    ...p,
    x: toFixedNumber(safeDiv(p.x - drawOffset.x, scale) + minX),
    y: toFixedNumber(safeDiv(p.y - drawOffset.y, scale) + minY),
  });

  const unprojectPoints = mapNested(points, unproject);

  return align
    ? alignToOrigin(unprojectPoints, { origin, mutate })
    : unprojectPoints;
}

// 将点集平移，使其最小边界对齐到指定原点（默认左上角 0,0）
export function alignToOrigin(points, options = {}) {
  const { origin = { x: 0, y: 0 }, mutate = false } = options;
  const bounds = getBounds(points);

  return mapNested(points, (p) => {
    if (mutate) {
      p.x = toFixedNumber(p.x - bounds.minX + origin.x);
      p.y = toFixedNumber(p.y - bounds.minY + origin.y);
      return p;
    } else {
      return {
        ...p,
        x: toFixedNumber(p.x - bounds.minX + origin.x),
        y: toFixedNumber(p.y - bounds.minY + origin.y),
      };
    }
  });
}

// 将数学坐标（原点在左下）转换为画布坐标（原点在左上，y 轴向下）
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

// 将画布坐标（原点左上）转换为数学坐标（原点左下，y 轴向上）
export function toMathCoords(points, origin = {}) {
  const { x = 0, y = 0 } = origin;
  const project = (p) => ({
    ...p,
    x: p.x - x,
    y: y - p.y, // y 反转
  });

  return mapNested(points, project);
}
