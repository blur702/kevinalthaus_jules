/**
 * Accessibility hooks for managing focus, announcements, and keyboard navigation
 */

import { useEffect, useRef, useCallback } from 'react';
import { generateId, announceToScreenReader, FocusTrap } from '../utils/accessibility';

/**
 * Hook for managing focus trap in modal dialogs
 * @param isActive - Whether the focus trap should be active
 * @returns Ref to attach to the container element
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (isActive) {
      focusTrapRef.current = new FocusTrap(containerRef.current);
      focusTrapRef.current.activate();
    } else {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
        focusTrapRef.current = null;
      }
    }

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
      }
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Hook for generating stable IDs for form elements
 * @param prefix - Optional prefix for the ID
 * @returns Stable ID string
 */
export const useId = (prefix?: string): string => {
  const idRef = useRef<string>();
  
  if (!idRef.current) {
    idRef.current = generateId(prefix);
  }
  
  return idRef.current;
};

/**
 * Hook for managing announcements to screen readers
 * @returns Function to announce messages
 */
export const useAnnouncer = () => {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);
};

/**
 * Hook for managing keyboard navigation
 * @param options - Configuration options
 * @returns Keyboard event handlers
 */
export const useKeyboardNavigation = (options: {
  onEscape?: () => void;
  onEnter?: () => void;
  onSpace?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
} = {}) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const {
      onEscape,
      onEnter,
      onSpace,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onTab,
    } = options;

    switch (event.key) {
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case 'Enter':
        if (onEnter) {
          event.preventDefault();
          onEnter();
        }
        break;
      case ' ':
        if (onSpace) {
          event.preventDefault();
          onSpace();
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          event.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          event.preventDefault();
          onArrowRight();
        }
        break;
      case 'Tab':
        if (onTab) {
          onTab(event.shiftKey);
        }
        break;
    }
  }, [options]);

  return { onKeyDown: handleKeyDown };
};

/**
 * Hook for managing reduced motion preferences
 * @returns Boolean indicating if user prefers reduced motion
 */
export const useReducedMotion = (): boolean => {
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;

    const handleChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion.current = event.matches;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion.current;
};

/**
 * Hook for managing focus restoration
 * @param isActive - Whether focus restoration should be active
 */
export const useFocusRestore = (isActive: boolean) => {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
    } else {
      if (previouslyFocusedElement.current && document.contains(previouslyFocusedElement.current)) {
        previouslyFocusedElement.current.focus();
      }
    }
  }, [isActive]);
};