import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material'

export type UserMode = 'bgg' | 'local'

export type PlayersAddUserControlsOption = { label: string; username: string; internalId?: string; suffix?: string }

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
  const isMobile = useMediaQuery('(max-width:600px)')
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
        <Box
          sx={{
            display: 'flex',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'white',
          }}
        >
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
            sx={{
              flex: 1,
              bgcolor: 'white',
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: 'white',
                '& fieldset': { border: 'none' },
              },
              '& .MuiInputBase-root': {
                bgcolor: 'white',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={onAdd}
            disabled={isLoading}
            sx={{
              borderRadius: 0,
              minWidth: isMobile ? 56 : 88,
              px: isMobile ? 1.5 : 2.75,
              boxShadow: 'none',
            }}
          >
            {isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : isMobile ? (
              '+'
            ) : (
              '+ Add'
            )}
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Autocomplete
            freeSolo
            disableClearable
            options={autocompleteOptions}
            getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
            inputValue={inputValue}
            onInputChange={(_, v) => onInputValueChange(v)}
            onChange={(_, v) => {
              if (v && typeof v !== 'string') {
                onInputValueChange(v.label)
              } else if (typeof v === 'string') {
                onInputValueChange(v)
              }
            }}
            disabled={isLoading}
            sx={{
              flex: 1,
              bgcolor: 'white',
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiAutocomplete-inputRoot': { 
                borderRadius: 0,
                '&::before, &::after': { display: 'none' },
              },
              '& .MuiAutocomplete-endAdornment': {
                borderLeft: 'none',
              },
              '& .MuiInputBase-root': {
                border: 'none',
                boxShadow: 'none',
                bgcolor: 'white',
              },
            }}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.username}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PersonIcon fontSize="small" color="action" />
                  <Typography
                    variant="body2"
                    sx={{ display: 'flex', gap: 0.5, alignItems: 'center', '& .suffix': { color: 'text.secondary', fontWeight: 600 } }}
                  >
                    <span>{option.label}</span>
                    {option.suffix && <span className="suffix">{option.suffix}</span>}
                  </Typography>
                </Stack>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                size="small"
                variant="standard"
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
                  '& .MuiInput-root': {
                    '&::before, &::after': { display: 'none' },
                    px: 1.5,
                    py: 1,
                  },
                  '& .MuiInputBase-root': {
                    '&::before, &::after': { display: 'none' },
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  disableUnderline: true,
                }}
              />
            )}
          />
          <Button
            variant="contained"
            onClick={onAdd}
            disabled={isLoading}
            sx={{
              borderRadius: 0,
              minWidth: isMobile ? 56 : 88,
              px: isMobile ? 1.5 : 2.75,
              boxShadow: 'none',
            }}
          >
            {isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : isMobile ? (
              '+'
            ) : (
              '+ Add'
            )}
          </Button>
        </Box>
      )}
    </>
  )
}
