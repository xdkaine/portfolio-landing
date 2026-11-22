export interface ViewportState {
  height: number;
  scrollTop: number;
  maxScroll: number;
  atEnd: boolean;
}

const observers = new Set<(viewport: ViewportState) => void>();
let frame = 0;
let layoutObserver: ResizeObserver | undefined;

function schedule() {
  if (frame || !observers.size) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const viewport = {
      height: window.innerHeight,
      scrollTop: window.scrollY,
      maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      atEnd: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    };
    observers.forEach(measure => measure(viewport));
  });
}

// Every reveal shares one passive listener and one measurement frame, including
// changes from late fonts/images. Animations never advance on an idle timer.
export function observeViewport(measure: (viewport: ViewportState) => void) {
  observers.add(measure);
  if (observers.size === 1) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (typeof ResizeObserver !== "undefined") {
      layoutObserver = new ResizeObserver(schedule);
      layoutObserver.observe(document.documentElement);
      layoutObserver.observe(document.body);
    }
    void document.fonts.ready.then(schedule);
  }
  schedule();
  return () => {
    observers.delete(measure);
    if (!observers.size) {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      layoutObserver?.disconnect();
      layoutObserver = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

export function viewportProgress(top: number, viewport: ViewportState, start = 0.98, end = 0.45, completeAtEnd = false) {
  if (completeAtEnd && viewport.maxScroll === 0) return 1;
  const from = viewport.scrollTop + top - viewport.height * start;
  const to = Math.min(viewport.scrollTop + top - viewport.height * end, completeAtEnd ? viewport.maxScroll : Infinity);
  // Fit the final reveal into the scroll distance the document actually has.
  // This avoids snapping everything to visible at the last pixel of the page.
  if (to <= from) return viewport.atEnd ? 1 : 0;
  return Math.min(1, Math.max(0, (viewport.scrollTop - from) / (to - from)));
}
