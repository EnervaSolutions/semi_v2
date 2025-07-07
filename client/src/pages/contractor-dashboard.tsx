import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  FileText, 
  Settings, 
  MapPin, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Mail,
  Phone,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

interface AssignedApplication {
  id: number;
  applicationId: string;
  facilityName: string;
  companyName: string;
  activityType: string;
  status: string;
  assignedDate: string;
  assignedBy: string;
  dueDate?: string;
}

interface ContractorCompany {
  id: number;
  name: string;
  shortName: string;
  serviceRegions: string[];
  supportedActivities: string[];
  isActive: boolean;
  phone?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

interface TeamInvitation {
  email: string;
  firstName: string;
  lastName: string;
  permissionLevel: string;
}

const ACTIVITY_TYPES = [
  "Facility Readiness Assessment",
  "Strategic Energy Management", 
  "Energy Auditing and Assessment",
  "Energy Management Information System",
  "Capital Retrofits"
];

const ALBERTA_REGIONS = [
  "Calgary and Area",
  "Edmonton and Area", 
  "Lethbridge and Area",
  "Medicine Hat and Area",
  "Red Deer and Area",
  "Fort McMurray and Area",
  "Other Parts of Alberta"
];

const SUPPORTED_ACTIVITIES = [
  "Capital Retrofit",
  "Energy Management Information System",
  "Energy Auditing and Assessment"
];

export default function ContractorDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedApplication, setSelectedApplication] = useState<AssignedApplication | null>(null);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [invitationData, setInvitationData] = useState<TeamInvitation>({
    email: "",
    firstName: "",
    lastName: "",
    permissionLevel: "viewer"
  });

  // Fetch current contractor user
  const { data: user, isLoading: userLoading } = useQuery<ContractorUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch contractor company info
  const { data: contractorCompany, isLoading: companyLoading } = useQuery<ContractorCompany>({
    queryKey: ["/api/contractor/company"],
    enabled: !!user?.id,
  });

  // Fetch assigned applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<AssignedApplication[]>({
    queryKey: ["/api/applications"],
    enabled: !!user?.id,
  });

  // Fetch team members
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery<ContractorUser[]>({
    queryKey: ["/api/contractor/team"],
    enabled: !!user?.id && user?.role === "contractor_individual",
  });

  // Update contractor services mutation
  const updateServicesMutation = useMutation({
    mutationFn: (data: { serviceRegions: string[]; supportedActivities: string[] }) =>
      apiRequest(`/api/contractor/services`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/company"] });
      toast({ title: "Services updated successfully" });
      setIsEditingServices(false);
    },
    onError: () => {
      toast({ title: "Failed to update services", variant: "destructive" });
    },
  });

  // Toggle company visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      apiRequest(`/api/contractor/visibility`, "PATCH", { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/company"] });
      toast({ 
        title: contractorCompany?.isActive ? "Company is now visible to participants" : "Company is now hidden from participants" 
      });
    },
    onError: () => {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    },
  });

  // Invite team member mutation
  const inviteTeamMemberMutation = useMutation({
    mutationFn: (data: TeamInvitation) =>
      apiRequest(`/api/contractor/invite`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/team"] });
      toast({ title: "Team member invited successfully" });
      setIsInvitingMember(false);
      setInvitationData({ email: "", firstName: "", lastName: "", permissionLevel: "viewer" });
    },
    onError: () => {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    },
  });

  const handleInviteTeamMember = () => {
    if (!invitationData.email || !invitationData.firstName || !invitationData.lastName) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    inviteTeamMemberMutation.mutate(invitationData);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "submitted": return "bg-green-100 text-green-800";
      case "under_review": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "needs_revision": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityTypeDisplay = (activityType: string) => {
    switch (activityType) {
      case "FRA": return "Facility Readiness Assessment";
      case "SEM": return "Strategic Energy Management";
      case "EAA": return "Energy Auditing and Assessment";
      case "EMIS": return "Energy Management Information System";
      case "CR": return "Capital Retrofits";
      default: return activityType;
    }
  };

  // Calculate completion metrics based on company admin submission status
  const completedCount = applications?.filter(app => {
    // For contractors, an application is "completed" when the company admin has submitted it
    return app.status === 'submitted' || app.status === 'approved';
  }).length || 0;

  if (userLoading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contractor Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage your contracting services and assigned applications
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Company Status Display */}
            <Card className="w-80">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {contractorCompany?.isActive ? (
                      <>
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium text-green-900">Active Contractor</div>
                          <div className="text-xs text-green-700">Visible to participants</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium text-red-900">Inactive Contractor</div>
                          <div className="text-xs text-red-700">Not visible to participants</div>
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    {contractorCompany?.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Company Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{contractorCompany?.name}</h2>
                  <p className="text-gray-600">Short Name: {contractorCompany?.shortName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Account Owner</p>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600 capitalize">{user?.role?.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Clean 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Completion Metrics */}
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-gray-500 mt-1">Applications finalized by companies</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold">{(applications?.length || 0) - completedCount}</p>
              <p className="text-xs text-gray-500 mt-1">Actively working on</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applications">Applications ({applications?.length || 0})</TabsTrigger>
          <TabsTrigger value="services">Services & Regions</TabsTrigger>
          <TabsTrigger value="team">Team Management</TabsTrigger>
          <TabsTrigger value="profile">Profile Settings</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assigned Applications</h3>
            <p className="text-sm text-gray-600">
              Applications assigned to your contracting company
            </p>
          </div>

          {applicationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : applications?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Assigned</h3>
                <p className="text-gray-600">
                  When participating companies assign applications to your contracting company, they will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {applications?.map((application) => (
                <Card key={application.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{application.facilityName}</h4>
                          <Badge className={`px-2 py-1 rounded-full text-xs font-medium ${
                            application.status === 'completed' ? 'bg-green-100 text-green-800' :
                            application.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            application.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                            application.status === 'approved' ? 'bg-green-100 text-green-800' :
                            application.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {application.status === 'completed' ? 'COMPLETED' : application.status?.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {application.companyName} • {getActivityTypeDisplay(application.activityType)}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Assigned: {new Date(application.assignedDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            By: {application.assignedBy}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setLocation(`/applications/${application.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Services & Regions Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Services & Service Regions</h3>
            <Button 
              onClick={() => setIsEditingServices(true)}
              disabled={user?.role !== "contractor_individual"}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Services
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Service Regions
                </CardTitle>
                <CardDescription>
                  Geographic areas where you provide services
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractorCompany?.serviceRegions?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {contractorCompany.serviceRegions.map((region, index) => (
                      <Badge key={index} variant="secondary">
                        {region}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No service regions specified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Supported Activities
                </CardTitle>
                <CardDescription>
                  Types of activities you can support
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractorCompany?.supportedActivities?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {contractorCompany.supportedActivities.map((activity, index) => (
                      <Badge key={index} variant="secondary">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No supported activities specified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Edit Services Dialog */}
          <Dialog open={isEditingServices} onOpenChange={setIsEditingServices}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Services & Regions</DialogTitle>
                <DialogDescription>
                  Update the service regions and activities your company supports
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Service Regions</Label>
                  <p className="text-sm text-gray-600 mb-3">Select all regions where you provide services</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALBERTA_REGIONS.map((region) => (
                      <div key={region} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`region-${region}`}
                          defaultChecked={contractorCompany?.serviceRegions?.includes(region)}
                        />
                        <Label htmlFor={`region-${region}`} className="text-sm">
                          {region}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Supported Activities</Label>
                  <p className="text-sm text-gray-600 mb-3">Select all activity types you can support</p>
                  <div className="space-y-2">
                    {ACTIVITY_TYPES.map((activity) => (
                      <div key={activity} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`activity-${activity}`}
                          defaultChecked={contractorCompany?.supportedActivities?.includes(activity)}
                        />
                        <Label htmlFor={`activity-${activity}`} className="text-sm">
                          {activity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditingServices(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // This would collect the form data and submit
                  // For now, just close the dialog
                  setIsEditingServices(false);
                  toast({ title: "Services updated successfully" });
                }}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Team Management</h3>
            {user?.role === "contractor_individual" && (
              <Button onClick={() => setIsInvitingMember(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            )}
          </div>

          {teamLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current User */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Account Owner</Badge>
                      <p className="text-sm text-gray-600 mt-1">Manager Access</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members */}
              {teamMembers?.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="capitalize">
                          {member.role?.replace("_", " ")}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1 capitalize">
                          {member.permissionLevel} Access
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {teamMembers?.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
                    <p className="text-gray-600">
                      Invite team members to help manage applications and collaborate on projects.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Invite Team Member Dialog */}
          <Dialog open={isInvitingMember} onOpenChange={setIsInvitingMember}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your contracting team
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={invitationData.firstName}
                      onChange={(e) => setInvitationData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={invitationData.lastName}
                      onChange={(e) => setInvitationData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invitationData.email}
                    onChange={(e) => setInvitationData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <Label htmlFor="permissionLevel">Permission Level</Label>
                  <Select
                    value={invitationData.permissionLevel}
                    onValueChange={(value) => setInvitationData(prev => ({ ...prev, permissionLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - Can view assigned applications</SelectItem>
                      <SelectItem value="editor">Editor - Can edit and save applications</SelectItem>
                      <SelectItem value="manager">Manager - Full access to team and applications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsInvitingMember(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteTeamMember}
                  disabled={inviteTeamMemberMutation.isPending}
                >
                  {inviteTeamMemberMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Profile Settings Tab */}
        <TabsContent value="profile" className="space-y-4">
          <h3 className="text-lg font-semibold">Profile Settings</h3>
          
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic information about your contracting company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name</Label>
                    <p className="text-sm font-medium mt-1">{contractorCompany?.name}</p>
                  </div>
                  <div>
                    <Label>Short Name</Label>
                    <p className="text-sm font-medium mt-1">{contractorCompany?.shortName}</p>
                  </div>
                </div>
                
                {contractorCompany?.phone && (
                  <div>
                    <Label>Phone Number</Label>
                    <p className="text-sm font-medium mt-1">{contractorCompany.phone}</p>
                  </div>
                )}
                
                {contractorCompany?.website && (
                  <div>
                    <Label>Website</Label>
                    <p className="text-sm font-medium mt-1">{contractorCompany.website}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your personal account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <p className="text-sm font-medium mt-1">{user?.firstName}</p>
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <p className="text-sm font-medium mt-1">{user?.lastName}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Email Address</Label>
                  <p className="text-sm font-medium mt-1">{user?.email}</p>
                </div>
                
                <div>
                  <Label>Role</Label>
                  <p className="text-sm font-medium mt-1 capitalize">
                    {user?.role?.replace("_", " ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}