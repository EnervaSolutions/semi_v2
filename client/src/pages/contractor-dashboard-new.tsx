import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, TrendingUp, Activity, CheckCircle, Clock, AlertCircle,
  BarChart3, Calendar, Users, Eye, Edit, UserPlus
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

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

export default function ContractorDashboard() {
  // Fetch current user
  const { data: user } = useQuery<ContractorUser>({
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "submitted": return "bg-green-100 text-green-800";
      case "under_review": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-emerald-100 text-emerald-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "needs_revision": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityTypeColor = (activityType: string) => {
    switch (activityType) {
      case "FRA": return "bg-purple-100 text-purple-800";
      case "SEM": return "bg-indigo-100 text-indigo-800";
      case "EAA": return "bg-cyan-100 text-cyan-800";
      case "EMIS": return "bg-teal-100 text-teal-800";
      case "CR": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate statistics
  const totalApplications = applications.length;
  const completedApplications = applications.filter(app => app.status === "approved").length;
  const inProgressApplications = applications.filter(app => 
    ["in_progress", "submitted", "under_review"].includes(app.status)
  ).length;
  const overdueApplications = applications.filter(app => 
    app.dueDate && new Date(app.dueDate) < new Date() && app.status !== "approved"
  ).length;

  if (companyLoading || applicationsLoading || teamLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-gray-600 mt-2">
              {contractorCompany?.name} • {contractorCompany?.shortName}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={contractorCompany?.isActive ? "default" : "secondary"}>
                {contractorCompany?.isActive ? "Active" : "Inactive"}
              </Badge>
              {(user?.role === "contractor_individual" || user?.role === "contractor_account_owner") && (
                <Badge variant="outline">Account Owner</Badge>
              )}
              {user?.role === "contractor_manager" && (
                <Badge variant="outline">Manager</Badge>
              )}
              {user?.role === "contractor_team_member" && (
                <Badge variant="outline">Team Member</Badge>
              )}
            </div>
          </div>
          
          {/* Company Status Card */}
          <Card className="w-72">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {contractorCompany?.isActive ? (
                    <>
                      <div className="h-2.5 w-2.5 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-green-900">Active Contractor</div>
                        <div className="text-xs text-green-700">Visible to participants</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-2.5 w-2.5 bg-red-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-red-900">Inactive Contractor</div>
                        <div className="text-xs text-red-700">Not visible to participants</div>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  {contractorCompany?.isActive ? (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Account Owner Notice */}
      {(user?.role === "contractor_individual" || user?.role === "contractor_account_owner") && (
        <div className="mb-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Contractor Account Owner
                  </h3>
                  <p className="text-blue-800 text-sm mb-3">
                    As the account owner, you can manage applications assigned to your contracting company. 
                    View applications below and assign them to your team members using the "Assign" button.
                  </p>
                  <div className="flex gap-2">
                    <Link href="/applications">
                      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                        <Users className="h-4 w-4 mr-1" />
                        Manage Applications
                      </Button>
                    </Link>
                    <Link href="/team">
                      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                        <Users className="h-4 w-4 mr-1" />
                        Team Management
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold">{totalApplications}</p>
              <p className="text-xs text-gray-500 mt-1">Assigned to your company</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold">{inProgressApplications}</p>
              <p className="text-xs text-gray-500 mt-1">Currently working on</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold">{completedApplications}</p>
              <p className="text-xs text-gray-500 mt-1">Successfully finished</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold">{overdueApplications}</p>
              <p className="text-xs text-gray-500 mt-1">Need immediate attention</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Recent Applications
            </CardTitle>
            <CardDescription>
              Latest application assignments for your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.slice(0, 5).map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{application.applicationId}</div>
                      <div className="text-xs text-gray-600">
                        {application.facilityName} • {application.companyName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Assigned {new Date(application.assignedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        <Badge className={getStatusColor(application.status)} variant="secondary">
                          {application.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getActivityTypeColor(application.activityType)}>
                          {application.activityType}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/applications/${application.id}`}>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        {(['contractor_account_owner', 'contractor_individual', 'contractor_manager'].includes(user?.role || '') || 
                         (user?.role === 'contractor_team_member' && user?.permissionLevel === 'manager')) && (
                          <Link href={`/applications/${application.id}`}>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </Link>
                        )}
                        {(user?.role === "contractor_individual" || user?.role === "contractor_account_owner") && (
                          <Link href="/applications">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {applications.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    No applications assigned yet
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-500 text-sm">
                  Applications assigned to your company will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Company Overview
            </CardTitle>
            <CardDescription>
              Your contracting company's service capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Service Regions */}
              <div>
                <div className="font-medium text-sm mb-2">Service Regions</div>
                <div className="flex flex-wrap gap-2">
                  {contractorCompany?.serviceRegions?.length > 0 ? (
                    contractorCompany.serviceRegions.slice(0, 3).map((region, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No regions configured</span>
                  )}
                  {contractorCompany?.serviceRegions?.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{contractorCompany.serviceRegions.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Supported Activities */}
              <div>
                <div className="font-medium text-sm mb-2">Supported Activities</div>
                <div className="flex flex-wrap gap-2">
                  {contractorCompany?.supportedActivities?.length > 0 ? (
                    contractorCompany.supportedActivities.slice(0, 3).map((activity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {activity}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No activities configured</span>
                  )}
                  {contractorCompany?.supportedActivities?.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{contractorCompany.supportedActivities.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Team Size */}
              {user?.role === "contractor_individual" && (
                <div>
                  <div className="font-medium text-sm mb-2">Team Size</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-4 border-t">
                <div className="font-medium text-sm mb-2">Quick Actions</div>
                <div className="text-xs text-gray-600">
                  Use the sidebar navigation to manage your company services, team, and view all applications.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}