import * as React from 'react';

/**
 * A higher-order component that adds development-only functionality like
 * `fast-refresh` and `keep-awake` when the app is in development mode.
 */
export function withDevTools<TComponent extends React.ComponentType<any>>(
  AppRootComponent: TComponent
): React.ComponentType<React.ComponentProps<TComponent>> {
  const useOptionalKeepAwake = () => {
    if (__DEV__) {
      try {
        const { useKeepAwake } = require('expo-keep-awake');
        useKeepAwake();
      } catch (e) {
        // Ignore if the module is not available
      }
    }
  };

  function WithDevTools(props: React.ComponentProps<TComponent>) {
    useOptionalKeepAwake();
    return <AppRootComponent {...props} />;
  }

  if (__DEV__) {
    const name = AppRootComponent.displayName || AppRootComponent.name || 'Anonymous';
    WithDevTools.displayName = `withDevTools(${name})`;
  }

  return WithDevTools;
}

// Also export as default for compatibility
export default withDevTools; 