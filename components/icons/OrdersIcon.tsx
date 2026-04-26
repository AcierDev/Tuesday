type OrdersIconProps = {
  className?: string;
};

export function OrdersIcon({ className }: OrdersIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transform: "scaleY(1.1)" }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <rect
          key={i}
          x="4"
          y={6 + i * 9}
          width="56"
          height="7"
          rx="1.5"
        />
      ))}
    </svg>
  );
}
