import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { VaultDocument } from '../types';
import { sanitizeFilename } from '../utils/fileValidation';

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
   * Uploads an actual binary file to Supabase Storage (or IndexedDB in offline sandbox mode).
   */
  public static async uploadDocumentFile(
    userId: string,
    docId: string,
    file: File,
    version = 1
  ): Promise<{ storagePath: string; mimeType: string; sizeBytes: number }> {
    const storagePath = this.buildStoragePath(userId, docId, file.name, version);
    const mimeType = file.type || 'application/octet-stream';

    // Always mirror in IndexedDB so preview/download is instantaneously available locally
    await saveFileToIndexedDB(storagePath, file, file.name, mimeType);

    // If Supabase is connected, upload to the private 'documents' bucket
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
        throw new Error(err?.message || 'Cloud storage upload exception occurred.');
      }
    }

    return {
      storagePath,
      mimeType,
      sizeBytes: file.size,
    };
  }

  /**
   * Generates a signed, short-lived URL (1 hour) for secure download or preview.
   * Returns a local blob URL if stored in IndexedDB.
   */
  public static async getSignedOrPreviewUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;

    // 1. Try Supabase Storage signed URL if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(storagePath, 3600); // 1 hour expiry

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
   */
  public static async downloadDocumentFile(doc: VaultDocument): Promise<void> {
    let downloadUrl: string | null = null;
    let shouldRevoke = false;

    // 1. Check local binary in IndexedDB first for fast instant response
    if (doc.storagePath) {
      const localBlob = await getFileFromIndexedDB(doc.storagePath);
      if (localBlob) {
        downloadUrl = URL.createObjectURL(localBlob);
        shouldRevoke = true;
      }
    }

    // 2. If not found in IndexedDB, fetch signed URL from Supabase
    if (!downloadUrl && doc.storagePath && isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(doc.storagePath, 600);

        if (data?.signedUrl) {
          downloadUrl = data.signedUrl;
        }
      } catch (err) {
        console.warn('[StorageService] Failed to retrieve signed URL for download:', err);
      }
    }

    // 3. Authoritative check: If no binary file exists, throw explicit error (no fake text files)
    if (!downloadUrl) {
      throw new Error(`Original document binary "${doc.fileName}" is unavailable in cloud storage. Please re-upload the document.`);
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
   */
  public static async deleteDocumentFile(storagePath?: string): Promise<void> {
    if (!storagePath) return;

    await deleteFileFromIndexedDB(storagePath);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      } catch (err) {
        console.warn('[StorageService] Supabase delete file error:', err);
      }
    }
  }

  /**
   * Generates a temporary expiring signed share link for counselor/admissions review.
   */
  public static async createExpiringShareLink(
    storagePath: string,
    expiresInMinutes = 60
  ): Promise<{ shareUrl: string | null; token: string; expiresAt: string }> {
    const token = `share_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
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
      } catch (err) {
        console.warn('[StorageService] Error creating signed share URL:', err);
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
}
