import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  FileText, 
  Activity, 
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Shield
} from "lucide-react";
import EditableDashboard from "@/components/EditableDashboard";
import SystemStatusManager from "@/components/SystemStatusManager";

export default function AdminDashboard() {
  // Fetch overview statistics
  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: pendingSubmissionsResponse, isLoading: pendingLoading } = useQuery({
    queryKey: ["/api/admin/pending-submissions"],
  });

  // Handle the new API response format that includes pagination
  const pendingSubmissions = pendingSubmissionsResponse?.data || [];

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: allApplications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["/api/admin/applications"],
  });

  // Calculate basic stats
  const overviewStats = {
    totalUsers: allUsers.length || 0,
    totalApplications: allApplications.length || 0,
    pendingReviews: pendingSubmissions.length || 0,
    totalCompanies: new Set(allUsers.map((user: any) => user.companyId).filter(Boolean)).size || 0,
  };

  const isLoading = statsLoading || pendingLoading || usersLoading || appsLoading;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            System overview, analytics, and status management.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="border-red-200 text-red-800">
            <Shield className="h-3 w-3 mr-1" />
            System Admin
          </Badge>
        </div>
      </div>

      {/* Admin Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system-status">System Status</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : overviewStats.totalUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered platform users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : overviewStats.totalCompanies}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered organizations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : overviewStats.totalApplications}
                </div>
                <p className="text-xs text-muted-foreground">
                  All submitted applications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : overviewStats.pendingReviews}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>
                Latest submissions and administrative actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading recent activity...
                </div>
              ) : pendingSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending submissions at this time
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSubmissions.slice(0, 5).map((submission: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-sm">
                            {submission.applicationId || 'Unknown Application'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {submission.companyName || 'Unknown Company'} • {submission.activityType || 'Unknown Activity'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <EditableDashboard />
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system-status" className="space-y-6">
          <SystemStatusManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}