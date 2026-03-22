import keys from '../data/api-keys.json';

interface RawKey {
  keyId: string;
  key: string;
  userId: string;
  active: boolean;
  label: string;
}

const keyStore: RawKey[] = [...(keys as RawKey[])];

export function validateApiKey(raw?: string): RawKey | undefined {
  if (!raw) return undefined;
  return keyStore.find((k) => k.key === raw && k.active);
}
