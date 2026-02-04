/**
 * ActionMenu (REQ-111 UX Improvements)
 *
 * A responsive action menu that shows IconButtons on desktop
 * and collapses into a "more" menu on mobile.
 *
 * Provides consistent action handling across list items while
 * maintaining touch-friendly targets on mobile devices.
 */

import { useState } from 'react';
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { ReactElement } from 'react';

export interface ActionItem {
  /** Unique identifier for the action */
  key: string;
  /** Label shown in menu on mobile, used for tooltip on desktop */
  label: string;
  /** Icon to display */
  icon: ReactElement;
  /** Action handler */
  onClick: () => void;
  /** MUI color for the action */
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  /** Whether this action is disabled */
  disabled?: boolean;
  /** Whether this action should be hidden */
  hidden?: boolean;
}

export interface ActionMenuProps {
  /** Array of action items */
  actions: ActionItem[];
  /** Whether any action is currently loading (shows single spinner) */
  loading?: boolean;
  /** Custom loading indicator */
  loadingIndicator?: ReactElement;
}

/**
 * Responsive action menu for list items.
 *
 * @example
 * ```tsx
 * <ActionMenu
 *   actions={[
 *     { key: 'approve', label: 'Approve', icon: <CheckIcon />, onClick: handleApprove, color: 'success' },
 *     { key: 'reject', label: 'Reject', icon: <CloseIcon />, onClick: handleReject, color: 'error' },
 *   ]}
 *   loading={isLoading}
 * />
 * ```
 */
export function ActionMenu({
  actions,
  loading,
  loadingIndicator,
}: ActionMenuProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const visibleActions = actions.filter((a) => !a.hidden);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: ActionItem) => {
    handleMenuClose();
    action.onClick();
  };

  // Show loading indicator
  if (loading && loadingIndicator) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 44 }}>
        {loadingIndicator}
      </Box>
    );
  }

  // Mobile: collapse into overflow menu
  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={handleMenuOpen}
          disabled={loading}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {visibleActions.map((action) => (
            <MenuItem
              key={action.key}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              sx={{
                color: action.color ? `${action.color}.main` : undefined,
                minHeight: 48, // Touch-friendly height
              }}
            >
              <ListItemIcon
                sx={{
                  color: action.color ? `${action.color}.main` : undefined,
                  minWidth: 36,
                }}
              >
                {action.icon}
              </ListItemIcon>
              <ListItemText primary={action.label} />
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  // Desktop: show icon buttons with tooltips
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {visibleActions.map((action) => (
        <Tooltip key={action.key} title={action.label}>
          <span>
            <IconButton
              color={action.color}
              onClick={action.onClick}
              disabled={action.disabled || loading}
              size="small"
            >
              {action.icon}
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
}
