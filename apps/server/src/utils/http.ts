/**
 * RSTA Server - HTTP Utility
 * Helper for making HTTP requests to provider APIs with proper error handling
 */

export interface HttpRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * Sanitize error messages to prevent leaking sensitive data
 */
function sanitizeErrorMessage(message: string): string {
  // Remove any potential API keys or tokens from error messages
  return message
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[a-zA-Z0-9\-_]+/gi, "Bearer [REDACTED]")
    .replace(/api[_-]?key[=:]\s*[a-zA-Z0-9\-_]+/gi, "api_key=[REDACTED]");
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  return { controller, timeoutId };
}

/**
 * Make an HTTP request with timeout and proper error handling
 * SECURITY: Never logs request bodies or authorization headers
 */
export async function httpRequest<T>(
  url: string,
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const { method, headers = {}, body, timeoutMs = 30000 } = options;

  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  try {
    const requestInit: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: controller.signal,
    };

    if (body && method !== "GET") {
      requestInit.body = JSON.stringify(body);
    }

    // Log request (without sensitive data)
    console.log(`[HTTP] ${method} ${url}`);

    const response = await fetch(url, requestInit);
    clearTimeout(timeoutId);

    // Attempt to parse JSON response
    let data: T | null = null;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        data = await response.json() as T;
      } catch {
        // Response wasn't valid JSON
        data = null;
      }
    }

    if (!response.ok) {
      const errorMessage = data && typeof data === "object" && "error" in data
        ? String((data as Record<string, unknown>).error)
        : `HTTP ${response.status}: ${response.statusText}`;

      console.error(`[HTTP] Error: ${response.status} for ${method} ${url}`);

      return {
        ok: false,
        status: response.status,
        data: null,
        error: sanitizeErrorMessage(errorMessage),
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      error: null,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle different error types
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`[HTTP] Timeout after ${timeoutMs}ms for ${method} ${url}`);
        return {
          ok: false,
          status: 0,
          data: null,
          error: `Request timeout after ${timeoutMs}ms`,
        };
      }

      console.error(`[HTTP] Error for ${method} ${url}: ${error.message}`);
      return {
        ok: false,
        status: 0,
        data: null,
        error: sanitizeErrorMessage(error.message),
      };
    }

    console.error(`[HTTP] Unknown error for ${method} ${url}`);
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Unknown error occurred",
    };
  }
}

/**
 * Convenience method for POST requests
 */
export async function httpPost<T>(
  url: string,
  body: unknown,
  headers?: Record<string, string>,
  timeoutMs?: number
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, {
    method: "POST",
    headers,
    body,
    timeoutMs,
  });
}

/**
 * Convenience method for GET requests
 */
export async function httpGet<T>(
  url: string,
  headers?: Record<string, string>,
  timeoutMs?: number
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, {
    method: "GET",
    headers,
    timeoutMs,
  });
}
