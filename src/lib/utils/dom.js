/**
 * 等待某个 DOM 元素就绪（可用于异步渲染或延迟挂载的场景）
 *
 * 提供一个获取元素的函数，内部会尝试使用 requestAnimationFrame 轮询，
 * 直到元素可用或达到最大尝试次数。
 *
 * @param {() => HTMLElement | null} getElementFn - 获取元素的函数，通常是 document.querySelector 等。
 * @param {Object} [options] - 配置项
 * @param {number} [options.attempt=10] - 最大尝试次数（每帧一次）
 * @returns {Promise<HTMLElement>} - 当元素就绪时 resolve，否则 reject(null)
 *
 * @example
 * whenElementReady(() => document.querySelector('#my-el')).then((el) => {
 *   // do something with el
 * });
 */
export function whenElementReady(getElementFn, { attempt = 10 } = {}) {
  return new Promise((resolve, reject) => {
    let count = 0;

    const tryFn = () => {
      const element = getElementFn();
      if (element) {
        resolve(element);
        return;
      }

      if (count >= attempt) {
        reject(null);
        return;
      }
      count++;
      requestAnimationFrame(tryFn);
    };

    tryFn();
  });
}