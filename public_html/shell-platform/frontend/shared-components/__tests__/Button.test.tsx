import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Save } from '@mui/icons-material';
import { Button } from '../src/components/Buttons';
import { ShellThemeProvider } from '../src/theme';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ShellThemeProvider>
    {children}
  </ShellThemeProvider>
);

describe('Button Component', () => {
  const defaultProps = {
    children: 'Test Button',
  };

  it('renders correctly', () => {
    render(
      <TestWrapper>
        <Button {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByRole('button', { name: /test button/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Button {...defaultProps} onClick={handleClick} />
      </TestWrapper>
    );
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('displays loading state correctly', () => {
    render(
      <TestWrapper>
        <Button {...defaultProps} loading={true} loadingText="Loading..." />
      </TestWrapper>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('does not trigger click when loading', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Button {...defaultProps} loading={true} onClick={handleClick} />
      </TestWrapper>
    );
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with start icon', () => {
    render(
      <TestWrapper>
        <Button {...defaultProps} startIcon={<Save data-testid="save-icon" />} />
      </TestWrapper>
    );
    
    expect(screen.getByTestId('save-icon')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(
      <TestWrapper>
        <Button {...defaultProps} variant="contained" />
      </TestWrapper>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-contained');
    
    rerender(
      <TestWrapper>
        <Button {...defaultProps} variant="outlined" />
      </TestWrapper>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-outlined');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(
      <TestWrapper>
        <Button {...defaultProps} size="small" />
      </TestWrapper>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-sizeSmall');
    
    rerender(
      <TestWrapper>
        <Button {...defaultProps} size="large" />
      </TestWrapper>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-sizeLarge');
  });

  it('handles disabled state', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Button {...defaultProps} disabled onClick={handleClick} />
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies full width style', () => {
    render(
      <TestWrapper>
        <Button {...defaultProps} fullWidth />
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-fullWidth');
  });

  it('has correct accessibility attributes', () => {
    render(
      <TestWrapper>
        <Button 
          {...defaultProps}
          aria-label="Custom label"
          aria-describedby="description"
          testId="test-button"
        />
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
    expect(button).toHaveAttribute('data-testid', 'test-button');
  });

  it('supports different button types', () => {
    const { rerender } = render(
      <TestWrapper>
        <Button {...defaultProps} type="submit" />
      </TestWrapper>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    
    rerender(
      <TestWrapper>
        <Button {...defaultProps} type="reset" />
      </TestWrapper>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'reset');
  });

  it('displays tooltip when provided', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Button {...defaultProps} tooltip="Helpful tooltip" />
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Helpful tooltip');
  });

  it('hides icons when loading', () => {
    render(
      <TestWrapper>
        <Button 
          {...defaultProps} 
          startIcon={<Save data-testid="save-icon" />}
          loading={true}
        />
      </TestWrapper>
    );
    
    expect(screen.queryByTestId('save-icon')).not.toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    
    render(
      <TestWrapper>
        <Button {...defaultProps} ref={ref} />
      </TestWrapper>
    );
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});