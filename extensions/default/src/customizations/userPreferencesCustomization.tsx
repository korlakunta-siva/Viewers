import React, { useState } from 'react';
import { useSystem, hotkeys as hotkeysModule } from '@ohif/core';
import { UserPreferencesModal, FooterAction, Switch, Label } from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';
import i18n from '@ohif/i18n';
import { useAppConfig } from '@state';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@ohif/ui-next';

const USER_PREFERENCES_KEY = 'ohif-user-preferences';

// Helper functions to read/write user preferences from localStorage
const getUserPreferences = () => {
  try {
    const stored = localStorage.getItem(USER_PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to read user preferences from localStorage:', error);
    return {};
  }
};

const setUserPreferences = (preferences) => {
  try {
    localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save user preferences to localStorage:', error);
  }
};

const { availableLanguages, defaultLanguage, currentLanguage: currentLanguageFn } = i18n;

interface HotkeyDefinition {
  keys: string;
  label: string;
}

interface HotkeyDefinitions {
  [key: string]: HotkeyDefinition;
}

function UserPreferencesModalDefault({ hide }: { hide: () => void }) {
  const { hotkeysManager } = useSystem();
  const { t } = useTranslation('UserPreferencesModal');
  const [appConfig, setAppConfig] = useAppConfig();

  const { hotkeyDefinitions = {}, hotkeyDefaults = {} } = hotkeysManager;

  const currentLanguage = currentLanguageFn();
  const userPreferences = getUserPreferences();

  const [state, setState] = useState({
    hotkeyDefinitions: hotkeyDefinitions as HotkeyDefinitions,
    languageValue: currentLanguage.value,
    autoPlayCine: userPreferences.autoPlayCine ?? appConfig?.autoPlayCine ?? true,
  });

  const onLanguageChangeHandler = (value: string) => {
    setState(state => ({ ...state, languageValue: value }));
  };

  const onHotkeyChangeHandler = (id: string, newKeys: string) => {
    setState(state => ({
      ...state,
      hotkeyDefinitions: {
        ...state.hotkeyDefinitions,
        [id]: {
          ...state.hotkeyDefinitions[id],
          keys: newKeys,
        },
      },
    }));
  };

  const onAutoPlayCineChange = (checked: boolean) => {
    setState(state => ({
      ...state,
      autoPlayCine: checked,
    }));
  };

  const onResetHandler = () => {
    setState(state => ({
      ...state,
      languageValue: defaultLanguage.value,
      hotkeyDefinitions: hotkeyDefaults as HotkeyDefinitions,
      autoPlayCine: true,
    }));

    hotkeysManager.restoreDefaultBindings();
  };

  return (
    <UserPreferencesModal>
      <UserPreferencesModal.Body>
        {/* Language Section */}
        <div className="mb-3 flex items-center space-x-14">
          <UserPreferencesModal.SubHeading>{t('Language')}</UserPreferencesModal.SubHeading>
          <Select
            defaultValue={state.languageValue}
            onValueChange={onLanguageChangeHandler}
          >
            <SelectTrigger
              className="w-60"
              aria-label="Language"
            >
              <SelectValue placeholder={t('Select language')} />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map(lang => (
                <SelectItem
                  key={lang.value}
                  value={lang.value}
                >
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto-play Cine Section */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex flex-col">
            <UserPreferencesModal.SubHeading>{t('Auto-play Cine')}</UserPreferencesModal.SubHeading>
            <Label className="text-muted-foreground mt-1 text-sm">
              {t('Auto-play Cine Description')}
            </Label>
          </div>
          <Switch
            checked={state.autoPlayCine}
            onCheckedChange={onAutoPlayCineChange}
            aria-label={t('Auto-play Cine')}
          />
        </div>

        <UserPreferencesModal.SubHeading>{t('Hotkeys')}</UserPreferencesModal.SubHeading>
        <UserPreferencesModal.HotkeysGrid>
          {Object.entries(state.hotkeyDefinitions).map(([id, definition]) => (
            <UserPreferencesModal.Hotkey
              key={id}
              label={t(definition.label)}
              value={definition.keys}
              onChange={newKeys => onHotkeyChangeHandler(id, newKeys)}
              placeholder={definition.keys}
              hotkeys={hotkeysModule}
            />
          ))}
        </UserPreferencesModal.HotkeysGrid>
      </UserPreferencesModal.Body>
      <FooterAction>
        <FooterAction.Left>
          <FooterAction.Auxiliary onClick={onResetHandler}>
            {t('Reset to defaults')}
          </FooterAction.Auxiliary>
        </FooterAction.Left>
        <FooterAction.Right>
          <FooterAction.Secondary
            onClick={() => {
              hotkeysModule.stopRecord();
              hotkeysModule.unpause();
              hide();
            }}
          >
            {t('Cancel')}
          </FooterAction.Secondary>
          <FooterAction.Primary
            onClick={() => {
              if (state.languageValue !== currentLanguage.value) {
                i18n.changeLanguage(state.languageValue);
              }
              hotkeysManager.setHotkeys(state.hotkeyDefinitions);

              // Save autoPlayCine preference
              const preferences = {
                ...getUserPreferences(),
                autoPlayCine: state.autoPlayCine,
              };
              setUserPreferences(preferences);

              // Update appConfig dynamically
              setAppConfig({
                ...appConfig,
                autoPlayCine: state.autoPlayCine,
              });

              hotkeysModule.stopRecord();
              hotkeysModule.unpause();
              hide();
            }}
          >
            {t('Save')}
          </FooterAction.Primary>
        </FooterAction.Right>
      </FooterAction>
    </UserPreferencesModal>
  );
}

export default {
  'ohif.userPreferencesModal': UserPreferencesModalDefault,
};
