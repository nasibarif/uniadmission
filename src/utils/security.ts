/**
 * Security & Input Sanitization Utilities
 * Protects against XSS, script injection, and protocol manipulation.
 */

// Regular expressions to detect and neutralize script tags, event handlers, and dangerous protocols
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;
const ON_EVENT_REGEX = /\bon\w+\s*=\s*(['"]).*?\1/gi;
const JAVASCRIPT_URI_REGEX = /javascript\s*:/gi;
const VBSCRIPT_URI_REGEX = /vbscript\s*:/gi;
const DATA_URI_HTML_REGEX = /data:(text\/html|application\/xhtml\+xml)/gi;

/**
 * Strips dangerous HTML, scripts, and pseudo-protocols from a string.
 * Optionally truncates to a maximum length to prevent payload bombs.
 */
export function sanitizeText(input: unknown, maxLength?: number): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    return String(input);
  }

  let sanitized = input
    .replace(SCRIPT_TAG_REGEX, '')
    .replace(ON_EVENT_REGEX, '')
    .replace(JAVASCRIPT_URI_REGEX, 'blocked:')
    .replace(VBSCRIPT_URI_REGEX, 'blocked:')
    .replace(DATA_URI_HTML_REGEX, 'blocked:');

  // Strip general HTML tags while preserving inner text
  sanitized = sanitized.replace(HTML_TAG_REGEX, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  if (maxLength && maxLength > 0 && sanitized.length > maxLength) {
    return sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates that a given URL is safe to use in href or window.open.
 * Disallows javascript:, vbscript:, data:, and file: protocols.
 */
export function isValidSafeUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;

  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    // Relative URLs starting with / or # are acceptable for internal routing
    return url.startsWith('/') || url.startsWith('#');
  }
}

/**
 * Recursively sanitizes all string properties within an object or array.
 * Useful for incoming form data and JSON payloads prior to state mutation or persistence.
 */
export function sanitizeObject<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeText(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }

  return data;
}
