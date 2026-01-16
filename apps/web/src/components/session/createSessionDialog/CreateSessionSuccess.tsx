import {
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export interface CreateSessionSuccessProps {
  sessionLink: string;
  copied: boolean;
  gamesUploaded: number;
  onCopyLink: () => void;
}

export function CreateSessionSuccess(props: CreateSessionSuccessProps) {
  const { sessionLink, copied, gamesUploaded, onCopyLink } = props;

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Share this link with your guests:
      </Typography>

      <TextField
        value={sessionLink}
        fullWidth
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                <IconButton onClick={onCopyLink} edge="end">
                  {copied ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <ContentCopyIcon />
                  )}
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      <Typography variant="caption" color="text.secondary">
        Session expires in 24 hours.
        {gamesUploaded > 0 && ` ${gamesUploaded} games uploaded.`}
      </Typography>
    </Stack>
  );
}
