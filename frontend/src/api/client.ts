const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const API_KEY = import.meta.env.VITE_API_KEY || 'poc-premium-key-001';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}
