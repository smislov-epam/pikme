import { Box, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import RefreshIcon from '@mui/icons-material/Refresh'
import PersonIcon from '@mui/icons-material/Person'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove'
import type { UserRecord } from '../../db/types'
import { colors } from '../../theme/theme'
import { getDisambiguatedLabel } from '../../services/db/userIdService'

export function PlayersListCard(props: {
  users: UserRecord[]
  gameOwners: Record<number, string[]>
  /** Set of usernames whose games are excluded from the session */
  excludedUserGames?: Set<string>
  onSetOrganizer: (username: string) => void
  onRequestDelete: (username: string) => void
  /** Add all games owned by this user to the session */
  onAddUserGamesToSession?: (username: string) => void
  /** Remove games owned ONLY by this user from the session */
  onRemoveUserGamesFromSession?: (username: string) => void
}) {
  const { users, gameOwners, excludedUserGames, onSetOrganizer, onRequestDelete, onAddUserGamesToSession, onRemoveUserGamesFromSession } = props

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Players ({users.length}) {users.find((u) => u.isOrganizer) && '• Host pinned first'}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {users.map((user) => {
            const userGameCount = Object.values(gameOwners).filter((owners) => owners.includes(user.username)).length
            const displayLabel = getDisambiguatedLabel(user, users)
            const isLinkedToFirebase = !!user.firebaseUid
            const isUserGamesExcluded = excludedUserGames?.has(user.username) ?? false

            return (
              <Chip
                key={user.username}
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {user.isOrganizer && <StarIcon sx={{ fontSize: 16, color: '#B8860B' }} />}
                    {displayLabel}
                    {user.isLocalOwner && (
                      <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
                        (Me)
                      </Typography>
                    )}
                    {user.isOrganizer && !user.isLocalOwner && (
                      <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
                        (Host)
                      </Typography>
                    )}
                    {user.isOrganizer && user.isLocalOwner && (
                      <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
                        (Host)
                      </Typography>
                    )}
                    {isLinkedToFirebase && (
                      <Tooltip title="Linked to registered account" arrow>
                        <CloudDoneIcon sx={{ fontSize: 14, color: 'success.main', ml: 0.25 }} />
                      </Tooltip>
                    )}
                    {userGameCount > 0 && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        ({userGameCount} games)
                      </Typography>
                    )}
                    {/* Add/Remove games from session icons - inside chip */}
                    {userGameCount > 0 && (onAddUserGamesToSession || onRemoveUserGamesFromSession) && (
                      isUserGamesExcluded ? (
                        onAddUserGamesToSession && (
                          <Tooltip title={`Add ${displayLabel}'s games to session`} arrow>
                            <PlaylistAddIcon
                              sx={{ fontSize: 16, color: 'white', cursor: 'pointer', ml: 0.25 }}
                              onClick={(e) => { e.stopPropagation(); onAddUserGamesToSession(user.username) }}
                            />
                          </Tooltip>
                        )
                      ) : (
                        onRemoveUserGamesFromSession && (
                          <Tooltip title={`Remove ${displayLabel}'s exclusive games from session`} arrow>
                            <PlaylistRemoveIcon
                              sx={{ fontSize: 16, color: 'white', cursor: 'pointer', ml: 0.25, opacity: 0.8, '&:hover': { opacity: 1 } }}
                              onClick={(e) => { e.stopPropagation(); onRemoveUserGamesFromSession(user.username) }}
                            />
                          </Tooltip>
                        )
                      )
                    )}
                  </Box>
                }
                icon={user.isBggUser ? <RefreshIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                onClick={() => !user.isOrganizer && onSetOrganizer(user.username)}
                onDelete={() => onRequestDelete(user.username)}
                title={
                  user.isLocalOwner
                    ? 'This is you (device owner)'
                    : user.isOrganizer
                      ? 'Host - games belong to them'
                      : 'Click to make host'
                }
                sx={{
                  height: 28,
                  bgcolor: user.isLocalOwner
                    ? colors.skyBlue
                    : user.isOrganizer
                      ? colors.sand
                      : user.isBggUser
                        ? 'primary.light'
                        : 'secondary.main',
                  color: 'primary.dark',
                  cursor: user.isOrganizer ? 'default' : 'pointer',
                  fontWeight: user.isOrganizer || user.isLocalOwner ? 600 : 400,
                  opacity: isUserGamesExcluded ? 0.6 : 1,
                  transition: 'background-color 0.2s ease',
                  '&:hover': { bgcolor: 'primary.main', color: 'white' },
                  '& .MuiChip-label': { px: 1, py: 0 },
                  '& .MuiChip-deleteIcon': { color: 'white', opacity: 0.9, '&:hover': { opacity: 1 } },
                }}
              />
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}
