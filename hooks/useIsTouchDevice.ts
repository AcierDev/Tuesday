"use client";

import { useSyncExternalStore } from "react";

// Primary input is a finger (phones, iPad without a trackpad).
export const TOUCH_DEVICE_QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(listener: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(TOUCH_DEVICE_QUERY);
  mql.addEventListener("change", listener);
  return () => mql.removeEventListener("change", listener);
}

function readIsTouch() {
  return typeof window !== "undefined" && !!window.matchMedia
    ? window.matchMedia(TOUCH_DEVICE_QUERY).matches
    : false;
}

const readServerSnapshot = () => false;

export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribe, readIsTouch, readServerSnapshot);
}
