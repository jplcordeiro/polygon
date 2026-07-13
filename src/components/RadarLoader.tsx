import { cn } from "@/lib/utils";

export function RadarLoader({
  texto,
  className = "h-dvh",
}: {
  texto: string;
  className?: string;
}) {
  return (
    <div className={cn("grid place-items-center bg-paper", className)}>
      <div className="flex flex-col items-center gap-5" role="status">
        <svg
          className="h-16 w-16 text-jwblue"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="50" cy="51" r="20" className="locator-ping fill-jwblue/25" />
          <circle
            cx="50"
            cy="51"
            r="20"
            className="locator-ping locator-ping--lag fill-jwblue/25"
          />
          <path
            d="M20 34 L50 20 L80 34 L80 68 L50 82 L20 68 Z"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="51" r="5.5" fill="currentColor" />
        </svg>
        <p className="text-[0.9rem] tracking-[0.01em] text-ink-soft">{texto}</p>
      </div>
    </div>
  );
}
