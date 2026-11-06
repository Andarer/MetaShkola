import type { Data } from "@/lib/ms/types";

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function getCrypto(): Crypto {
  if (typeof window !== "undefined" && window.crypto) return window.crypto;
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  throw new Error("Web Crypto API is not available");
}

export async function encryptData(data: Data, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const rawData = enc.encode(JSON.stringify(data));
  const cryptoApi = getCrypto();

  // Generate random salt (16 bytes) and IV (12 bytes)
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));

  // Import passphrase as key material
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM key using PBKDF2
  const key = await cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Encrypt payload
  const cipher = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    rawData.buffer as ArrayBuffer
  );

  const envelope = {
    v: 1,
    app: "MetaSchool",
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    cipher: bufferToBase64(cipher),
  };

  return btoa(JSON.stringify(envelope));
}

export async function decryptData(encryptedString: string, passphrase: string): Promise<Data> {
  const enc = new TextEncoder();
  const envelopeJson = atob(encryptedString.trim());
  const envelope = JSON.parse(envelopeJson);

  if (!envelope.salt || !envelope.iv || !envelope.cipher) {
    throw new Error("Неверный формат зашифрованного резервного файла.");
  }

  const saltBuffer = base64ToBuffer(envelope.salt);
  const ivBuffer = base64ToBuffer(envelope.iv);
  const cipherBuffer = base64ToBuffer(envelope.cipher);
  const cryptoApi = getCrypto();

  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await cryptoApi.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    cipherBuffer
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decrypted);
  return JSON.parse(jsonStr) as Data;
}
