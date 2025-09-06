import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Save, Delete, Download } from '@mui/icons-material';
import { Button } from '../src/components/Buttons';

const meta: Meta<typeof Button> = {
  title: 'Components/Buttons/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A comprehensive button component with loading states, icons, and accessibility features.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'error', 'warning', 'info', 'success'],
    },
    variant: {
      control: { type: 'select' },
      options: ['contained', 'outlined', 'text'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
    onClick: action('button-click'),
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'contained',
    color: 'primary',
    onClick: action('button-click'),
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'outlined',
    color: 'secondary',
    onClick: action('button-click'),
  },
};

export const WithIcon: Story = {
  args: {
    children: 'Save',
    startIcon: <Save />,
    variant: 'contained',
    color: 'primary',
    onClick: action('save-click'),
  },
};

export const Loading: Story = {
  args: {
    children: 'Save',
    loading: true,
    loadingText: 'Saving...',
    variant: 'contained',
    color: 'primary',
    onClick: action('loading-click'),
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
    variant: 'contained',
    onClick: action('disabled-click'),
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button size="small" onClick={action('small-click')}>Small</Button>
      <Button size="medium" onClick={action('medium-click')}>Medium</Button>
      <Button size="large" onClick={action('large-click')}>Large</Button>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button variant="contained" onClick={action('contained-click')}>Contained</Button>
      <Button variant="outlined" onClick={action('outlined-click')}>Outlined</Button>
      <Button variant="text" onClick={action('text-click')}>Text</Button>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Button color="primary" onClick={action('primary-click')}>Primary</Button>
      <Button color="secondary" onClick={action('secondary-click')}>Secondary</Button>
      <Button color="success" onClick={action('success-click')}>Success</Button>
      <Button color="error" onClick={action('error-click')}>Error</Button>
      <Button color="warning" onClick={action('warning-click')}>Warning</Button>
      <Button color="info" onClick={action('info-click')}>Info</Button>
    </div>
  ),
};

export const WithTooltip: Story = {
  args: {
    children: 'Hover for tooltip',
    tooltip: 'This is a helpful tooltip',
    variant: 'outlined',
    onClick: action('tooltip-click'),
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
    variant: 'contained',
    color: 'primary',
    onClick: action('full-width-click'),
  },
  parameters: {
    layout: 'padded',
  },
};