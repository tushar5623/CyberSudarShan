const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function activateDialog(dialog, onClose) {
  const doc = dialog.ownerDocument;
  const opener = doc.activeElement;
  const overflow = doc.body.style.overflow;
  const backgrounds = [];
  let branch = dialog;
  while (branch.parentElement) {
    const parent = branch.parentElement;
    for (const sibling of parent.children) {
      if (sibling !== branch) {
        backgrounds.push([sibling, sibling.inert]);
        sibling.inert = true;
      }
    }
    if (parent === doc.body) break;
    branch = parent;
  }
  doc.body.style.overflow = 'hidden';
  const controls = () => [...dialog.querySelectorAll(focusable)].filter(element =>
    element.getClientRects().length > 0 && !element.hidden);
  const initial = dialog.querySelector('[data-dialog-initial-focus]') ?? controls()[0] ?? dialog;
  initial.focus({ preventScroll: true });

  function keydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === 'Tab') {
      const items = controls();
      const first = items[0] ?? dialog;
      const last = items.at(-1) ?? dialog;
      if (!items.length || !dialog.contains(doc.activeElement) ||
          (event.shiftKey ? doc.activeElement === first : doc.activeElement === last) ||
          doc.activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  }
  doc.addEventListener('keydown', keydown);
  return () => {
    doc.removeEventListener('keydown', keydown);
    for (const [element, inert] of backgrounds) element.inert = inert;
    doc.body.style.overflow = overflow;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
}
