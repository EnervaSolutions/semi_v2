import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Settings, Check, X } from "lucide-react";

const ACTIVITY_TYPES = ['FRA', 'SEM', 'EAA', 'EMIS', 'CR'];

interface ActivityContractorSettings {
  activityType: string;
  allowContractorAssignment: boolean;
  contractorFilterType: string;
  requiredContractorActivities: string[];
}

export default function ContractorAssignmentSettings() {
  const { toast } = useToast();
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [formData, setFormData] = useState<ActivityContractorSettings>({
    activityType: '',
    allowContractorAssignment: false,
    contractorFilterType: 'all',
    requiredContractorActivities: [],
  });

  // Fetch current activity settings
  const { data: activitySettings = [], isLoading } = useQuery({
    queryKey: ["/api/activity-settings"],
  });

  // Fetch registered contractors for overview
  const { data: contractors = [] } = useQuery({
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

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
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

  const getActivitySettings = (activityType: string) => {
    return activitySettings.find((s: any) => s.activityType === activityType) || {
      allowContractorAssignment: false,
      contractorFilterType: 'all',
      requiredContractorActivities: [],
    };
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading contractor assignment settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Contractor Assignment Management</CardTitle>
              <CardDescription>
                Configure which activity types allow contractor assignment and set filtering criteria
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{contractors.length}</div>
              <p className="text-sm text-gray-600">Registered Contractors</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {activitySettings.filter((s: any) => s.allowContractorAssignment).length}
              </div>
              <p className="text-sm text-gray-600">Activities with Contractor Assignment</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {contractors.filter((c: any) => c.isActive).length}
              </div>
              <p className="text-sm text-gray-600">Active Contractors</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Settings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Type Configuration</CardTitle>
          <CardDescription>
            Manage contractor assignment settings for each SEMI activity type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity Type</TableHead>
                <TableHead>Contractor Assignment</TableHead>
                <TableHead>Filter Type</TableHead>
                <TableHead>Required Activities</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTIVITY_TYPES.map(activityType => {
                const settings = getActivitySettings(activityType);
                const isEditing = editingActivity === activityType;

                return (
                  <TableRow key={activityType}>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {activityType}
                      </Badge>
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
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Show All Contractors</SelectItem>
                            <SelectItem value="activity_specific">Filter by Activities</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {settings.allowContractorAssignment ? 
                            (settings.contractorFilterType === 'all' ? 'All Contractors' : 'Activity Filtered') 
                            : 'N/A'
                          }
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="space-y-2">
                          {formData.allowContractorAssignment && formData.contractorFilterType === 'activity_specific' && (
                            <div className="grid grid-cols-2 gap-2">
                              {ACTIVITY_TYPES.map(activity => (
                                <div key={activity} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`edit-activity-${activity}`}
                                    checked={formData.requiredContractorActivities.includes(activity)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
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
                                  <Label htmlFor={`edit-activity-${activity}`} className="text-xs">{activity}</Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={handleSave}
                            disabled={updateSettingsMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
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
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
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

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How Contractor Assignment Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><strong>Show All Contractors:</strong> Participating companies can assign any registered and active contractor to applications of this activity type.</p>
          </div>
          <div className="text-sm text-gray-600">
            <p><strong>Filter by Activities:</strong> Only contractors who support the selected activities will be available for assignment to applications of this activity type.</p>
          </div>
          <div className="text-sm text-gray-600">
            <p><strong>Note:</strong> Contractors must be active and registered in the system to be available for assignment, regardless of filter settings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}