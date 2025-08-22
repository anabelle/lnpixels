import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPicker from '../src/components/ColorPicker';

describe('ColorPicker', () => {
  const mockOnColorChange = vi.fn();
  const defaultProps = {
    color: '#ff0000',
    onColorChange: mockOnColorChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render color input field', () => {
    render(<ColorPicker {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /color/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('#ff0000');
  });

  it('should display color preview', () => {
    render(<ColorPicker {...defaultProps} />);
    const preview = screen.getByRole('button', { name: /color preview/i });
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('should call onColorChange when valid hex color is entered', async () => {
    const user = userEvent.setup();
    render(<ColorPicker {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /color/i });
    await user.clear(input);
    await user.type(input, '#00ff00');

    expect(mockOnColorChange).toHaveBeenCalledWith('#00ff00');
  });

  it('should not call onColorChange for invalid hex colors', async () => {
    const user = userEvent.setup();
    render(<ColorPicker {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /color/i });
    await user.clear(input);
    await user.type(input, 'invalid-color');

    expect(mockOnColorChange).not.toHaveBeenCalled();
  });

  it('should handle 3-digit hex colors', async () => {
    const user = userEvent.setup();
    // Start with a different color to ensure callback is triggered
    render(<ColorPicker {...defaultProps} color="#000000" />);

    const input = screen.getByRole('textbox', { name: /color/i });
    await user.clear(input);
    await user.type(input, '#f00');

    // Should be called with the expanded 6-digit version
    expect(mockOnColorChange).toHaveBeenCalledWith('#ff0000');
  });

  it('should handle hex colors without # prefix', async () => {
    const user = userEvent.setup();
    render(<ColorPicker {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /color/i });
    await user.clear(input);
    await user.type(input, '00ff00');

    expect(mockOnColorChange).toHaveBeenCalledWith('#00ff00');
  });

  it('should show error state for invalid colors', async () => {
    const user = userEvent.setup();
    render(<ColorPicker {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /color/i });
    await user.clear(input);
    await user.type(input, 'invalid');

    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should clear error state when valid color is entered', async () => {
    const user = userEvent.setup();
    render(<ColorPicker {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /color/i });

    // Enter invalid color
    await user.clear(input);
    await user.type(input, 'invalid');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    // Enter valid color
    await user.clear(input);
    await user.type(input, '#00ff00');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('should have proper accessibility attributes', () => {
    render(<ColorPicker {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /color/i });
    expect(input).toHaveAttribute('aria-label', 'Color (hex code)');
    expect(input).toHaveAttribute('aria-describedby', 'color-help');

    const helpText = screen.getByText(/enter a hex color code/i);
    expect(helpText).toHaveAttribute('id', 'color-help');
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<ColorPicker {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /color/i });

    // Focus input
    await user.click(input);
    expect(input).toHaveFocus();

    // Clear and type valid color
    await user.clear(input);
    await user.type(input, '#123456');
    expect(mockOnColorChange).toHaveBeenCalledWith('#123456');
  });

  it('should handle color preview click', async () => {
    const user = userEvent.setup();
    render(<ColorPicker {...defaultProps} />);

    const preview = screen.getByRole('button', { name: /color preview/i });
    await user.click(preview);

    // Preview click should focus the input
    const input = screen.getByRole('textbox', { name: /color/i });
    expect(input).toHaveFocus();
  });
});