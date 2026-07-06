import { cn } from "@/lib/utils";

export function LocatorSeal({
  className = "h-24 w-24",
  tracing = false,
}: {
  className?: string;
  tracing?: boolean;
}) {
  const ring = "24,40 58,22 96,44 88,86 44,96 20,70";
  return (
    <svg
      className={cn(className)}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Selo de território com marcador de localização"
    >
      <polygon
        points={ring}
        className="fill-jwblue/10 stroke-jwblue-deep"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {tracing ? (
        <polygon
          points={ring}
          pathLength={100}
          className="seal-trace fill-none stroke-jwblue"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <circle cx="55" cy="60" r="18" className="locator-ping fill-jwblue/25" />
          <circle
            cx="55"
            cy="60"
            r="18"
            className="locator-ping locator-ping--lag fill-jwblue/25"
          />
        </>
      )}
      <circle cx="55" cy="60" r="6.5" className="fill-white" />
      <circle cx="55" cy="60" r="4.5" className="fill-jwblue" />
    </svg>
  );
}
