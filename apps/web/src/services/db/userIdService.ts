/**
 * User Internal ID Generation Service
 *
 * Generates unique internal IDs for users that are:
 * 1. Human-readable aliases based on the username/display name
 * 2. Unique enough to prevent collisions with other users
 * 3. Stable and deterministic when the same name is processed
 */

/**
 * Normalizes a name into a slug by:
 * - Converting to lowercase
 * - Removing diacritics (accents)
 * - Replacing spaces and special characters with hyphens
 * - Removing consecutive hyphens
 * - Trimming leading/trailing hyphens
 */
export function normalizeToSlug(name: string | undefined | null): string {
  if (name == null) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-') // Collapse consecutive hyphens
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
}

/**
 * Generates a short random suffix using alphanumeric characters.
 * Uses crypto.getRandomValues for better randomness.
 */
export function generateRandomSuffix(length: number = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  return Array.from(randomValues)
    .map((v) => chars[v % chars.length])
    .join('')
}

/**
 * Generates a unique internal ID from a username/display name.
 *
 * Format: <slug>-<random-suffix>
 * Example: "john-smith-a3x9"
 *
 * @param name - The username or display name to generate ID from
 * @param suffixLength - Length of the random suffix (default: 4)
 * @returns A unique internal ID string
 */
export function generateInternalId(
  name: string | undefined | null,
  suffixLength: number = 4,
): string {
  const slug = normalizeToSlug(name)
  const suffix = generateRandomSuffix(suffixLength)

  // If slug is empty (e.g., name was all special chars), use 'user' as fallback
  const baseSlug = slug || 'user'

  return `${baseSlug}-${suffix}`
}

/**
 * Extracts the base slug (without suffix) from an internal ID.
 * Useful for display or comparison purposes.
 * 
 * @param internalId - The internal ID to extract slug from
 * @returns The slug portion, or the original string if no suffix found
 */
export function extractSlugFromId(internalId: string): string {
  if (!internalId) return ''
  const parts = internalId.split('-')
  if (parts.length <= 1) return internalId
  // Remove the last part (suffix)
  return parts.slice(0, -1).join('-')
}

/**
 * Checks if two internal IDs are derived from the same base name.
 * This compares the slug portion, ignoring the random suffix.
 * 
 * @param id1 - First internal ID
 * @param id2 - Second internal ID
 * @returns true if both IDs share the same base slug
 */
export function isSameBaseUser(id1: string, id2: string): boolean {
  if (!id1 || !id2) return false
  return extractSlugFromId(id1) === extractSlugFromId(id2)
}

/**
 * Extracts the unique suffix from an internal ID.
 * Used for displaying disambiguation information.
 * 
 * @param internalId - The internal ID to extract suffix from
 * @returns The suffix portion (e.g., "a3x9" from "john-smith-a3x9")
 */
export function extractSuffixFromId(internalId: string): string {
  if (!internalId) return ''
  const parts = internalId.split('-')
  if (parts.length <= 1) return ''
  return parts[parts.length - 1]
}

/**
 * Checks if a display name has duplicates among a list of users.
 * Comparison is case-insensitive.
 * 
 * @param displayName - The display name to check
 * @param users - Array of user objects with displayName and username
 * @returns Array of users with matching display names
 */
export function findUsersWithSameName<T extends { displayName?: string; username: string }>(
  displayName: string,
  users: T[],
): T[] {
  const normalized = displayName.toLowerCase().trim()
  return users.filter((u) => {
    const uName = (u.displayName || u.username).toLowerCase().trim()
    return uName === normalized
  })
}

/**
 * Gets a disambiguated display label for a user.
 * If there are other users with the same name, appends the ID suffix.
 * 
 * @param user - The user to get a label for
 * @param allUsers - All users to check for duplicates
 * @returns Display label, possibly with suffix for disambiguation
 */
export function getDisambiguatedLabel<T extends { displayName?: string; username: string; internalId: string }>(
  user: T,
  allUsers: T[],
): string {
  const baseName = user.displayName || user.username
  const duplicates = findUsersWithSameName(baseName, allUsers)
  
  if (duplicates.length > 1) {
    const suffix = extractSuffixFromId(user.internalId)
    return suffix ? `${baseName} (#${suffix})` : baseName
  }
  
  return baseName
}
