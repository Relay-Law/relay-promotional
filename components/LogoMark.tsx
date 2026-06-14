type LogoMarkProps = {
  variant?: "nav" | "footer";
  className?: string;
};

/** Relay mark from `public/relay-logos/white_logo.svg` — tuned for dark backgrounds. */
export function LogoMark({ variant = "nav", className = "" }: LogoMarkProps) {
  const height = variant === "footer" ? 20 : 28;
  const width = Math.round((height * 10) / 11);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 10 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${variant === "footer" ? "opacity-40" : ""} ${className}`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 0H10V4.85532C7.37471 4.5735 5.29021 2.54932 5 0ZM5 11C5.29021 8.45068 7.37471 6.4265 10 6.14468V11H5Z"
        fill="currentColor"
      />
      <path
        d="M3.35164 0H2.64836H-1.78814e-07V4.85532V6.14468V11H2.64836H3.35164C3.50536 8.45068 4.60946 6.42649 6 6.14468V4.85532C4.60946 4.5735 3.50536 2.54932 3.35164 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
