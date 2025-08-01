import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, isFetched, isError } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Always ensure permissionLevel is present
  const patchedUser = user ? { ...user, permissionLevel: user.permissionLevel || 'viewer' } : null;

  // Stay loading until we have definitive auth status
  const authLoading = isLoading || (!isFetched && !isError) || (isFetched && !isError && user === undefined);

  return {
    user: patchedUser,
    isLoading: authLoading,
    isAuthenticated: !!patchedUser,
  };
}