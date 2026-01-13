import { createTheme, alpha } from '@mui/material/styles'

// Calming color palette based on PRD requirements:
// - Warm sand accent (relaxing yellow)
// - Liquid blue primary (light to dark gradient)
// - Off-white base for calmness

const colors = {
  sand: '#F5E1A4',      // Warm yellow/sand - accent
  skyBlue: '#A8C8E4',   // Light blue - secondary
  oceanBlue: '#5A89B0', // Medium blue - primary
  navyBlue: '#2B4A70',  // Dark navy - primary dark
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
      dark: '#D4C48A',
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
    borderRadius: 16,
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
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
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
            borderRadius: 12,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 500,
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
