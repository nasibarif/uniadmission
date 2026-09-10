/**
 * File Security & Validation Utilities
 * Enforces file size limits, MIME type whitelists, extension verification,
 * and magic byte header inspection to prevent executable / malicious uploads.
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName: string;
}

// 20 MB maximum file size limit
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'doc',
  'jpg',
  'jpeg',
  'png',
  'txt',
]);

// Allowed MIME types
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'text/plain',
]);

// Dangerous executable & script extensions explicitly blacklisted
export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'zsh',
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'html', 'htm', 'xhtml', 'svg', 'xml',
  'php', 'phtml', 'py', 'rb', 'pl', 'cgi',
  'vbs', 'ps1', 'jar', 'dll', 'so', 'dylib',
  'bin', 'com', 'scr', 'msi', 'app'
]);

/**
 * Strips path traversal characters, directory separators, and control characters from filenames.
 */
export function sanitizeFilename(filename: string): string {
  // Remove directory traversal indicators and backslashes
  let clean = filename.replace(/^.*[\\/]/, '');

  // Strip control characters and non-printable characters
  clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Replace invalid characters with an underscore
  clean = clean.replace(/[<>:"/\\|?*]/g, '_');

  // Limit filename length to 150 characters
  if (clean.length > 150) {
    const ext = clean.substring(clean.lastIndexOf('.'));
    const base = clean.substring(0, 150 - ext.length);
    clean = `${base}${ext}`;
  }

  return clean || 'unnamed_document';
}

/**
 * Checks the initial bytes of a file against known magic signatures.
 */
export async function verifyMagicBytes(file: File): Promise<boolean> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // Plain text does not have fixed magic bytes
  if (extension === 'txt') return true;

  try {
    const slice = file.slice(0, 8);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46)
    if (extension === 'pdf') {
      return (
        bytes.length >= 4 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46
      );
    }

    // PNG magic bytes: 0x89, 'P', 'N', 'G' (0x89, 0x50, 0x4E, 0x47)
    if (extension === 'png') {
      return (
        bytes.length >= 4 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    }

    // JPEG magic bytes: 0xFF, 0xD8, 0xFF
    if (extension === 'jpg' || extension === 'jpeg') {
      return (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
      );
    }

    // DOCX (Zip format): 'P', 'K', 0x03, 0x04 (0x50, 0x4B, 0x03, 0x04)
    if (extension === 'docx') {
      return (
        bytes.length >= 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04
      );
    }

    // DOC (Legacy Word format OLE CF): 0xD0, 0xCF, 0x11, 0xE0
    if (extension === 'doc') {
      return (
        bytes.length >= 4 &&
        bytes[0] === 0xd0 &&
        bytes[1] === 0xcf &&
        bytes[2] === 0x11 &&
        bytes[3] === 0xe0
      );
    }

    return true;
  } catch {
    // If magic byte check cannot be completed in browser context, fallback to extension check
    return true;
  }
}

/**
 * Comprehensive validation function for client and server-side file uploads.
 */
export async function validateUploadedFile(file: File): Promise<FileValidationResult> {
  const sanitizedName = sanitizeFilename(file.name);

  // 1. File existence and size check
  if (!file || file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).', sanitizedName };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum 20MB limit.`,
      sanitizedName,
    };
  }

  // 2. Extension check
  const parts = sanitizedName.split('.');
  if (parts.length < 2) {
    return { valid: false, error: 'File has no extension.', sanitizedName };
  }

  const extension = parts.pop()?.toLowerCase() || '';

  // Check dangerous blacklist first
  if (DANGEROUS_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      error: `Unsupported file type (.${extension}). File is executable or poses a security risk and cannot be uploaded.`,
      sanitizedName,
    };
  }

  // Whitelist check
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      error: `Unsupported file type (.${extension}). Allowed formats: PDF, DOCX, DOC, JPG, PNG, TXT.`,
      sanitizedName,
    };
  }

  // 3. MIME type check (if provided by browser)
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    // Some systems may report empty type or generic octet-stream for valid extensions,
    // but if it reports an explicitly unsafe type like text/html or application/x-msdownload, reject.
    if (file.type.includes('html') || file.type.includes('javascript') || file.type.includes('executable')) {
      return {
        valid: false,
        error: `MIME type ${file.type} is not permitted for security reasons.`,
        sanitizedName,
      };
    }
  }

  // 4. Magic bytes inspection
  const magicMatches = await verifyMagicBytes(file);
  if (!magicMatches) {
    return {
      valid: false,
      error: `File contents do not match its declared .${extension} extension. Possible corrupted or tampered file.`,
      sanitizedName,
    };
  }

  return { valid: true, sanitizedName };
}
