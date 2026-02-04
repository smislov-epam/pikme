/**
 * DialogHeader (REQ-111 UX Improvements)
 *
 * A standardized dialog header component with colored background and icon.
 * Follows ui-ux-guidelines.md section 9.1 for dialog structure.
 *
 * Supports multiple variants:
 * - default: Ocean blue background (informational/neutral actions)
 * - success: Green background (successful outcomes)
 * - error/destructive: Tinted red background (destructive actions)
 * - warning: Tinted amber background (cautionary actions)
 */

import { alpha, DialogTitle } from '@mui/material';
import type { ReactNode } from 'react';
import { colors } from '../../theme/theme';

export type DialogHeaderVariant =
  | 'default'
  | 'success'
  | 'error'
  | 'destructive'
  | 'warning';

export interface DialogHeaderProps {
  /** Icon to display before the title */
  icon?: ReactNode;
  /** Dialog title text */
  title: string;
  /** Visual variant determining background color */
  variant?: DialogHeaderVariant;
  /** Dialog title ID for accessibility (aria-labelledby) */
  id?: string;
}

/**
 * Get colors for a dialog header variant.
 */
function getVariantColors(variant: DialogHeaderVariant): {
  bgColor: string;
  textColor: string;
} {
  switch (variant) {
    case 'success':
      return {
        bgColor: '#2e7d32',
        textColor: 'white',
      };
    case 'error':
    case 'destructive':
      return {
        bgColor: alpha('#d32f2f', 0.12),
        textColor: '#d32f2f',
      };
    case 'warning':
      return {
        bgColor: alpha('#ed6c02', 0.12),
        textColor: '#ed6c02',
      };
    case 'default':
    default:
      return {
        bgColor: colors.oceanBlue,
        textColor: 'white',
      };
  }
}

/**
 * Standardized dialog header with colored background.
 *
 * @example
 * ```tsx
 * <Dialog open={open} onClose={onClose}>
 *   <DialogHeader
 *     icon={<PersonAddIcon />}
 *     title="Create Invite"
 *     variant="default"
 *   />
 *   <DialogContent>...</DialogContent>
 * </Dialog>
 * ```
 */
export function DialogHeader({
  icon,
  title,
  variant = 'default',
  id,
}: DialogHeaderProps) {
  const { bgColor, textColor } = getVariantColors(variant);

  return (
    <DialogTitle
      id={id}
      sx={{
        bgcolor: bgColor,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.5,
      }}
    >
      {icon}
      {title}
    </DialogTitle>
  );
}
