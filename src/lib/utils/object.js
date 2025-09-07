import { isString, isSymbol, isFunction } from "../utils/is";

/**
 * 特殊标记，用于在 mapObject 的回调中表示“跳过该属性”。
 * @example
 * mapObject({ a:1, b:2 }, (k,v) => v % 2 ? [k,v] : MAP_OBJECT_SKIP)
 */
export const MAP_OBJECT_SKIP = Symbol("utils.mapObject.SKIP");

/**
 * 安全地为对象设置属性，避免 "__proto__" 被当作原型污染。
 * - 对于 "__proto__"：使用 defineProperty 强制写入为数据属性。
 * - 对于其他键：直接赋值。
 * @param {Object} obj - 目标对象
 * @param {string|symbol} k - 属性键
 * @param {*} v - 属性值
 */
export function fastSet(obj, k, v) {
  if (k === "__proto__") {
    Object.defineProperty(obj, k, {
      value: v,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } else {
    obj[k] = v;
  }
}

/**
 * 获取对象属性的完整元信息（descriptor + 各种布尔标记）。
 * @param {Object} obj - 目标对象
 * @param {string|symbol} k - 属性键
 * @returns {Object|null} 元信息对象，若属性不存在返回 null
 */
export function getPropMeta(obj, k) {
  const desc = Object.getOwnPropertyDescriptor(obj, k);
  if (!desc) return null;

  const isStringKey = isString(k);
  const isSymbolKey = isSymbol(k);
  const isProtoKey = k === "__proto__";

  const isAccessorProperty = "get" in desc || "set" in desc;
  const isDataProperty = !isAccessorProperty; // 互斥

  const hasGet = isAccessorProperty && isFunction(desc.get);
  const hasSet = isAccessorProperty && isFunction(desc.set);

  return {
    desc,
    isStringKey,
    isSymbolKey,
    isProtoKey,
    isAccessorProperty,
    isDataProperty,
    writable: isDataProperty ? desc.writable : undefined,
    enumerable: desc.enumerable,
    configurable: desc.configurable,
    hasGet,
    hasSet,
    get: hasGet ? desc.get : undefined,
    set: hasSet ? desc.set : undefined,
  };
}

/**
 * 安全地在对象上定义/更新属性。
 * - 自动处理 __proto__ 特殊情况，防止原型污染。
 * - 会保留或更新 enumerable/writable/configurable 标记。
 * - 根据属性是否是数据属性或访问器属性，执行不同的逻辑。
 * @param {Object} obj - 目标对象
 * @param {string|symbol} k - 属性键
 * @param {*} v - 属性值
 * @param {Object} [options] - 可选 flags（writable, enumerable, configurable）
 * @returns {Object} 原对象（便于链式调用）
 */
export function safeDefine(obj, k, v, options = {}) {
  const meta = getPropMeta(obj, k);
  const exten = Object.isExtensible(obj);
  const define = (obj, k, patch) => {
    if (Object.keys(patch).length > 0) {
      Object.defineProperty(obj, k, patch);
    }
    return obj;
  };

  // 属性不存在且可扩展：定义为数据属性
  if (meta === null) {
    if (!exten) return obj;

    const patch = {
      value: v,
      writable: options.writable ?? true,
      enumerable: options.enumerable ?? true,
      configurable: options.configurable ?? true,
    };

    return define(obj, k, patch);
  }

  const valueChanged = meta.isDataProperty && !Object.is(meta.desc.value, v);

  const writableChanged =
    meta.isDataProperty &&
    options.writable !== undefined &&
    options.writable !== meta.writable;

  const enumerableChanged =
    options.enumerable !== undefined && options.enumerable !== meta.enumerable;

  const configurableChanged =
    options.configurable !== undefined &&
    options.configurable !== meta.configurable;

  // 特殊处理 __proto__ 属性：如果可配，重新定义为数据属性
  if (meta.isProtoKey) {
    if (meta.configurable === true) {
      const patch = {};
      if (meta.isAccessorProperty) {
        patch.value = v;
        patch.writable = options.writable ?? true;
      } else {
        if (valueChanged) patch.value = v;
        if (writableChanged) patch.writable = options.writable;
      }

      patch.enumerable = options.enumerable ?? meta.enumerable;
      patch.configurable = options.configurable ?? meta.configurable;

      define(obj, k, patch);
    } else {
      // ECMA-262 § 9.1.6.3 规定，不可配但可写，
      // 允许通过 Object.defineProperty(obj, k, { value: v }) 修改值
      if (meta.isDataProperty && meta.writable === true && valueChanged) {
        define(obj, k, { value: v });
      }
    }
    return obj;
  }

  // 访问器属性
  if (meta.isAccessorProperty) {
    // 有 set 方法可改 value
    // 不读 getter、不做同值判断
    if (meta.hasSet) {
      meta.set.call(obj, v);
    }

    // 可配置：允许调整可枚举/可配置
    if (meta.configurable === true) {
      const patch = {};
      if (enumerableChanged) patch.enumerable = options.enumerable;
      if (configurableChanged) patch.configurable = options.configurable;

      define(obj, k, patch);
    }
    return obj;
  }

  // 数据属性
  if (meta.isDataProperty) {
    // 可配置：一次性重新定义
    if (meta.configurable === true) {
      const patch = {};
      if (valueChanged) patch.value = v;
      if (writableChanged) patch.writable = options.writable;
      if (enumerableChanged) patch.enumerable = options.enumerable;
      if (configurableChanged) patch.configurable = options.configurable;

      define(obj, k, patch);
    }
    // 不可配但可写：仅修改值
    else {
      if (meta.writable === true && valueChanged) {
        // ECMA-262 § 9.1.6.3 规定，不可配但可写，
        // 允许通过 Object.defineProperty(obj, k, { value: v }) 修改值
        define(obj, k, { value: v });
      }
    }
    return obj;
  }

  // 其他情况：跳过
  return obj;
}

/**
 * 过滤对象的自有可枚举字符串属性。
 * - 会读取属性值，可能触发 getter。
 * - 返回一个新对象（不会修改原对象）。
 * @param {Object} obj - 输入对象
 * @param {(key:string, value:any)=>boolean} fn - 判断函数，返回 true 保留该属性
 * @returns {Object} 过滤后的新对象
 */
export function filterObject(obj, fn) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(k, v)));
}

/**
 * 遍历对象的自有可枚举字符串属性，对每个属性执行回调。
 * - 回调可以返回 [newKey, newValue] 来修改键/值；
 * - 或返回 MAP_OBJECT_SKIP 来跳过该属性；
 * - 否则默认保留原键值。
 * - 返回的新对象不会修改原对象。
 * @param {Object} obj - 输入对象
 * @param {(key:string, value:any)=>[string|symbol, any]|typeof MAP_OBJECT_SKIP|any[]} fn - 映射函数
 * @returns {Object} 新对象
 * @example
 * mapObject({ a:1, b:2 }, (k,v) => [k+k, v*10]) // { aa:10, bb:20 }
 * mapObject({ a:1, b:2 }, (k,v) => MAP_OBJECT_SKIP) // {}
 */
export function mapObject(obj, fn) {
  const out = {};
  const keys = Object.keys(obj);

  for (const k of keys) {
    const v = obj[k];
    const res = fn(k, v);
    if (res === MAP_OBJECT_SKIP) continue;

    const [nk, nv] =
      Array.isArray(res) &&
      res.length === 2 &&
      (isString(res[0]) || isSymbol(res[0]))
        ? res
        : [k, v];

    fastSet(out, nk, nv);
  }

  return out;
}

/**
 * 遍历对象的自有可枚举字符串属性，仅对值做映射（key 保持不变）。
 * - 返回的新对象不会修改原对象。
 * @param {Object} obj - 输入对象
 * @param {(value:any, key:string)=>any} fn - 映射函数
 * @returns {Object} 新对象
 * @example
 * mapValues({ a:1, b:2 }, v => v*2) // { a:2, b:4 }
 */
export function mapValues(obj, fn) {
  const out = {};
  for (const k of Object.keys(obj)) {
    fastSet(out, k, fn(obj[k], k));
  }
  return out;
}

// 同时挂到函数上，支持 mapObject.SKIP 写法
mapObject.SKIP = MAP_OBJECT_SKIP;
