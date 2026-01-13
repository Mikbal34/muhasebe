/**
 * Authenticated fetch wrapper that handles 401 responses
 * and dispatches an event to trigger the session expired modal
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // Add Authorization header if token exists
  const headers = new Headers(init?.headers)
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Make the request
  const response = await fetch(input, {
    ...init,
    headers,
  })

  // If 401 Unauthorized, dispatch event to trigger session expired modal
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
  }

  return response
}

/**
 * Helper to make GET requests with auth
 */
export async function authGet(url: string, options?: Omit<RequestInit, 'method'>) {
  return authFetch(url, { ...options, method: 'GET' })
}

/**
 * Helper to make POST requests with auth and JSON body
 */
export async function authPost(url: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>) {
  return authFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Helper to make PUT requests with auth and JSON body
 */
export async function authPut(url: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>) {
  return authFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Helper to make PATCH requests with auth and JSON body
 */
export async function authPatch(url: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>) {
  return authFetch(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Helper to make DELETE requests with auth
 */
export async function authDelete(url: string, options?: Omit<RequestInit, 'method'>) {
  return authFetch(url, { ...options, method: 'DELETE' })
}
