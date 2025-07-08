import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  FileText, 
  Upload, 
  Download,
  Type, 
  Calendar, 
  Hash,
  CheckSquare,
  RadioIcon,
  List,
  Save,
  Eye
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'file' | 'file_download' | 'checkbox' | 'radio' | 'select';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  fileTypes?: string[];
  multiple?: boolean;
  description?: string;
  order: number;
  downloadUrl?: string;
  fileName?: string;
}

interface FormTemplate {
  id?: number;
  name: string;
  description: string;
  activityType: string;
  phase?: string;
  order: number;
  fields: FormField[];
  form_fields?: FormField[]; // For compatibility with database structure
  isActive: boolean;
  fieldCount?: number;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'textarea', label: 'Text Area', icon: FileText },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'file_download', label: 'File Download', icon: Download },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio Button', icon: RadioIcon },
  { type: 'select', label: 'Dropdown', icon: List },
];

const ACTIVITY_TYPES = ['FRA', 'SEM', 'EAA', 'EMIS', 'CR'];

export default function AdminFormBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");

  // Fetch all form templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/admin/form-templates'],
    enabled: user?.role === 'system_admin',
    select: (data: any[]) => data.map((template: any) => {
      const parsedFields = template.formFields ? JSON.parse(template.formFields) : [];
      return {
        ...template,
        fields: parsedFields,
        form_fields: parsedFields, // for compatibility, but always use fields
        fieldCount: parsedFields.length,
      };
    }),
  });



  // Create/Update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: FormTemplate) => {
      const url = template.id ? `/api/admin/form-templates/${template.id}` : '/api/admin/form-templates';
      const method = template.id ? 'PATCH' : 'POST';
      // Always use fields as the source of truth
      const currentFields = template.fields || [];
      const cleanTemplate = {
        name: template.name,
        description: template.description,
        activityType: template.activityType,
        phase: template.phase,
        order: template.order,
        isActive: template.isActive,
        formFields: JSON.stringify(currentFields),
      };
      console.log('[FORM BUILDER] Saving template:', cleanTemplate);
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanTemplate),
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[FORM BUILDER] Save failed:', errorData);
        throw new Error('Failed to save template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/form-templates'] });
      toast({ title: "Success", description: "Form template saved successfully" });
      setIsEditing(false);
      setSelectedTemplate(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save form template", variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/admin/form-templates/${templateId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete template');
      
      // Handle both JSON responses and empty 204 responses
      try {
        return await response.json();
      } catch {
        return { success: true };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/form-templates'] });
      if (data?.preservedData) {
        toast({ 
          title: "Template Deactivated", 
          description: "Template deactivated to preserve historical application data",
        });
      } else {
        toast({ title: "Template Deleted", description: "Form template deleted successfully" });
      }
    },
    onError: () => {
      toast({ title: "Delete Failed", description: "Could not delete form template", variant: "destructive" });
    },
  });

  const createNewTemplate = () => {
    const newTemplate: FormTemplate = {
      name: '',
      description: '',
      activityType: 'FRA',
      order: 1,
      fields: [],
      isActive: true,
    };
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
    setActiveTab("builder");
  };

  const addField = (type: string) => {
    if (!selectedTemplate) return;
    const currentFields = selectedTemplate.fields || [];
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as any,
      label: `New ${type} field`,
      required: false,
      order: currentFields.length,
      ...(type === 'file' && { fileTypes: ['.pdf', '.xlsx', '.docx'], multiple: true }),
      ...(type === 'select' && { options: ['Option 1', 'Option 2'] }),
      ...(type === 'radio' && { options: ['Option 1', 'Option 2'] }),
    };
    const updatedFields = [...currentFields, newField];
    setSelectedTemplate({
      ...selectedTemplate,
      fields: updatedFields,
      form_fields: updatedFields, // for compatibility
    });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!selectedTemplate) return;
    const currentFields = selectedTemplate.fields || [];
    const updatedFields = currentFields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setSelectedTemplate({
      ...selectedTemplate,
      fields: updatedFields,
      form_fields: updatedFields, // for compatibility
    });
  };

  const removeField = (fieldId: string) => {
    if (!selectedTemplate) return;
    const currentFields = selectedTemplate.fields || [];
    const filteredFields = currentFields.filter(field => field.id !== fieldId);
    setSelectedTemplate({
      ...selectedTemplate,
      fields: filteredFields,
      form_fields: filteredFields, // for compatibility
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination || !selectedTemplate) return;
    const currentFields = selectedTemplate.fields || [];
    const items = Array.from(currentFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    // Update order values
    const updatedFields = items.map((field, index) => ({
      ...field,
      order: index,
    }));
    setSelectedTemplate({
      ...selectedTemplate,
      fields: updatedFields,
      form_fields: updatedFields, // for compatibility
    });
  };

  const saveTemplate = () => {
    if (!selectedTemplate || !selectedTemplate.name) {
      toast({ title: "Error", description: "Please provide a template name", variant: "destructive" });
      return;
    }
    // Always use fields as the source of truth
    const currentFields = selectedTemplate.fields || [];
    // Remove computed frontend fields to prevent database errors, but always provide fields as an array for type safety
    const { fields: _fields, form_fields: _form_fields, fieldCount: _fieldCount, ...rest } = selectedTemplate;
    const templateData = {
      ...rest,
      fields: currentFields, // always provide fields as an array
      formFields: JSON.stringify(currentFields),
    };
    console.log('Saving template with data:', templateData);
    saveTemplateMutation.mutate(templateData);
  };

  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<number | null>(null);

  const confirmDeleteTemplate = (templateId: number) => {
    deleteTemplateMutation.mutate(templateId);
    setDeleteConfirmTemplate(null);
  };

  if (user?.role !== 'system_admin') {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only system administrators can access the form builder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
        <p className="text-gray-600">Create and manage dynamic forms for application activities</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Form Templates</TabsTrigger>
          <TabsTrigger value="builder">Form Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Existing Templates</h2>
            <Button onClick={createNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: any) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.activityType}
                    </Badge>
                    <Badge variant="outline">
                      {template.phase ? template.phase.replace('_', ' ') : 'Activity'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{template.description || 'No description provided'}</p>
                  <div className="text-xs text-gray-500 mb-3">
                    {template.fields?.length || template.form_fields?.length || template.fieldCount || 0} fields
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsEditing(true);
                        setActiveTab('builder');
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreview(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmTemplate(template.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          {!selectedTemplate ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
              <p className="text-gray-600 mb-4">Create a new template or select an existing one to start building.</p>
              <Button onClick={createNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Field Palette */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Field Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {FIELD_TYPES.map((fieldType) => (
                      <Button
                        key={fieldType.type}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => addField(fieldType.type)}
                      >
                        <fieldType.icon className="h-4 w-4 mr-2" />
                        {fieldType.label}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Form Builder */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Form Builder</CardTitle>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowPreview(true)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button size="sm" onClick={saveTemplate}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="form-fields">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                            {(selectedTemplate.fields || []).map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="border rounded-lg p-4 bg-white"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <div {...provided.dragHandleProps}>
                                          <GripVertical className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <Badge variant="secondary">{field.type}</Badge>
                                        {field.required && <Badge variant="destructive">Required</Badge>}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeField(field.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    <FieldEditor field={field} onUpdate={updateField} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {(selectedTemplate.fields || []).length === 0 && (
                              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500">Drag field types here to start building your form</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </CardContent>
                </Card>
              </div>

              {/* Template Settings */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Template Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="templateName">Template Name</Label>
                      <Input
                        id="templateName"
                        value={selectedTemplate.name}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          name: e.target.value
                        })}
                        placeholder="Enter template name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="templateDescription">Description</Label>
                      <Textarea
                        id="templateDescription"
                        value={selectedTemplate.description}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          description: e.target.value
                        })}
                        placeholder="Describe this template"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="activityType">Activity Type</Label>
                      <Select
                        value={selectedTemplate.activityType}
                        onValueChange={(value) => setSelectedTemplate({
                          ...selectedTemplate,
                          activityType: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="order">Order</Label>
                      <Input
                        id="order"
                        type="number"
                        min="1"
                        value={selectedTemplate.order || ''}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          order: parseInt(e.target.value) || 1
                        })}
                        placeholder="Template order (1, 2, 3...)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Order determines the sequence within the activity type
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Preview: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && <FormPreview template={selectedTemplate} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmTemplate !== null} onOpenChange={() => setDeleteConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? If applications have used this template, 
              it will be deactivated instead of deleted to preserve historical data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmTemplate && confirmDeleteTemplate(deleteConfirmTemplate)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Field Editor Component
function FieldEditor({ 
  field, 
  onUpdate 
}: { 
  field: FormField; 
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  const updateOptions = (options: string[]) => {
    onUpdate(field.id, { options });
  };

  const updateFileTypes = (fileTypes: string[]) => {
    onUpdate(field.id, { fileTypes });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${field.id}-label`}>Field Label</Label>
          <Input
            id={`${field.id}-label`}
            value={field.label}
            onChange={(e) => onUpdate(field.id, { label: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`${field.id}-placeholder`}>Placeholder</Label>
          <Input
            id={`${field.id}-placeholder`}
            value={field.placeholder || ''}
            onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`${field.id}-description`}>Description</Label>
        <Textarea
          id={`${field.id}-description`}
          value={field.description || ''}
          onChange={(e) => onUpdate(field.id, { description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
          />
          <span className="text-sm">Required</span>
        </label>
        
        {field.type === 'file' && (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={field.multiple}
              onChange={(e) => onUpdate(field.id, { multiple: e.target.checked })}
            />
            <span className="text-sm">Multiple files</span>
          </label>
        )}
      </div>

      {(field.type === 'select' || field.type === 'radio') && (
        <div>
          <Label>Options</Label>
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[index] = e.target.value;
                    updateOptions(newOptions);
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const newOptions = field.options?.filter((_, i) => i !== index) || [];
                    updateOptions(newOptions);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateOptions([...(field.options || []), 'New Option'])}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {field.type === 'file' && (
        <div>
          <Label>Accepted File Types</Label>
          <Input
            value={field.fileTypes?.join(', ') || ''}
            onChange={(e) => updateFileTypes(e.target.value.split(',').map(s => s.trim()))}
            placeholder=".pdf, .xlsx, .docx"
          />
        </div>
      )}

      {field.type === 'file_download' && (
        <div className="space-y-3">
          <div>
            <Label htmlFor={`${field.id}-filename`}>Display Name</Label>
            <Input
              id={`${field.id}-filename`}
              value={field.fileName || ''}
              onChange={(e) => onUpdate(field.id, { fileName: e.target.value })}
              placeholder="FRA Template"
            />
          </div>
          <div>
            <Label>Upload File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Choose file to upload
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('files', file);
                        formData.append('type', 'template');
                        
                        try {
                          const response = await fetch('/api/documents/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            console.log('Upload result:', result);
                            const uploadedFile = result[0]; // result is an array, not an object with files property
                            onUpdate(field.id, { 
                              downloadUrl: `/api/documents/${uploadedFile.id}/download`,
                              fileName: field.fileName || file.name
                            });
                          }
                        } catch (error) {
                          console.error('Upload failed:', error);
                        }
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, Excel, Word files supported
                </p>
              </div>
            </div>
            {field.downloadUrl && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✓ File uploaded successfully
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Form Preview Component
function FormPreview({ template }: { template: FormTemplate }) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold">{template.name}</h3>
        <p className="text-gray-600">{template.description}</p>
        <div className="flex space-x-2 mt-2">
          <Badge>{template.activityType}</Badge>
          <Badge variant="outline">Order: {template.order}</Badge>
        </div>
      </div>

      <div className="space-y-4">
        {template.fields.map((field) => (
          <div key={field.id}>
            <Label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            
            <div className="mt-2">
              {field.type === 'text' && (
                <Input placeholder={field.placeholder} />
              )}
              {field.type === 'textarea' && (
                <Textarea placeholder={field.placeholder} />
              )}
              {field.type === 'number' && (
                <Input type="number" placeholder={field.placeholder} />
              )}
              {field.type === 'date' && (
                <Input type="date" />
              )}
              {field.type === 'file' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {field.multiple ? 'Choose files' : 'Choose file'}
                  </p>
                  {field.fileTypes && (
                    <p className="text-xs text-gray-500">
                      Accepted: {field.fileTypes.join(', ')}
                    </p>
                  )}
                </div>
              )}
              {field.type === 'file_download' && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{field.fileName || 'Download File'}</p>
                      <p className="text-xs text-gray-500">{field.description}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
              {field.type === 'checkbox' && (
                <div className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-sm">{field.placeholder || 'Checkbox option'}</span>
                </div>
              )}
              {field.type === 'radio' && (
                <div className="space-y-2">
                  {field.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input type="radio" name={field.id} />
                      <span className="text-sm">{option}</span>
                    </div>
                  ))}
                </div>
              )}
              {field.type === 'select' && (
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option, index) => (
                      <SelectItem key={index} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}