import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, Mail, Shield, Eye, Edit, Settings, Copy, Check, Trash2, Crown, AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ContractorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissionLevel: string;
  isActive: boolean;
  company?: {
    id: number;
    name: string;
    shortName: string;
  };
}

interface TeamInvitation {
  email: string;
  firstName: string;
  lastName: string;
  permissionLevel: string;
}

interface PendingInvitation {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  permissionLevel: string;
  createdAt: string;
  status: string;
}

interface ContractorJoinRequest {
  id: number;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  requestedPermissionLevel: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export default function ContractorTeam() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("team-members");
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string, password: string} | null>(null);
  const [invitedMemberName, setInvitedMemberName] = useState<string>("");
  const [showOwnershipTransfer, setShowOwnershipTransfer] = useState(false);
  const [selectedTransferUser, setSelectedTransferUser] = useState<ContractorUser | null>(null);
  const [editingUser, setEditingUser] = useState<ContractorUser | null>(null);
  const [showEditPermissions, setShowEditPermissions] = useState(false);
  const [invitationData, setInvitationData] = useState<TeamInvitation>({
    email: "",
    firstName: "",
    lastName: "",
    permissionLevel: "editor"
  });

  // Fetch current user
  const { data: user } = useQuery<ContractorUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch team members
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery<ContractorUser[]>({
    queryKey: ["/api/contractor/team-members"],
    enabled: !!user?.id && (user?.role === "contractor_individual" || user?.role === "contractor_account_owner" || (user?.role === "contractor_team_member" && user?.permissionLevel === "manager")),
  });

  // Fetch pending invitations
  const { data: pendingInvitations = [], isLoading: invitationsLoading } = useQuery<PendingInvitation[]>({
    queryKey: ["/api/contractor/team-invitations"],
    enabled: !!user?.id && (user?.role === "contractor_individual" || user?.role === "contractor_account_owner" || (user?.role === "contractor_team_member" && user?.permissionLevel === "manager")),
  });

  // Fetch contractor join requests
  const { data: joinRequests = [], isLoading: joinRequestsLoading } = useQuery<ContractorJoinRequest[]>({
    queryKey: ["/api/contractor/join-requests"],
    enabled: !!user?.id && (user?.role === "contractor_individual" || user?.role === "contractor_account_owner" || (user?.role === "contractor_team_member" && user?.permissionLevel === "manager")),
  });

  // Invite team member mutation
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (data: TeamInvitation) => {
      const response = await apiRequest(`/api/contractor/invite-team-member`, "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/team-invitations"] });
      
      // Show credentials dialog
      if (data.credentials) {
        setGeneratedCredentials(data.credentials);
        setInvitedMemberName(`${invitationData.firstName} ${invitationData.lastName}`);
        setShowCredentials(true);
      }
      
      setIsInvitingMember(false);
      setInvitationData({ email: "", firstName: "", lastName: "", permissionLevel: "editor" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send invitation", 
        description: error.message || "An error occurred while sending the invitation",
        variant: "destructive" 
      });
    },
  });

  const handleInviteMember = () => {
    if (!invitationData.email || !invitationData.firstName || !invitationData.lastName) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    inviteTeamMemberMutation.mutate(invitationData);
  };

  // Join request approval/rejection mutations
  const approveJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, assignedPermissionLevel }: { requestId: number, assignedPermissionLevel: string }) => {
      const response = await apiRequest(`/api/contractor/join-requests/${requestId}/approve`, "POST", { assignedPermissionLevel });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/team-members"] });
      toast({ title: "Join request approved successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to approve join request", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const rejectJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, reviewNotes }: { requestId: number, reviewNotes?: string }) => {
      const response = await apiRequest(`/api/contractor/join-requests/${requestId}/reject`, "POST", { reviewNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/join-requests"] });
      toast({ title: "Join request rejected" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to reject join request", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const getPermissionIcon = (level: string) => {
    switch (level) {
      case "manager": return <Settings className="h-4 w-4 text-red-600" />;
      case "editor": return <Edit className="h-4 w-4 text-blue-600" />;
      case "viewer": return <Eye className="h-4 w-4 text-gray-600" />;
      default: return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPermissionColor = (level: string) => {
    switch (level) {
      case "manager": return "bg-red-100 text-red-800";
      case "editor": return "bg-blue-100 text-blue-800";
      case "viewer": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "contractor_individual": 
      case "contractor_account_owner": return "bg-purple-100 text-purple-800";
      case "contractor_manager": return "bg-orange-100 text-orange-800";
      case "contractor_team_member": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Enhanced permission logic
  const isOwner = user?.role === "contractor_individual" || user?.role === "contractor_account_owner";
  const isManager = user?.permissionLevel === "manager" || isOwner;
  const isContractorTeamMemberWithManager = user?.role === "contractor_team_member" && user?.permissionLevel === "manager";
  const canInviteMembers = isOwner || isManager || isContractorTeamMemberWithManager;
  const canManagePermissions = isOwner;
  const canDeleteMembers = isOwner || isManager || isContractorTeamMemberWithManager;

  // Add mutations for team management - moved before conditional rendering
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissionLevel }: { userId: string, permissionLevel: string }) => {
      const response = await apiRequest(`/api/contractor/update-permissions`, "PATCH", { userId, permissionLevel });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/team-members"] });
      toast({ title: "Permissions updated successfully" });
      setShowEditPermissions(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update permissions", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async ({ newOwnerId }: { newOwnerId: string }) => {
      const response = await apiRequest(`/api/contractor/transfer-ownership`, "PATCH", { newOwnerId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Ownership transferred successfully" });
      setShowOwnershipTransfer(false);
      setSelectedTransferUser(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to transfer ownership", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await apiRequest(`/api/contractor/delete-member`, "DELETE", { userId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/team-members"] });
      toast({ title: "Team member removed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove team member", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });



  if (teamLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!canInviteMembers) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-500 text-center max-w-md">
              You need manager or owner permissions to access team management features. Contact your account owner for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your contracting company's team members and permissions
          </p>
        </div>
        <div className="flex gap-2">
          {canInviteMembers && (
            <Dialog open={isInvitingMember} onOpenChange={setIsInvitingMember}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite Team Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to add a new member to your contracting team
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={invitationData.firstName}
                        onChange={(e) => setInvitationData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={invitationData.lastName}
                        onChange={(e) => setInvitationData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={invitationData.email}
                      onChange={(e) => setInvitationData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permissionLevel">Permission Level</Label>
                    <Select
                      value={invitationData.permissionLevel}
                      onValueChange={(value) => setInvitationData(prev => ({ ...prev, permissionLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor - Requires individual assignment to applications</SelectItem>
                        <SelectItem value="manager">Manager - Full access to all applications and team management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsInvitingMember(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleInviteMember}
                    disabled={inviteTeamMemberMutation.isPending}
                  >
                    {inviteTeamMemberMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold">{teamMembers.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold">
                {teamMembers.filter(member => member.isActive).length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Managers</p>
              <p className="text-2xl font-bold">
                {teamMembers.filter(member => member.permissionLevel === "manager").length}
              </p>
            </div>
            <Settings className="h-8 w-8 text-purple-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Invites</p>
              <p className="text-2xl font-bold">
                {pendingInvitations.filter(inv => inv.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Join Requests</p>
              <p className="text-2xl font-bold">
                {joinRequests.filter(req => req.status === 'pending').length}
              </p>
            </div>
            <UserPlus className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team-members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="pending-invitations" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Invitations ({pendingInvitations.filter(inv => inv.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="join-requests" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Join Requests ({joinRequests.filter(req => req.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team-members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Current members of your contracting company
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length > 0 ? (
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(member.role)}>
                          {member.role === "contractor_account_owner" || member.role === "contractor_individual" ? "Account Owner" : 
                           member.role === "contractor_manager" ? "Manager" : "Team Member"}
                        </Badge>
                        {member.role !== "contractor_account_owner" && member.role !== "contractor_individual" && (
                          <Badge variant="outline" className={getPermissionColor(member.permissionLevel)}>
                            <div className="flex items-center gap-1">
                              {getPermissionIcon(member.permissionLevel)}
                              {(member.permissionLevel || 'viewer').charAt(0).toUpperCase() + (member.permissionLevel || 'viewer').slice(1)}
                            </div>
                          </Badge>
                        )}
                        {member.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                        )}
                        
                        {/* Action buttons for team management */}
                        {member.id !== user?.id && (
                          <div className="flex items-center gap-1 ml-2">
                            {canManagePermissions && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingUser(member);
                                  setShowEditPermissions(true);
                                }}
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {canManagePermissions && member.role !== "contractor_account_owner" && member.role !== "contractor_individual" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTransferUser(member);
                                  setShowOwnershipTransfer(true);
                                }}
                              >
                                <Crown className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {canDeleteMembers && member.role !== "contractor_account_owner" && member.role !== "contractor_individual" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteUserMutation.mutate({ userId: member.id })}
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No team members yet</p>
                  <Button onClick={() => setIsInvitingMember(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First Team Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations sent that are waiting for new members to accept
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingInvitations.filter(inv => inv.status === 'pending').length > 0 ? (
                <div className="space-y-4">
                  {pendingInvitations.filter(inv => inv.status === 'pending').map((invitation: any) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {invitation.firstName} {invitation.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {invitation.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            Invited {new Date(invitation.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getPermissionColor(invitation.permissionLevel)}>
                          <div className="flex items-center gap-1">
                            {getPermissionIcon(invitation.permissionLevel)}
                            {invitation.permissionLevel.charAt(0).toUpperCase() + invitation.permissionLevel.slice(1)}
                          </div>
                        </Badge>
                        <Badge className="bg-orange-100 text-orange-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Awaiting Response
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No pending invitations</p>
                  <p className="text-sm text-gray-400">All sent invitations have been accepted or expired</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Join Requests</CardTitle>
              <CardDescription>
                Individuals requesting to join your contractor company
              </CardDescription>
            </CardHeader>
            <CardContent>
              {joinRequestsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">Loading join requests...</p>
                </div>
              ) : joinRequests.filter(req => req.status === 'pending').length > 0 ? (
                <div className="space-y-4">
                  {joinRequests.filter(req => req.status === 'pending').map((request: ContractorJoinRequest) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg border-blue-200 bg-blue-50">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                          <UserPlus className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {request.userFirstName} {request.userLastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {request.userEmail}
                          </div>
                          <div className="text-xs text-gray-400">
                            Requested {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                          {request.message && (
                            <div className="text-sm text-gray-600 mt-1 italic">
                              "{request.message}"
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Requested: {request.requestedPermissionLevel.charAt(0).toUpperCase() + request.requestedPermissionLevel.slice(1)}
                        </Badge>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Approve Join Request</DialogTitle>
                                <DialogDescription>
                                  Set the permission level for {request.userFirstName} {request.userLastName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="assignedPermissionLevel">Permission Level</Label>
                                  <Select
                                    defaultValue={request.requestedPermissionLevel}
                                    onValueChange={(value) => {
                                      approveJoinRequestMutation.mutate({
                                        requestId: request.id,
                                        assignedPermissionLevel: value
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="editor">Editor - Requires individual assignment to applications</SelectItem>
                                      <SelectItem value="manager">Manager - Full access to all applications and team management</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => rejectJoinRequestMutation.mutate({ requestId: request.id })}
                            disabled={rejectJoinRequestMutation.isPending}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No pending join requests</p>
                  <p className="text-sm text-gray-400">No individuals have requested to join your contractor company yet</p>
                </div>
              )}
              
              {/* Show processed requests */}
              {joinRequests.filter(req => req.status !== 'pending').length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h4 className="font-medium text-gray-900 mb-4">Recent Decisions</h4>
                  <div className="space-y-3">
                    {joinRequests.filter(req => req.status !== 'pending').slice(0, 5).map((request: ContractorJoinRequest) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <span className="font-medium">{request.userFirstName} {request.userLastName}</span>
                            <span className="text-gray-500 ml-2">({request.userEmail})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      {/* Credentials Display Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Team Member Invited Successfully</DialogTitle>
            <DialogDescription>
              {invitedMemberName} has been added to your team. Share these login credentials with them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                An email with these credentials has been sent to {generatedCredentials?.username}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Username</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    value={generatedCredentials?.username || ""} 
                    readOnly 
                    className="bg-gray-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials?.username || "");
                      toast({ title: "Username copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Temporary Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    value={generatedCredentials?.password || ""} 
                    readOnly 
                    className="bg-gray-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials?.password || "");
                      toast({ title: "Password copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <Shield className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                The new team member should change their password after first login for security.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setShowCredentials(false)} 
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ownership Transfer Dialog */}
      <Dialog open={showOwnershipTransfer} onOpenChange={setShowOwnershipTransfer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              Transfer account ownership to {selectedTransferUser?.firstName} {selectedTransferUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. You will become a Manager and lose Account Owner privileges.
              </AlertDescription>
            </Alert>

            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="font-medium mb-2">What will happen:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {selectedTransferUser?.firstName} {selectedTransferUser?.lastName} will become the Account Owner</li>
                <li>• You will become a Manager with reduced permissions</li>
                <li>• The new owner will have full control over the company</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowOwnershipTransfer(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedTransferUser) {
                    transferOwnershipMutation.mutate({ newOwnerId: selectedTransferUser.id });
                    setShowOwnershipTransfer(false);
                  }
                }}
                disabled={transferOwnershipMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {transferOwnershipMutation.isPending ? "Transferring..." : "Transfer Ownership"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={showEditPermissions} onOpenChange={setShowEditPermissions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Edit Permissions
            </DialogTitle>
            <DialogDescription>
              Change permission level for {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Permission Level</Label>
              <Select 
                value={editingUser?.permissionLevel || "viewer"}
                onValueChange={(value) => {
                  if (editingUser) {
                    setEditingUser({...editingUser, permissionLevel: value});
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Viewer - Read only access
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Editor - Can edit content
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Manager - Full management access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowEditPermissions(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingUser) {
                    updatePermissionsMutation.mutate({
                      userId: editingUser.id,
                      permissionLevel: editingUser.permissionLevel
                    });
                    setShowEditPermissions(false);
                  }
                }}
                disabled={updatePermissionsMutation.isPending}
                className="flex-1"
              >
                {updatePermissionsMutation.isPending ? "Updating..." : "Update Permissions"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}