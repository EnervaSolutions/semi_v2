import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, Trash2, User } from "lucide-react";

interface ContractorTeamAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId?: string;
  applicationTitle?: string;
}

export default function ContractorTeamAssignmentDialog({
  open,
  onOpenChange,
  applicationId,
  applicationTitle
}: ContractorTeamAssignmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<string>('view');

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/contractor/team"],
    enabled: !!user?.id && open,
  });

  // Query for current assignments
  const { data: currentAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: [`/api/applications/${applicationId}/contractor-team-assignments`],
    enabled: !!applicationId && open,
    staleTime: 1000 * 60 * 5,
    retry: 3,
  });

  // Debug logging
  console.log('[CONTRACTOR TEAM DIALOG] Current assignments:', currentAssignments);
  console.log('[CONTRACTOR TEAM DIALOG] Application ID:', applicationId);
  console.log('[CONTRACTOR TEAM DIALOG] Dialog open:', open);

  // Assignment mutations
  const assignMutation = useMutation({
    mutationFn: async ({ applicationId, userId, permission }: { applicationId: number; userId: string; permission: string }) => {
      return apiRequest(`/api/contractor/team-member/${userId}/assign`, "POST", {
        applicationId,
        permissions: [permission]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}/contractor-team-assignments`] });
      setSelectedUserId('');
      setSelectedPermission('view');
      toast({
        title: "Success",
        description: "Team member assigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign team member",
        variant: "destructive",
      });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ applicationId, userId }: { applicationId: number; userId: string }) => {
      return apiRequest(`/api/contractor/applications/${applicationId}/unassign`, "POST", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}/contractor-team-assignments`] });
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    },
    onError: (error: any) => {
      console.error('[REMOVE ASSIGNMENT] Error:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  // Filter team members to only show contractor_team_member role with editor permission level
  // Exclude managers and account owners as they already have permanent edit access
  const contractorEditors = teamMembers.filter((member: any) => 
    member.role === 'contractor_team_member' && member.permissionLevel === 'editor'
  );

  // Get unassigned team members (editors only)
  const assignedUserIds = currentAssignments.map((assignment: any) => assignment.assignedUserId || assignment.userId);
  const unassignedMembers = contractorEditors.filter((member: any) => 
    !assignedUserIds.includes(member.id)
  );

  const handleAssign = () => {
    if (!selectedUserId || !selectedPermission) {
      toast({
        title: "Validation Error",
        description: "Please select a team member and permission level",
        variant: "destructive"
      });
      return;
    }

    assignMutation.mutate({
      applicationId: parseInt(applicationId!),
      userId: selectedUserId,
      permission: selectedPermission
    });
  };

  const handleRemove = (userId: string) => {
    removeAssignmentMutation.mutate({
      applicationId: parseInt(applicationId!),
      userId: userId
    });
  };

  const handlePermissionChange = (permission: string) => {
    setSelectedPermission(permission);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Team Members to Application
          </DialogTitle>
          {applicationTitle && (
            <p className="text-sm text-gray-600">
              Application: {applicationTitle}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignments */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current Team Assignments
            </h3>
            {assignmentsLoading ? (
              <div className="text-sm text-gray-500 italic">Loading assignments...</div>
            ) : currentAssignments.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                No team members assigned to this application yet
              </div>
            ) : (
              <div className="space-y-2">
                {currentAssignments.map((assignment: any) => {
                  const userId = assignment.assignedUserId || assignment.userId || assignment.id;
                  const permissions = assignment.permissions || [];
                  const hasEditAccess = Array.isArray(permissions) ? permissions.includes('edit') : permissions === 'edit';
                  
                  return (
                    <div key={userId} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 p-2 bg-blue-100 rounded-full text-blue-600" />
                        <div>
                          <div className="font-medium">{assignment.firstName} {assignment.lastName}</div>
                          <div className="text-sm text-gray-500">{assignment.email}</div>
                          {assignment.role && (
                            <div className="text-xs text-gray-400">{assignment.role}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={hasEditAccess ? 'default' : 'secondary'}>
                          {hasEditAccess ? 'Edit Access' : 'View Only'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(userId)}
                          disabled={removeAssignmentMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assign New Team Member */}
          <div>
            <h3 className="font-medium mb-3">Assign New Team Member</h3>
            {unassignedMembers.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                All available team members are already assigned to this application
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Team Member
                  </label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedMembers.map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.firstName} {member.lastName} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Permission Level
                  </label>
                  <RadioGroup 
                    value={selectedPermission} 
                    onValueChange={handlePermissionChange}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="view" id="view" />
                      <Label htmlFor="view" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="font-medium">View Only</div>
                          <div className="text-sm text-gray-500">Can view and download files</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="edit" id="edit" />
                      <Label htmlFor="edit" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Edit className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="font-medium">Edit Access</div>
                          <div className="text-sm text-gray-500">Can edit application and submit changes (includes view access)</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {unassignedMembers.length > 0 && (
            <Button 
              onClick={handleAssign}
              disabled={!selectedUserId || assignMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Team Member
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}