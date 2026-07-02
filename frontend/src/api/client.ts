export type HealthResponse = {
  status: string;
  service: string;
  version: string;
  database: {
    status: string;
    sqlite_version: string;
    path: string;
    tables: string[];
  };
  modules: string[];
};

const API_BASE_URL_KEY = "day3_rpa_api_base_url";
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(localStorage.getItem(API_BASE_URL_KEY) ?? DEFAULT_API_BASE_URL);
}

export function setApiBaseUrl(value: string): string {
  const normalized = normalizeBaseUrl(value);
  if (normalized) {
    localStorage.setItem(API_BASE_URL_KEY, normalized);
  } else {
    localStorage.removeItem(API_BASE_URL_KEY);
  }
  return normalized;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/api/health");
}

export async function testBackendConnection(baseUrl: string): Promise<HealthResponse> {
  const normalized = normalizeBaseUrl(baseUrl);
  const healthUrl = `${normalized}/api/health`;
  const response = await fetch(healthUrl);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
