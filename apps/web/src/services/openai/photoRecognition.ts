/**
 * Photo recognition service using OpenAI Vision API.
 * Analyzes images of board game boxes and identifies game titles.
 */

import { openAiChatCompletion } from './openaiClient'
import { findBggMatchesBatch, type BggMatchResult } from './bggMatching'

export type { BggMatchResult }

export interface RecognizedGame {
  name: string
  confidence: number // 0-1 score from OpenAI
}

export interface RecognitionResult {
  games: RecognizedGame[]
}

export interface RecognizedGameTile {
  id: string
  recognizedName: string
  confidence: 'high' | 'medium' | 'low'
  confidenceScore: number
  bggMatch?: {
    bggId: number
    name: string
    yearPublished?: number
    thumbnail?: string
  }
  bggSearchResults?: Array<{ bggId: number; name: string; yearPublished?: number }>
  dismissed: boolean
}

export interface PhotoRecognitionResult {
  games: RecognizedGameTile[]
  rawResponse: RecognitionResult
}

export interface PhotoRecognitionOptions {
  imageBase64: string
  signal?: AbortSignal
}

const SYSTEM_PROMPT = `You are a board game identification expert. Analyze images of board game boxes and identify game titles. Return a JSON array of identified games with ACCURATE confidence scores.

STRICT Confidence Scoring Rules:
- 0.95-1.0: ONLY if the full game title is clearly readable in large text
- 0.85-0.94: Full title visible but smaller or slightly angled
- 0.70-0.84: Partial title visible OR recognized primarily by distinctive box art
- 0.50-0.69: Only spine visible, or significant portion obscured, or recognized by color/shape
- 0.30-0.49: Mostly guessing based on partial letters or vague recognition
- 0.10-0.29: Very uncertain guess - you think you might recognize it but aren't sure

BE CRITICAL: If you can only see a spine, edge, or partial box, confidence should be 0.7 or LOWER.
Do NOT give high confidence (0.9+) unless you can clearly read the full title.

IMPORTANT: Always list games you think you recognize, even with very low confidence. The user will decide whether to add them.`

const USER_PROMPT = `Identify ALL board game boxes visible in this image. For each game, provide:
1. The exact title as it would appear on BoardGameGeek
2. An HONEST confidence score (0-1) based on how clearly you can see/identify it

BE STRICT with confidence:
- Spine only visible? → 0.5-0.7 max
- Partial box/obscured? → 0.6-0.8 max  
- Only recognized by art/colors? → 0.5-0.75 max
- Full title clearly readable? → 0.9+
- Uncertain guess based on shape/color? → 0.1-0.4

IMPORTANT: 
- List EVERY game you can see or suspect, even partially
- Include games you're uncertain about with LOW confidence scores (0.1-0.4)
- Users will review and decide which games to add - don't filter out uncertain matches
- It's better to include a guess with low confidence than to omit a game entirely
- Count all boxes carefully. Do not skip any.

Return JSON format only:
{"games": [{"name": "Game Title", "confidence": 0.85}, ...]}

If no board games are visible, return: {"games": []}`

/**
 * Convert confidence score (0-1) to display category.
 */
function mapConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.8) return 'high'
  if (score >= 0.5) return 'medium'
  return 'low'
}

/**
 * Generate a unique ID for a recognized game tile.
 */
function generateTileId(name: string, index: number): string {
  return `${name.toLowerCase().replace(/\s+/g, '-')}-${index}-${Date.now()}`
}

/**
 * Parse the OpenAI response JSON into RecognitionResult.
 */
function parseRecognitionResponse(content: string): RecognitionResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { games: [] }
    }
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.games || !Array.isArray(parsed.games)) {
      return { games: [] }
    }
    return {
      games: parsed.games
        .filter((g: unknown) => typeof g === 'object' && g !== null && 'name' in g)
        .map((g: { name: string; confidence?: number }) => ({
          name: String(g.name),
          confidence: typeof g.confidence === 'number' ? g.confidence : 0.5,
        })),
    }
  } catch {
    return { games: [] }
  }
}

/**
 * Recognize board games from a photo using OpenAI Vision API.
 *
 * @param options.imageBase64 - Base64-encoded image data (without data URI prefix)
 * @param options.signal - Optional AbortSignal for cancellation
 * @returns Recognized games with confidence scores
 */
export async function recognizeGamesFromPhoto(
  options: PhotoRecognitionOptions
): Promise<PhotoRecognitionResult> {
  const { imageBase64, signal } = options

  // Determine image type from base64 header or default to jpeg
  let mimeType = 'image/jpeg'
  if (imageBase64.startsWith('/9j/')) {
    mimeType = 'image/jpeg'
  } else if (imageBase64.startsWith('iVBOR')) {
    mimeType = 'image/png'
  } else if (imageBase64.startsWith('UklGR')) {
    mimeType = 'image/webp'
  } else if (imageBase64.startsWith('R0lGOD')) {
    mimeType = 'image/gif'
  }

  const imageUrl = `data:${mimeType};base64,${imageBase64}`

  const content = await openAiChatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
        ],
      },
    ],
    {
      signal,
      model: 'gpt-4o',
      maxTokens: 4000, // Increased to allow many games in response
      responseFormat: { type: 'json_object' },
      temperature: 0.2, // Low temperature for more deterministic/consistent recognition
    }
  )

  const rawResponse = parseRecognitionResponse(content)
  
  // Log for debugging
  console.log(`[PhotoRecognition] OpenAI returned ${rawResponse.games.length} games:`, 
    rawResponse.games.map(g => `${g.name} (${g.confidence})`))

  // Sort by confidence (highest first) and limit to 50 games
  const sortedGames = rawResponse.games
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 50)

  // Perform BGG matching for all recognized games
  const gameNames = sortedGames.map((g) => g.name)
  const bggMatches = await findBggMatchesBatch(gameNames, signal)
  
  // Log BGG matching results
  const matchedCount = Array.from(bggMatches.values()).filter(Boolean).length
  console.log(`[PhotoRecognition] BGG matched ${matchedCount} of ${gameNames.length} games`)

  // Convert to tile format with BGG matches
  const games: RecognizedGameTile[] = sortedGames.map((game, index) => {
    const bggMatch = bggMatches.get(game.name)
    return {
      id: generateTileId(game.name, index),
      recognizedName: game.name,
      confidence: mapConfidence(game.confidence),
      confidenceScore: game.confidence,
      bggMatch: bggMatch ?? undefined,
      dismissed: false,
    }
  })

  return {
    games,
    rawResponse,
  }
}

/**
 * Convert a File object to base64 string (without data URI prefix).
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URI prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate image file before processing.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE_MB = 20
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
  const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  if (!SUPPORTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format. Please use JPEG, PNG, WebP, or GIF.`,
    }
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Recognize board games from an image file.
 * Convenience function that handles file-to-base64 conversion.
 *
 * @param file - Image file to analyze
 * @param signal - Optional AbortSignal for cancellation
 * @returns Recognized games with confidence scores
 */
export async function recognizeGamesFromFile(
  file: File,
  signal?: AbortSignal
): Promise<PhotoRecognitionResult> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const imageBase64 = await fileToBase64(file)
  return recognizeGamesFromPhoto({ imageBase64, signal })
}
