/**
 * Fuzzy Search Utility
 *
 * Lightweight fuzzy search implementation for filtering modes, commands, etc.
 * Based on similar principles to fzf but simpler for our use case.
 */

export interface FuzzyMatch<T> {
  item: T
  score: number
  matches: number[]  // Indices of matched characters
}

/**
 * Calculate fuzzy match score for a search query against a target string
 *
 * @param query - Search query
 * @param target - Target string to search in
 * @param caseSensitive - Whether to perform case-sensitive search
 * @returns Match score (higher is better) and matched indices, or null if no match
 */
export function fuzzyMatch(
  query: string,
  target: string,
  caseSensitive: boolean = false
): { score: number; matches: number[] } | null {
  if (!query) {
    return { score: 0, matches: [] }
  }

  const searchQuery = caseSensitive ? query : query.toLowerCase()
  const searchTarget = caseSensitive ? target : target.toLowerCase()

  let score = 0
  let queryIndex = 0
  const matches: number[] = []
  let lastMatchIndex = -1
  let consecutiveMatches = 0

  for (let i = 0; i < searchTarget.length && queryIndex < searchQuery.length; i++) {
    if (searchTarget[i] === searchQuery[queryIndex]) {
      matches.push(i)
      queryIndex++

      // Bonus for consecutive characters
      if (lastMatchIndex === i - 1) {
        consecutiveMatches++
        score += 5 + consecutiveMatches  // Increasing bonus for longer consecutive matches
      } else {
        consecutiveMatches = 0
        score += 1
      }

      // Bonus for matching at word boundaries
      if (i === 0 || searchTarget[i - 1] === ' ' || searchTarget[i - 1] === '-' || searchTarget[i - 1] === '_') {
        score += 10
      }

      // Bonus for matching uppercase letters in camelCase
      if (target[i] === target[i].toUpperCase() && target[i] !== target[i].toLowerCase()) {
        score += 8
      }

      lastMatchIndex = i
    }
  }

  // If we didn't match all query characters, it's not a match
  if (queryIndex < searchQuery.length) {
    return null
  }

  // Penalty for longer target strings (prefer shorter matches)
  score -= (target.length - query.length) * 0.1

  // Bonus for exact prefix match
  if (searchTarget.startsWith(searchQuery)) {
    score += 50
  }

  // Bonus for exact match
  if (searchTarget === searchQuery) {
    score += 100
  }

  return { score, matches }
}

/**
 * Perform fuzzy search on an array of items
 *
 * @param query - Search query
 * @param items - Array of items to search
 * @param getText - Function to extract searchable text from an item
 * @param options - Search options
 * @returns Sorted array of matching items with scores
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  options: {
    caseSensitive?: boolean
    limit?: number
    threshold?: number  // Minimum score to include in results
  } = {}
): FuzzyMatch<T>[] {
  const { caseSensitive = false, limit, threshold = 0 } = options

  if (!query.trim()) {
    // Return all items with zero score if no query
    return items.map(item => ({
      item,
      score: 0,
      matches: [],
    }))
  }

  const results: FuzzyMatch<T>[] = []

  for (const item of items) {
    const text = getText(item)
    const match = fuzzyMatch(query, text, caseSensitive)

    if (match && match.score >= threshold) {
      results.push({
        item,
        score: match.score,
        matches: match.matches,
      })
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score)

  // Apply limit if specified
  if (limit && limit > 0) {
    return results.slice(0, limit)
  }

  return results
}

/**
 * Search multiple fields of an item
 *
 * @param query - Search query
 * @param items - Array of items to search
 * @param getFields - Function to extract multiple searchable fields from an item
 * @param options - Search options
 * @returns Sorted array of matching items with scores
 */
export function fuzzySearchMultiField<T>(
  query: string,
  items: T[],
  getFields: (item: T) => string[],
  options: {
    caseSensitive?: boolean
    limit?: number
    threshold?: number
  } = {}
): FuzzyMatch<T>[] {
  const { caseSensitive = false, limit, threshold = 0 } = options

  if (!query.trim()) {
    return items.map(item => ({
      item,
      score: 0,
      matches: [],
    }))
  }

  const results: FuzzyMatch<T>[] = []

  for (const item of items) {
    const fields = getFields(item)
    let bestMatch: { score: number; matches: number[] } | null = null

    // Find the best match across all fields
    for (const field of fields) {
      const match = fuzzyMatch(query, field, caseSensitive)
      if (match && (!bestMatch || match.score > bestMatch.score)) {
        bestMatch = match
      }
    }

    if (bestMatch && bestMatch.score >= threshold) {
      results.push({
        item,
        score: bestMatch.score,
        matches: bestMatch.matches,
      })
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score)

  if (limit && limit > 0) {
    return results.slice(0, limit)
  }

  return results
}

/**
 * Highlight matched characters in a string
 *
 * @param text - Original text
 * @param matches - Array of matched character indices
 * @param highlightClass - CSS class for highlighted characters
 * @returns HTML string with highlighted matches
 */
export function highlightMatches(
  text: string,
  matches: number[],
  highlightClass: string = 'fuzzy-match'
): string {
  if (!matches || matches.length === 0) {
    return text
  }

  let result = ''
  let lastIndex = 0

  for (const matchIndex of matches) {
    // Add non-highlighted text
    result += text.slice(lastIndex, matchIndex)
    // Add highlighted character
    result += `<span class="${highlightClass}">${text[matchIndex]}</span>`
    lastIndex = matchIndex + 1
  }

  // Add remaining text
  result += text.slice(lastIndex)

  return result
}
