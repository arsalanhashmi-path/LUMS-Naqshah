/**
 * Theme definitions for light and dark modes
 */

export const themes = {
  dark: {
    name: 'dark',
    background: 'rgba(10, 10, 15, 0.85)',
    backgroundSolid: '#0a0a0f',
    surface: 'rgba(25, 25, 35, 0.9)',
    surfaceHover: 'rgba(40, 40, 55, 0.95)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderHover: 'rgba(255, 255, 255, 0.25)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    accent: '#4cc9f0',
    accentSecondary: '#f72585',
    success: '#2a9d8f',
    danger: '#e63946',
    warning: '#f77f00',
    purple: '#7209b7',
    blue: '#4361ee',
    gradient: 'linear-gradient(135deg, rgba(76, 201, 240, 0.15) 0%, rgba(247, 37, 133, 0.15) 100%)',
    shadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    shadowSmall: '0 8px 32px rgba(0, 0, 0, 0.4)',
    blur: '20px',
    mapStyle: 'dark'
  },
  light: {
    name: 'light',
    background: 'rgba(255, 255, 255, 0.85)',
    backgroundSolid: '#f8f9fa',
    surface: 'rgba(255, 255, 255, 0.95)',
    surfaceHover: 'rgba(248, 249, 250, 1)',
    border: 'rgba(0, 0, 0, 0.1)',
    borderHover: 'rgba(0, 0, 0, 0.2)',
    text: '#1a1a2e',
    textSecondary: 'rgba(26, 26, 46, 0.8)',
    textMuted: 'rgba(26, 26, 46, 0.5)',
    accent: '#0077b6',
    accentSecondary: '#d00057',
    success: '#087f5b',
    danger: '#c92a2a',
    warning: '#e67700',
    purple: '#5f3dc4',
    blue: '#1864ab',
    gradient: 'linear-gradient(135deg, rgba(0, 119, 182, 0.1) 0%, rgba(208, 0, 87, 0.1) 100%)',
    shadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    shadowSmall: '0 8px 32px rgba(0, 0, 0, 0.1)',
    blur: '20px',
    mapStyle: 'light'
  }
};

/**
 * Common style mixins
 */
export const glassPanel = (theme) => ({
  backgroundColor: theme.background,
  backdropFilter: `blur(${theme.blur})`,
  WebkitBackdropFilter: `blur(${theme.blur})`,
  border: `1px solid ${theme.border}`,
  boxShadow: theme.shadow,
  borderRadius: '20px',
});

export const glassButton = (theme, variant = 'default') => {
  const colors = {
    default: { bg: theme.surface, hover: theme.surfaceHover, text: theme.text },
    accent: { bg: theme.accent, hover: theme.accent, text: '#000' },
    danger: { bg: theme.danger, hover: theme.danger, text: '#fff' },
    success: { bg: theme.success, hover: theme.success, text: '#fff' },
    purple: { bg: theme.purple, hover: theme.purple, text: '#fff' },
    blue: { bg: theme.blue, hover: theme.blue, text: '#fff' },
  };
  const c = colors[variant] || colors.default;
  return {
    backgroundColor: c.bg,
    color: c.text,
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
  };
};

export const glassInput = (theme) => ({
  backgroundColor: theme.surface,
  color: theme.text,
  border: `1px solid ${theme.border}`,
  borderRadius: '12px',
  padding: '12px 16px',
  outline: 'none',
  fontSize: '14px',
  transition: 'all 0.2s ease',
});
