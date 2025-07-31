import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  KeyRound,
  Users,
  UserCheck,
  Building,
  Building2,
  UserX,
  UserPlus,
  Shield,
  ArrowUpDown,
  FileSpreadsheet,
  Calendar,
  SortAsc,
  Shuffle,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { USER_ROLES, PERMISSION_LEVELS } from "@/lib/constants";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permission_level: string;
  companyId: number | null;
  isActive: boolean;
  createdAt: string;
  company?: {
    id: number;
    name: string;
    isContractor: boolean;
  };
}

interface Company {
  id: number;
  name: string;
  isContractor: boolean;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Handle navigation to users page with company filter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyParam = urlParams.get('company');
    if (companyParam) {
      setCompanyFilter(companyParam);
    }
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all"); // regular, contractor, all
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name-asc, name-desc, company-asc, company-desc

  // Form states
  const [createForm, setCreateForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "team_member",
    permission_level: "view",
    companyId: "",
    isActive: true,
    isTemporaryPassword: false
  });

  // Password field states
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    role: "",
    permission_level: "",
    companyId: "",
    isActive: true
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  // Fetch all users with forced refresh and comprehensive debugging
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"], // Stable query key
    queryFn: async () => {
      console.log('=== FRONTEND FETCHING USERS ===');
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/users?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      
      console.log('Frontend - Total users received:', data.length);
      console.log('Frontend - Raw first user:', data[0]);
      
      if (data.length > 0) {
        const usersWithCompanies = data.filter((u: any) => u.companyId);
        console.log('Frontend - Users with company IDs:', usersWithCompanies.length);
        
        const usersWithCompanyNames = data.filter((u: any) => u.companyName);
        console.log('Frontend - Users with company NAMES:', usersWithCompanyNames.length);
        
        if (usersWithCompanies.length > 0) {
          const firstUserWithCompany = usersWithCompanies[0];
          console.log('=== FRONTEND COMPANY DATA ANALYSIS ===');
          console.log('Email:', firstUserWithCompany.email);
          console.log('Company ID:', firstUserWithCompany.companyId);
          console.log('Company Name:', firstUserWithCompany.companyName);
          console.log('Company Short Name:', firstUserWithCompany.companyShortName);
          console.log('Is Contractor:', firstUserWithCompany.isContractor);
          console.log('=== END ANALYSIS ===');
        }
      }
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Ensure users is always an array and properly synced
  const users = React.useMemo(() => {
    if (Array.isArray(usersData)) {
      console.log('Setting users data:', usersData.length);
      return usersData;
    }
    console.log('Users data not array, returning empty');
    return [];
  }, [usersData]);

  // Debug: Log users data when it changes
  React.useEffect(() => {
    if (users && users.length > 0) {
      const firstUser = users[0] as any;
      console.log('Frontend - Users received:', users.length);
      console.log('Frontend - Company data in first user:', {
        email: firstUser?.email,
        companyId: firstUser?.companyId,
        companyName: firstUser?.companyName,
        companyShortName: firstUser?.companyShortName,
        isContractor: firstUser?.isContractor
      });
    }
  }, [users]);

  // Fetch all companies for assignment dropdown
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/admin/companies"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest("/api/admin/users", "POST", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateDialog(false);
      setCreateForm({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "team_member",
        permission_level: "view",
        companyId: "",
        isActive: true,
        isTemporaryPassword: false
      });
      setShowCreatePassword(false);
      toast({
        title: "Success",
        description: "User created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      return await apiRequest(`/api/admin/users/${userId}`, "PATCH", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditDialog(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/reset-password`, "POST", { password });
    },
    onSuccess: () => {
      setShowPasswordDialog(false);
      setSelectedUser(null);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      toast({
        title: "Success",
        description: "Password reset successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete users mutation
  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async ({ userIds }: { userIds: string[] }) => {
      return await apiRequest("/api/admin/users/bulk-delete", "POST", { userIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowBulkDeleteDialog(false);
      setSelectedUsers([]);
      toast({
        title: "Success",
        description: "Selected users deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete users.",
        variant: "destructive",
      });
    },
  });



  // Filter, search, and sort users
  const filteredAndSortedUsers = useMemo(() => {
    console.log('=== FILTERING AND SORTING USERS ===');
    console.log('Users input length:', users.length);
    console.log('Users is array:', Array.isArray(users));
    console.log('Search Term:', searchTerm);
    console.log('Role Filter:', roleFilter);
    console.log('Status Filter:', statusFilter);
    console.log('User Type Filter:', userTypeFilter);
    console.log('Company Filter:', companyFilter);
    console.log('Sort By:', sortBy);
    
    if (!users || !users.length) {
      console.log('No users available, returning empty array');
      return [];
    }
    
    // First filter
    const filtered = users.filter((user: any) => {
      // Search filter - EMPTY SEARCH MEANS SHOW ALL
      const searchMatch = searchTerm === '' || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      
      // Status filter
      const statusMatch = statusFilter === "all" || 
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      // User type filter
      const typeMatch = userTypeFilter === "all" ||
        (userTypeFilter === "contractor" && user.isContractor) ||
        (userTypeFilter === "regular" && !user.isContractor);

      // Company filter - show users from specific company
      const companyMatch = companyFilter === "all" || 
        (companyFilter === "no-company" && !user.companyId) ||
        (user.companyId && user.companyId.toString() === companyFilter);

      const result = searchMatch && roleMatch && statusMatch && typeMatch && companyMatch;
      
      // Debug first 3 users
      if (users.indexOf(user) < 3) {
        console.log(`User ${user.email}:`, {
          searchMatch: searchMatch,
          roleMatch: roleMatch,
          statusMatch: statusMatch,
          typeMatch: typeMatch,
          companyMatch: companyMatch,
          finalResult: result,
          searchTerm: searchTerm,
          userRole: user.role,
          userActive: user.isActive,
          userContractor: user.isContractor,
          userCompanyId: user.companyId,
          companyFilter: companyFilter
        });
      }

      return result;
    });
    
    // Then sort
    const sorted = [...filtered].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          return nameA.localeCompare(nameB);
        case 'name-desc':
          const nameA2 = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          const nameB2 = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          return nameB2.localeCompare(nameA2);
        case 'company-asc':
          const companyA = a.companyName || 'No Company';
          const companyB = b.companyName || 'No Company';
          return companyA.localeCompare(companyB);
        case 'company-desc':
          const companyA2 = a.companyName || 'No Company';
          const companyB2 = b.companyName || 'No Company';
          return companyB2.localeCompare(companyA2);
        default:
          return 0;
      }
    });
    
    console.log('Filtered users count:', filtered.length);
    console.log('Sorted users count:', sorted.length);
    console.log('=== END FILTERING AND SORTING ===');
    return sorted;
  }, [users, searchTerm, roleFilter, statusFilter, userTypeFilter, companyFilter, sortBy]);

  // Excel export function
  // Generate secure random password
  const generateRandomPassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    // Ensure at least one character from each required category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the remaining 8 characters
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password to avoid predictable patterns
    const shuffled = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setCreateForm(prev => ({ ...prev, password: shuffled }));
    
    toast({
      title: "Password Generated",
      description: "A secure random password has been generated.",
    });
  };

  const exportToExcel = () => {
    const dataToExport = filteredAndSortedUsers.map((user: any) => ({
      'Name': `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      'Email': user.email || '',
      'Phone': user.businessMobile || '',
      'Join Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
      'Role': user.role || '',
      'Company': user.companyName || 'No Company',
      'Status': user.isActive ? 'Active' : 'Inactive'
    }));

    // Convert to CSV format for Excel
    const headers = Object.keys(dataToExport[0] || {});
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Export Complete",
      description: `Exported ${dataToExport.length} users to Excel file.`,
    });
  };

  const handleCreateUser = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword && showCreateDialog) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    const userData = {
      ...createForm,
      companyId: createForm.companyId && createForm.companyId !== "none" ? parseInt(createForm.companyId) : null
    };

    createUserMutation.mutate(userData);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permission_level: user.permission_level || "view", // Populate permission_level from user data
      companyId: user.companyId?.toString() || "none",
      isActive: user.isActive
    });
    setShowEditDialog(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    const userData = {
      ...editForm,
      companyId: editForm.companyId && editForm.companyId !== "none" ? parseInt(editForm.companyId) : null
    };

    updateUserMutation.mutate({ userId: selectedUser.id, userData });
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowPasswordDialog(true);
  };

  const handlePasswordReset = () => {
    if (!selectedUser) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({ 
      userId: selectedUser.id, 
      password: passwordForm.newPassword 
    });
  };

  const handleBulkDelete = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "No users selected for deletion.",
        variant: "destructive",
      });
      return;
    }
    bulkDeleteUsersMutation.mutate({ userIds: selectedUsers });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system_admin':
        return "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg";
      case 'company_admin':
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md";
      case 'contractor_individual':
      case 'contractor_team_member':
      case 'contractor_account_owner':
      case 'contractor_manager':
        return "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md";
      default:
        return "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm";
    }
  };

  const getUserTypeColor = (user: User) => {
    if (user.company?.isContractor) {
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  const getUserTypeBadge = (user: User) => {
    if (user.company?.isContractor) {
      return 'Contractor';
    }
    return 'Regular';
  };

  const stats = React.useMemo(() => {
    if (!Array.isArray(users)) return { totalUsers: 0, activeUsers: 0, contractorUsers: 0, regularUsers: 0 };
    
    const userArray = users as any[];
    const contractorCount = userArray.filter(u => 
      u.isContractor === true || (u.role && u.role.includes('contractor'))
    ).length;
    
    return {
      totalUsers: userArray.length,
      activeUsers: userArray.filter(u => u.isActive).length,
      contractorUsers: contractorCount,
      regularUsers: userArray.length - contractorCount,
    };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage all registered users across the platform</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={exportToExcel}
            className="border-green-600 text-green-700 hover:bg-green-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Manually create a new user account with assigned credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showCreatePassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateRandomPassword}
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      title="Generate random password"
                    >
                      <Shuffle className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      title={showCreatePassword ? "Hide password" : "Show password"}
                    >
                      {showCreatePassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isTemporaryPassword"
                  checked={createForm.isTemporaryPassword}
                  onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, isTemporaryPassword: !!checked }))}
                />
                <Label htmlFor="isTemporaryPassword">Is temporary password</Label>
                <div className="text-xs text-gray-500">
                  (User will be required to change password on first login)
                </div>
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLES).map(([value, role]) => (
                      <SelectItem key={value} value={value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="permission_level">Permission Level</Label>
                <Select value={createForm.permission_level} onValueChange={(value) => setCreateForm(prev => ({ ...prev, permission_level: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Permission Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERMISSION_LEVELS).map(([value, level]) => (
                      <SelectItem key={value} value={value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="company">Company (Optional)</Label>
                <Select value={createForm.companyId} onValueChange={(value) => setCreateForm(prev => ({ ...prev, companyId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Company</SelectItem>
                    {companies?.map((company: any) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name} ({company.shortName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={createForm.isActive}
                  onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="isActive">Active User</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.regularUsers}</div>
            <p className="text-xs text-muted-foreground">Company users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contractor Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contractorUsers}</div>
            <p className="text-xs text-muted-foreground">Contractor accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <p className="text-sm text-gray-600">
            Total: {users.length} users | Filtered: {filteredAndSortedUsers.length} users
            {companyFilter !== "all" && (
              <span className="ml-2 text-blue-600 font-medium">
                • {companyFilter === "no-company" ? "Users with no company" : 
                   companies?.find((c: any) => c.id.toString() === companyFilter)?.name || "Selected company"}
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent>
          {/* Search, Filters, and Sort */}
          <div className="flex flex-col gap-4 mb-6">
            {/* First Row: Search and Sort */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Newest First
                    </div>
                  </SelectItem>
                  <SelectItem value="oldest">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Oldest First
                    </div>
                  </SelectItem>
                  <SelectItem value="name-asc">
                    <div className="flex items-center">
                      <SortAsc className="h-4 w-4 mr-2" />
                      Name A-Z
                    </div>
                  </SelectItem>
                  <SelectItem value="name-desc">
                    <div className="flex items-center">
                      <SortAsc className="h-4 w-4 mr-2" />
                      Name Z-A
                    </div>
                  </SelectItem>
                  <SelectItem value="company-asc">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Company A-Z
                    </div>
                  </SelectItem>
                  <SelectItem value="company-desc">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Company Z-A
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Second Row: Filters */}
            <div className="flex items-center space-x-4">

            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(USER_ROLES).map(([value, role]) => (
                  <SelectItem key={value} value={value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-60">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                <SelectItem value="no-company">No Company</SelectItem>
                {companies?.map((company: any) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name} ({company.shortName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedUsers.length} user(s) selected
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers(filteredAndSortedUsers.map((user: any) => user.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4">User Information</TableHead>
                  <TableHead className="font-semibold text-gray-900">Role & Permissions</TableHead>
                  <TableHead className="font-semibold text-gray-900">Company Association</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.map((user: any, index: number) => (
                  <TableRow 
                    key={user.id} 
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} 
                      hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100
                    `}
                  >
                    <TableCell className="py-4">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(prev => [...prev, user.id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col space-y-1">
                        <span className="font-semibold text-gray-900">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-sm text-gray-600">{user.email}</span>
                        <span className="text-xs text-gray-500">
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col space-y-2">
                        <Badge className={`${getRoleColor(user.role)} font-medium px-3 py-1 rounded-full text-xs w-fit`}>
                          {USER_ROLES[user.role]?.label || user.role}
                        </Badge>
                        {user.role === 'system_admin' && (
                          <span className="text-xs text-red-600 font-medium">Full System Access</span>
                        )}
                        {user.role === 'company_admin' && (
                          <span className="text-xs text-blue-600 font-medium">Company Administrator</span>
                        )}
                        {user.isContractor && (
                          <span className="text-xs text-emerald-600 font-medium">Contractor Role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">

                      {user.companyName ? (
                        <div className="flex flex-col space-y-1">
                          <span className="font-medium text-gray-900">{user.companyName}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                              {user.companyShortName}
                            </span>
                            {user.isContractor && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                Contractor
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : user.companyId ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600 font-medium">Company ID: {user.companyId}</span>
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-700">Data Issue</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 italic">No Company</span>
                          <Badge variant="secondary" className="text-xs">Independent</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col space-y-1">
                        <Badge 
                          variant={user.isActive ? 'default' : 'destructive'} 
                          className={`w-fit font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {user.isEmailVerified && (
                          <span className="text-xs text-green-600 flex items-center">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                            Email Verified
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="hover:bg-blue-100 hover:text-blue-700 p-2"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleResetPassword(user)}
                          className="hover:bg-orange-100 hover:text-orange-700 p-2"
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="hover:bg-red-100 hover:text-red-700 p-2"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editRole">Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_ROLES).map(([value, role]) => (
                    <SelectItem key={value} value={value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editPermissionLevel">Permission Level</Label>
              <Select value={editForm.permission_level} onValueChange={(value) => setEditForm(prev => ({ ...prev, permission_level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Permission Level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERMISSION_LEVELS).map(([value, level]) => (
                    <SelectItem key={value} value={value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editCompany">Company</Label>
              <Select value={editForm.companyId} onValueChange={(value) => setEditForm(prev => ({ ...prev, companyId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Company</SelectItem>
                  {companies?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name} ({company.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="editIsActive"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isActive: !!checked }))}
              />
              <Label htmlFor="editIsActive">Active User</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.firstName} {selectedUser?.lastName}? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUsers.length} selected users? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteUsersMutation.isPending}
            >
              {bulkDeleteUsersMutation.isPending ? 'Deleting...' : 'Delete Users'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.firstName} {selectedUser?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset} disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}