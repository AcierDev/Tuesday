// utils/parseMinecraftColors.tsx
import React from "react";
import {
  AnimatedLetterE,
  AnimatedLetterWF,
  AnimatedLetterSH,
} from "@/components/ui/AnimatedLetter";

export const minecraftColors: { [key: string]: string } = {
  "0": "#000000", // Black
  "1": "#0000AA", // Dark Blue
  "2": "#00AA00", // Dark Green
  "3": "#00AAAA", // Dark Aqua
  "4": "#AA0000", // Dark Red
  "5": "#AA00AA", // Dark Purple
  "6": "#FFAA00", // Gold
  "7": "#AAAAAA", // Gray
  "8": "#555555", // Dark Gray
  "9": "#5555FF", // Blue
  a: "#55FF55", // Green
  b: "#55FFFF", // Aqua
  c: "#FF5555", // Red
  d: "#FF55FF", // Light Purple
  e: "#FFFF55", // Yellow
  f: "#FFFFFF", // White
};

interface TextSegment {
  text: string;
  color: string;
}

const fractionRegex = /\((\d+)\/(\d+)\)/g;

const renderColoredText = (
  text: string,
  color: string,
  keyPrefix: string
): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  fractionRegex.lastIndex = 0;
  let lastIdx = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = fractionRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      out.push(
        <span key={`${keyPrefix}-t-${i}`} style={{ color }}>
          {text.slice(lastIdx, m.index)}
        </span>
      );
    }
    out.push(
      <span
        key={`${keyPrefix}-f-${i}`}
        className="inline-flex h-5 items-center justify-center rounded-md bg-violet-500 px-1.5 mx-0.5 text-xs font-bold leading-none text-black tabular-nums"
      >
        {m[1]}/{m[2]}
      </span>
    );
    lastIdx = m.index + m[0].length;
    i++;
  }
  if (lastIdx < text.length) {
    out.push(
      <span key={`${keyPrefix}-t-${i}`} style={{ color }}>
        {text.slice(lastIdx)}
      </span>
    );
  }
  return out;
};

export const parseMinecraftColors = (
  input: string
): React.ReactNode[] => {
  try {
    const regex = /(&[0-9a-f])/gi;
    const segments: TextSegment[] = [];
    let lastIndex = 0;
    const defaultColor = minecraftColors["f"] ?? "#FFFFFF";
    let currentColor: string = defaultColor;

    // Sanitize input to prevent XSS
    const sanitizedInput = input.replace(/[<>]/g, "");

    let match: RegExpExecArray | null;
    while ((match = regex.exec(sanitizedInput)) !== null) {
      const index = match.index;
      // Safely access the color code
      const colorCode = match[1]?.charAt(1)?.toLowerCase() ?? "0";

      // Push the text before the color code
      if (index > lastIndex) {
        segments.push({
          text: sanitizedInput.substring(lastIndex, index),
          color: currentColor,
        });
      }

      // Update the current color
      currentColor = minecraftColors[colorCode] ?? defaultColor;
      lastIndex = index + 2; // Skip the color code
    }

    // Push the remaining text
    if (lastIndex < sanitizedInput.length) {
      segments.push({
        text: sanitizedInput.substring(lastIndex),
        color: currentColor,
      });
    }

    // Convert segments to React elements and handle prefix replacement
    const elements: React.ReactNode[] = [];

    segments.forEach((segment, idx) => {
      const text = segment.text;

      // Check for company prefixes and replace with animated components
      if (text.includes("[EW]")) {
        const parts = text.split("[EW]");
        parts.forEach((part, partIdx) => {
          if (partIdx > 0) {
            elements.push(
              <AnimatedLetterE
                key={`${idx}-e-${partIdx}`}
                size="sm"
                className="inline-flex mx-1"
              />
            );
          }
          if (part) {
            elements.push(
              ...renderColoredText(
                part,
                segment.color,
                `${idx}-text-${partIdx}`
              )
            );
          }
        });
      } else if (text.includes("[WF]")) {
        const parts = text.split("[WF]");
        parts.forEach((part, partIdx) => {
          if (partIdx > 0) {
            elements.push(
              <AnimatedLetterWF
                key={`${idx}-wf-${partIdx}`}
                size="sm"
                className="inline-flex mx-1"
              />
            );
          }
          if (part) {
            elements.push(
              ...renderColoredText(
                part,
                segment.color,
                `${idx}-text-${partIdx}`
              )
            );
          }
        });
      } else if (text.includes("[SH]")) {
        const parts = text.split("[SH]");
        parts.forEach((part, partIdx) => {
          if (partIdx > 0) {
            elements.push(
              <AnimatedLetterSH
                key={`${idx}-sh-${partIdx}`}
                size="sm"
                className="inline-flex mx-1"
              />
            );
          }
          if (part) {
            elements.push(
              ...renderColoredText(
                part,
                segment.color,
                `${idx}-text-${partIdx}`
              )
            );
          }
        });
      } else {
        elements.push(...renderColoredText(text, segment.color, `${idx}`));
      }
    });

    return elements;
  } catch (error) {
    console.error("Error parsing Minecraft colors:", error);
    return [
      <span key="error" style={{ color: "#FFFFFF" }}>
        {input}
      </span>,
    ];
  }
};
