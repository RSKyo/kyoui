/**
 * 扁平化嵌套数组（生成器），支持指定展开层数。
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 要展开的最大层数（默认为 Infinity 表示完全展开）
 * @yields {any} 每一项非数组元素，按原始顺序产出
 *
 * 说明：
 * - “展开 1 层”表示只展开最外层数组中的嵌套数组；
 * - 每增加 1 层 depth，相当于进一步展开更深一层的嵌套；
 * - 与 Array.prototype.flat(depth) 的行为一致。
 */
export function* flattenArrayGen(arr, depth = Infinity) {
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      yield* flattenArrayGen(item, depth - 1);
    } else {
      yield item;
    }
  }
}

/**
 * 扁平化嵌套数组（返回新数组），等价于 [...flattenArrayGen(arr, depth)]
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 最大展开层数
 * @returns {any[]} 扁平化结果数组
 */
export function flattenArray(arr, depth = Infinity) {
  return [...flattenArrayGen(arr, depth)];
}

/**
 * 提取嵌套数组中指定层级以内的所有非数组元素（生成器版）。
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 最大提取深度（0 表示只提取最外层的非数组元素）
 * @yields {any} 非数组元素，按原始顺序依次产出
 *
 * 说明：
 * - 每遇到一个数组，就视为“进入下一层”
 * - 仅当当前层级 ≤ depth 时才继续递归提取
 */
export function* extractArrayGen(arr, depth = Infinity) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      if (depth > 0) {
        yield* extractArrayGen(item, depth - 1);
      }
    } else {
      yield item;
    }
  }
}

/**
 * 提取嵌套数组中指定层级以内的所有非数组元素（数组版）。
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 最大提取深度
 * @returns {any[]} 扁平的一维数组，仅包含非数组元素
 */
export function extractArray(arr, depth = Infinity) {
  return [...extractArrayGen(arr, depth)];
}

/**
 * 递归地对嵌套数组中的每个非数组元素应用映射函数。
 *
 * @param {any} data - 任意层级嵌套的数组或值
 * @param {Function} fn - 应用于每个非数组元素的函数
 * @returns {any} 映射后的嵌套结构
 */
export function mapNested(data, fn) {
  if (Array.isArray(data)) {
    return data.map((d) => mapNested(d, fn));
  }
  return fn(data);
}