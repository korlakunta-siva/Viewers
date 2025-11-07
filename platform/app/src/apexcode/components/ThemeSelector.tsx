import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Icons,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@ohif/ui-next';
import { getAllThemes, getTheme, applyTheme, getSavedTheme, Theme } from '../utils/themes';
import { useTranslation } from 'react-i18next';

/**
 * Theme Selector Component
 * Provides a dropdown to select and switch between different themes
 */
function ThemeSelector() {
  const { t } = useTranslation();
  const [currentTheme, setCurrentTheme] = useState<string>(getSavedTheme());
  const themes = getAllThemes();

  useEffect(() => {
    // Initialize theme on mount
    const savedTheme = getSavedTheme();
    const theme = getTheme(savedTheme);
    applyTheme(theme);
    setCurrentTheme(savedTheme);
  }, []);

  const handleThemeChange = (themeId: string) => {
    const theme = getTheme(themeId);
    applyTheme(theme);
    setCurrentTheme(themeId);
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { themeId } }));
  };

  useEffect(() => {
    // Listen for theme changes from other components
    const handleThemeChange = () => {
      const newTheme = getSavedTheme();
      setCurrentTheme(newTheme);
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  const currentThemeData = getTheme(currentTheme);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:bg-primary-dark mx-2 h-full"
            >
              <Icons.ByName name="color-change" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">
              {t('Header:Select Theme') || 'Select Theme'}
            </div>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {t('Header:Theme') || 'Theme'}
      </TooltipContent>
    </Tooltip>
  );
}

export default ThemeSelector;
