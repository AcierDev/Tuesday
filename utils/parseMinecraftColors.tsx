// utils/parseMinecraftColors.tsx
import React from 'react';

export const minecraftColors: { [key: string]: string } = {
  '0': '#000000', // Black
  '1': '#0000AA', // Dark Blue
  '2': '#00AA00', // Dark Green
  '3': '#00AAAA', // Dark Aqua
  '4': '#AA0000', // Dark Red
  '5': '#AA00AA', // Dark Purple
  '6': '#FFAA00', // Gold
  '7': '#AAAAAA', // Gray
  '8': '#555555', // Dark Gray
  '9': '#5555FF', // Blue
  'a': '#55FF55', // Green
  'b': '#55FFFF', // Aqua
  'c': '#FF5555', // Red
  'd': '#FF55FF', // Light Purple
  'e': '#FFFF55', // Yellow
  'f': '#FFFFFF', // White
};

interface TextSegment {
  text: string;
  color: string;
}

export const parseMinecraftColors = (input: string): React.ReactNode[] => {
  const regex = /(&[0-9a-f])/gi;
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let currentColor = minecraftColors['0']; // Default color is white

  let match;
  while ((match = regex.exec(input)) !== null) {
    const index = match.index;
    const code = match[1][1].toLowerCase();

    // Push the text before the color code
    if (index > lastIndex) {
      segments.push({
        text: input.substring(lastIndex, index),
        color: currentColor,
      });
    }

    // Update the current color
    currentColor = minecraftColors[code] || currentColor;
    lastIndex = index + 2; // Skip the color code
  }

  // Push the remaining text
  if (lastIndex < input.length) {
    segments.push({
      text: input.substring(lastIndex),
      color: currentColor,
    });
  }

  // Convert segments to React elements
  return segments.map((segment, idx) => (
    <span key={idx} style={{ color: segment.color }}>
      {segment.text}
    </span>
  ));
};