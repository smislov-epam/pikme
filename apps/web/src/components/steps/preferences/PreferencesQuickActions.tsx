import { Button, Stack } from '@mui/material'
import SortIcon from '@mui/icons-material/Sort'

export function PreferencesQuickActions(props: {
  selectedUser: string
  onAutoSort: (username: string) => void
  onMarkRestNeutral: (username: string) => void
}) {
  const { selectedUser, onAutoSort, onMarkRestNeutral } = props

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SortIcon />}
        onClick={() => onAutoSort(selectedUser)}
      >
        Auto-sort by my rating
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => onMarkRestNeutral(selectedUser)}
      >
        Mark rest neutral
      </Button>
    </Stack>
  )
}
