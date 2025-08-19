// 类型枚举
export const TYPE_ENUM = {
  NULL: "null",
  UNDEFINED: "undefined",
  NUMBER: "number",
  NAN: "nan",
  BOOLEAN: "boolean",
  STRING: "string",
  SYMBOL: "symbol",
  BIGINT: "bigint",
  FUNCTION: "function",
  ARRAY: "array",
  OBJECT: "object",
  PLAIN_OBJECT: "plain-object",
  DATE: "date",
  REG_EXP: "reg-exp",
  MAP: "map",
  SET: "set",
  WEAK_MAP: "weak-map",
  WEAK_SET: "weak-set",
  ERROR: "error",
  PROMISE: "promise",
  ELEMENT: "element",
  NODE: "node",
};

// 原始类型判断
export const isNull = (val) => val === null;
export const isUndefined = (val) => typeof val === TYPE_ENUM.UNDEFINED;
export const isNumber = (val) => typeof val === TYPE_ENUM.NUMBER && !Number.isNaN(val);
export const isNaNValue = (val) => typeof val === TYPE_ENUM.NUMBER && Number.isNaN(val);
export const isBoolean = (val) => typeof val === TYPE_ENUM.BOOLEAN;
export const isString = (val) => typeof val === TYPE_ENUM.STRING;
export const isSymbol = (val) => typeof val === TYPE_ENUM.SYMBOL;
export const isBigInt = (val) => typeof val === TYPE_ENUM.BIGINT;
export const isFunction = (val) => typeof val === TYPE_ENUM.FUNCTION;

// 引用类型判断
export const isArray = Array.isArray;
export const isObject = (val) => val !== null && typeof val === TYPE_ENUM.OBJECT;

const toString = Object.prototype.toString;

export const isPlainObject = (val) =>
  toString.call(val) === "[object Object]";

export const isDate = (val) =>
  toString.call(val) === "[object Date]";

export const isRegExp = (val) =>
  toString.call(val) === "[object RegExp]";

export const isMap = (val) =>
  toString.call(val) === "[object Map]";

export const isSet = (val) =>
  toString.call(val) === "[object Set]";

export const isWeakMap = (val) =>
  toString.call(val) === "[object WeakMap]";

export const isWeakSet = (val) =>
  toString.call(val) === "[object WeakSet]";

export const isError = (val) =>
  toString.call(val) === "[object Error]";

export const isPromise = (val) =>
  !!val &&
  typeof val.then === TYPE_ENUM.FUNCTION &&
  typeof val.catch === TYPE_ENUM.FUNCTION;

export const isElement = (val) =>
  typeof Element !== TYPE_ENUM.UNDEFINED && val instanceof Element;

export const isNode = (val) =>
  typeof Node !== TYPE_ENUM.UNDEFINED && val instanceof Node;

/**
 * 判断一个值是否是指定类型。
 * 支持的类型有：
 * "null", "undefined", "number", "nan", "boolean", "string",
 * "symbol", "big-int", "function", "array", "object", "plain-object",
 * "date", "reg-exp", "map", "set", "weak-map", "weak-set",
 * "error", "promise", "element", "node" 等。
 *
 * @param {*} value - 要判断的值
 * @param {string} type - 类型字符串
 * @returns {boolean}
 */
export function isType(value, type) {
  switch (type) {
    case TYPE_ENUM.NULL: return isNull(value);
    case TYPE_ENUM.UNDEFINED: return isUndefined(value);
    case TYPE_ENUM.NUMBER: return isNumber(value);
    case TYPE_ENUM.NAN: return isNaNValue(value);
    case TYPE_ENUM.BOOLEAN: return isBoolean(value);
    case TYPE_ENUM.STRING: return isString(value);
    case TYPE_ENUM.SYMBOL: return isSymbol(value);
    case TYPE_ENUM.BIGINT: return isBigInt(value);
    case TYPE_ENUM.FUNCTION: return isFunction(value);
    case TYPE_ENUM.ARRAY: return isArray(value);
    case TYPE_ENUM.OBJECT: return isObject(value);
    case TYPE_ENUM.PLAIN_OBJECT: return isPlainObject(value);
    case TYPE_ENUM.DATE: return isDate(value);
    case TYPE_ENUM.REG_EXP: return isRegExp(value);
    case TYPE_ENUM.MAP: return isMap(value);
    case TYPE_ENUM.SET: return isSet(value);
    case TYPE_ENUM.WEAK_MAP: return isWeakMap(value);
    case TYPE_ENUM.WEAK_SET: return isWeakSet(value);
    case TYPE_ENUM.ERROR: return isError(value);
    case TYPE_ENUM.PROMISE: return isPromise(value);
    case TYPE_ENUM.ELEMENT: return isElement(value);
    case TYPE_ENUM.NODE: return isNode(value);
    default:
      return false; // 若不识别，直接返回 false 更稳妥
  }
}
