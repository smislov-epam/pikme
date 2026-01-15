import { createTheme, alpha } from '@mui/material/styles'

// Calming color palette based on PRD requirements:
// - Warm sand accent (relaxing yellow)
// - Liquid blue primary (light to dark gradient)
// - Off-white base for calmness

const colors = {
  sand: '#F2C94C',      // Warm sand accent (more pronounced)
  skyBlue: '#A7D1FF',   // Light blue highlight
  oceanBlue: '#2F6FB2', // Primary blue (more pronounced)
  navyBlue: '#1F3A5F',  // Dark navy for text/contrast
  offWhite: '#FAFBFC',  // Soft off-white background
  warmWhite: '#FFFEF9', // Warm white for cards
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: colors.offWhite,
      paper: colors.warmWhite,
    },
    primary: {
      light: colors.skyBlue,
      main: colors.oceanBlue,
      dark: colors.navyBlue,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.sand,
      light: alpha(colors.sand, 0.4),
      dark: '#D4A72C',
      contrastText: colors.navyBlue,
    },
    warning: {
      main: colors.sand,
      light: alpha(colors.sand, 0.4),
      dark: '#D4A72C',
      contrastText: colors.navyBlue,
    },
    text: {
      primary: colors.navyBlue,
      secondary: alpha(colors.navyBlue, 0.7),
    },
    divider: alpha(colors.oceanBlue, 0.12),
    action: {
      hover: alpha(colors.skyBlue, 0.08),
      selected: alpha(colors.skyBlue, 0.16),
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      'Nunito',
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap');

        * {
          scrollbar-width: thin;
          scrollbar-color: ${alpha(colors.oceanBlue, 0.35)} transparent;
        }

        *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        *::-webkit-scrollbar-track {
          background: transparent;
        }

        *::-webkit-scrollbar-thumb {
          background-color: ${alpha(colors.oceanBlue, 0.28)};
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        *::-webkit-scrollbar-thumb:hover {
          background-color: ${alpha(colors.oceanBlue, 0.4)};
        }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: `0 4px 20px ${alpha(colors.navyBlue, 0.08)}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
        },
        contained: {
          boxShadow: `0 4px 14px ${alpha(colors.oceanBlue, 0.3)}`,
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha(colors.oceanBlue, 0.4)}`,
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation3: {
          boxShadow: `0 -4px 20px ${alpha(colors.navyBlue, 0.08)}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          padding: '16px 0',
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          fontSize: '1.75rem',
          '&.Mui-completed': {
            color: colors.oceanBlue,
          },
          '&.Mui-active': {
            color: colors.oceanBlue,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: colors.warmWhite,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(colors.oceanBlue, 0.28),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(colors.oceanBlue, 0.5),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.oceanBlue,
            borderWidth: 2,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: alpha(colors.navyBlue, 0.7),
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          borderColor: alpha(colors.oceanBlue, 0.28),
          color: alpha(colors.navyBlue, 0.75),
          backgroundColor: alpha(colors.skyBlue, 0.06),
          '&:hover': {
            borderColor: alpha(colors.oceanBlue, 0.5),
            backgroundColor: alpha(colors.skyBlue, 0.12),
          },
          '&.Mui-selected': {
            backgroundColor: colors.sand,
            color: colors.navyBlue,
            borderColor: alpha(colors.sand, 0.9),
            '&:hover': {
              backgroundColor: alpha(colors.sand, 0.85),
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        indicator: {
          height: 3,
          borderRadius: 3,
          backgroundColor: colors.sand,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 40,
          '&.Mui-selected': {
            color: colors.navyBlue,
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 8,
        },
        thumb: {
          width: 20,
          height: 20,
        },
        track: {
          borderRadius: 4,
        },
        rail: {
          borderRadius: 4,
          opacity: 0.3,
        },
      },
    },
  },
})

// Export colors for direct use in components
export { colors }
