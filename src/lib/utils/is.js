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
  PRIMITIVE: "primitive",
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

export const isPrimitive = (val) => 
  typeof val !== TYPE_ENUM.OBJECT && typeof val !== TYPE_ENUM.FUNCTION;
