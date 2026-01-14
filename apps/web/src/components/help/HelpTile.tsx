import type { ReactNode, RefObject } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'
import { colors } from '../../theme/theme'

export function HelpTile(props: {
  title: string
  children: ReactNode
  containerRef?: RefObject<HTMLDivElement | null>
}) {
  const { title, children, containerRef } = props

  return (
    <Box
      ref={containerRef}
      sx={{
        scrollMarginTop: 16,
      }}
    >
      <Card sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: colors.oceanBlue,
            color: 'white',
          }}
        >
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
        </Box>
        <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
      </Card>
    </Box>
  )
}
