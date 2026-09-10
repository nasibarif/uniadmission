import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { VaultDocument } from '../types';
import { sanitizeFilename, validateUploadedFile } from '../utils/fileValidation';

const BUCKET_NAME = 'documents';
const IDB_NAME = 'uniadmission_vault_db';
const IDB_STORE = 'vault_files';
const IDB_VERSION = 1;

/**
 * Helper to open and initialize IndexedDB for local binary file persistence.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'storagePath' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save binary file to IndexedDB.
 */
async function saveFileToIndexedDB(
  storagePath: string,
  file: Blob | File,
  fileName: string,
  mimeType: string
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put({
        storagePath,
        blob: file,
        fileName,
        mimeType,
        savedAt: new Date().toISOString(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[StorageService] IndexedDB write failed:', err);
  }
}

/**
 * Retrieve binary file from IndexedDB.
 */
async function getFileFromIndexedDB(storagePath: string): Promise<Blob | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  try {
    const db = await openIndexedDB();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(storagePath);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[StorageService] IndexedDB read failed:', err);
    return null;
  }
}

/**
 * Delete binary file from IndexedDB.
 */
async function deleteFileFromIndexedDB(storagePath: string): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(storagePath);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[StorageService] IndexedDB delete failed:', err);
  }
}

export class StorageService {
  /**
   * Generates a unique, user-isolated storage path:
   * Format: {userId}/{docId}/v{version}/{fileName}
   */
  public static buildStoragePath(
    userId: string,
    docId: string,
    fileName: string,
    version = 1
  ): string {
    const cleanFileName = sanitizeFilename(fileName);
    return `${userId}/${docId}/v${version}/${cleanFileName}`;
  }

  /**
   * Helper to compute SHA-256 hash of share tokens for database storage (P1-04)
   */
  public static async hashShareToken(token: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return token;
  }

  /**
   * Uploads an actual binary file to Supabase Storage (or IndexedDB in offline sandbox mode).
   * Validates file size, dangerous extensions, and binary magic bytes (P1-10).
   */
  public static async uploadDocumentFile(
    userId: string,
    docId: string,
    file: File,
    version = 1
  ): Promise<{ storagePath: string; mimeType: string; sizeBytes: number }> {
    // 1. Comprehensive File Inspection (P1-10): Magic bytes, extension whitelist, and size
    const validation = await validateUploadedFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file uploaded.');
    }

    const storagePath = this.buildStoragePath(userId, docId, file.name, version);
    const mimeType = file.type || 'application/octet-stream';

    // 2. PERSISTENCE INVERSION:
    // Upload to authoritative Supabase Storage FIRST. Never cache in IndexedDB before persistent upload confirmation.
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            contentType: mimeType,
            upsert: true,
          });

        if (error) {
          throw new Error(`Cloud document storage upload failed: ${error.message}`);
        }
      } catch (err: any) {
        // Ensure no phantom entry is created on failure
        await deleteFileFromIndexedDB(storagePath);
        throw new Error(err?.message || 'Cloud storage upload exception occurred.');
      }
    }

    // 3. Update local client cache ONLY after cloud confirmation (or in offline mode)
    await saveFileToIndexedDB(storagePath, file, file.name, mimeType);

    return {
      storagePath,
      mimeType,
      sizeBytes: file.size,
    };
  }

  /**
   * Generates a signed, short-lived URL (15 minutes) for secure download or preview.
   * Returns a local blob URL if stored in IndexedDB.
   */
  public static async getSignedOrPreviewUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;

    // 1. Try Supabase Storage signed URL if configured (short-lived 15 minutes = 900s)
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(storagePath, 900); // 15-minute expiry

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err) {
        console.warn('[StorageService] Failed to create signed URL from Supabase:', err);
      }
    }

    // 2. Fallback to local IndexedDB Blob URL
    const blob = await getFileFromIndexedDB(storagePath);
    if (blob) {
      return URL.createObjectURL(blob);
    }

    return null;
  }

  /**
   * Performs real file download of the uploaded document (never a fake metadata text file).
   * AUTHORITATIVE CLOUD FIRST (P1-01):
   * Verifies cloud authorization and generates a signed URL BEFORE checking local cache.
   * If cloud authorization fails (or document was deleted from cloud), cached data is NEVER exposed.
   */
  public static async downloadDocumentFile(doc: VaultDocument): Promise<void> {
    let downloadUrl: string | null = null;
    let shouldRevoke = false;

    // 1. Authoritative Cloud Authorization Check FIRST (P1-01)
    if (isSupabaseConfigured() && supabase) {
      if (!doc.storagePath) {
        throw new Error(`DOCUMENT_NOT_FOUND: Document "${doc.fileName}" has no cloud storage path.`);
      }

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.storagePath, 600);

      if (error || !data?.signedUrl) {
        throw new Error(`DOCUMENT_ACCESS_DENIED: Cloud authorization failed or document was deleted: ${error?.message || 'Access denied'}`);
      }

      downloadUrl = data.signedUrl;
    } else if (doc.storagePath) {
      // 2. Offline / local sandbox fallback ONLY when Supabase is not configured
      const localBlob = await getFileFromIndexedDB(doc.storagePath);
      if (localBlob) {
        downloadUrl = URL.createObjectURL(localBlob);
        shouldRevoke = true;
      }
    }

    // 3. If no verified binary exists, fail explicitly
    if (!downloadUrl) {
      throw new Error(`DOCUMENT_NOT_FOUND: Original document binary "${doc.fileName}" is unavailable in cloud storage. Please re-upload the document.`);
    }

    // Trigger browser file download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = doc.fileName || 'document';
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl!), 10000);
    }
  }

  /**
   * Delete a document file from storage and local cache.
   * AUTHORITATIVE CLOUD FIRST (P1-02):
   * Cloud deletion must succeed before local cache is removed. If cloud deletion fails,
   * an error is thrown and local cache is preserved for inspection.
   */
  public static async deleteDocumentFile(storagePath?: string): Promise<void> {
    if (!storagePath) return;

    // 1. Authoritative Cloud Deletion FIRST (P1-02)
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (error) {
        throw new Error(`DOCUMENT_DELETE_FAILED: Cloud document deletion failed: ${error.message}`);
      }
    }

    // 2. Remove local client cache ONLY after cloud confirmation succeeds
    await deleteFileFromIndexedDB(storagePath);
  }

  /**
   * Generates a temporary expiring signed share link backed by cryptographic UUID and persistent registry (P1-03, P1-04).
   */
  public static async createExpiringShareLink(
    storagePath: string,
    expiresInMinutes = 60
  ): Promise<{ shareUrl: string | null; token: string; expiresAt: string }> {
    // Cryptographically secure token (P1-03)
    const token = `share_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    let shareUrl: string | null = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(storagePath, expiresInMinutes * 60);
        if (data?.signedUrl) {
          shareUrl = data.signedUrl;
        }

        // Persistent share link registration with hashed token (P1-04)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const tokenHash = await this.hashShareToken(token);
          await supabase.from('document_share_links').insert({
            document_id: storagePath,
            owner_user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
          });
        }
      } catch (err) {
        console.warn('[StorageService] Error creating signed share URL or registering link:', err);
      }
    }

    if (!shareUrl) {
      const blob = await getFileFromIndexedDB(storagePath);
      if (blob) {
        shareUrl = URL.createObjectURL(blob);
      }
    }

    return { shareUrl, token, expiresAt };
  }

  /**
   * Revoke an active share link by token (P1-04)
   */
  public static async revokeShareLink(token: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const tokenHash = await this.hashShareToken(token);
      const { error } = await supabase
        .from('document_share_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash);

      if (error) {
        throw new Error(`Failed to revoke share link: ${error.message}`);
      }
    }
  }
}
