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