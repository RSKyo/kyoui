export const convertToRgba = (color, alpha = 1) => {
  if (typeof color !== "string") return color;
  color = color.trim().toLowerCase();
  alpha = Math.max(0, Math.min(1, alpha)); // Clamp alpha to [0, 1]

  if (color.startsWith("rgba(")) return color;
  if (color.startsWith("rgb(")) {
    return `rgba${color.slice(3, -1)}, ${alpha})`;
  }

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    let r, g, b;

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return color; // invalid hex
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
};

export const applyStrokeStyle = (ctx, stroke = {}) => {
  const {
    color = "black",
    alpha = 1,
    width = 1,
    cap = "butt",
    join = "miter",
    dash = [],
    dashOffset = 0,
  } = stroke;

  ctx.strokeStyle = convertToRgba(color, alpha);
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.lineJoin = join;
  ctx.setLineDash(dash);
  ctx.lineDashOffset = dashOffset;
};

export const applyFillStyle = (ctx, fill = {}) => {
  const { color = "transparent", alpha = 1 } = fill;
  ctx.fillStyle = convertToRgba(color, alpha);
};

export const drawCircle = (
  ctx,
  x,
  y,
  radius = 6,
  { fill = {}, stroke = {} } = {}
) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);

  // 描边样式
  if (stroke) {
    applyStrokeStyle(ctx, stroke);
    ctx.stroke();
  }

  // 填充样式
  if (fill) {
    applyFillStyle(ctx, fill);
    ctx.fill();
  }
};

export const drawLine = (ctx, x1, y1, x2, y2, stroke = {}) => {
  applyStrokeStyle(ctx, stroke);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

export const drawPolyline = (ctx, points, stroke = {}) => {
  applyStrokeStyle(ctx, stroke);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
};

export const drawBezierControlPolygon = (ctx, p0, p1, p2, p3, stroke = {}) => {
  drawPolyline(ctx, [p0, p1, p2, p3], stroke);
};

export const drawBezierControlPoints = (
  ctx,
  p0,
  p1,
  p2,
  p3,
  {
    p0: styleP0 = {},
    p1: styleP1 = {},
    p2: styleP2 = {},
    p3: styleP3 = {},
  } = {}
) => {
  drawCircle(ctx, p0.x, p0.y, styleP0.radius, styleP0);
  drawCircle(ctx, p1.x, p1.y, styleP1.radius, styleP1);
  drawCircle(ctx, p2.x, p2.y, styleP2.radius, styleP2);
  drawCircle(ctx, p3.x, p3.y, styleP3.radius, styleP3);
};

export const drawBezier = (ctx, p0, p1, p2, p3, stroke = {}) => {
  applyStrokeStyle(ctx, stroke);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  ctx.stroke();
};

export const drawGrid = (ctx, width, height, spacing = 50, style = {}) => {
  const limitX = Math.ceil(width / spacing) * spacing;
  const limitY = Math.ceil(height / spacing) * spacing;

  if (style.fillColor) {
    const { fillColor, fillAlpha = 1 } = style;
    applyFillStyle(ctx, { color: fillColor, alpha: fillAlpha });
    ctx.fillRect(0, 0, width, height);
  }

  applyStrokeStyle(ctx, style);
  for (let x = 0; x <= limitX; x += spacing) {
    drawLine(ctx, x, 0, x, height, style);
  }
  for (let y = 0; y <= limitY; y += spacing) {
    drawLine(ctx, 0, y, width, y, style);
  }
};
