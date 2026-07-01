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

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
