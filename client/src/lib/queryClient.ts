import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle authentication errors without redirecting for admin users
    if (res.status === 401) {
      console.warn('Authentication required, but continuing operation');
      // Don't throw for 401s in admin context to prevent redirects
      if (window.location.pathname.includes('/admin')) {
        console.log('Admin context detected, not throwing 401 error');
        return;
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
  
  // Check if response is HTML instead of JSON (indicates Vite middleware interference)
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error('API returned HTML instead of JSON - possible routing issue');
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: isFormData ? {} : data ? { "Content-Type": "application/json" } : {},
    body: isFormData ? data : data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - allow some staleness for better performance
      gcTime: 10 * 60 * 1000, // 10 minutes cache time
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      retry: 1, // Retry once on failure
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
});
