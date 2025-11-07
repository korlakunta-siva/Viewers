import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  Icons,
} from '@ohif/ui-next';
import { getAllThemes, getTheme, applyTheme, getSavedTheme } from '../utils/themes';
import { useTranslation } from 'react-i18next';

/**
 * Theme Selector Menu Item Component
 * Provides a submenu in the settings menu to select themes
 */
function ThemeSelectorMenu() {
  const { t } = useTranslation();
  const [currentTheme, setCurrentTheme] = useState<string>(getSavedTheme());
  const themes = getAllThemes();

  useEffect(() => {
    // Update current theme when it changes externally
    const savedTheme = getSavedTheme();
    setCurrentTheme(savedTheme);

    // Listen for theme changes from other components
    const handleStorageChange = () => {
      const newTheme = getSavedTheme();
      setCurrentTheme(newTheme);
    };
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event if theme changes in same window
    const handleThemeChange = () => {
      const newTheme = getSavedTheme();
      setCurrentTheme(newTheme);
    };
    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  const handleThemeChange = (themeId: string) => {
    const theme = getTheme(themeId);
    applyTheme(theme);
    setCurrentTheme(themeId);
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('theme-changed'));
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex items-center gap-2">
          <Icons.ByName name="color-change" className="h-4 w-4" />
          <span>{t('Header:Theme') || 'Theme'}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-[200px]">
          <DropdownMenuLabel>{t('Header:Select Theme') || 'Select Theme'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {themes.map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onSelect={() => handleThemeChange(theme.id)}
              className={`flex items-center gap-2 py-2 ${
                currentTheme === theme.id ? 'bg-primary-dark' : ''
              }`}
            >
              <div
                className="h-4 w-4 rounded border border-gray-600"
                style={{
                  backgroundColor: theme.colors.primary.main,
                  borderColor: theme.colors.primary.light,
                }}
                title={theme.description}
              />
              <span className="flex-1">{theme.name}</span>
            {currentTheme === theme.id && (
              <Icons.Checked className="h-4 w-4 text-primary-light" />
            )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}

export default ThemeSelectorMenu;
