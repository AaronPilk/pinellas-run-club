import React from 'react';

import { AppProviders } from '@/app/providers';
import { RootNavigator } from '@/app/navigation/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
