export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function safeJsonParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
}

export function textContains(source: string, query: string): boolean {
  return source.toLowerCase().includes(query.toLowerCase());
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
