import React, { useEffect } from 'react';
import '../../tailwind.css';
import '../../assets/styles.css';

export const ThemeWrapper = ({ children }) => {
  useEffect(() => {
    // Initialize theme on app load
    if (typeof window !== 'undefined') {
      // Dynamic import to avoid build issues
      import('../../../../app/src/apexcode/utils/themes')
        .then(({ initializeTheme }) => {
          initializeTheme();
        })
        .catch(() => {
          // Silently fail if theme utils are not available
          console.warn('Theme utilities not available');
        });
    }
  }, []);

  return <React.Fragment>{children}</React.Fragment>;
};
