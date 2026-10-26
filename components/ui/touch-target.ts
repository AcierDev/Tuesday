// Expands an element's tap area to at least 44×44px on touch screens (Apple's
// minimum) via an invisible ::before, without changing its compact visual or
// layout. The host must not clip overflow (no overflow-hidden / truncate on
// the host itself; truncate an inner span instead). 44px is the minimum touch
// target; Tailwind needs the literal in the class string.
export const TOUCH_HIT_AREA =
  "relative before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:hidden [@media(pointer:coarse)]:before:block before:h-[max(100%,44px)] before:w-[max(100%,44px)] before:content-['']";
