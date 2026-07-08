import React from 'react';

import { AppProviders } from '@/core/providers';
import { RootNavigator } from '@/core/navigation/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
