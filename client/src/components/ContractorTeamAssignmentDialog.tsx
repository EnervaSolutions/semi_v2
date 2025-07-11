import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['view']);

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/contractor/team"],
    enabled: !!user?.id && open,
  });

  // Query for current assignments
  const { data: currentAssignments = [] } = useQuery({
    queryKey: [`/api/applications/${applicationId}/contractor-team-assignments`],
    enabled: !!applicationId && open,
    staleTime: 1000 * 60 * 5
  });

  // Assignment mutations
  const assignMutation = useMutation({
    mutationFn: async ({ applicationId, userId, permissions }: { applicationId: number; userId: string; permissions: string[] }) => {
      return apiRequest(`/api/contractor/applications/${applicationId}/assign`, "POST", {
        userId,
        permissions
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}/contractor-team-assignments`] });
      setSelectedUserId('');
      setSelectedPermissions(['view']);
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  // Filter team members to only show contractor_team_member role
  const contractorTeamMembers = teamMembers.filter((member: any) => 
    member.role === 'contractor_team_member'
  );

  // Get unassigned team members
  const assignedUserIds = currentAssignments.map((assignment: any) => assignment.assignedUserId);
  const unassignedMembers = contractorTeamMembers.filter((member: any) => 
    !assignedUserIds.includes(member.id)
  );

  const handleAssign = () => {
    if (!selectedUserId || selectedPermissions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a team member and permissions",
        variant: "destructive"
      });
      return;
    }

    assignMutation.mutate({
      applicationId: parseInt(applicationId!),
      userId: selectedUserId,
      permissions: selectedPermissions
    });
  };

  const handleRemove = (userId: string) => {
    removeAssignmentMutation.mutate({
      applicationId: parseInt(applicationId!),
      userId: userId
    });
  };

  const handlePermissionChange = (permission: string) => {
    if (permission === 'view') {
      setSelectedPermissions(['view']);
    } else if (permission === 'edit') {
      setSelectedPermissions(['view', 'edit']);
    }
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
            <h3 className="font-medium mb-3">Current Assignments</h3>
            {currentAssignments.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No team members assigned yet</p>
            ) : (
              <div className="space-y-2">
                {currentAssignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">
                          {assignment.firstName} {assignment.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {assignment.email}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {assignment.permissions?.map((permission: string) => (
                          <Badge
                            key={permission}
                            variant={permission === 'edit' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {permission === 'edit' ? (
                              <><Edit className="h-3 w-3 mr-1" />Edit</>
                            ) : (
                              <><Eye className="h-3 w-3 mr-1" />View</>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(assignment.assignedUserId)}
                      disabled={removeMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
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
                  <label className="text-sm font-medium mb-2 block">
                    Permission Level
                  </label>
                  <Select 
                    value={selectedPermissions.includes('edit') ? 'edit' : 'view'} 
                    onValueChange={handlePermissionChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          View Only - Can view and download files
                        </div>
                      </SelectItem>
                      <SelectItem value="edit">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Edit - Can edit application and submit changes
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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