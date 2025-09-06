/**
 * Accessibility utility functions
 * Provides helpers for WCAG 2.1 AA compliance
 */

/**
 * Generates a unique ID for form elements and ARIA relationships
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export const generateId = (prefix = 'shell'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates ARIA attributes for form fields
 * @param fieldName - Name of the form field
 * @param options - Configuration options
 * @returns Object with ARIA attributes
 */
export const createAriaAttributes = (
  fieldName: string,
  options: {
    required?: boolean;
    invalid?: boolean;
    describedBy?: string[];
    labelledBy?: string[];
  } = {}
) => {
  const { required = false, invalid = false, describedBy = [], labelledBy = [] } = options;

  const attributes: Record<string, any> = {};

  if (required) {
    attributes['aria-required'] = true;
  }

  if (invalid) {
    attributes['aria-invalid'] = true;
  }

  if (describedBy.length > 0) {
    attributes['aria-describedby'] = describedBy.join(' ');
  }

  if (labelledBy.length > 0) {
    attributes['aria-labelledby'] = labelledBy.join(' ');
  }

  return attributes;
};

/**
 * Manages focus trap for modal dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private focusableElements: HTMLElement[];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.focusableElements = this.getFocusableElements();
    this.updateFocusableElements();
  }

  /**
   * Gets all focusable elements within the container
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'a[href]',
      'area[href]',
      'iframe',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(this.element.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Updates the focusable elements list
   */
  private updateFocusableElements(): void {
    this.focusableElements = this.getFocusableElements();
    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  /**
   * Handles keydown events for focus trapping
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;

    this.updateFocusableElements();

    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };

  /**
   * Activates the focus trap
   */
  activate(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.element.addEventListener('keydown', this.handleKeyDown);
    
    // Focus the first focusable element
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    } else {
      // If no focusable elements, focus the container itself
      this.element.focus();
    }
  }

  /**
   * Deactivates the focus trap
   */
  deactivate(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown);
    
    // Restore focus to previously focused element
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }
  }
}

/**
 * Announces text to screen readers
 * @param message - Message to announce
 * @param priority - Announcement priority (polite or assertive)
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;

  document.body.appendChild(announcer);
  announcer.textContent = message;

  // Remove the announcer after a short delay
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
};

/**
 * Checks if an element is visible to screen readers
 * @param element - Element to check
 * @returns True if visible to screen readers
 */
export const isVisibleToScreenReader = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  const isHidden = 
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    element.hasAttribute('aria-hidden') ||
    element.hidden;
  
  return !isHidden;
};

/**
 * Creates skip link functionality
 * @param targetId - ID of the element to skip to
 * @param linkText - Text for the skip link
 * @returns Skip link element
 */
export const createSkipLink = (targetId: string, linkText: string): HTMLElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = linkText;
  skipLink.className = 'skip-link';
  
  // Style the skip link to be visually hidden until focused
  skipLink.style.cssText = `
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
    z-index: 999999;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    text-decoration: none;
    font-weight: bold;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.cssText = `
      position: absolute;
      left: 6px;
      top: 6px;
      width: auto;
      height: auto;
      overflow: visible;
      z-index: 999999;
      background: #000;
      color: #fff;
      padding: 8px 16px;
      text-decoration: none;
      font-weight: bold;
      border-radius: 4px;
    `;
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.cssText = `
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
      z-index: 999999;
      background: #000;
      color: #fff;
      padding: 8px 16px;
      text-decoration: none;
      font-weight: bold;
    `;
  });

  return skipLink;
};

/**
 * Manages reduced motion preferences
 * @returns True if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Creates ARIA live region for dynamic content updates
 * @param priority - Live region priority
 * @param atomic - Whether updates should be announced atomically
 * @returns Live region element
 */
export const createLiveRegion = (
  priority: 'polite' | 'assertive' = 'polite',
  atomic = true
): HTMLElement => {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', atomic.toString());
  liveRegion.className = 'sr-only';
  liveRegion.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;

  return liveRegion;
};