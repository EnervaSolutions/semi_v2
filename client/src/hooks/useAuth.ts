import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Always ensure permissionLevel is present
  const patchedUser = user ? { ...user, permissionLevel: user.permissionLevel || 'viewer' } : null;

  return {
    user: patchedUser,
    isLoading,
    isAuthenticated: !!patchedUser,
  };
}