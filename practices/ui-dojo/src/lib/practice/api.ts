import { MASTRA_BASE_URL } from "@/constants";

export const practiceUrl = (path: string) => `${MASTRA_BASE_URL}/practice${path}`;

/** Call the practice API; surface server-safe failures and support query cancellation. */
export async function practiceApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(practiceUrl(path), { ...options, headers: {
    ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...options.headers,
  } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json();
}
