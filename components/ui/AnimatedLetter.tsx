"use client";

import { cn } from "@/lib/utils";

interface AnimatedLetterProps {
  letter: "E" | "WF";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function AnimatedLetter({
  letter,
  className,
  size = "lg",
}: AnimatedLetterProps) {
  const sizeClasses = {
    sm: "text-sm font-bold",
    md: "text-6xl md:text-8xl",
    lg: "text-8xl md:text-9xl",
    xl: "text-9xl md:text-[12rem]",
  };

  const letterStyles = {
    E: {
      color: "text-yellow-400",
      shadow: `
        0 0 3px #fbbf24,
        0 0 6px #fbbf24
      `,
    },
    WF: {
      color: "text-purple-400",
      shadow: `
        0 0 3px #c084fc,
        0 0 6px #c084fc
      `,
    },
  };

  const style = letterStyles[letter];

  return (
    <div className={cn("flex items-center justify-center pr-2", className)}>
      <span
        className={cn(
          "font-bold select-none transition-all duration-1000 ease-in-out",
          style.color,
          "drop-shadow-sm",
          "animate-pulse hover:animate-none",
          "hover:scale-105 transform-gpu",
          "cursor-default",
          sizeClasses[size]
        )}
        style={{
          textShadow: style.shadow,
          animationDuration: "4s",
        }}
      >
        {letter}
      </span>
    </div>
  );
}

// Convenience components for easier use
export function AnimatedLetterE(props: Omit<AnimatedLetterProps, "letter">) {
  return <AnimatedLetter letter="E" {...props} />;
}

export function AnimatedLetterWF(props: Omit<AnimatedLetterProps, "letter">) {
  return <AnimatedLetter letter="WF" {...props} />;
}
