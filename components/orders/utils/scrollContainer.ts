// Nearest ancestor that scrolls vertically. The app shell scrolls an inner
// div (not the window), so window.scrollTo does nothing on most pages.
const SCROLLING_OVERFLOW = new Set(["auto", "scroll", "overlay"]);

type StyleReader = (el: Element) => Pick<CSSStyleDeclaration, "overflowY">;

export function findScrollContainer(
  node: Element | null,
  readStyle: StyleReader = (el) => getComputedStyle(el)
): Element | null {
  let el = node?.parentElement ?? null;
  while (el) {
    if (SCROLLING_OVERFLOW.has(readStyle(el).overflowY)) return el;
    el = el.parentElement;
  }
  return typeof document !== "undefined" ? document.scrollingElement : null;
}
