/**
 * Smoke tests for UI components
 * Verifies that Jest and React Testing Library are working correctly
 */

import { renderWithProviders, screen } from '@/tests/helpers/render';
import { Button } from '@/components/ui/button';
import userEvent from '@testing-library/user-event';

describe('Button Component (Smoke Test)', () => {
  it('should render button with text', () => {
    renderWithProviders(<Button>Click me</Button>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <Button onClick={handleClick}>Click me</Button>
    );

    await user.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    renderWithProviders(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByText('Disabled Button');
    expect(button).toBeDisabled();
  });

  it('should apply variant classes correctly', () => {
    renderWithProviders(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByText('Delete');
    expect(button).toBeInTheDocument();
  });
});
