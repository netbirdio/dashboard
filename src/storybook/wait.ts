/**
 * Waits until the DOM has stopped changing for `quietMs`, or `maxMs` at the
 * latest. Stories used to sleep for a fixed time before the screenshot; most
 * of them are done long before, so this returns as soon as rendering settles
 * while keeping the old duration as the upper bound.
 */
export function settle(maxMs = 300, quietMs = 120): Promise<void> {
  return new Promise((resolve) => {
    let quietTimer: ReturnType<typeof setTimeout>;
    const done = () => {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      resolve();
    };
    const restartQuiet = () => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(done, quietMs);
    };
    const observer = new MutationObserver(restartQuiet);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    const maxTimer = setTimeout(done, maxMs);
    restartQuiet();
  });
}
