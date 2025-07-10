import { flattenArray } from "@/app/lib/utils/common";

// 计算点数组（可嵌套）的边界值和范围
export function getBounds(points) {
  const iter = flattenArray(points);
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
