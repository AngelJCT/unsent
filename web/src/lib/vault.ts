import type { CategoryId } from "@/lib/tokens";

const DB_NAME = "unsent-vault";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const RECORD_STORE = "records";
const KEY_ID = "vault-v1";

export type VaultStatus = "kept" | "burned";
export type VaultEntry = {
  id: string;
  recipientCategory: CategoryId;
  createdAt: string;
  status: VaultStatus;
  snippet?: string;
  // The goal chosen for this draft, when one was. Metadata only — feeds
  // the on-device Vault insights; never a message-text field.
  goal?: string;
};

export type VaultSummary = {
  unsent: number;
  kept: number;
  letGo: number;
};

type StoredKey = {
  id: string;
  key: CryptoKey;
};

type StoredVaultRecord = {
  id: string;
  iv: string;
  ciphertext: string;
};

function supportsVault() {
  return (
    typeof window !== "undefined" &&
    "indexedDB" in window &&
    "crypto" in window &&
    Boolean(window.crypto.subtle)
  );
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        db.createObjectStore(RECORD_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function vaultKey(db: IDBDatabase): Promise<CryptoKey> {
  const read = db.transaction(KEY_STORE, "readonly");
  const readDone = transactionDone(read);
  const existing = await requestToPromise<StoredKey | undefined>(
    read.objectStore(KEY_STORE).get(KEY_ID),
  );
  await readDone;
  if (existing?.key) return existing.key;

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const write = db.transaction(KEY_STORE, "readwrite");
  const writeDone = transactionDone(write);
  write.objectStore(KEY_STORE).put({ id: KEY_ID, key });
  await writeDone;
  return key;
}

function makeSnippet(draft: string): string | undefined {
  const compact = draft.trim().replace(/\s+/g, " ");
  if (!compact) return undefined;
  return compact.length > 96 ? `${compact.slice(0, 93).trim()}...` : compact;
}

async function encryptEntry(
  key: CryptoKey,
  entry: VaultEntry,
): Promise<StoredVaultRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(JSON.stringify(entry));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(payload),
  );
  return {
    id: entry.id,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptEntry(
  key: CryptoKey,
  record: StoredVaultRecord,
): Promise<VaultEntry | null> {
  try {
    const iv = base64ToBytes(record.iv);
    const ciphertext = base64ToBytes(record.ciphertext);
    const payload = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
    const parsed = JSON.parse(new TextDecoder().decode(payload)) as VaultEntry;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.createdAt !== "string" ||
      (parsed.status !== "kept" && parsed.status !== "burned")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveVaultEntry(input: {
  draft?: string;
  recipientCategory: CategoryId | null;
  status: VaultStatus;
  goal?: string | null;
}): Promise<VaultEntry | null> {
  if (!supportsVault()) return null;

  const db = await openDb();
  try {
    const key = await vaultKey(db);
    const entry: VaultEntry = {
      id: crypto.randomUUID(),
      recipientCategory: input.recipientCategory ?? "other",
      createdAt: new Date().toISOString(),
      status: input.status,
      ...(input.goal ? { goal: input.goal } : {}),
      ...(input.status === "kept" && input.draft
        ? { snippet: makeSnippet(input.draft) }
        : {}),
    };
    const record = await encryptEntry(key, entry);
    const transaction = db.transaction(RECORD_STORE, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(RECORD_STORE).put(record);
    await done;
    return entry;
  } finally {
    db.close();
  }
}

export async function loadVaultEntries(): Promise<VaultEntry[]> {
  if (!supportsVault()) return [];

  const db = await openDb();
  try {
    const key = await vaultKey(db);
    const transaction = db.transaction(RECORD_STORE, "readonly");
    const done = transactionDone(transaction);
    const records = await requestToPromise<StoredVaultRecord[]>(
      transaction.objectStore(RECORD_STORE).getAll(),
    );
    await done;
    const entries = await Promise.all(
      records.map((record) => decryptEntry(key, record)),
    );
    return entries
      .filter((entry): entry is VaultEntry => entry !== null)
      .sort(
        (a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
  } finally {
    db.close();
  }
}

export async function loadVaultSummary(): Promise<VaultSummary> {
  const entries = await loadVaultEntries();
  const kept = entries.filter((entry) => entry.status === "kept").length;
  const letGo = entries.filter((entry) => entry.status === "burned").length;
  return {
    unsent: kept + letGo,
    kept,
    letGo,
  };
}

/** Dev only — deletes the on-device Vault database. Best-effort. */
export function clearVault(): Promise<void> {
  return new Promise((resolve) => {
    if (!supportsVault()) return resolve();
    try {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
