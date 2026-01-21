import { useCallback, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { HELP_CATEGORIES } from './helpSections'

interface HelpNavMenuProps {
  onNavigate: (sectionId: string) => void
  expandedSections?: Set<string>
}

export function HelpNavMenu({ onNavigate }: HelpNavMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('wizard-steps')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedSection(null)
  }, [])

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      setSelectedSection(sectionId)
      onNavigate(sectionId)
    },
    [onNavigate]
  )

  const handleSwipe = useCallback(() => {
    const swipeThreshold = 50
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) < swipeThreshold) return

    const currentIndex = HELP_CATEGORIES.findIndex((c) => c.id === selectedCategory)
    if (diff > 0) {
      const nextIndex = currentIndex < HELP_CATEGORIES.length - 1 ? currentIndex + 1 : 0
      setSelectedCategory(HELP_CATEGORIES[nextIndex].id)
    } else {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : HELP_CATEGORIES.length - 1
      setSelectedCategory(HELP_CATEGORIES[prevIndex].id)
    }
    setSelectedSection(null)
  }, [selectedCategory])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX
      handleSwipe()
    },
    [handleSwipe]
  )

  const navigatePrev = useCallback(() => {
    const currentIndex = HELP_CATEGORIES.findIndex((c) => c.id === selectedCategory)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : HELP_CATEGORIES.length - 1
    setSelectedCategory(HELP_CATEGORIES[prevIndex].id)
    setSelectedSection(null)
  }, [selectedCategory])

  const navigateNext = useCallback(() => {
    const currentIndex = HELP_CATEGORIES.findIndex((c) => c.id === selectedCategory)
    const nextIndex = currentIndex < HELP_CATEGORIES.length - 1 ? currentIndex + 1 : 0
    setSelectedCategory(HELP_CATEGORIES[nextIndex].id)
    setSelectedSection(null)
  }, [selectedCategory])

  const selectedCategoryData = HELP_CATEGORIES.find((c) => c.id === selectedCategory)

  return (
    <Box onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} sx={{ mt: 0 }}>
      {/* Main category tabs row - on top */}
      <Box
        sx={{
          display: 'flex',
          bgcolor: 'primary.main',
          position: 'relative',
          border: 'none',
          mt: 0,
          pt: 0,
        }}
      >
        {HELP_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id
          return (
            <Box
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              sx={{
                flex: 1,
                py: 1,
                px: { xs: 0.5, sm: 1 },
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isSelected ? 'warning.main' : 'transparent',
                color: isSelected ? 'warning.contrastText' : 'white',
                fontWeight: isSelected ? 700 : 500,
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                borderRadius: isSelected ? '8px 8px 0 0' : 0,
                position: 'relative',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isSelected ? 'warning.dark' : 'rgba(255,255,255,0.15)',
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 1.2,
                  display: 'block',
                }}
              >
                {category.label}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Sub-items row - on yellow background */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          px: 2,
          py: 1,
          bgcolor: 'warning.main',
          minHeight: 36,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {/* Mobile navigation arrows */}
        <ChevronLeftIcon
          onClick={navigatePrev}
          sx={{
            cursor: 'pointer',
            color: 'warning.contrastText',
            flexShrink: 0,
            display: { xs: 'block', sm: 'none' },
            '&:hover': { color: 'grey.700' },
          }}
        />

        {/* Section items */}
        {selectedCategoryData?.sections.map((section) => {
          const isSelected = selectedSection === section.id
          return (
            <Typography
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              variant="body2"
              sx={{
                px: 1.5,
                py: 0.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? 'white' : 'warning.contrastText',
                transition: 'all 0.15s ease',
                '&:hover': {
                  color: 'white',
                },
              }}
            >
              {section.shortLabel || section.label}
            </Typography>
          )
        })}

        {/* Mobile navigation arrows */}
        <ChevronRightIcon
          onClick={navigateNext}
          sx={{
            cursor: 'pointer',
            color: 'warning.contrastText',
            flexShrink: 0,
            display: { xs: 'block', sm: 'none' },
            '&:hover': { color: 'grey.700' },
          }}
        />
      </Box>
    </Box>
  )
}
