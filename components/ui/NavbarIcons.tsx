// Custom sidebar icons not available in lucide-react.

export const SawBladeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12,1 L12.65,3.73 L16.77,2.09 L16.18,4.83 L20.60,5.14 L18.88,7.35 L22.72,9.55 L20.21,10.79 L22.72,14.45 L19.92,14.47 L20.60,18.86 L18.06,17.67 L16.77,21.91 L15.00,19.74 L12,23 L11.35,20.27 L7.23,21.91 L7.82,19.17 L3.40,18.86 L5.12,16.65 L1.28,14.45 L3.79,13.21 L1.28,9.55 L4.08,9.53 L3.40,5.14 L5.94,6.33 L7.23,2.09 L9.00,4.26 Z" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
);

export const Columns5 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M6.6 3v18" />
    <path d="M10.2 3v18" />
    <path d="M13.8 3v18" />
    <path d="M17.4 3v18" />
  </svg>
);
