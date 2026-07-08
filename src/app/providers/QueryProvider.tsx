import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { queryClient } from '@/lib/queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
