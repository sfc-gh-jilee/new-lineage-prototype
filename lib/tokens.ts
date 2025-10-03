/**
 * Design Token Utility
 * Access CSS custom properties (design tokens) from JavaScript/TypeScript
 */

// Type definitions for token categories
interface ColorTokens {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
  error: string;
  warning: string;
  success: string;
}

interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

interface RadiusTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
}

interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
}

/**
 * Get CSS custom property value
 * @param property - CSS custom property name (with or without --)
 * @param element - Element to get computed style from (defaults to document.documentElement)
 * @returns The computed value of the CSS custom property
 */
export function getToken(property: string, element?: Element): string {
  const prop = property.startsWith('--') ? property : `--${property}`;
  const el = element || document.documentElement;
  return getComputedStyle(el).getPropertyValue(prop).trim();
}

/**
 * Design tokens object - dynamically reads from CSS custom properties
 * Usage: tokens.colors.primary, tokens.spacing.md, etc.
 */
export const tokens: DesignTokens = {
  colors: {
    get primary() { return getToken('--color-primary'); },
    get secondary() { return getToken('--color-secondary'); },
    get background() { return getToken('--bg-primary'); },
    get text() { return getToken('--text-primary'); },
    get border() { return getToken('--border-primary'); },
    get error() { return getToken('--red-600'); },
    get warning() { return getToken('--yellow-600'); },
    get success() { return getToken('--green-600'); },
  },
  spacing: {
    get xs() { return getToken('--space-1'); },
    get sm() { return getToken('--space-2'); },
    get md() { return getToken('--space-3'); },
    get lg() { return getToken('--space-4'); },
    get xl() { return getToken('--space-6'); },
  },
  radius: {
    get sm() { return getToken('--radius-sm'); },
    get md() { return getToken('--radius-md'); },
    get lg() { return getToken('--radius-lg'); },
    get xl() { return getToken('--radius-xl'); },
  },
  shadows: {
    get sm() { return getToken('--shadow-sm'); },
    get md() { return getToken('--shadow'); },
    get lg() { return getToken('--shadow-lg'); },
  }
};

/**
 * Create inline styles using design tokens
 * @param styles - Style object with token references
 * @returns React inline style object
 * 
 * @example
 * const styles = createTokenStyles({
 *   backgroundColor: tokens.colors.background,
 *   padding: tokens.spacing.md,
 *   borderRadius: tokens.radius.lg,
 *   boxShadow: tokens.shadows.md
 * });
 */
export function createTokenStyles(styles: Record<string, string>): React.CSSProperties {
  return styles as React.CSSProperties;
}

/**
 * Spacing utilities - common spacing patterns
 */
export const spacing = {
  get none() { return '0'; },
  get xs() { return getToken('--space-1'); },
  get sm() { return getToken('--space-2'); },
  get md() { return getToken('--space-3'); },
  get lg() { return getToken('--space-4'); },
  get xl() { return getToken('--space-6'); },
  get xxl() { return getToken('--space-8'); },
};

/**
 * Common style patterns using tokens
 */
export const stylePatterns = {
  popover: {
    get base() {
      return createTokenStyles({
        position: 'absolute',
        backgroundColor: getToken('--bg-primary'),
        borderRadius: getToken('--radius-lg'),
        padding: getToken('--space-3'),
        boxShadow: getToken('--shadow'),
        fontSize: getToken('--text-sm'),
        lineHeight: getToken('--leading-normal'),
        pointerEvents: 'none',
        zIndex: getToken('--z-max'),
      });
    },
    get dataQuality() {
      return createTokenStyles({
        ...this.base,
        background: '#fbfbfb',
        boxShadow: '0 4px 16px rgba(25, 30, 36, 0.2)',
        minWidth: '200px',
        maxWidth: '250px',
      });
    }
  },
  interactive: {
    get help() {
      return createTokenStyles({
        position: 'relative',
        cursor: 'help',
      });
    }
  }
};
