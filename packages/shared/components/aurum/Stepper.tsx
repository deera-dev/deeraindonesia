export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  /** Accessible label for the group, e.g. "Jumlah D-07-OSK". */
  label?: string;
  className?: string;
}

export function Stepper({ value, onChange, min = 0, label, className }: StepperProps) {
  function dec() {
    if (value > min) onChange(value - 1);
  }
  function inc() {
    onChange(value + 1);
  }

  return (
    <div
      className={["aurum-stepper", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label || "Jumlah"}
    >
      <button
        type="button"
        className="aurum-stepper__btn"
        onClick={dec}
        disabled={value <= min}
        aria-label="Kurangi"
      >
        −
      </button>
      <span className="aurum-stepper__value">{value}</span>
      <button type="button" className="aurum-stepper__btn" onClick={inc} aria-label="Tambah">
        +
      </button>
    </div>
  );
}
