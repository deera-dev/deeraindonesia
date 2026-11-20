import type { ReactNode } from "react";

export interface CardProps {
  padding?: "sm" | "md" | "lg";
  /** Adds shadow-sm and drops the hairline border. */
  elevated?: boolean;
  children?: ReactNode;
  className?: string;
}

export function Card({ padding = "md", elevated = false, children, className }: CardProps) {
  return (
    <div
      className={[
        "aurum-card",
        `aurum-card--pad-${padding}`,
        elevated && "aurum-card--elevated",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
