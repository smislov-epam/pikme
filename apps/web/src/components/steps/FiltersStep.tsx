import { Stack } from '@mui/material'
import type { GameRecord, UserRecord } from '../../db/types'
import { AdvancedFiltersAccordion } from './AdvancedFiltersAccordion'
import { PlayerCountCard } from './filters/PlayerCountCard'
import { VibeCard } from './filters/VibeCard'
import { TimeRangeCard } from './filters/TimeRangeCard'
import { FiltersResultsSection } from './filters/FiltersResultsSection'
import type { LayoutMode } from '../../services/storage/uiPreferences'
import { SectionHeader } from '../ui/SectionHeader'

export interface FiltersStepProps {
  games: GameRecord[]
  users: UserRecord[]
  gameOwners: Record<number, string[]>
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  sessionUserCount: number
  playerCount: number
  onPlayerCountChange: (count: number) => void
  timeRange: { min: number; max: number }
  onTimeRangeChange: (range: { min: number; max: number }) => void
  mode: 'coop' | 'competitive' | 'any'
  onModeChange: (mode: 'coop' | 'competitive' | 'any') => void
  requireBestWithPlayerCount: boolean
  onRequireBestWithPlayerCountChange: (enabled: boolean) => void
  excludeLowRatedThreshold: number | null
  onExcludeLowRatedChange: (threshold: number | null) => void
  ageRange: { min: number; max: number }
  onAgeRangeChange: (range: { min: number; max: number }) => void
  complexityRange: { min: number; max: number }
  onComplexityRangeChange: (range: { min: number; max: number }) => void
  ratingRange: { min: number; max: number }
  onRatingRangeChange: (range: { min: number; max: number }) => void
  filteredGames: GameRecord[]
  onExcludeGameFromSession: (bggId: number) => void
  onUndoExcludeGameFromSession: (bggId: number) => void
  /** Whether all filter controls are disabled (e.g., in session guest mode) */
  disabled?: boolean
}

export function FiltersStep({
  games,
  users,
  gameOwners,
  layoutMode,
  onLayoutModeChange,
  sessionUserCount,
  playerCount,
  onPlayerCountChange,
  timeRange,
  onTimeRangeChange,
  mode,
  onModeChange,
  requireBestWithPlayerCount,
  onRequireBestWithPlayerCountChange,
  excludeLowRatedThreshold,
  onExcludeLowRatedChange,
  ageRange,
  onAgeRangeChange,
  complexityRange,
  onComplexityRangeChange,
  ratingRange,
  onRatingRangeChange,
  filteredGames,
  onExcludeGameFromSession,
  onUndoExcludeGameFromSession,
  disabled = false,
}: FiltersStepProps) {
  return (
    <Stack spacing={2}>
      <SectionHeader
        title="Set your constraints"
        subtitle={disabled ? "Filters are set by the host (read-only)" : "Filter games by what works for your group tonight"}
        titleVariant="h5"
        subtitleVariant="caption"
        titleColor="primary.dark"
      />

      {/* Player Count */}
      <PlayerCountCard
        sessionUserCount={sessionUserCount}
        playerCount={playerCount}
        onPlayerCountChange={onPlayerCountChange}
        disabled={disabled}
      />

      {/* Time Range */}
      <TimeRangeCard timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} disabled={disabled} />

      {/* Game Mode */}
      <VibeCard mode={mode} onModeChange={onModeChange} disabled={disabled} />

      <AdvancedFiltersAccordion
        playerCount={playerCount}
        requireBestWithPlayerCount={requireBestWithPlayerCount}
        onRequireBestWithPlayerCountChange={onRequireBestWithPlayerCountChange}
        excludeLowRatedThreshold={excludeLowRatedThreshold}
        onExcludeLowRatedChange={onExcludeLowRatedChange}
        ageRange={ageRange}
        onAgeRangeChange={onAgeRangeChange}
        complexityRange={complexityRange}
        onComplexityRangeChange={onComplexityRangeChange}
        ratingRange={ratingRange}
        onRatingRangeChange={onRatingRangeChange}
        disabled={disabled}
      />

      <FiltersResultsSection
        games={games}
        users={users}
        gameOwners={gameOwners}
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        filteredGames={filteredGames}
        onExcludeGameFromSession={onExcludeGameFromSession}
        onUndoExcludeGameFromSession={onUndoExcludeGameFromSession}
      />
    </Stack>
  )
}