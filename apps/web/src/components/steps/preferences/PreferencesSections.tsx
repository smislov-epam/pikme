import type { ReactNode } from 'react'
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { GameRecord } from '../../../db/types'
import { colors } from '../../../theme/theme'
import { SortableGameCard } from '../PreferenceGameCard'
import { DraggableGameCard } from '../DraggableGameCard'
import { DraggablePreferenceRowCard, SortablePreferenceRowCard } from './PreferenceRowCard'
import type { LayoutMode } from '../../../services/storage/uiPreferences'
import { SectionHeader } from '../../ui/SectionHeader'

export interface PreferenceGameRow {
  game: GameRecord
  userRating?: number
  isTopPick?: boolean
  isDisliked?: boolean
}

const LIST_SCROLL_SX = {
  maxHeight: { xs: 260, sm: 360 },
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarGutter: 'stable',
  direction: 'ltr',
} as const

function DroppableList(props: {
  droppableId: string
  children: ReactNode
  minHeight?: number
  highlightColor?: string
}) {
  const { droppableId, children, minHeight, highlightColor } = props
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const outline = highlightColor ?? colors.oceanBlue

  return (
    <Box
      ref={setNodeRef}
      sx={{
        ...LIST_SCROLL_SX,
        minHeight: minHeight ?? 48,
        p: 1,
        borderRadius: '8px',
        border: '2px dashed',
        borderColor: isOver ? outline : 'transparent',
        bgcolor: isOver ? alpha(outline, 0.08) : 'transparent',
        transition: 'border-color 120ms ease, background-color 120ms ease',
      }}
    >
      {children}
    </Box>
  )
}

export function TopPicksSection(props: {
  topPicks: PreferenceGameRow[]
  droppableId: string
  layoutMode: LayoutMode
  onOpenDetails?: (game: GameRecord) => void
  onToggleTopPick: (bggId: number, currentlyTopPick: boolean) => void
  onToggleDisliked: (bggId: number, currentlyDisliked: boolean) => void
}) {
  const { topPicks, droppableId, layoutMode, onOpenDetails, onToggleTopPick, onToggleDisliked } = props

  return (
    <Card sx={{ bgcolor: colors.sand + '30', border: `2px dashed ${colors.sand}` }}>
      <CardContent>
        <SectionHeader
          icon={<StarIcon sx={{ color: colors.sand }} />}
          title={`Top Picks (${topPicks.length})`}
          titleVariant="subtitle1"
          sx={{ mb: 0.5 }}
        />

        <DroppableList droppableId={droppableId} minHeight={120} highlightColor={colors.sand}>
          {topPicks.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0 }}>
              Drag games here or tap the star to pin favorites (max 3)
            </Typography>
          ) : (
            <Stack spacing={1}>
              {topPicks.map(({ game, userRating }) => (
                layoutMode === 'simplified' ? (
                  <DraggablePreferenceRowCard
                    key={game.bggId}
                    id={game.bggId}
                    game={game}
                    userRating={userRating}
                    isTopPick
                    isDisliked={false}
                    onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                    onToggleTopPick={() => onToggleTopPick(game.bggId, true)}
                    onToggleDisliked={() => onToggleDisliked(game.bggId, false)}
                  />
                ) : (
                  <DraggableGameCard
                    key={game.bggId}
                    id={game.bggId}
                    game={game}
                    userRating={userRating}
                    isTopPick
                    isDisliked={false}
                    onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                    onToggleTopPick={() => onToggleTopPick(game.bggId, true)}
                    onToggleDisliked={() => onToggleDisliked(game.bggId, false)}
                  />
                )
              ))}
            </Stack>
          )}
        </DroppableList>
      </CardContent>
    </Card>
  )
}

export function DislikedSection(props: {
  disliked: PreferenceGameRow[]
  droppableId: string
  layoutMode: LayoutMode
  onOpenDetails?: (game: GameRecord) => void
  onToggleTopPick: (bggId: number, currentlyTopPick: boolean) => void
  onToggleDisliked: (bggId: number, currentlyDisliked: boolean) => void
}) {
  const { disliked, droppableId, layoutMode, onOpenDetails, onToggleTopPick, onToggleDisliked } = props

  return (
    <Card sx={{ border: '1px solid', borderColor: 'error.light' }}>
      <CardContent>
        <SectionHeader
          title={`Disliked (${disliked.length})`}
          titleVariant="subtitle1"
          sx={{ mb: 0.5 }}
        />
        <DroppableList droppableId={droppableId} minHeight={120} highlightColor={'#ef5350'}>
          {disliked.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0 }}>
              Drag games here to veto them
            </Typography>
          ) : (
            <Stack spacing={1}>
              {disliked.map(({ game, userRating }) => (
                layoutMode === 'simplified' ? (
                  <DraggablePreferenceRowCard
                    key={game.bggId}
                    id={game.bggId}
                    game={game}
                    isDisliked
                    userRating={userRating}
                    onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                    onToggleTopPick={() => onToggleTopPick(game.bggId, false)}
                    onToggleDisliked={() => onToggleDisliked(game.bggId, true)}
                  />
                ) : (
                  <DraggableGameCard
                    key={game.bggId}
                    id={game.bggId}
                    game={game}
                    isDisliked
                    userRating={userRating}
                    onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                    onToggleTopPick={() => onToggleTopPick(game.bggId, false)}
                    onToggleDisliked={() => onToggleDisliked(game.bggId, true)}
                  />
                )
              ))}
            </Stack>
          )}
        </DroppableList>
      </CardContent>
    </Card>
  )
}

export function RankedSection(props: {
  ranked: PreferenceGameRow[]
  droppableId: string
  layoutMode: LayoutMode
  onOpenDetails?: (game: GameRecord) => void
  onToggleTopPick: (bggId: number, currentlyTopPick: boolean) => void
  onToggleDisliked: (bggId: number, currentlyDisliked: boolean) => void
}) {
  const { ranked, droppableId, layoutMode, onOpenDetails, onToggleTopPick, onToggleDisliked } = props
  const ids = ranked.map((g) => g.game.bggId)

  return (
    <Card>
      <CardContent>
        <SectionHeader
          title={`Ranked (${ranked.length})`}
          subtitle="Drag to reorder"
          titleVariant="subtitle1"
          subtitleVariant="caption"
          sx={{ mb: 0.5 }}
        />
        <DroppableList droppableId={droppableId} minHeight={160} highlightColor={colors.oceanBlue}>
          {ranked.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0 }}>
              Drag games here to rank them
            </Typography>
          ) : (
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <Stack spacing={1}>
                {ranked.map(({ game, userRating }, index) => (
                  layoutMode === 'simplified' ? (
                    <SortablePreferenceRowCard
                      key={game.bggId}
                      id={game.bggId}
                      game={game}
                      rank={index + 1}
                      userRating={userRating}
                      isTopPick={false}
                      isDisliked={false}
                      onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                      onToggleTopPick={() => onToggleTopPick(game.bggId, false)}
                      onToggleDisliked={() => onToggleDisliked(game.bggId, false)}
                    />
                  ) : (
                    <SortableGameCard
                      key={game.bggId}
                      id={game.bggId}
                      game={game}
                      rank={index + 1}
                      userRating={userRating}
                      isTopPick={false}
                      isDisliked={false}
                      onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                      onToggleTopPick={() => onToggleTopPick(game.bggId, false)}
                      onToggleDisliked={() => onToggleDisliked(game.bggId, false)}
                    />
                  )
                ))}
              </Stack>
            </SortableContext>
          )}
        </DroppableList>
      </CardContent>
    </Card>
  )
}

export function NeutralSection(props: {
  neutral: PreferenceGameRow[]
  nextRank: number
  droppableId: string
  layoutMode: LayoutMode
  onOpenDetails?: (game: GameRecord) => void
  onToggleTopPick: (bggId: number, currentlyTopPick: boolean) => void
  onToggleDisliked: (bggId: number, currentlyDisliked: boolean) => void
  onSetRank: (bggId: number, rank: number) => void
}) {
  const { neutral, nextRank, droppableId, layoutMode, onOpenDetails, onToggleTopPick, onToggleDisliked, onSetRank } = props

  return (
    <Card>
      <CardContent>
        <SectionHeader
          title={`Available Games (${neutral.length})`}
          subtitle="Tap a game for details. Use ★ / 👎 and the # button to set preferences."
          titleVariant="subtitle1"
          subtitleVariant="caption"
          sx={{ mb: 0.5 }}
        />

        <DroppableList droppableId={droppableId} minHeight={120} highlightColor={alpha(colors.oceanBlue, 0.35)}>
          <Stack spacing={1} sx={{ mt: 0 }}>
            {neutral.map(({ game, userRating, isDisliked, isTopPick }) => (
              layoutMode === 'simplified' ? (
                <DraggablePreferenceRowCard
                  key={game.bggId}
                  id={game.bggId}
                  game={game}
                  userRating={userRating}
                  isTopPick={isTopPick}
                  isDisliked={isDisliked}
                  onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                  onToggleTopPick={() => onToggleTopPick(game.bggId, !!isTopPick)}
                  onToggleDisliked={() => onToggleDisliked(game.bggId, !!isDisliked)}
                  onRank={(rank) => onSetRank(game.bggId, rank)}
                  nextRank={nextRank}
                />
              ) : (
                <DraggableGameCard
                  key={game.bggId}
                  id={game.bggId}
                  game={game}
                  userRating={userRating}
                  isTopPick={isTopPick}
                  isDisliked={isDisliked}
                  onOpenDetails={onOpenDetails ? () => onOpenDetails(game) : undefined}
                  onToggleTopPick={() => onToggleTopPick(game.bggId, !!isTopPick)}
                  onToggleDisliked={() => onToggleDisliked(game.bggId, !!isDisliked)}
                  onRank={(rank) => onSetRank(game.bggId, rank)}
                  nextRank={nextRank}
                />
              )
            ))}
          </Stack>
        </DroppableList>
      </CardContent>
    </Card>
  )
}
