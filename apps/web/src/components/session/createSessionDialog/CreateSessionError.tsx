import { Alert, Button, Stack } from '@mui/material';

export interface CreateSessionErrorProps {
  error: string | null;
  onTryAgain: () => void;
}

export function CreateSessionError(props: CreateSessionErrorProps) {
  const { error, onTryAgain } = props;

  return (
    <Stack spacing={2}>
      <Alert severity="error">{error}</Alert>
      <Button onClick={onTryAgain} variant="outlined">
        Try Again
      </Button>
    </Stack>
  );
}
