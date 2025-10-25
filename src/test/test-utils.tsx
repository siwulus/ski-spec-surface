import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement } from 'react';

/**
 * Custom render function that wraps components with necessary providers
 * Add providers here as needed (e.g., ThemeProvider, QueryClientProvider, etc.)
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  // For now, just render without additional providers
  // Add providers as wrapper when needed:
  // const Wrapper = ({ children }: { children: React.ReactNode }) => (
  //   <ThemeProvider>{children}</ThemeProvider>
  // );

  return render(ui, { ...options });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
