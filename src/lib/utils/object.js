import {
  isArray,
  isPlainObject,
  isString,
  isSymbol,
  isFunction,
} from "../utils/is";
import { log } from "../utils/logger.js";

export const MAP_OBJECT_SKIP = Symbol.for("utils.mapObject.SKIP");

export function getPropMeta(obj, k) {
  const desc = Object.getOwnPropertyDescriptor(obj, k);
  if (!desc) return null;

  const isStringKey = isString(k);
  const isSymbolKey = isSymbol(k);
  const isProtoKey = isStringKey && k === "__proto__";

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

      if (enumerableChanged)
        patch.enumerable = options.enumerable ?? meta.enumerable;
      if (configurableChanged)
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
 * 根据条件筛选对象中的键值对。
 * @param {Object} obj - 输入对象
 * @param {(k: string, value: any) => boolean} fn - 判断是否保留的函数
 * @returns {Object} 新对象，仅包含满足条件的键值对
 */
export function filterEntries(obj, fn) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(k, v)));
}

// 获取对象的自有可枚举键
export function enumKeys(obj, { includeSymbols = false } = {}) {
  return includeSymbols
    ? Reflect.ownKeys(obj).filter((k) =>
        Object.prototype.propertyIsEnumerable.call(obj, k)
      )
    : Object.keys(obj);
}

export function mapPlainObject(obj, fn, { includeSymbols = false } = {}) {
  if (!isPlainObject(obj)) return obj;

  const keys = enumKeys(obj, { includeSymbols });

  const pairs = [];
  for (const k of keys) {
    const v = obj[k];
    const res = fn(k, v);
    if (res === MAP_OBJECT_SKIP) continue;

    if (
      isArray(res) &&
      res.length === 2 &&
      (isString(res[0]) || isSymbol(res[0]))
    ) {
      pairs.push(res);
    } else {
      pairs.push([k, v]);
    }
  }

  // 用 null 原型，赋值最简单也最安全（'__proto__' 只会当普通键）
  const out = Object.create(null);
  for ([k, v] in pairs) {
    out[k] = v;
  }
  return out;
}

// 可选：同时挂到函数上，便于 mapObject.SKIP 写法
mapPlainObject.SKIP = MAP_OBJECT_SKIP;
