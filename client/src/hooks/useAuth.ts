import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading, isFetched, isError } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Always ensure permissionLevel is present
  const patchedUser = user ? { ...user, permissionLevel: user.permissionLevel || 'viewer' } : null;

  // Stay loading until we have definitive auth status
  const authLoading = isLoading || (!isFetched && !isError) || (isFetched && !isError && user === undefined);

  // Handle admin auto-redirect
  useEffect(() => {
    if (patchedUser?.role === 'system_admin' && location === '/') {
      setLocation('/admin');
    }
  }, [patchedUser?.role, location, setLocation]);

  // Helper functions for role checking
  const isAdmin = patchedUser?.role === 'system_admin';
  const isContractor = patchedUser?.role?.startsWith('contractor_');
  const isRegularUser = patchedUser && !isAdmin && !isContractor;

  return {
    user: patchedUser,
    isLoading: authLoading,
    isAuthenticated: !!patchedUser,
    isAdmin,
    isContractor,
    isRegularUser,
  };
}