import keys from '../data/seed-api-keys.json';
import { ApiKeyRecord } from '../types';

class ApiKeyService {
  private data: ApiKeyRecord[] = keys as ApiKeyRecord[];

  validate(key: string): ApiKeyRecord | null {
    return this.data.find((k) => k.key === key && k.active) || null;
  }
}

export const apiKeyService = new ApiKeyService();
