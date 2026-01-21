import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { HelpNavMenu } from './help/HelpNavMenu'
import { HELP_SECTIONS } from './help/helpSections'
import { HelpWalkthroughSections } from './help/HelpWalkthroughSections'

export type HelpTopic = 'clear' | 'settings' | null

export function HelpWalkthroughDialog(props: {
  open: boolean
  focusTopic?: HelpTopic
  onClose: () => void
}) {
  const { open, focusTopic = null, onClose } = props

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [heroExpanded, setHeroExpanded] = useState(true)

  const clearRef = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['what-pikme-does']) // Start with intro expanded
  )

  const handleToggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleNavigate = useCallback((sectionId: string) => {
    // Expand the section first
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.add(sectionId)
      return next
    })

    // Scroll to the section after a brief delay for expansion animation
    setTimeout(() => {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
  }, [])

  const handleExpandAll = useCallback(() => {
    setExpandedSections(new Set(HELP_SECTIONS.map((s) => s.id)))
  }, [])

  const handleCollapseAll = useCallback(() => {
    setExpandedSections(new Set())
  }, [])

  const allExpanded = useMemo(
    () => expandedSections.size === HELP_SECTIONS.length,
    [expandedSections]
  )

  // Handle focusTopic navigation
  useEffect(() => {
    if (!open) return
    if (focusTopic === 'clear') {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => handleNavigate('clear-data'), 0)
    } else if (focusTopic === 'settings') {
      setTimeout(() => handleNavigate('bgg-api-key'), 0)
    }
  }, [focusTopic, open, handleNavigate])

  // Reset to default state when dialog opens
  useEffect(() => {
    if (open && !focusTopic) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setExpandedSections(new Set(['what-pikme-does']))
        contentRef.current?.scrollTo({ top: 0 })
      }, 0)
    }
  }, [open, focusTopic])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: '90vh', sm: '85vh' },
          maxHeight: { xs: '90vh', sm: '85vh' },
          overflow: 'hidden',
          '& .MuiDialogTitle-root': {
            borderBottom: 'none',
          },
          '& .MuiDialogContent-root': {
            borderTop: 'none',
          },
        },
      }}
    >
      {/* Entire blue header wrapped in single Box to avoid any gaps/lines */}
      <Box sx={{ bgcolor: 'primary.main', pb: 0, mb: 0 }}>
        {/* Title section */}
        <DialogTitle
          sx={{
            pr: 10,
            color: 'white',
            pb: 0,
            bgcolor: 'transparent',
          }}
        >
          PIKME walkthrough
          {/* Mobile collapse arrow - left of X */}
          {isMobile && (
            <IconButton
              aria-label={heroExpanded ? 'Collapse description' : 'Expand description'}
              onClick={() => setHeroExpanded(!heroExpanded)}
              sx={{ position: 'absolute', right: 44, top: 8, color: 'white' }}
            >
              {heroExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
          <IconButton
            aria-label="Close walkthrough"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Hero section - collapsible on mobile */}
        <Collapse in={!isMobile || heroExpanded}>
          <Box sx={{ color: 'white', px: 3, pb: 1.5 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              🎲 End the "what should we play?" debate forever
            </Typography>
            <Typography variant="body2">
              PIKME brings peace to game night by guiding your group to a single pick everyone can
              enjoy. No more endless discussions — just a calm 4-step wizard that considers
              everyone's preferences.
            </Typography>
          </Box>
        </Collapse>
      </Box>

      {/* Navigation - part of fixed header */}
      <HelpNavMenu onNavigate={handleNavigate} expandedSections={expandedSections} />

      {/* Scrollable content - only this part scrolls */}
      <DialogContent
        ref={contentRef}
        sx={{
          flex: 1,
          p: 2,
          bgcolor: 'grey.50',
          borderTop: 'none',
          overflowY: 'auto',
        }}
      >
        <HelpWalkthroughSections
          clearRef={clearRef}
          settingsRef={settingsRef}
          expandedSections={expandedSections}
          onToggleSection={handleToggleSection}
        />
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Button size="small" onClick={allExpanded ? handleCollapseAll : handleExpandAll}>
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
