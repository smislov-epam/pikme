import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  setOpenAiApiKey,
  clearOpenAiApiKey,
  hasOpenAiApiKey,
} from './openaiClient'

describe('openaiClient', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('API key management', () => {
    it('should store API key and report it exists', () => {
      expect(hasOpenAiApiKey()).toBe(false)

      setOpenAiApiKey('sk-test-key-123')

      expect(hasOpenAiApiKey()).toBe(true)
    })

    it('should clear API key', () => {
      setOpenAiApiKey('sk-test-key-123')
      expect(hasOpenAiApiKey()).toBe(true)

      clearOpenAiApiKey()

      expect(hasOpenAiApiKey()).toBe(false)
    })

    it('should return false when no key is stored', () => {
      expect(hasOpenAiApiKey()).toBe(false)
    })

    it('should handle empty string as no key', () => {
      localStorage.setItem('openai_api_key', '')
      expect(hasOpenAiApiKey()).toBe(false)
    })

    it('should trim whitespace from key', () => {
      setOpenAiApiKey('  sk-test-key-123  ')
      expect(hasOpenAiApiKey()).toBe(true)
      // The key should be stored trimmed
      expect(localStorage.getItem('openai_api_key')).toBe('sk-test-key-123')
    })
  })
})
