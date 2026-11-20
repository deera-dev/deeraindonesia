import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div className="aurum-modal-overlay" role="presentation">
      <div className="aurum-modal-scrim" onClick={onClose} />
      <div className="aurum-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="aurum-modal__header">
          <h2 className="aurum-modal__title">{title}</h2>
          <button type="button" className="aurum-modal__close" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M2 2l12 12M14 2L2 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="aurum-modal__body">{children}</div>
        {footer && <div className="aurum-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
