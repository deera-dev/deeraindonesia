import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /** Only meaningful with variant="primary"; use on exactly one button per screen. */
  glow?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    glow = false,
    disabled,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      className={[
        "aurum-btn",
        `aurum-btn--${variant}`,
        `aurum-btn--${size}`,
        glow && variant === "primary" && "aurum-btn--glow",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading && <span className="aurum-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
});
