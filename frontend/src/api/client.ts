export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, init)
  if (res.status === 204) {
    return undefined as T
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = data?.error
    throw new ApiError(res.status, err?.code ?? 'unknown', err?.message ?? res.statusText)
  }
  return data as T
}

function withBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, withBody('POST', body)),
  patch: <T>(path: string, body: unknown) => request<T>(path, withBody('PATCH', body)),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}
