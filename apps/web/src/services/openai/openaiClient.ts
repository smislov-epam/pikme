/**
 * OpenAI API client for PIKME.
 *
 * SECURITY NOTE: Unlike the BGG API key, we do NOT support VITE_* environment
 * variable fallback for OpenAI keys. Reasons:
 * 1. OpenAI has per-request billing ($0.01-0.04/image for Vision API)
 * 2. VITE_* vars are bundled into client JS and visible in browser DevTools
 * 3. Users must provide their own key to control their own billing
 *
 * The key is stored in localStorage only, never transmitted to PIKME servers.
 */

const STORAGE_KEY = 'openai_api_key'

/**
 * Internal function to get the API key.
 * Not exported to prevent accidental logging.
 */
function getOpenAiApiKey(): string | undefined {
  const localKey = localStorage.getItem(STORAGE_KEY)
  if (localKey && localKey.trim().length > 0) return localKey.trim()
  return undefined // No env var fallback - intentional for security
}

export function setOpenAiApiKey(key: string): void {
  const trimmed = key.trim()
  if (trimmed.length > 0) {
    localStorage.setItem(STORAGE_KEY, trimmed)
  }
}

export function clearOpenAiApiKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasOpenAiApiKey(): boolean {
  return !!getOpenAiApiKey()
}

export class OpenAiAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenAiAuthError'
  }
}

export class OpenAiRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenAiRateLimitError'
  }
}

export class OpenAiNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenAiNetworkError'
  }
}

/**
 * Validate an OpenAI API key by calling the models endpoint.
 * This is a cheap call that verifies the key is valid.
 */
export async function validateOpenAiApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key.trim()}`,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

export interface OpenAiRequestOptions {
  signal?: AbortSignal
  temperature?: number
}

/**
 * Make a request to the OpenAI Chat Completions API.
 * Uses the stored API key from localStorage.
 */
export async function openAiChatCompletion(
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>
  }>,
  options: OpenAiRequestOptions & {
    model?: string
    maxTokens?: number
    responseFormat?: { type: 'json_object' | 'text' }
  } = {}
): Promise<string> {
  const apiKey = getOpenAiApiKey()
  if (!apiKey) {
    throw new OpenAiAuthError('No OpenAI API key configured. Please add your key in settings.')
  }

  const { signal, model = 'gpt-4o', maxTokens = 1000, responseFormat, temperature } = options

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
  }

  if (temperature !== undefined) {
    body.temperature = temperature
  }

  if (responseFormat) {
    body.response_format = responseFormat
  }

  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    throw new OpenAiNetworkError('Failed to connect to OpenAI. Check your internet connection.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new OpenAiAuthError('Your OpenAI API key is invalid or expired. Please update it in settings.')
  }

  if (response.status === 429) {
    throw new OpenAiRateLimitError('Rate limit exceeded. Please wait and try again.')
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}
