import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppConfig } from '@state';

/**
 * Component that redirects to the appropriate entry point based on AppEntry config
 * If AppEntry is "local" or "localonly", redirects to /local
 * Otherwise, stays at / (study list)
 */
function AppEntryRedirect() {
  const [appConfig] = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're at the root path
    if (location.pathname === '/' || location.pathname === '') {
      const appEntry = appConfig?.AppEntry;

      if (appEntry === 'local' || appEntry === 'localonly') {
        navigate('/local', { replace: true });
      }
      // If AppEntry is not "local"/"localonly" or missing, stay at / (study list)
    }
  }, [location.pathname, navigate, appConfig]);

  return null;
}

export default AppEntryRedirect;
