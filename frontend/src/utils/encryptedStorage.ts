const ENCRYPTION_KEY_ID = 'memora-encryption-key';

async function getOrCreateKey(): Promise<CryptoKey> {
  const existingKey = sessionStorage.getItem(ENCRYPTION_KEY_ID);
  if (existingKey) {
    const keyData = JSON.parse(existingKey);
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(ENCRYPTION_KEY_ID, JSON.stringify(exportedKey));
  return key;
}

async function encrypt(data: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string): Promise<string> {
  const key = await getOrCreateKey();
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}

export const EncryptedLS = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return fallback;
      
      const decrypted = await decrypt(encrypted);
      const parsed = JSON.parse(decrypted);
      return (parsed === null || parsed === undefined) ? fallback : (parsed as T);
    } catch {
      return fallback;
    }
  },
  
  async set(key: string, value: unknown): Promise<void> {
    try {
      const jsonStr = JSON.stringify(value);
      const encrypted = await encrypt(jsonStr);
      localStorage.setItem(key, encrypted);
    } catch {}
  },
  
  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};