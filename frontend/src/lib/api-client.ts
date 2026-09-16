/**
 * Thin fetch wrapper shared by every feature: resolves the API base URL, does the
 * JSON round-trip, and turns a non-2xx response into an Error carrying the backend's
 * own message.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
    throw new Error(typeof body?.detail === 'string' ? body.detail : response.statusText)
  }

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  put: <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
}
