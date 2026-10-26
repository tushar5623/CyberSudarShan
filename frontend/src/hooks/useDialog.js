import { useEffect, useRef } from 'react';
import { activateDialog } from '../lib/dialog.js';

export function useDialog(open, onClose) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (open && dialog.current) return activateDialog(dialog.current, () => close.current());
  }, [open]);
  return dialog;
}
