/**
 * Turkish string normalization utilities
 * Handles Turkish specific characters for case-insensitive search
 */

/**
 * Normalizes a string for Turkish case-insensitive comparison
 * Converts all Turkish characters to their lowercase ASCII equivalents
 *
 * Turkish character mappings:
 * İ → i, I → i, ı → i
 * Ş → s, ş → s
 * Ğ → g, ğ → g
 * Ü → u, ü → u
 * Ö → o, ö → o
 * Ç → c, ç → c
 */
export function normalizeTurkish(str: string): string {
  if (!str) return ''

  return str
    .toLowerCase()
    .replace(/İ/gi, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/gi, 's')
    .replace(/ş/g, 's')
    .replace(/Ğ/gi, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/gi, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ö/gi, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/gi, 'c')
    .replace(/ç/g, 'c')
}

/**
 * Checks if a string includes another string with Turkish normalization
 * Use this for search functionality
 */
export function turkishIncludes(text: string, search: string): boolean {
  return normalizeTurkish(text).includes(normalizeTurkish(search))
}

/**
 * Checks if a string starts with another string with Turkish normalization
 */
export function turkishStartsWith(text: string, search: string): boolean {
  return normalizeTurkish(text).startsWith(normalizeTurkish(search))
}
