import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeToSlug,
  generateRandomSuffix,
  generateInternalId,
  extractSlugFromId,
  isSameBaseUser,
} from './userIdService'

describe('userIdService', () => {
  describe('normalizeToSlug', () => {
    it('converts to lowercase', () => {
      expect(normalizeToSlug('JohnSmith')).toBe('johnsmith')
    })

    it('replaces spaces with hyphens', () => {
      expect(normalizeToSlug('John Smith')).toBe('john-smith')
    })

    it('removes diacritics', () => {
      expect(normalizeToSlug('José García')).toBe('jose-garcia')
    })

    it('removes special characters', () => {
      expect(normalizeToSlug('john@smith.com')).toBe('john-smith-com')
    })

    it('collapses consecutive hyphens', () => {
      expect(normalizeToSlug('john   smith')).toBe('john-smith')
    })

    it('trims leading/trailing hyphens', () => {
      expect(normalizeToSlug(' john smith ')).toBe('john-smith')
    })

    it('handles empty string', () => {
      expect(normalizeToSlug('')).toBe('')
    })

    it('handles only special characters', () => {
      expect(normalizeToSlug('!@#$%')).toBe('')
    })

    it('handles unicode names', () => {
      expect(normalizeToSlug('北京')).toBe('')
    })

    it('handles undefined input', () => {
      expect(normalizeToSlug(undefined)).toBe('')
    })

    it('handles null input', () => {
      expect(normalizeToSlug(null)).toBe('')
    })
  })

  describe('generateRandomSuffix', () => {
    it('generates suffix of specified length', () => {
      const suffix = generateRandomSuffix(4)
      expect(suffix).toHaveLength(4)
    })

    it('generates different suffixes on each call', () => {
      const suffixes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        suffixes.add(generateRandomSuffix(4))
      }
      // Expect high uniqueness (at least 90% unique)
      expect(suffixes.size).toBeGreaterThan(90)
    })

    it('only uses alphanumeric characters', () => {
      const suffix = generateRandomSuffix(100)
      expect(suffix).toMatch(/^[a-z0-9]+$/)
    })

    it('uses default length of 4', () => {
      const suffix = generateRandomSuffix()
      expect(suffix).toHaveLength(4)
    })
  })

  describe('generateInternalId', () => {
    beforeEach(() => {
      // Mock crypto for deterministic tests
      const mockValues = [0, 1, 2, 3]
      let index = 0
      vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = mockValues[index % mockValues.length]
            index++
          }
          return arr
        },
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('generates ID with slug and suffix', () => {
      const id = generateInternalId('John Smith')
      expect(id).toMatch(/^john-smith-[a-z0-9]{4}$/)
    })

    it('uses custom suffix length', () => {
      const id = generateInternalId('John', 6)
      expect(id).toMatch(/^john-[a-z0-9]{6}$/)
    })

    it('uses fallback slug for empty name', () => {
      const id = generateInternalId('')
      expect(id).toMatch(/^user-[a-z0-9]{4}$/)
    })

    it('uses fallback slug for special-chars-only name', () => {
      const id = generateInternalId('!@#$%')
      expect(id).toMatch(/^user-[a-z0-9]{4}$/)
    })

    it('handles names with diacritics', () => {
      const id = generateInternalId('José García')
      expect(id).toMatch(/^jose-garcia-[a-z0-9]{4}$/)
    })

    it('handles undefined input', () => {
      const id = generateInternalId(undefined)
      expect(id).toMatch(/^user-[a-z0-9]{4}$/)
    })

    it('handles null input', () => {
      const id = generateInternalId(null)
      expect(id).toMatch(/^user-[a-z0-9]{4}$/)
    })
  })

  describe('extractSlugFromId', () => {
    it('extracts slug from ID with suffix', () => {
      expect(extractSlugFromId('john-smith-a3x9')).toBe('john-smith')
    })

    it('handles single-word slug', () => {
      expect(extractSlugFromId('john-a3x9')).toBe('john')
    })

    it('handles ID without suffix', () => {
      expect(extractSlugFromId('johnsmith')).toBe('johnsmith')
    })

    it('handles multi-hyphen names', () => {
      expect(extractSlugFromId('john-paul-smith-a3x9')).toBe('john-paul-smith')
    })

    it('returns empty string for empty input', () => {
      expect(extractSlugFromId('')).toBe('')
    })
  })

  describe('isSameBaseUser', () => {
    it('returns true for IDs from same name', () => {
      expect(isSameBaseUser('john-smith-a3x9', 'john-smith-b4y0')).toBe(true)
    })

    it('returns false for IDs from different names', () => {
      expect(isSameBaseUser('john-smith-a3x9', 'jane-doe-b4y0')).toBe(false)
    })

    it('handles single-word names', () => {
      expect(isSameBaseUser('john-a3x9', 'john-b4y0')).toBe(true)
    })

    it('returns false for empty inputs', () => {
      expect(isSameBaseUser('', 'john-a3x9')).toBe(false)
      expect(isSameBaseUser('john-a3x9', '')).toBe(false)
      expect(isSameBaseUser('', '')).toBe(false)
    })
  })
})
