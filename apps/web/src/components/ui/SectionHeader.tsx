import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material'
import { Box, Stack, Typography } from '@mui/material'

export function SectionHeader(props: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  titleVariant?: 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2'
  subtitleVariant?: 'body2' | 'caption'
  titleColor?: string
  subtitleColor?: string
  sx?: SxProps<Theme>
}) {
  const {
    title,
    subtitle,
    icon,
    actions,
    titleVariant = 'h5',
    subtitleVariant = 'body2',
    titleColor = 'text.primary',
    subtitleColor = 'text.secondary',
    sx,
  } = props

  return (
    <Stack spacing={0} sx={sx}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
          {icon}
          <Typography
            variant={titleVariant}
            sx={{
              color: titleColor,
              fontWeight: titleVariant.startsWith('subtitle') ? 600 : 700,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
        </Stack>
        {actions}
      </Box>

      {subtitle ? (
        <Typography
          variant={subtitleVariant}
          color={subtitleColor}
          sx={{
            mt: 0,
            lineHeight: subtitleVariant === 'caption' ? 1.2 : 1.25,
          }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  )
}
