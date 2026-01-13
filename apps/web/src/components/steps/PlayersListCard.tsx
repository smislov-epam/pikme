import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import RefreshIcon from '@mui/icons-material/Refresh'
import PersonIcon from '@mui/icons-material/Person'
import type { UserRecord } from '../../db/types'
import { colors } from '../../theme/theme'

export function PlayersListCard(props: {
  users: UserRecord[]
  gameOwners: Record<number, string[]>
  onSetOrganizer: (username: string) => void
  onRequestDelete: (username: string) => void
}) {
  const { users, gameOwners, onSetOrganizer, onRequestDelete } = props

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Players ({users.length}) {users.find((u) => u.isOrganizer) && '• Host pinned first'}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {users.map((user) => {
            const userGameCount = Object.values(gameOwners).filter((owners) => owners.includes(user.username)).length

            return (
              <Chip
                key={user.username}
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {user.isOrganizer && <StarIcon sx={{ fontSize: 16, color: '#B8860B' }} />}
                    {user.displayName || user.username}
                    {user.isOrganizer && (
                      <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
                        (Host)
                      </Typography>
                    )}
                    {userGameCount > 0 && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        ({userGameCount} games)
                      </Typography>
                    )}
                  </Box>
                }
                icon={user.isBggUser ? <RefreshIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                onClick={() => !user.isOrganizer && onSetOrganizer(user.username)}
                onDelete={() => onRequestDelete(user.username)}
                title={user.isOrganizer ? 'Host - games belong to them' : 'Click to make host'}
                sx={{
                  height: 28,
                  bgcolor: user.isOrganizer ? colors.sand : user.isBggUser ? 'primary.light' : 'secondary.main',
                  color: 'primary.dark',
                  cursor: user.isOrganizer ? 'default' : 'pointer',
                  fontWeight: user.isOrganizer ? 600 : 400,
                  '& .MuiChip-label': { px: 1, py: 0 },
                  '& .MuiChip-deleteIcon': { color: 'primary.dark', opacity: 0.6, '&:hover': { opacity: 1 } },
                }}
              />
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}
