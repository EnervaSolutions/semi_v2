import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Settings, AlertTriangle, CheckCircle, XCircle, Edit2, Save, X, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { getNAICSDescription } from "../../../shared/naics-data";
import * as XLSX from 'xlsx';

/* ===========================
 * CRITICAL APPLICATION LIMITS MANAGEMENT
 * 
 * IMPORTANT: Application usage column has been intentionally
 * removed from the table display as requested. The usage data
 * is still calculated in the backend but not shown to reduce
 * visual clutter and focus on limit management only.
 * 
 * KEY FEATURES THAT MUST BE PRESERVED:
 * - Activity settings display and management
 * - Application limit editing with persistence
 * - Real-time status updates and validation
 * - Proper authentication and role checking
 * 
 * PROTECTED ENDPOINTS USED:
 * - GET /api/activity-settings (retrieve current settings)
 * - PATCH /api/admin/activity-settings/:activityType (update limits)
 * 
 * WARNING: Removing or modifying this functionality will break
 * the application limit system and prevent proper program management.
 * ========================== */

export default function AdminApplicationLimitsPage() {
  const { toast } = useToast();
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [key: string]: number | null }>({});
  const [downloadingActivity, setDownloadingActivity] = useState<string | null>(null);

  // Fetch activity settings for Application Limits
  const { data: activitySettings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/activity-settings"],
  });

  // Fetch all applications to show current usage
  const { data: applications = [] } = useQuery({
    queryKey: ["/api/admin/applications"],
  });

  // Mutation to update activity limits
  const updateActivityLimitMutation = useMutation({
    mutationFn: async ({ activityType, maxApplications, isEnabled }: { 
      activityType: string; 
      maxApplications: number | null;
      isEnabled?: boolean;
    }) => {
      return await apiRequest(`/api/admin/activity-settings/${activityType}`, "PATCH", {
        maxApplications,
        ...(isEnabled !== undefined && { isEnabled })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-settings"] });
      setEditingActivity(null);
      setEditValues({});
      toast({
        title: "Success",
        description: "Application limit updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not update the application limit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getActivityUsage = (activityType: string) => {
    return applications.filter((app: any) => app.activityType === activityType).length;
  };

  const getActivityColor = (activityType: string) => {
    const activity = ACTIVITY_TYPES[activityType as keyof typeof ACTIVITY_TYPES];
    return activity?.color || 'gray';
  };

  const handleStartEdit = (activityType: string, currentLimit: number | null) => {
    setEditingActivity(activityType);
    setEditValues({ [activityType]: currentLimit });
  };

  const handleSaveEdit = (activityType: string) => {
    const newLimit = editValues[activityType];
    updateActivityLimitMutation.mutate({
      activityType,
      maxApplications: newLimit
    });
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setEditValues({});
  };

  const handleToggleActivity = (activityType: string, currentEnabled: boolean) => {
    const currentActivity = mergedActivities.find(a => a.activityType === activityType);
    updateActivityLimitMutation.mutate({
      activityType,
      maxApplications: currentActivity?.maxApplications || null, // Keep current limit
      isEnabled: !currentEnabled
    });
  };

  const exportActivityData = async (activityType: string) => {
    try {
      const filteredApplications = applications.filter((app: any) => app.activityType === activityType);
      
      if (filteredApplications.length === 0) {
        toast({
          title: "No Data",
          description: `No applications found for ${activityType} activity.`,
          variant: "destructive",
        });
        return;
      }

      // Fetch documents for each application
      const applicationsWithDocuments = await Promise.all(
        filteredApplications.map(async (app: any) => {
          try {
            const docsResponse = await apiRequest(`/api/applications/${app.id}/documents`, "GET");
            const documents = await docsResponse.json();
            console.log(`DEBUG DOCS - App ${app.id} (${app.applicationId}):`, documents?.length || 0, 'documents', documents);
            return {
              ...app,
              documents: Array.isArray(documents) ? documents : []
            };
          } catch (error) {
            console.error(`Failed to fetch documents for application ${app.id}:`, error);
            return {
              ...app,
              documents: []
            };
          }
        })
      );

      console.log('DEBUG - DOCUMENT COUNTS:', applicationsWithDocuments.map(app => ({
        id: app.id,
        applicationId: app.applicationId,
        documentsCount: app.documents?.length || 0
      })));
      
      // Create comprehensive data structure for export
      const exportData = applicationsWithDocuments.map((app: any) => {
        // Debug logging to understand the data structure
        console.log('DEBUG EXPORT - App data:', {
          id: app.id,
          applicationId: app.applicationId,
          submittedAt: app.submittedAt,
          reviewedAt: app.reviewedAt,
          reviewNotes: app.reviewNotes,
          company: app.company,
          facility: app.facility,
          documentsLength: app.documents?.length || 0
        });
        
        const documentInfo = (app.documents && app.documents.length > 0)
          ? app.documents.map((doc: any) => 
              `${doc.originalName} (${doc.documentType || 'other'}${doc.size ? `, ${Math.round(doc.size/1024)}KB` : ''})`
            ).join('; ')
          : 'No documents';

        return {
          'Application ID': app.applicationId,
          'Title': app.title,
          'Company Name': app.company?.name || 'N/A',
          'Company Short Name': app.company?.shortName || 'N/A',
          'Facility Name': app.facility?.name || 'N/A',
          'Facility Location': app.facility ? 
            `${app.facility.city || ''}, ${app.facility.province || ''}`.trim().replace(/^,|,$/, '') || 'N/A' : 'N/A',
          'NAICS Code': app.facility?.naicsCode || 'N/A',
          'NAICS Description': app.facility?.naicsCode ? getNAICSDescription(app.facility.naicsCode) : 'N/A',
          'Activity Type': app.activityType,
          'Status': app.status,
          'Created Date': app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A',
          'Submitted Date': app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A',
          'Reviewed Date': app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : 'N/A',
          'Floor Area (sq ft)': app.facility?.grossFloorArea || 'N/A',
          'Operating Hours/Week': app.facility?.weeklyOperatingHours || 'N/A',
          'Workers (Main Shift)': app.facility?.numberOfWorkersMainShift || 'N/A',
          'Has EMIS': app.facility?.hasEmis ? 'Yes' : 'No',
          'Has Energy Manager': app.facility?.hasEnergyManager ? 'Yes' : 'No',
          'Company Business Number': app.company?.businessNumber || 'N/A',
          'Company Phone': app.company?.phone || 'N/A',
          'Company Website': app.company?.website || 'N/A',
          'Review Notes': app.reviewNotes || 'N/A',
          'Documents Count': app.documents?.length || 0,
          'Documents': documentInfo
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${activityType} Applications`);

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `SEMI_${activityType}_Applications_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      const totalDocuments = applicationsWithDocuments.reduce((sum, app) => sum + app.documents.length, 0);
      
      toast({
        title: "Export Successful",
        description: `Downloaded ${filteredApplications.length} ${activityType} applications with ${totalDocuments} documents listed as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export application data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadActivityDocuments = async (activityType: string) => {
    try {
      setDownloadingActivity(activityType);
      console.log(`Starting document download for ${activityType}`);
      
      const filteredApplications = applications.filter((app: any) => app.activityType === activityType);
      
      if (filteredApplications.length === 0) {
        toast({
          title: "No Applications",
          description: `No applications found for ${activityType} activity.`,
          variant: "destructive",
        });
        setDownloadingActivity(null);
        return;
      }

      console.log(`Found ${filteredApplications.length} applications for ${activityType}`);

      // Show progress toast
      toast({
        title: "Preparing Download",
        description: `Collecting documents from ${filteredApplications.length} ${activityType} applications...`,
      });

      // Get total document count first
      let totalDocuments = 0;
      console.log(`Frontend document count check for ${filteredApplications.length} applications:`);
      
      for (const app of filteredApplications) {
        try {
          console.log(`Checking documents for app ${app.id} (${app.applicationId})`);
          const docsResponse = await apiRequest(`/api/applications/${app.id}/documents`, "GET");
          console.log(`App ${app.id} document response:`, docsResponse);
          const docCount = docsResponse?.length || 0;
          totalDocuments += docCount;
          console.log(`App ${app.id}: ${docCount} documents (running total: ${totalDocuments})`);
        } catch (error) {
          console.error(`Failed to count documents for application ${app.id}:`, error);
        }
      }

      console.log(`Frontend document count check complete: ${totalDocuments} total documents`);

      // Skip the frontend document count check - let the backend handle this
      // The backend has access to the database and can properly filter documents
      console.log(`Proceeding with ZIP download regardless of frontend count - backend will handle validation`);

      // Show ZIP creation progress
      toast({
        title: "Creating ZIP File",
        description: `Creating ZIP archive for ${filteredApplications.length} ${activityType} applications...`,
      });

      console.log(`Requesting ZIP download from: /api/admin/export/documents/${activityType}`);

      // Request ZIP download from server
      const response = await fetch(`/api/admin/export/documents/${activityType}`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log(`ZIP download response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ZIP download failed: ${response.status} - ${errorText}`);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `SEMI_${activityType}_Documents_${timestamp}.zip`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`ZIP download completed successfully`);

      // Get the actual document count from response headers or assume success
      toast({
        title: "Documents Downloaded",
        description: `ZIP file created from ${filteredApplications.length} ${activityType} applications`,
      });
    } catch (error) {
      console.error('Document download error:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDownloadingActivity(null);
    }
  };

  const getUsageStatus = (usage: number, limit: number | null) => {
    if (limit === null) return 'unlimited';
    if (usage >= limit) return 'exceeded';
    if (usage / limit >= 0.8) return 'warning';
    return 'normal';
  };

  const getUsageColor = (status: string) => {
    switch (status) {
      case 'exceeded': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'unlimited': return 'text-blue-600 bg-blue-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  // Merge activity settings with predefined activity types
  const mergedActivities = Object.entries(ACTIVITY_TYPES).map(([activityType, activity]) => {
    const setting = activitySettings.find((s: any) => s.activityType === activityType);
    const usage = getActivityUsage(activityType);
    
    return {
      activityType,
      ...activity,
      isEnabled: setting?.isEnabled ?? true,
      maxApplications: setting?.maxApplications ?? null,
      currentUsage: usage,
      usageStatus: getUsageStatus(usage, setting?.maxApplications ?? null)
    };
  });

  const stats = {
    totalActivities: mergedActivities.length,
    enabledActivities: mergedActivities.filter(a => a.isEnabled).length,
    limitedActivities: mergedActivities.filter(a => a.maxApplications !== null).length,
    activitiesNearLimit: mergedActivities.filter(a => a.usageStatus === 'warning' || a.usageStatus === 'exceeded').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Application Limits</h1>
          <p className="text-gray-600">Manage application limits and activity availability</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActivities}</div>
            <p className="text-xs text-muted-foreground">Available activity types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled Activities</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enabledActivities}</div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limited Activities</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.limitedActivities}</div>
            <p className="text-xs text-muted-foreground">With application limits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attention Needed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activitiesNearLimit}</div>
            <p className="text-xs text-muted-foreground">Near or at limit</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Limits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Limits Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Application Limit</TableHead>
                <TableHead>Usage Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mergedActivities.map((activity) => (
                <TableRow key={activity.activityType}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-${activity.color}-600`}>
                        {activity.icon}
                      </div>
                      <div>
                        <div className="font-medium">{activity.name}</div>
                        <div className="text-sm text-gray-500">{activity.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={activity.isEnabled}
                        onCheckedChange={() => handleToggleActivity(activity.activityType, activity.isEnabled)}
                        disabled={updateActivityLimitMutation.isPending}
                      />
                      <Badge variant={activity.isEnabled ? 'default' : 'secondary'}>
                        {activity.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    {editingActivity === activity.activityType ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={editValues[activity.activityType] || ''}
                          onChange={(e) => setEditValues(prev => ({
                            ...prev,
                            [activity.activityType]: e.target.value ? parseInt(e.target.value) : null
                          }))}
                          placeholder="No limit"
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(activity.activityType)}
                          disabled={updateActivityLimitMutation.isPending}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          {activity.maxApplications || 'No limit'}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(activity.activityType, activity.maxApplications)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge className={getUsageColor(activity.usageStatus)}>
                      {activity.usageStatus === 'unlimited' && 'Unlimited'}
                      {activity.usageStatus === 'normal' && 'Normal'}
                      {activity.usageStatus === 'warning' && 'Near Limit'}
                      {activity.usageStatus === 'exceeded' && 'Exceeded'}
                    </Badge>
                    {activity.maxApplications && (
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.currentUsage}/{activity.maxApplications} ({Math.round((activity.currentUsage / activity.maxApplications) * 100)}%)
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      {activity.isEnabled ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      {activity.usageStatus === 'exceeded' && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      {activity.usageStatus === 'warning' && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Application Usage Overview</CardTitle>
          <p className="text-sm text-gray-600">View application counts and export detailed data for each activity type</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {mergedActivities.map((activity) => (
              <div key={activity.activityType} className="text-center p-4 border rounded-lg">
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold
                  ${activity.isEnabled ? `bg-${activity.color}-600` : 'bg-gray-400'}`}>
                  {activity.icon}
                </div>
                <div className="font-medium text-sm mb-1">{activity.activityType}</div>
                <div className="text-2xl font-bold mb-1">{activity.currentUsage}</div>
                <div className="text-xs text-gray-500 mb-3">
                  {activity.maxApplications ? `/ ${activity.maxApplications}` : '/ ∞'}
                </div>
                
                {/* Export Buttons */}
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportActivityData(activity.activityType)}
                    disabled={activity.currentUsage === 0}
                    className="w-full"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export Data
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadActivityDocuments(activity.activityType)}
                    disabled={activity.currentUsage === 0 || downloadingActivity === activity.activityType}
                    className="w-full"
                  >
                    {downloadingActivity === activity.activityType ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3 mr-1" />
                    )}
                    {downloadingActivity === activity.activityType ? 'Creating ZIP...' : 'Download Files'}
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  {activity.currentUsage === 0 
                    ? 'No applications' 
                    : `${activity.currentUsage} applications`}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Data: Excel with details<br/>
                  Files: ZIP with documents
                </div>
                
                {!activity.isEnabled && (
                  <Badge variant="secondary" className="mt-2 text-xs">Disabled</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
