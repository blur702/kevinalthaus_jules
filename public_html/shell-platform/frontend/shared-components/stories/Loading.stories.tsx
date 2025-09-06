import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Loading } from '../src/components/Feedback';

const meta: Meta<typeof Loading> = {
  title: 'Components/Feedback/Loading',
  component: Loading,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A comprehensive loading component with multiple variants and customization options.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['circular', 'linear', 'skeleton', 'backdrop', 'inline', 'pulse', 'dots'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'inherit'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const SampleContent = () => (
  <Card>
    <CardContent>
      <Typography variant="h5" gutterBottom>
        Sample Content
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This is the content that appears when loading is complete.
        It demonstrates how the Loading component wraps and shows/hides content.
      </Typography>
    </CardContent>
  </Card>
);

export const Default: Story = {
  args: {
    loading: true,
  },
};

export const WithMessage: Story = {
  args: {
    loading: true,
    message: 'Loading data...',
  },
};

export const WithContent: Story = {
  args: {
    loading: false,
    children: <SampleContent />,
  },
};

export const LoadingWithContent: Story = {
  args: {
    loading: true,
    message: 'Loading content...',
    children: <SampleContent />,
  },
};

export const Circular: Story = {
  args: {
    variant: 'circular',
    loading: true,
    message: 'Loading...',
  },
};

export const Linear: Story = {
  args: {
    variant: 'linear',
    loading: true,
    message: 'Processing...',
  },
  parameters: {
    layout: 'padded',
  },
};

export const LinearWithProgress: Story = {
  args: {
    variant: 'linear',
    loading: true,
    value: 65,
    message: 'Uploading... 65%',
  },
  parameters: {
    layout: 'padded',
  },
};

export const Skeleton: Story = {
  args: {
    variant: 'skeleton',
    loading: true,
    skeletonLines: 3,
    skeletonVariant: 'text',
    children: <SampleContent />,
  },
  parameters: {
    layout: 'padded',
  },
};

export const SkeletonRectangular: Story = {
  args: {
    variant: 'skeleton',
    loading: true,
    skeletonVariant: 'rectangular',
    skeletonHeight: 200,
    children: <SampleContent />,
  },
  parameters: {
    layout: 'padded',
  },
};

export const Backdrop: Story = {
  args: {
    variant: 'backdrop',
    loading: true,
    message: 'Processing your request...',
    children: <SampleContent />,
  },
};

export const Inline: Story = {
  render: () => (
    <Typography variant="body1">
      Processing your request{' '}
      <Loading variant="inline" size="small" loading={true} />
      {' '}please wait...
    </Typography>
  ),
};

export const Pulse: Story = {
  args: {
    variant: 'pulse',
    loading: true,
    size: 'large',
    message: 'Syncing data...',
  },
};

export const Dots: Story = {
  args: {
    variant: 'dots',
    loading: true,
    message: 'Loading...',
  },
};

export const Sizes: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Loading variant="circular" size="small" loading={true} />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Small
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Loading variant="circular" size="medium" loading={true} />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Medium
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Loading variant="circular" size="large" loading={true} />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Large
        </Typography>
      </Box>
    </Box>
  ),
};

export const CustomSize: Story = {
  args: {
    variant: 'circular',
    loading: true,
    size: 80,
    message: 'Custom size loading...',
  },
};

export const Colors: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Loading variant="circular" color="primary" loading={true} />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Primary
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Loading variant="circular" color="secondary" loading={true} />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Secondary
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Loading variant="circular" color="inherit" loading={true} />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Inherit
        </Typography>
      </Box>
    </Box>
  ),
};