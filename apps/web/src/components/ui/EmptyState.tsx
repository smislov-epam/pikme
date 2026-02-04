/**
 * EmptyState (REQ-111 UX Improvements)
 *
 * A standardized empty state component for lists and content areas.
 * Provides consistent visual treatment across the app.
 *
 * Follows ui-ux-guidelines.md for empty state patterns:
 * - Centered icon + message
 * - Optional action button
 * - Muted colors to indicate absence of content
 */

import type { ReactNode, ReactElement } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface EmptyStateProps {
  /** Icon to display above the message */
  icon: ReactElement;
  /** Primary message text */
  message: string;
  /** Optional secondary message or description */
  description?: string;
  /** Optional action button configuration */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'text' | 'outlined' | 'contained';
    icon?: ReactNode;
  };
  /** Whether to wrap in a Paper component (default: true) */
  paper?: boolean;
  /** Additional styles */
  sx?: SxProps<Theme>;
}

/**
 * Standardized empty state display for lists and content areas.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<InboxIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
 *   message="No pending requests"
 *   description="New requests will appear here"
 *   action={{
 *     label: "Refresh",
 *     onClick: handleRefresh,
 *     variant: "outlined"
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  message,
  description,
  action,
  paper = true,
  sx,
}: EmptyStateProps) {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        textAlign: 'center',
        ...(!paper && sx),
      }}
    >
      <Box sx={{ mb: 1, color: 'text.secondary' }}>{icon}</Box>
      <Typography color="text.secondary" fontWeight={500}>
        {message}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, maxWidth: 300 }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant={action.variant || 'text'}
          onClick={action.onClick}
          startIcon={action.icon}
          sx={{ mt: 2 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );

  if (paper) {
    return (
      <Paper variant="outlined" sx={sx}>
        {content}
      </Paper>
    );
  }

  return content;
}
