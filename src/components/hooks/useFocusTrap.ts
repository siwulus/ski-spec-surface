import { useEffect, type RefObject } from 'react';

/**
 * Custom hook for implementing focus trap in modal dialogs
 *
 * @param dialogRef - Ref to the dialog container element
 * @param isOpen - Whether the dialog is currently open
 * @param returnFocusRef - Optional ref to element that should receive focus on close
 */
export const useFocusTrap = (
  dialogRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  returnFocusRef?: RefObject<HTMLElement | null>
) => {
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    // Store the element that had focus before opening
    const previouslyFocusedElement = document.activeElement as HTMLElement;

    // Get all focusable elements within the dialog
    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const focusableArray = Array.from(focusableElements);
    const firstElement = focusableArray[0];
    const lastElement = focusableArray[focusableArray.length - 1];

    // Handle Tab key for focus trap
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Shift + Tab on first element -> focus last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
      // Tab on last element -> focus first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    // Add event listener
    dialogRef.current.addEventListener('keydown', handleTabKey);

    // Focus first element when modal opens
    firstElement?.focus();

    // Cleanup: remove listener and return focus
    return () => {
      dialogRef.current?.removeEventListener('keydown', handleTabKey);

      // Return focus to trigger button or previously focused element
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus();
      } else if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen, dialogRef, returnFocusRef]);
};
