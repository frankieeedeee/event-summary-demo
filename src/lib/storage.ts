/**
 * Optimized storage utility using IndexedDB with individual attendee storage.
 * Stores each attendee as a separate record with indexes for fast queries.
 * Supports batch operations to avoid blocking the main thread.
 */

import type { AttendeeRow } from './types';

const DB_NAME = 'hx-event-summary-db';
const DB_VERSION = 3; // Incremented to clear stale client data
const ATTENDEES_STORE = 'attendees';
const METADATA_STORE = 'metadata';
const METADATA_KEY = 'version';

// Batch size for processing attendees
const BATCH_SIZE = 1000;
// Timeout for operations (30 seconds)
const OPERATION_TIMEOUT = 30000;

/**
 * Create a promise with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  const startTime = performance.now();
  console.log(`[Storage] Starting ${operationName} at ${startTime.toFixed(2)}ms`);
  
  return Promise.race([
    promise.then((result) => {
      const duration = performance.now() - startTime;
      console.log(`[Storage] ${operationName} completed in ${duration.toFixed(2)}ms`);
      return result;
    }),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        const duration = performance.now() - startTime;
        console.error(`[Storage] ${operationName} timed out after ${duration.toFixed(2)}ms`);
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

interface StoredAttendee extends AttendeeRow {
  id: string; // Unique ID for each attendee
}

interface Metadata {
  version: number;
  validCount: number;
  cancelledCount: number;
}

/**
 * Generate unique ID for attendee
 */
function generateAttendeeId(index: number, status: 'Valid' | 'Cancelled'): string {
  return `${status}-${index}`;
}

/**
 * Get IndexedDB database instance
 */
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create attendees store with indexes
      if (!db.objectStoreNames.contains(ATTENDEES_STORE)) {
        const attendeesStore = db.createObjectStore(ATTENDEES_STORE, { keyPath: 'id' });
        attendeesStore.createIndex('status', 'status', { unique: false });
        attendeesStore.createIndex('eventDateTime', 'eventDateTime', { unique: false });
      }
      
      // Create metadata store
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE);
      }
    };
  });
}

/**
 * Store attendees in batches to avoid blocking
 */
export async function storeAttendeeData(
  validAttendees: AttendeeRow[],
  cancelledAttendees: AttendeeRow[],
  dataVersion: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const operationStart = performance.now();
  console.log(`[Storage] storeAttendeeData: Starting - Valid: ${validAttendees.length}, Cancelled: ${cancelledAttendees.length}`);

  try {
    const dbStart = performance.now();
    const db = await getDB();
    console.log(`[Storage] getDB took ${(performance.now() - dbStart).toFixed(2)}ms`);

    const total = validAttendees.length + cancelledAttendees.length;
    let processed = 0;

    // Clear existing data
    const clearStart = performance.now();
    await clearAttendeeData();
    console.log(`[Storage] clearAttendeeData took ${(performance.now() - clearStart).toFixed(2)}ms`);

    // Store in batches
    const storeBatch = async (attendees: AttendeeRow[], status: 'Valid' | 'Cancelled') => {
      const batchStart = performance.now();
      console.log(`[Storage] storeBatch: Starting ${status} - ${attendees.length} attendees`);
      
      for (let i = 0; i < attendees.length; i += BATCH_SIZE) {
        const batchStartTime = performance.now();
        const batch = attendees.slice(i, i + BATCH_SIZE);
        
        await new Promise<void>((resolve, reject) => {
          const txStart = performance.now();
          const transaction = db.transaction([ATTENDEES_STORE], 'readwrite');
          const store = transaction.objectStore(ATTENDEES_STORE);
          
          batch.forEach((attendee, batchIndex) => {
            const storedAttendee: StoredAttendee = {
              ...attendee,
              id: generateAttendeeId(i + batchIndex, status),
            };
            store.put(storedAttendee);
          });
          
          transaction.oncomplete = () => {
            const txDuration = performance.now() - txStart;
            processed += batch.length;
            const progress = total > 0 ? Math.min(100, (processed / total) * 100) : 0;
            const batchDuration = performance.now() - batchStartTime;
            
            if (i % (BATCH_SIZE * 10) === 0 || batch.length < BATCH_SIZE) {
              console.log(`[Storage] Batch ${i / BATCH_SIZE + 1}: ${batch.length} items, ${txDuration.toFixed(2)}ms tx, ${batchDuration.toFixed(2)}ms total, ${progress.toFixed(1)}%`);
            }
            
            onProgress?.(progress);
            resolve();
          };
          
          transaction.onerror = () => reject(transaction.error);
        });
        
        // Yield to main thread between batches
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      const batchDuration = performance.now() - batchStart;
      console.log(`[Storage] storeBatch: Completed ${status} in ${batchDuration.toFixed(2)}ms`);
    };

    // Store valid attendees
    await storeBatch(validAttendees, 'Valid');
    
    // Store cancelled attendees
    await storeBatch(cancelledAttendees, 'Cancelled');

    // Store metadata
    const metadataStart = performance.now();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const metadata: Metadata = {
        version: dataVersion,
        validCount: validAttendees.length,
        cancelledCount: cancelledAttendees.length,
      };
      const request = store.put(metadata, METADATA_KEY);
      
      request.onsuccess = () => {
        console.log(`[Storage] Metadata stored in ${(performance.now() - metadataStart).toFixed(2)}ms`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    
    const totalDuration = performance.now() - operationStart;
    console.log(`[Storage] storeAttendeeData: Completed in ${totalDuration.toFixed(2)}ms`);
  } catch (error) {
    const totalDuration = performance.now() - operationStart;
    console.error(`[Storage] storeAttendeeData: Failed after ${totalDuration.toFixed(2)}ms`, error);
    throw new Error(
      `Failed to store data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Load attendees in batches with progress callback
 */
export async function loadAttendeeData(
  dataVersion: number,
  onProgress?: (progress: number) => void
): Promise<{ validAttendees: AttendeeRow[]; cancelledAttendees: AttendeeRow[] } | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const operationStart = performance.now();
  console.log(`[Storage] loadAttendeeData: Starting`);

  try {
    const dbStart = performance.now();
    const db = await getDB();
    console.log(`[Storage] getDB took ${(performance.now() - dbStart).toFixed(2)}ms`);
    
    // Check metadata
    const metadataStart = performance.now();
    const metadata = await new Promise<Metadata | null>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(METADATA_KEY);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    console.log(`[Storage] Metadata loaded in ${(performance.now() - metadataStart).toFixed(2)}ms`);

    if (!metadata || metadata.version !== dataVersion) {
      console.log(`[Storage] No valid metadata found or version mismatch`);
      return null;
    }

    console.log(`[Storage] Loading: Valid: ${metadata.validCount}, Cancelled: ${metadata.cancelledCount}`);
    const total = metadata.validCount + metadata.cancelledCount;
    const validAttendees: AttendeeRow[] = [];
    const cancelledAttendees: AttendeeRow[] = [];
    let loaded = 0;

    // Load valid attendees
    const validStart = performance.now();
    await withTimeout(
      loadByStatus(db, 'Valid', metadata.validCount, (attendees) => {
        const pushStart = performance.now();
        validAttendees.push(...attendees);
        loaded += attendees.length;
        const progress = Math.min(100, (loaded / total) * 100);
        const pushDuration = performance.now() - pushStart;
        
        if (loaded % (BATCH_SIZE * 10) === 0 || progress >= 95) {
          console.log(`[Storage] Loaded ${loaded}/${total} (${progress.toFixed(1)}%) - Push took ${pushDuration.toFixed(2)}ms`);
        }
        
        onProgress?.(progress);
      }),
      OPERATION_TIMEOUT,
      'loadByStatus(Valid)'
    );
    console.log(`[Storage] Valid attendees loaded in ${(performance.now() - validStart).toFixed(2)}ms`);

    // Load cancelled attendees
    const cancelledStart = performance.now();
    await withTimeout(
      loadByStatus(db, 'Cancelled', metadata.cancelledCount, (attendees) => {
        const pushStart = performance.now();
        cancelledAttendees.push(...attendees);
        loaded += attendees.length;
        const progress = Math.min(100, (loaded / total) * 100);
        const pushDuration = performance.now() - pushStart;
        
        if (loaded % (BATCH_SIZE * 10) === 0 || progress >= 95) {
          console.log(`[Storage] Loaded ${loaded}/${total} (${progress.toFixed(1)}%) - Push took ${pushDuration.toFixed(2)}ms`);
        }
        
        onProgress?.(progress);
      }),
      OPERATION_TIMEOUT,
      'loadByStatus(Cancelled)'
    );
    console.log(`[Storage] Cancelled attendees loaded in ${(performance.now() - cancelledStart).toFixed(2)}ms`);

    const totalDuration = performance.now() - operationStart;
    console.log(`[Storage] loadAttendeeData: Completed in ${totalDuration.toFixed(2)}ms - Returning ${validAttendees.length + cancelledAttendees.length} attendees`);
    
    return { validAttendees, cancelledAttendees };
  } catch (error) {
    const totalDuration = performance.now() - operationStart;
    console.error(`[Storage] loadAttendeeData: Failed after ${totalDuration.toFixed(2)}ms`, error);
    return null;
  }
}

/**
 * Load attendees by status using cursor in batches
 */
function loadByStatus(
  db: IDBDatabase,
  status: 'Valid' | 'Cancelled',
  _expectedCount: number,
  onBatch: (attendees: AttendeeRow[]) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cursorStart = performance.now();
    let itemsProcessed = 0;
    let batchCount = 0;
    
    const transaction = db.transaction([ATTENDEES_STORE], 'readonly');
    const store = transaction.objectStore(ATTENDEES_STORE);
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only(status));
    
    const batch: AttendeeRow[] = [];
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursor) {
        const attendee = cursor.value as StoredAttendee;
        // Remove id before adding to result
        const { id, ...attendeeRow } = attendee;
        batch.push(attendeeRow);
        itemsProcessed++;
        
        if (batch.length >= BATCH_SIZE) {
          const batchStart = performance.now();
          const batchToProcess = batch.splice(0);
          // Process batch synchronously but continue cursor immediately
          // This keeps the transaction alive
          onBatch(batchToProcess);
          batchCount++;
          const batchDuration = performance.now() - batchStart;
          
          if (batchCount % 10 === 0) {
            console.log(`[Storage] loadByStatus(${status}): Processed ${itemsProcessed} items, ${batchCount} batches, last batch: ${batchDuration.toFixed(2)}ms`);
          }
          
          // Continue cursor immediately - don't use setTimeout as it can cause transaction to finish
          cursor.continue();
        } else {
          // Continue cursor immediately
          cursor.continue();
        }
      } else {
        // Process remaining batch
        if (batch.length > 0) {
          const batchStart = performance.now();
          onBatch(batch);
          const batchDuration = performance.now() - batchStart;
          console.log(`[Storage] loadByStatus(${status}): Final batch (${batch.length} items) took ${batchDuration.toFixed(2)}ms`);
        }
        
        const totalDuration = performance.now() - cursorStart;
        console.log(`[Storage] loadByStatus(${status}): Completed ${itemsProcessed} items in ${totalDuration.toFixed(2)}ms`);
        resolve();
      }
    };
    
    request.onerror = () => {
      console.error(`[Storage] loadByStatus(${status}): Error`, request.error);
      reject(request.error);
    };
    
    // Handle transaction completion/error
    transaction.oncomplete = () => {
      // Transaction completed successfully
    };
    
    transaction.onerror = () => {
      console.error(`[Storage] loadByStatus(${status}): Transaction error`, transaction.error);
      reject(transaction.error);
    };
  });
}

/**
 * Clear all stored data from IndexedDB
 */
export async function clearAttendeeData(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const db = await getDB();
    
    // Clear attendees
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([ATTENDEES_STORE], 'readwrite');
      const store = transaction.objectStore(ATTENDEES_STORE);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Clear metadata
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.delete(METADATA_KEY);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to clear IndexedDB:', error);
  }
}
