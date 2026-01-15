import AddIcon from '@mui/icons-material/Add'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

export type UserMode = 'bgg' | 'local'

export type PlayersAddUserControlsOption = { label: string; username: string; internalId?: string }

export interface PlayersAddUserControlsProps {
  mode: UserMode
  onModeChange: (mode: UserMode) => void
  inputValue: string
  onInputValueChange: (value: string) => void
  autocompleteOptions: PlayersAddUserControlsOption[]
  isLoading: boolean
  onAdd: () => void
}

export function PlayersAddUserControls({
  mode,
  onModeChange,
  inputValue,
  onInputValueChange,
  autocompleteOptions,
  isLoading,
  onAdd,
}: PlayersAddUserControlsProps) {
  return (
    <>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, v) => v && onModeChange(v)}
        fullWidth
        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
      >
        <ToggleButton value="bgg" sx={{ py: 1, minHeight: 40 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefreshIcon fontSize="small" />
            BGG Username
          </Box>
        </ToggleButton>
        <ToggleButton value="local" sx={{ py: 1, minHeight: 40 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon fontSize="small" />
            Local Player
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === 'bgg' ? (
        <TextField
          fullWidth
          size="small"
          placeholder="Enter BGG username"
          value={inputValue}
          onChange={(e) => onInputValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd()
          }}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="contained"
                  size="small"
                  onClick={onAdd}
                  disabled={!inputValue.trim() || isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} /> : <AddIcon />}
                  sx={{ height: 32 }}
                >
                  Add
                </Button>
              </InputAdornment>
            ),
          }}
        />
      ) : (
        <Autocomplete
          freeSolo
          disableClearable
          options={autocompleteOptions}
          getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
          inputValue={inputValue}
          onInputChange={(_, v) => onInputValueChange(v)}
          onChange={(_, v) => {
            if (v && typeof v !== 'string') {
              // Selected an existing user - use their username
              onInputValueChange(v.username)
            } else if (typeof v === 'string') {
              onInputValueChange(v)
            }
          }}
          disabled={isLoading}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option.username}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">{option.label}</Typography>
              </Stack>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              size="small"
              placeholder={
                autocompleteOptions.length > 0 ? 'Enter name or select existing player' : 'Enter player name'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  e.preventDefault()
                  onAdd()
                }
              }}
              sx={{
                // Ensure text doesn't overlap the inline Add button + Autocomplete popup icon.
                '& .MuiOutlinedInput-input': { pr: 14 },
              }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {params.InputProps.endAdornment}
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={onAdd}
                        disabled={!inputValue.trim() || isLoading}
                        startIcon={isLoading ? <CircularProgress size={16} /> : <AddIcon />}
                        // Leave room for the Autocomplete popup indicator on the far right.
                        sx={{ height: 32, mr: 4.5 }}
                      >
                        Add
                      </Button>
                    </InputAdornment>
                  </>
                ),
              }}
            />
          )}
        />
      )}
    </>
  )
}
