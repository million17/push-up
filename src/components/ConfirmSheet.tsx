import type { ReactNode } from 'react';
import { useT } from '../i18n/useT';
import { Button } from './Button';

interface Props {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm(): void;
  onCancel(): void;
  /** Extra actions shown between confirm and cancel. */
  children?: ReactNode;
}

/** In-app confirmation (no blocking browser dialogs). */
export function ConfirmSheet({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel, children }: Props) {
  const { t } = useT();
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="sheet-title">{title}</h2>
        {message && <p className="muted">{message}</p>}
        <div className="stack">
          <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm}>
            {confirmLabel}
          </Button>
          {children}
          <Button variant="ghost" block onClick={onCancel}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
