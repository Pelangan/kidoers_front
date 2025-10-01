/**
 * Custom render function for testing React components
 * Wraps components with necessary providers
 */

import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement, ReactNode } from 'react';

/**
 * Custom render function that wraps components with providers
 * 
 * Usage:
 *   import { renderWithProviders } from '@/tests/helpers/render';
 *   
 *   it('should render component', () => {
 *     const { getByText } = renderWithProviders(<MyComponent />);
 *     expect(getByText('Hello')).toBeInTheDocument();
 *   });
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Wrapper component that provides context
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <>
        {/* Add providers here as needed, e.g.:
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </QueryClientProvider>
        */}
        {children}
      </>
    );
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { userEvent };

