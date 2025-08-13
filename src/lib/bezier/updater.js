import { mirrorPoint } from "../utils";
import { getSegmentFlags } from "./core";

// 更新起点 P0，同时联动前段末尾控制点和当前段控制点 P1
function updatedP0(beziers, segmentIndex, x, y, dx, dy, flags, set) {
  // update curr p1
  if (!flags.isIsolated) {
    const p1 = beziers[segmentIndex][1];
    const newP1 = {
      ...p1,
      x: p1.x + dx,
      y: p1.y + dy,
    };
    set(segmentIndex, 1, newP1);

    // update prev p2/p3
    if (!flags.isHead) {
      const prevIndex = segmentIndex - 1;
      const p2 = beziers[prevIndex][2];
      const p3 = beziers[prevIndex][3];
      const newP2 = {
        ...p2,
        ...mirrorPoint(newP1, { x, y }),
      };
      const newP3 = {
        ...p3,
        x,
        y,
      };
      set(prevIndex, 2, newP2);
      set(prevIndex, 3, newP3);
    }
  }
}

// 更新控制点 P1，同时联动前段控制点 P2 的镜像
function updatedP1(beziers, segmentIndex, x, y, dx, dy, flags, set) {
  // update prev p2
  if (!flags.isIsolated && !flags.isHead) {
    const p0 = beziers[segmentIndex][0];
    const prevIndex = segmentIndex - 1;
    const p2 = beziers[prevIndex][2];
    const newP2 = {
      ...p2,
      ...mirrorPoint({ x, y }, p0),
    };
    set(prevIndex, 2, newP2);
  }
}

// 更新控制点 P2，同时联动后段控制点 P1 的镜像
function updatedP2(beziers, segmentIndex, x, y, dx, dy, flags, set) {
  // update next p1
  if (!flags.isIsolated && !flags.isTail) {
    const p3 = beziers[segmentIndex][3];
    const nextIndex = segmentIndex + 1;
    const p1 = beziers[nextIndex][1];
    const newP1 = {
      ...p1,
      ...mirrorPoint({ x, y }, p3),
    };
    set(nextIndex, 1, newP1);
  }
}

// 更新终点 P3，同时联动后段起点 P0 和控制点 P1
function updatedP3(beziers, segmentIndex, x, y, dx, dy, flags, set) {
  // update curr p2
  if (!flags.isIsolated) {
    const p2 = beziers[segmentIndex][2];
    const newP2 = {
      ...p2,
      x: p2.x + dx,
      y: p2.y + dy,
    };
    set(segmentIndex, 2, newP2);

    // update next p0/p1
    if (!flags.isTail) {
      const nextIndex = segmentIndex + 1;
      const p0 = beziers[nextIndex][0];
      const p1 = beziers[nextIndex][1];
      const newP0 = {
        ...p0,
        x,
        y,
      };
      const newP1 = {
        ...p1,
        ...mirrorPoint(newP2, { x, y }),
      };
      set(nextIndex, 0, newP0);
      set(nextIndex, 1, newP1);
    }
  }
}

const bezierUpdaters = {
  0: updatedP0,
  1: updatedP1,
  2: updatedP2,
  3: updatedP3,
};

export function updateBezier(
  segs,
  segmentIndex,
  pointIndex,
  x,
  y,
  { segmentFlags } = {}
) {
  const target = segs[segmentIndex][pointIndex];

  const changes = {};
  const set = (i, j, p) => {
    (changes[i] ||= {})[j] = p;
  };
  set(segmentIndex, pointIndex, { ...target, x, y });

  const dx = x - target.x;
  const dy = y - target.y;
  const flags = segmentFlags || getSegmentFlags(segs, segmentIndex);
  bezierUpdaters[pointIndex]?.(segs, segmentIndex, x, y, dx, dy, flags, set);

  if (Object.keys(changes).length === 0) return segs;

  return segs.map((seg, i) => {
    return changes[i] ? seg.map((p, j) => changes[i][j] || p) : seg;
  });
}
