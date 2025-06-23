// 缓动函数：缓入正弦，随时间加速（sin 前四分之一周期）
export const easeInSine_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.47, y: 0.0 },
    { x: 0.745, y: 0.715 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeInSine_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.47, y: 1.0 },
    { x: 0.745, y: 0.285 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓出正弦，随时间减速（sin 后四分之一周期）
export const easeOutSine_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.39, y: 0.575 },
    { x: 0.565, y: 1.0 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeOutSine_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.39, y: 0.425 },
    { x: 0.565, y: 0.0 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓入缓出正弦，中间加速（sin 半周期）
export const easeInOutSine_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.445, y: 0.05 },
    { x: 0.55, y: 0.95 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeInOutSine_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.445, y: 0.95 },
    { x: 0.55, y: 0.05 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：线性匀速
export const linear_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.75 },
    { x: 1.0, y: 1.0 },
  ],
];

export const linear_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.25, y: 0.75 },
    { x: 0.75, y: 0.25 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓入二次，渐进加速
export const easeInQuad_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.55, y: 0.085 },
    { x: 0.68, y: 0.53 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeInQuad_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.55, y: 0.915 },
    { x: 0.68, y: 0.47 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓出二次，缓慢结束
export const easeOutQuad_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.25, y: 0.46 },
    { x: 0.45, y: 0.94 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeOutQuad_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.25, y: 0.54 },
    { x: 0.45, y: 0.06 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓入缓出二次，两端缓慢，中间快速
export const easeInOutQuad_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.455, y: 0.03 },
    { x: 0.515, y: 0.955 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeInOutQuad_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.455, y: 0.97 },
    { x: 0.515, y: 0.045 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓入三次，更自然地进入
export const easeInCubic_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.55, y: 0.055 },
    { x: 0.675, y: 0.19 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeInCubic_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.55, y: 0.945 },
    { x: 0.675, y: 0.81 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓出三次，更自然地退出
export const easeOutCubic_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.215, y: 0.61 },
    { x: 0.355, y: 1.0 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeOutCubic_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.215, y: 0.39 },
    { x: 0.355, y: 0.0 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：缓入缓出三次，两端平滑，中间加速
export const easeInOutCubic_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.645, y: 0.045 },
    { x: 0.355, y: 1.0 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeInOutCubic_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.645, y: 0.955 },
    { x: 0.355, y: 0.0 },
    { x: 1.0, y: 0.0 },
  ],
];

// 缓动函数：回弹缓出，超出后回落
export const easeOutBack_math = [
  [
    { x: 0.0, y: 0.0 },
    { x: 0.34, y: 1.56 },
    { x: 0.64, y: 1.0 },
    { x: 1.0, y: 1.0 },
  ],
];

export const easeOutBack_canvas = [
  [
    { x: 0.0, y: 1.0 },
    { x: 0.34, y: -0.56 },
    { x: 0.64, y: 0.0 },
    { x: 1.0, y: 0.0 },
  ],
];
