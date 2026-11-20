import { type InputHTMLAttributes, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, type, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasError = !!error;

  return (
    <div className={["aurum-field", className].filter(Boolean).join(" ")}>
      {label && (
        <label className="aurum-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type ?? "text"}
        className={["aurum-field__input", hasError && "aurum-field__input--error"]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError || hint ? `${inputId}-msg` : undefined}
        {...rest}
      />
      {(error || hint) && (
        <p
          id={`${inputId}-msg`}
          className={["aurum-field__msg", hasError && "aurum-field__msg--error"]
            .filter(Boolean)
            .join(" ")}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
