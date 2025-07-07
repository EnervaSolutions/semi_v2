import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ActivityTemplate } from "@shared/schema";

const ACTIVITY_TYPES = ['FRA', 'SEM', 'EEA', 'EMIS', 'CR'];

interface ActivityTemplateForm {
  activityType: string;
  templateName: string;
  displayOrder: number;
  description: string;
  isRequired: boolean;
  prerequisiteTemplateId: number | null;
  isActive: boolean;
  allowContractorAssignment: boolean;
  contractorFilterType: string;
  requiredContractorActivities: string[];
}

export default function AdminActivityTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ActivityTemplateForm>({
    activityType: '',
    templateName: '',
    displayOrder: 1,
    description: '',
    isRequired: false,
    prerequisiteTemplateId: null,
    isActive: true,
    allowContractorAssignment: false,
    contractorFilterType: 'all',
    requiredContractorActivities: [],
  });

  // Fetch all activity templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/admin/activity-templates'],
    enabled: user?.role === 'system_admin',
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: ActivityTemplateForm) => {
      const res = await apiRequest("POST", "/api/admin/activity-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-templates'] });
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Activity template created",
        description: "The new activity template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to create template",
        description: "Could not create the activity template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ActivityTemplateForm> }) => {
      const res = await apiRequest("PATCH", `/api/admin/activity-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-templates'] });
      setEditingTemplate(null);
      resetForm();
      toast({
        title: "Activity template updated",
        description: "The activity template has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update template",
        description: "Could not update the activity template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/activity-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-templates'] });
      setDeleteTemplateId(null);
      toast({
        title: "Activity template deleted",
        description: "The activity template has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete template",
        description: "Could not delete the activity template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      activityType: '',
      templateName: '',
      displayOrder: 1,
      description: '',
      isRequired: false,
      prerequisiteTemplateId: null,
      isActive: true,
      allowContractorAssignment: false,
      contractorFilterType: 'all',
      requiredContractorActivities: [],
    });
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const startEdit = (template: ActivityTemplate) => {
    setEditingTemplate(template);
    setFormData({
      activityType: template.activityType,
      templateName: template.templateName,
      displayOrder: template.displayOrder,
      description: template.description || '',
      isRequired: template.isRequired || false,
      prerequisiteTemplateId: template.prerequisiteTemplateId,
      isActive: template.isActive || false,
      allowContractorAssignment: (template as any).allowContractorAssignment || false,
      contractorFilterType: (template as any).contractorFilterType || 'all',
      requiredContractorActivities: (template as any).requiredContractorActivities || [],
    });
    setShowCreateDialog(true);
  };

  const closeDialog = () => {
    setShowCreateDialog(false);
    setEditingTemplate(null);
    resetForm();
  };

  // Group templates by activity type
  const templatesByType = (templates as ActivityTemplate[]).reduce((acc: Record<string, ActivityTemplate[]>, template: ActivityTemplate) => {
    if (!acc[template.activityType]) {
      acc[template.activityType] = [];
    }
    acc[template.activityType].push(template);
    return acc;
  }, {});

  // Sort templates within each type by display order
  Object.keys(templatesByType).forEach(type => {
    templatesByType[type].sort((a: ActivityTemplate, b: ActivityTemplate) => a.displayOrder - b.displayOrder);
  });

  // Check if user has admin access
  if (user?.role !== 'system_admin') {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access activity template management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Template Management</h1>
            <p className="text-gray-600">Configure dynamic activity phases for each activity type</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Activity Template' : 'Create New Activity Template'}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate 
                    ? 'Update the activity template configuration.'
                    : 'Create a new activity phase template. Activities will only appear if templates exist for them.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="activityType">Activity Type</Label>
                    <Select 
                      value={formData.activityType} 
                      onValueChange={(value) => setFormData({ ...formData, activityType: value })}
                      disabled={!!editingTemplate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="displayOrder">Display Order</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      min="1"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="templateName">Phase Name</Label>
                  <Input
                    id="templateName"
                    placeholder="e.g., Pre-Assessment, Implementation Planning, Final Report"
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this phase involves..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="dependsOn">Depends On Template</Label>
                  <Select 
                    value={formData.prerequisiteTemplateId?.toString() || ''} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      prerequisiteTemplateId: value ? parseInt(value) : null 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No dependency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No dependency</SelectItem>
                      {(templates as ActivityTemplate[])
                        .filter((t: ActivityTemplate) => t.activityType === formData.activityType && t.id !== editingTemplate?.id)
                        .map((template: ActivityTemplate) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.templateName}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRequired"
                      checked={formData.isRequired}
                      onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                    />
                    <Label htmlFor="isRequired">Required Phase</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>

                {/* Contractor Assignment Settings */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-3">Contractor Assignment Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allowContractorAssignment"
                        checked={formData.allowContractorAssignment}
                        onCheckedChange={(checked) => setFormData({ ...formData, allowContractorAssignment: checked })}
                      />
                      <Label htmlFor="allowContractorAssignment">Allow Contractor Assignment</Label>
                    </div>

                    {formData.allowContractorAssignment && (
                      <div className="pl-6 space-y-3">
                        <div>
                          <Label htmlFor="contractorFilterType">Contractor Filter Type</Label>
                          <Select 
                            value={formData.contractorFilterType} 
                            onValueChange={(value) => setFormData({ ...formData, contractorFilterType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select filter type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Show All Contractors</SelectItem>
                              <SelectItem value="activity_specific">Filter by Supported Activities</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.contractorFilterType === 'activity_specific' && (
                          <div>
                            <Label>Required Contractor Activities</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {['FRA', 'SEM', 'EAA', 'EMIS', 'CR'].map(activity => (
                                <div key={activity} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`activity-${activity}`}
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
                                  <Label htmlFor={`activity-${activity}`}>{activity}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.activityType || !formData.templateName || createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading activity templates...</div>
      ) : (
        <div className="space-y-6">
          {ACTIVITY_TYPES.map(activityType => (
            <Card key={activityType}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{activityType}</Badge>
                    <span className="text-lg">Activity Templates</span>
                  </div>
                  <Badge variant="outline">
                    {templatesByType[activityType]?.length || 0} phases
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure the phases available for {activityType} applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesByType[activityType]?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Phase Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Dependencies</TableHead>
                        <TableHead>Contractor Assignment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templatesByType[activityType].map((template: ActivityTemplate) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-mono text-sm">
                            {template.displayOrder}
                          </TableCell>
                          <TableCell className="font-medium">
                            {template.templateName}
                            {template.isRequired && (
                              <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                            {template.description}
                          </TableCell>
                          <TableCell>
                            {template.prerequisiteTemplateId ? (
                              <Badge variant="outline" className="text-xs">
                                Dependent
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {template.allowContractorAssignment ? (
                              <div className="space-y-1">
                                <Badge variant="default" className="text-xs">
                                  Enabled
                                </Badge>
                                {template.contractorFilterType === 'activity_specific' && (
                                  <div className="text-xs text-gray-500">
                                    Filter: {template.requiredContractorActivities?.join(', ') || 'None'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(template)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteTemplateId(template.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No activity templates configured for {activityType}</p>
                    <p className="text-sm">Create templates to enable this activity type</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the activity template and make the phase unavailable for new applications. 
              Existing applications will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && deleteTemplateMutation.mutate(deleteTemplateId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}