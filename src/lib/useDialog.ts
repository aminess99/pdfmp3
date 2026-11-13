import { useCallback, useRef } from 'react';

// Keyboard and focus behaviour for a role="dialog" element: Esc closes the topmost dialog,
// focus moves into it when it opens (the first field on a computer, the dialog itself on a
// phone so the keyboard does not pop up), Tab stays inside it, and focus returns to what was
// focused before when it closes.
//
//   const dialogRef = useDialog(onClose);
//   <div role="dialog" ref={dialogRef} ...>
const stack: HTMLElement[] = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function attach(el: HTMLElement, close: () => void): () => void {
  const previous = document.activeElement as HTMLElement | null;
  stack.push(el);
  if (!el.contains(document.activeElement)) {
    const field = el.querySelector<HTMLElement>('input:not([disabled]):not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea:not([disabled])');
    if (field && window.matchMedia?.('(pointer: fine)').matches) field.focus();
    else {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  }
  const onKey = (e: KeyboardEvent) => {
    if (stack[stack.length - 1] !== el) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('keydown', onKey);
    const i = stack.indexOf(el);
    if (i >= 0) stack.splice(i, 1);
    if (previous && previous !== document.body && document.contains(previous)) previous.focus({ preventScroll: true });
  };
}

export function useDialog<T extends HTMLElement = HTMLElement>(onClose?: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const detach = useRef<(() => void) | null>(null);
  return useCallback((el: T | null) => {
    detach.current?.();
    detach.current = el ? attach(el, () => closeRef.current?.()) : null;
  }, []);
}
