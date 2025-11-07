/**
 * Theme definitions for Apex Medical Image Viewer
 * Provides multiple color schemes suitable for medical imaging
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: {
      light: string;
      main: string;
      dark: string;
      active: string;
    };
    secondary: {
      light: string;
      main: string;
      dark: string;
      active: string;
    };
    background: {
      low: string;
      med: string;
      full: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    common: {
      bright: string;
      light: string;
      main: string;
      dark: string;
      active: string;
    };
  };
}

export const themes: Record<string, Theme> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark theme optimized for medical imaging',
    colors: {
      primary: {
        light: '#5acce6',
        main: '#0944b3',
        dark: '#090c29',
        active: '#348cfd',
      },
      secondary: {
        light: '#3a3f99',
        main: '#2b166b',
        dark: '#041c4a', // Dark enough for good contrast
        active: '#1f1f27',
      },
      background: {
        low: '#050615',
        med: '#090C29',
        full: '#041C4A',
      },
      text: {
        primary: '#ffffff', // Pure white for maximum contrast
        secondary: '#a19fad',
        disabled: '#726f7e',
      },
      common: {
        bright: '#ffffff', // Pure white for icons
        light: '#a19fad',
        main: '#ffffff', // Pure white for main text
        dark: '#726f7e',
        active: '#2c3074',
      },
    },
  },
  light: {
    id: 'light',
    name: 'Light',
    description: 'Light theme for bright environments',
    colors: {
      primary: {
        light: '#348cfd',
        main: '#0944b3',
        dark: '#062d7a',
        active: '#1a5fd6',
      },
      secondary: {
        light: '#e2e8f0',
        main: '#cbd5e0',
        dark: '#718096', // Darker for better contrast with text
        active: '#a0aec0',
      },
      background: {
        low: '#f7fafc',
        med: '#edf2f7',
        full: '#e2e8f0',
      },
      text: {
        primary: '#1a202c', // Dark text for light backgrounds
        secondary: '#2d3748',
        disabled: '#718096',
      },
      common: {
        bright: '#000000', // Black for maximum contrast
        light: '#2d3748',
        main: '#1a202c', // Dark text for readability
        dark: '#4a5568',
        active: '#0944b3',
      },
    },
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    description: 'Cool blue theme for extended viewing sessions',
    colors: {
      primary: {
        light: '#7dd3fc',
        main: '#0ea5e9',
        dark: '#0369a1',
        active: '#0284c7',
      },
      secondary: {
        light: '#64748b',
        main: '#1e293b',
        dark: '#0f172a', // Much darker for better contrast with white text/icons
        active: '#334155',
      },
      background: {
        low: '#0c1220',
        med: '#1e293b',
        full: '#334155',
      },
      text: {
        primary: '#ffffff', // Pure white for maximum contrast
        secondary: '#e0f2fe',
        disabled: '#94a3b8',
      },
      common: {
        bright: '#ffffff', // Pure white for icons and bright text
        light: '#e0f2fe',
        main: '#ffffff', // Pure white for main text
        dark: '#94a3b8',
        active: '#0ea5e9',
      },
    },
  },
  green: {
    id: 'green',
    name: 'Green',
    description: 'Green theme for reduced eye strain',
    colors: {
      primary: {
        light: '#86efac',
        main: '#22c55e',
        dark: '#15803d',
        active: '#16a34a',
      },
      secondary: {
        light: '#4ade80',
        main: '#166534', // Darker green for better contrast
        dark: '#0f4c1f', // Very dark green for header
        active: '#22c55e',
      },
      background: {
        low: '#0a1f0a',
        med: '#1a2e1a',
        full: '#2d3e2d',
      },
      text: {
        primary: '#dcfce7', // Light green text for dark backgrounds
        secondary: '#bbf7d0',
        disabled: '#86efac',
      },
      common: {
        bright: '#f0fdf4', // Very light green for icons
        light: '#bbf7d0',
        main: '#dcfce7', // Light green for main text
        dark: '#86efac',
        active: '#22c55e',
      },
    },
  },
};

export const defaultTheme = 'blue';

/**
 * Get theme by ID
 */
export function getTheme(themeId: string): Theme {
  return themes[themeId] || themes[defaultTheme];
}

/**
 * Get all available themes
 */
export function getAllThemes(): Theme[] {
  return Object.values(themes);
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  // Apply CSS custom properties for theme variables
  root.style.setProperty('--theme-primary-light', theme.colors.primary.light);
  root.style.setProperty('--theme-primary-main', theme.colors.primary.main);
  root.style.setProperty('--theme-primary-dark', theme.colors.primary.dark);
  root.style.setProperty('--theme-primary-active', theme.colors.primary.active);

  root.style.setProperty('--theme-secondary-light', theme.colors.secondary.light);
  root.style.setProperty('--theme-secondary-main', theme.colors.secondary.main);
  root.style.setProperty('--theme-secondary-dark', theme.colors.secondary.dark);
  root.style.setProperty('--theme-secondary-active', theme.colors.secondary.active);

  root.style.setProperty('--theme-background-low', theme.colors.background.low);
  root.style.setProperty('--theme-background-med', theme.colors.background.med);
  root.style.setProperty('--theme-background-full', theme.colors.background.full);

  root.style.setProperty('--theme-text-primary', theme.colors.text.primary);
  root.style.setProperty('--theme-text-secondary', theme.colors.text.secondary);
  root.style.setProperty('--theme-text-disabled', theme.colors.text.disabled);

  root.style.setProperty('--theme-common-bright', theme.colors.common.bright);
  root.style.setProperty('--theme-common-light', theme.colors.common.light);
  root.style.setProperty('--theme-common-main', theme.colors.common.main);
  root.style.setProperty('--theme-common-dark', theme.colors.common.dark);
  root.style.setProperty('--theme-common-active', theme.colors.common.active);

  // Override Tailwind colors directly using CSS variables that Tailwind can use
  // This ensures the theme actually changes the UI
  root.style.setProperty('--primary-light', theme.colors.primary.light);
  root.style.setProperty('--primary-main', theme.colors.primary.main);
  root.style.setProperty('--primary-dark', theme.colors.primary.dark);
  root.style.setProperty('--primary-active', theme.colors.primary.active);

  root.style.setProperty('--secondary-light', theme.colors.secondary.light);
  root.style.setProperty('--secondary-main', theme.colors.secondary.main);
  root.style.setProperty('--secondary-dark', theme.colors.secondary.dark);
  root.style.setProperty('--secondary-active', theme.colors.secondary.active);

  // Update background colors
  root.style.setProperty('--bkg-low', theme.colors.background.low);
  root.style.setProperty('--bkg-med', theme.colors.background.med);
  root.style.setProperty('--bkg-full', theme.colors.background.full);

  // Update common colors
  root.style.setProperty('--common-bright', theme.colors.common.bright);
  root.style.setProperty('--common-light', theme.colors.common.light);
  root.style.setProperty('--common-main', theme.colors.common.main);
  root.style.setProperty('--common-dark', theme.colors.common.dark);
  root.style.setProperty('--common-active', theme.colors.common.active);

  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme.id);

  // Also set a class for easier CSS targeting
  root.className = root.className.replace(/\btheme-\w+/g, '');
  root.classList.add(`theme-${theme.id}`);

  // Store in localStorage to persist user selection
  try {
    localStorage.setItem('apex-theme', theme.id);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }

  // Also update body element for better theme propagation
  const body = document.body;
  body.setAttribute('data-theme', theme.id);
  body.className = body.className.replace(/\btheme-\w+/g, '');
  body.classList.add(`theme-${theme.id}`);

  // Update OHIF-specific CSS variables that might be used
  root.style.setProperty('--background', theme.colors.background.low);
  root.style.setProperty('--foreground', theme.colors.text.primary);
  root.style.setProperty('--card', theme.colors.background.med);
  root.style.setProperty('--card-foreground', theme.colors.text.primary);
  root.style.setProperty('--popover', theme.colors.background.med);
  root.style.setProperty('--popover-foreground', theme.colors.text.primary);
  root.style.setProperty('--muted', theme.colors.secondary.main);
  root.style.setProperty('--muted-foreground', theme.colors.text.secondary);
  root.style.setProperty('--accent', theme.colors.secondary.dark);
  root.style.setProperty('--accent-foreground', theme.colors.text.primary);
  root.style.setProperty('--border', theme.colors.secondary.dark);
  root.style.setProperty('--input', theme.colors.secondary.main);
  root.style.setProperty('--ring', theme.colors.primary.main);

  // Dispatch custom event for components listening to theme changes
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { themeId: theme.id } }));

  // Force a repaint to ensure changes are visible
  root.style.display = 'none';
  root.offsetHeight; // Trigger reflow
  root.style.display = '';
}

/**
 * Get saved theme from localStorage
 * Returns the user's saved theme preference, or defaultTheme if none is saved
 */
export function getSavedTheme(): string {
  try {
    const saved = localStorage.getItem('apex-theme');
    // Validate that the saved theme exists in our themes object
    if (saved && themes[saved]) {
      return saved;
    }
    // If no valid theme is saved, return default (blue)
    return defaultTheme;
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
    return defaultTheme;
  }
}

/**
 * Initialize theme on app load
 * Loads the user's saved theme preference from localStorage, or uses defaultTheme
 */
export function initializeTheme(): void {
  const themeId = getSavedTheme(); // This will return saved theme or defaultTheme (blue)
  const theme = getTheme(themeId);
  applyTheme(theme);
  console.log(`Theme initialized: ${themeId} (${theme.name})`);
}
