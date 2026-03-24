import keys from '../data/seed-api-keys.json';
import { ApiKeyRecord } from '../types';
import { verifySecret } from '../utils/secret-hash';

class ApiKeyService {
  private data: ApiKeyRecord[] = keys as ApiKeyRecord[];

  validate(key: string): ApiKeyRecord | null {
    return this.data.find((candidate) => candidate.active && verifySecret(key, candidate.keyHash)) || null;
  }
}

export const apiKeyService = new ApiKeyService();
