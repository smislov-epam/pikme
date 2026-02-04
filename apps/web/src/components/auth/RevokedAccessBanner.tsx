/**
 * Revoked Access Banner (REQ-111)
 *
 * Banner shown to users whose access has been revoked by an admin.
 */

import { Alert } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';

export function RevokedAccessBanner() {
  return (
    <Alert severity="error" icon={<BlockIcon />} sx={{ mb: 2 }}>
      Your access has been revoked. You can still view existing data but cannot create new sessions. 
      Please contact an administrator if you believe this is an error.
    </Alert>
  );
}
