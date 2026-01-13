import {
  FormControl,
  MenuItem,
  Select,
  Tab,
  Tabs,
} from '@mui/material'
import type { UserRecord } from '../../../db/types'

export function PreferencesUserSelector(props: {
  users: UserRecord[]
  selectedUser: string
  isMobile: boolean
  onChange: (username: string) => void
}) {
  const { users, selectedUser, isMobile, onChange } = props

  if (users.length <= 1) return null

  if (isMobile) {
    return (
      <FormControl fullWidth>
        <Select
          size="small"
          value={selectedUser}
          onChange={(e) => onChange(String(e.target.value))}
          sx={{ bgcolor: 'background.paper', height: 40 }}
        >
          {users.map((user) => (
            <MenuItem key={user.username} value={user.username}>
              {user.displayName || user.username}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  return (
    <Tabs
      value={selectedUser}
      onChange={(_, v) => onChange(String(v))}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        bgcolor: 'background.paper',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: 'divider',
        '& .MuiTab-root': {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 40,
        },
        '& .MuiTab-root.Mui-selected': {
          bgcolor: 'secondary.light',
        },
      }}
    >
      {users.map((user) => (
        <Tab
          key={user.username}
          value={user.username}
          label={user.displayName || user.username}
        />
      ))}
    </Tabs>
  )
}
