import { describe, it, expect } from 'vitest'
import { validateImageFile } from './photoRecognition'

describe('photoRecognition', () => {
  describe('validateImageFile', () => {
    it('should accept JPEG files under size limit', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept PNG files under size limit', () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }) // 5MB

      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })

    it('should accept WebP files under size limit', () => {
      const file = new File(['test'], 'test.webp', { type: 'image/webp' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })

    it('should accept GIF files under size limit', () => {
      const file = new File(['test'], 'test.gif', { type: 'image/gif' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })

    it('should reject unsupported file types', () => {
      const file = new File(['test'], 'test.bmp', { type: 'image/bmp' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 })

      const result = validateImageFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unsupported image format')
    })

    it('should reject files over 20MB', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 }) // 25MB

      const result = validateImageFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
      expect(result.error).toContain('20MB')
    })

    it('should accept files exactly at 20MB limit', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 }) // Exactly 20MB

      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
    })
  })
})
