import type { ReactNode, RefObject } from 'react'
import { useState } from 'react'
import { Box, Card, CardContent, Collapse, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { colors } from '../../theme/theme'

export interface HelpTileProps {
  id?: string
  title: string
  children: ReactNode
  containerRef?: RefObject<HTMLDivElement | null>
  /** Controlled mode: whether the tile is expanded */
  expanded?: boolean
  /** Controlled mode: callback when user clicks to toggle */
  onToggle?: (id: string) => void
  /** Uncontrolled mode: default expanded state */
  defaultExpanded?: boolean
}

export function HelpTile(props: HelpTileProps) {
  const {
    id,
    title,
    children,
    containerRef,
    expanded,
    onToggle,
    defaultExpanded = false,
  } = props

  // Support both controlled and uncontrolled modes
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isControlled = expanded !== undefined && onToggle !== undefined
  const isExpanded = isControlled ? expanded : internalExpanded

  const handleToggle = () => {
    if (isControlled && id) {
      onToggle(id)
    } else {
      setInternalExpanded((prev) => !prev)
    }
  }

  return (
    <Box
      ref={containerRef}
      id={id}
      sx={{
        scrollMarginTop: 80,
      }}
    >
      <Card sx={{ overflow: 'hidden' }}>
        <Box
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleToggle()
            }
          }}
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: colors.oceanBlue,
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background-color 0.2s ease',
            '&:hover': {
              bgcolor: '#1565c0',
            },
            '&:focus-visible': {
              outline: '2px solid white',
              outlineOffset: -2,
            },
          }}
        >
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <ExpandMoreIcon
            sx={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Box>
        <Collapse in={isExpanded} timeout={300}>
          <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
        </Collapse>
      </Card>
    </Box>
  )
}
