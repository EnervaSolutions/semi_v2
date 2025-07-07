import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Users, HardHat, CheckCircle, XCircle, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_TYPES } from "@/lib/constants";

interface ActivityContractorSettings {
  activityType: string;
  allowContractorAssignment: boolean;
  contractorFilterType: string;
  requiredContractorActivities: string[];
}

interface ActivitySettings {
  id: number;
  activityType: string;
  allowContractorAssignment: boolean;
  contractorFilterType: string;
  requiredContractorActivities: string[];
}

interface Contractor {
  id: number;
  name: string;
  shortName: string;
  supportedActivities: string[];
  serviceRegions: string[];
  capitalRetrofitTechnologies: string[];
  isActive: boolean;
  website?: string;
  phone?: string;
  businessNumber?: string;
}

export default function AdminContractorAssignmentPage() {
  const { toast } = useToast();
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [formData, setFormData] = useState<ActivityContractorSettings>({
    activityType: '',
    allowContractorAssignment: false,
    contractorFilterType: 'all',
    requiredContractorActivities: [],
  });

  // Fetch current activity settings
  const { data: activitySettings = [], isLoading } = useQuery<ActivitySettings[]>({
    queryKey: ["/api/activity-settings"],
  });

  // Fetch registered contractors for overview
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ["/api/admin/contractors"],
  });

  // Update activity contractor settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: ActivityContractorSettings) => {
      return apiRequest(`/api/activity-settings/${data.activityType}/contractor-assignment`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Contractor assignment settings have been updated successfully.",
      });
      setEditingActivity(null);
      queryClient.invalidateQueries({ queryKey: ["/api/activity-settings"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update contractor assignment settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle contractor status
  const toggleContractorStatusMutation = useMutation({
    mutationFn: async ({ contractorId, isActive }: { contractorId: number; isActive: boolean }) => {
      return apiRequest(`/api/admin/contractors/${contractorId}/toggle-status`, 'PATCH', { isActive });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Contractor status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contractors"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update contractor status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startEdit = (activityType: string) => {
    const currentSettings = activitySettings.find((s: any) => s.activityType === activityType);
    setEditingActivity(activityType);
    setFormData({
      activityType,
      allowContractorAssignment: currentSettings?.allowContractorAssignment || false,
      contractorFilterType: currentSettings?.contractorFilterType || 'all',
      requiredContractorActivities: currentSettings?.requiredContractorActivities || [],
    });
  };

  const cancelEdit = () => {
    setEditingActivity(null);
    setFormData({
      activityType: '',
      allowContractorAssignment: false,
      contractorFilterType: 'all',
      requiredContractorActivities: [],
    });
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const toggleContractorStatus = (contractorId: number, isActive: boolean) => {
    toggleContractorStatusMutation.mutate({ contractorId, isActive });
  };

  const editContractor = (contractor: any) => {
    // Navigate to contractor edit page or open edit dialog
    // For now, we'll show a toast with contractor info
    toast({
      title: "Edit Contractor",
      description: `Edit functionality for ${contractor.name} will be implemented in the contractor management page.`,
    });
  };

  const getActivitySettings = (activityType: string) => {
    return activitySettings.find((s: any) => s.activityType === activityType) || {
      allowContractorAssignment: false,
      contractorFilterType: 'all',
      requiredContractorActivities: [],
    };
  };

  const getContractorsByActivity = (supportedActivities: string[]) => {
    return contractors.filter((contractor: any) => {
      // Check main supported activities
      const hasMainActivity = supportedActivities.some(activity => 
        contractor.supportedActivities?.includes(activity)
      );
      
      // Check Capital Retrofit technologies
      const hasCRTechnology = supportedActivities.some(activity => 
        contractor.capitalRetrofitTechnologies?.includes(activity)
      );
      
      return hasMainActivity || hasCRTechnology;
    });
  };

  const getActivityColor = (activityType: string) => {
    const activity = ACTIVITY_TYPES[activityType as keyof typeof ACTIVITY_TYPES];
    switch (activity?.color) {
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'teal': return 'bg-teal-100 text-teal-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      case 'indigo': return 'bg-indigo-100 text-indigo-800';
      case 'green': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading contractor assignment settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contractor Assignment Settings</h1>
          <p className="text-gray-600">Configure which activities allow contractor assignment and filter contractor visibility for participants</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contractors.length}</div>
            <p className="text-xs text-muted-foreground">Registered service providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignment Enabled</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activitySettings.filter((setting: any) => setting.allowContractorAssignment).length}
            </div>
            <p className="text-xs text-muted-foreground">Activities allowing contractors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Activities</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activitySettings.filter((setting: any) => setting.contractorFilterType === 'activity_specific').length}
            </div>
            <p className="text-xs text-muted-foreground">Activities with filtering</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Contractor Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Contractor Assignment Configuration</CardTitle>
          <p className="text-sm text-gray-600">Configure which activities allow contractor assignment and control contractor visibility for participants</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity Type</TableHead>
                <TableHead>Allow Assignment</TableHead>
                <TableHead>Contractor Filter</TableHead>
                <TableHead>Required Activities</TableHead>
                <TableHead>Available Contractors</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ACTIVITY_TYPES).map(([activityType, activity]) => {
                const settings = getActivitySettings(activityType);
                const isEditing = editingActivity === activityType;
                const availableContractors = settings.contractorFilterType === 'activity_specific' && settings.requiredContractorActivities?.length > 0
                  ? getContractorsByActivity(settings.requiredContractorActivities)
                  : contractors;

                return (
                  <TableRow key={activityType}>
                    <TableCell>
                      <div>
                        <Badge className={getActivityColor(activityType)}>
                          {activityType}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1">{activity.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Switch
                          checked={formData.allowContractorAssignment}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, allowContractorAssignment: checked })
                          }
                        />
                      ) : (
                        <Badge variant={settings.allowContractorAssignment ? "default" : "secondary"}>
                          {settings.allowContractorAssignment ? "Enabled" : "Disabled"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select 
                          value={formData.contractorFilterType} 
                          onValueChange={(value) => setFormData({ ...formData, contractorFilterType: value })}
                          disabled={!formData.allowContractorAssignment}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select filter type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Show All Contractors</SelectItem>
                            <SelectItem value="activity_specific">Filter by Activities</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm">
                          {settings.allowContractorAssignment 
                            ? (settings.contractorFilterType === 'all' ? 'All Contractors' : 'Activity Filtered')
                            : 'N/A'
                          }
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        formData.allowContractorAssignment && formData.contractorFilterType === 'activity_specific' ? (
                          <div className="space-y-3 max-w-xs">
                            {/* Main Activities */}
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-2">Main Activities:</div>
                              <div className="space-y-2">
                                {["Capital Retrofit", "Energy Management Information System", "Energy Auditing and Assessment"].map(activity => (
                                  <div key={activity} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-activity-${activity}`}
                                      checked={formData.requiredContractorActivities.includes(activity)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setFormData({
                                            ...formData,
                                            requiredContractorActivities: [...formData.requiredContractorActivities, activity]
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            requiredContractorActivities: formData.requiredContractorActivities.filter(a => a !== activity)
                                          });
                                        }
                                      }}
                                    />
                                    <label htmlFor={`edit-activity-${activity}`} className="text-xs">{activity}</label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Capital Retrofit Sub-Technologies */}
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-2">CR Technologies:</div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {["Lighting", "Solar PV", "HVAC", "Process Heating", "Geothermal", "Process Cooling and Refrigeration", "Pump Driven Systems", "Fan Driven Systems", "Compressed Air", "Building Envelope", "Other"].map(tech => (
                                  <div key={tech} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-tech-${tech}`}
                                      checked={formData.requiredContractorActivities.includes(tech)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setFormData({
                                            ...formData,
                                            requiredContractorActivities: [...formData.requiredContractorActivities, tech]
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            requiredContractorActivities: formData.requiredContractorActivities.filter(a => a !== tech)
                                          });
                                        }
                                      }}
                                    />
                                    <label htmlFor={`edit-tech-${tech}`} className="text-xs">{tech}</label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">N/A</div>
                        )
                      ) : (
                        <div className="text-sm text-gray-600">
                          {settings.allowContractorAssignment && settings.contractorFilterType === 'activity_specific' ? 
                            (settings.requiredContractorActivities?.join(', ') || 'None') : 
                            'N/A'
                          }
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{availableContractors.length}</span>
                        <span className="text-gray-500"> / {contractors.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={updateSettingsMutation.isPending}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(activityType)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Registered Contractors Management */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Contractors Management</CardTitle>
          <p className="text-sm text-gray-600">Manage contractors, their status, supported activities, and service regions</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Service Regions</TableHead>
                <TableHead>Supported Activities</TableHead>
                <TableHead>CR Technologies</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((contractor: any) => (
                <TableRow key={contractor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{contractor.name}</div>
                      <div className="text-sm text-gray-500">{contractor.shortName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant={contractor.isActive ? 'default' : 'secondary'}>
                        {contractor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleContractorStatus(contractor.id, !contractor.isActive)}
                      >
                        {contractor.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {contractor.serviceRegions?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contractor.serviceRegions.map((region: string) => (
                            <Badge key={region} variant="outline" className="text-xs">
                              {region}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">None specified</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {contractor.supportedActivities?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contractor.supportedActivities.map((activity: string) => (
                            <Badge key={activity} variant="outline" className="text-xs">
                              {activity}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">None specified</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {contractor.capitalRetrofitTechnologies?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contractor.capitalRetrofitTechnologies.slice(0, 3).map((tech: string) => (
                            <Badge key={tech} variant="outline" className="text-xs bg-green-50">
                              {tech}
                            </Badge>
                          ))}
                          {contractor.capitalRetrofitTechnologies.length > 3 && (
                            <Badge variant="outline" className="text-xs bg-gray-50">
                              +{contractor.capitalRetrofitTechnologies.length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">None specified</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editContractor(contractor)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {contractors.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No contractors are currently registered in the system.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}