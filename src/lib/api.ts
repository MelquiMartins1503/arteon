interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

const BASE_URL = "/api";

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, ...init } = options;

  const queryString = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  const url = `${BASE_URL}${endpoint}${queryString}`;

  const headers = {
    "Content-Type": "application/json",
    ...init.headers,
  };

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    // Tenta ler erro JSON, fallback para status text
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.message || errorBody.error || response.statusText,
    );
  }

  // Se status 204 No Content, retorna null
  if (response.status === 204) return null as T;

  return response.json();
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { method: "GET", ...options }),

  post: <T>(url: string, body: unknown, options?: RequestOptions) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body), ...options }),

  put: <T>(url: string, body: unknown, options?: RequestOptions) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body), ...options }),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { method: "DELETE", ...options }),
};
