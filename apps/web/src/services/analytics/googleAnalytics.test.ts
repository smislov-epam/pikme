import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Google Analytics gtag stub', () => {
  let originalDataLayer: IArguments[] | undefined
  let originalGtag: ((...args: [string, ...unknown[]]) => void) | undefined

  beforeEach(() => {
    // Save original values
    originalDataLayer = window.dataLayer
    originalGtag = window.gtag
    // Reset for each test
    delete window.dataLayer
    delete window.gtag
  })

  afterEach(() => {
    // Restore original values
    if (originalDataLayer !== undefined) {
      window.dataLayer = originalDataLayer
    } else {
      delete window.dataLayer
    }
    if (originalGtag !== undefined) {
      window.gtag = originalGtag
    } else {
      delete window.gtag
    }
  })

  it('should push Arguments objects to dataLayer, not arrays', () => {
    // Set up the gtag stub exactly as the real implementation does
    window.dataLayer = window.dataLayer || []
    window.gtag =
      window.gtag ||
      function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments)
      }

    // Call gtag with test data
    window.gtag('event', 'test_event', { param: 'value' })

    // Verify dataLayer has one entry
    expect(window.dataLayer).toHaveLength(1)

    // The entry should be an Arguments object, not an array
    const entry = window.dataLayer[0]

    // Arguments objects are NOT arrays
    expect(Array.isArray(entry)).toBe(false)

    // Arguments objects have numeric indices and length property
    expect(entry[0]).toBe('event')
    expect(entry[1]).toBe('test_event')
    expect(entry[2]).toEqual({ param: 'value' })
    expect(entry.length).toBe(3)
  })

  it('should demonstrate that array format is different from Arguments format', () => {
    // This test shows the WRONG way (using arrays) vs the RIGHT way (using arguments)
    const dataLayerWrong: unknown[][] = []
    const dataLayerRight: IArguments[] = []

    // WRONG: Using rest params pushes arrays
    const gtagWrong = (...args: unknown[]) => {
      dataLayerWrong.push(args)
    }

    // RIGHT: Using arguments object pushes IArguments
    // Using @ts-expect-error because we call the function with arguments
    // but the function signature doesn't declare any parameters (matching the real implementation)
    const gtagRight = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      dataLayerRight.push(arguments)
    }

    gtagWrong('event', 'test')
    // @ts-expect-error - intentionally calling with args to test Arguments object behavior
    gtagRight('event', 'test')

    // Arrays have Array.isArray = true
    expect(Array.isArray(dataLayerWrong[0])).toBe(true)

    // Arguments objects have Array.isArray = false
    expect(Array.isArray(dataLayerRight[0])).toBe(false)

    // Both contain the same data, but in different formats
    // gtag.js only recognizes the Arguments format
  })
})
