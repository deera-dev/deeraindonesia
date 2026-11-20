import type { ReactNode } from "react";

export interface BadgeProps {
  status?: "success" | "warning" | "danger" | "info";
  children: ReactNode;
  className?: string;
}

const BADGE_ICON: Record<NonNullable<BadgeProps["status"]>, string> = {
  success: "M9.5 1a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM13 7.2l-4.2 4.6a.8.8 0 01-1.15.03L6 10.2",
  warning: "M9.5 2 1 16h17L9.5 2zM9.5 8v3.5M9.5 14h.01",
  danger: "M9.5 1a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM6.5 6.5l6 6m0-6l-6 6",
  info: "M9.5 1 11.3 7.3 17.5 9.5 11.3 11.7 9.5 18 7.7 11.7 1.5 9.5 7.7 7.3z",
};

export function Badge({ status = "info", children, className }: BadgeProps) {
  return (
    <span
      className={["aurum-badge", `aurum-badge--${status}`, className].filter(Boolean).join(" ")}
    >
      <svg
        viewBox="0 0 19 19"
        width="13"
        height="13"
        aria-hidden="true"
        className={status === "info" ? "aurum-badge-pulse" : undefined}
      >
        <path
          d={BADGE_ICON[status]}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </span>
  );
}
