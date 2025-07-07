import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  UserPlus, 
  Settings, 
  Eye, 
  Edit, 
  Crown, 
  FileText, 
  Building,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface ContractorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissionLevel: string;
  isActive: boolean;
}

interface Application {
  id: number;
  applicationId: string;
  title: string;
  description: string;
  status: string;
  activityType: string;
  facilityName: string;
  facilityCode: string;
  companyName: string;
  companyShortName: string;
  assignedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ContractorAssignments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [assignmentPermissions, setAssignmentPermissions] = useState<Record<string, string[]>>({});

  // Fetch current user
  const { data: user } = useQuery<ContractorUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery<ContractorUser[]>({
    queryKey: ["/api/contractor/team-members"],
    enabled: !!user?.id && ['contractor_account_owner', 'contractor_manager'].includes(user?.role || ''),
  });

  // Fetch applications for assignment
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/contractor/applications-for-assignment"],
    enabled: !!user?.id && ['contractor_account_owner', 'contractor_manager'].includes(user?.role || ''),
  });

  // Assign application mutation
  const assignApplicationMutation = useMutation({
    mutationFn: async (data: { applicationId: number; userId: string; permissions: string[] }) => {
      const response = await apiRequest(`/api/contractor/assign-application`, "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/applications-for-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/applications"] });
      toast({ title: "Application assigned successfully" });
      setShowAssignmentDialog(false);
      setSelectedApplication(null);
      setSelectedTeamMembers([]);
      setAssignmentPermissions({});
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to assign application", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (data: { applicationId: number; userId: string }) => {
      const response = await apiRequest(`/api/contractor/remove-assignment/${data.applicationId}/${data.userId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/applications-for-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/applications"] });
      toast({ title: "Assignment removed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove assignment", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const handleAssignApplication = () => {
    if (!selectedApplication) return;

    selectedTeamMembers.forEach(userId => {
      const permissions = assignmentPermissions[userId] || ['view'];
      assignApplicationMutation.mutate({
        applicationId: selectedApplication.id,
        userId,
        permissions
      });
    });
  };

  const handleRemoveAssignment = (applicationId: number, userId: string) => {
    removeAssignmentMutation.mutate({ applicationId, userId });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'FRA': return 'bg-purple-100 text-purple-800';
      case 'SEM': return 'bg-blue-100 text-blue-800';
      case 'EAA': return 'bg-green-100 text-green-800';
      case 'EMIS': return 'bg-orange-100 text-orange-800';
      case 'CR': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeamMemberName = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    return member ? `${member.firstName} ${member.lastName}` : 'Unknown';
  };

  const canAssignApplications = user?.role === 'contractor_account_owner' || user?.role === 'contractor_manager';

  if (!canAssignApplications) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-500 text-center max-w-md">
              Only account owners and managers can assign applications to team members.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Application Assignments</h1>
        <p className="text-gray-600 mt-1">
          Assign applications to team members and manage their permissions
        </p>
      </div>

      <div className="space-y-6">
        {applications.length > 0 ? (
          <div className="grid gap-6">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{application.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Building className="h-4 w-4" />
                        <span>{application.companyName} - {application.facilityName}</span>
                        <span className="text-gray-300">•</span>
                        <span>{application.applicationId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getActivityTypeColor(application.activityType)}>
                        {application.activityType}
                      </Badge>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  {application.description && (
                    <CardDescription className="mt-2">
                      {application.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Currently Assigned Team Members */}
                    {application.assignedUsers && application.assignedUsers.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Assigned Team Members</h4>
                        <div className="space-y-2">
                          {application.assignedUsers.map((userId) => (
                            <div key={userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Users className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="text-sm font-medium">
                                  {getTeamMemberName(userId)}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAssignment(application.id, userId)}
                                disabled={removeAssignmentMutation.isPending}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No team members assigned</p>
                      </div>
                    )}

                    {/* Assign Button */}
                    <Dialog open={showAssignmentDialog && selectedApplication?.id === application.id} 
                            onOpenChange={(open) => {
                              setShowAssignmentDialog(open);
                              if (!open) {
                                setSelectedApplication(null);
                                setSelectedTeamMembers([]);
                                setAssignmentPermissions({});
                              }
                            }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowAssignmentDialog(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign Team Members
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Assign Team Members</DialogTitle>
                          <DialogDescription>
                            Select team members to assign to {application.title} and set their permissions
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Team Members</h4>
                            <div className="space-y-3">
                              {teamMembers.filter(member => 
                                member.role !== 'contractor_account_owner' && 
                                member.isActive &&
                                !application.assignedUsers?.includes(member.id)
                              ).map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={selectedTeamMembers.includes(member.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedTeamMembers(prev => [...prev, member.id]);
                                          setAssignmentPermissions(prev => ({
                                            ...prev,
                                            [member.id]: member.permissionLevel === 'editor' ? ['view', 'edit'] : ['view']
                                          }));
                                        } else {
                                          setSelectedTeamMembers(prev => prev.filter(id => id !== member.id));
                                          setAssignmentPermissions(prev => {
                                            const { [member.id]: removed, ...rest } = prev;
                                            return rest;
                                          });
                                        }
                                      }}
                                    />
                                    <div>
                                      <p className="text-sm font-medium">
                                        {member.firstName} {member.lastName}
                                      </p>
                                      <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                  </div>
                                  
                                  {selectedTeamMembers.includes(member.id) && (
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={assignmentPermissions[member.id]?.includes('edit') ? 'edit' : 'view'}
                                        onValueChange={(value) => {
                                          setAssignmentPermissions(prev => ({
                                            ...prev,
                                            [member.id]: value === 'edit' ? ['view', 'edit'] : ['view']
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="view">
                                            <div className="flex items-center gap-2">
                                              <Eye className="h-3 w-3" />
                                              View
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="edit">
                                            <div className="flex items-center gap-2">
                                              <Edit className="h-3 w-3" />
                                              Edit
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAssignApplication}
                            disabled={selectedTeamMembers.length === 0 || assignApplicationMutation.isPending}
                          >
                            {assignApplicationMutation.isPending ? "Assigning..." : "Assign Members"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Available</h3>
              <p className="text-gray-500 text-center max-w-md">
                You don't have any applications assigned to your contractor company yet. 
                Applications will appear here once they are assigned by system administrators.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}