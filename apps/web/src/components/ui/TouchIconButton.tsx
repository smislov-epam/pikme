/**
 * TouchIconButton (REQ-111 UX Improvements)
 *
 * A wrapper around MUI IconButton that enforces minimum 44px touch targets
 * for mobile accessibility compliance per WCAG 2.1 guidelines.
 *
 * On desktop, displays as a compact IconButton.
 * On mobile, ensures minimum touch area while keeping visual appearance consistent.
 */

import { forwardRef } from 'react';
import { IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import type { IconButtonProps } from '@mui/material';

export interface TouchIconButtonProps extends Omit<IconButtonProps, 'size'> {
  /** Tooltip text shown on hover (desktop) or long-press (mobile) */
  tooltip?: string;
  /** Placement of the tooltip */
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Accessible icon button with 44px minimum touch target on mobile.
 *
 * @example
 * ```tsx
 * <TouchIconButton
 *   tooltip="Delete item"
 *   color="error"
 *   onClick={handleDelete}
 * >
 *   <DeleteIcon />
 * </TouchIconButton>
 * ```
 */
export const TouchIconButton = forwardRef<
  HTMLButtonElement,
  TouchIconButtonProps
>(function TouchIconButton(
  { tooltip, tooltipPlacement = 'top', sx, ...props },
  ref
) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Minimum 44px touch target on mobile per WCAG 2.1
  const minSize = isMobile ? 44 : undefined;

  const button = (
    <IconButton
      ref={ref}
      size={isMobile ? 'medium' : 'small'}
      sx={{
        minWidth: minSize,
        minHeight: minSize,
        ...sx,
      }}
      {...props}
    />
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement={tooltipPlacement}>
        {button}
      </Tooltip>
    );
  }

  return button;
});
