import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Download, Upload, FileText, CheckCircle, Clock, ArrowLeft, Copy, Check, Users, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ContractorAssignmentDialog from "@/components/ContractorAssignmentDialog";
import { canCreateEdit } from "@/lib/permissions";


export default function ApplicationDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; docId: number | null; filename: string }>({ 
    open: false, 
    docId: null, 
    filename: '' 
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<{phase: string, formData: any, templateId?: number} | null>(null);
  const [phasesStarted, setPhasesStarted] = useState<{[key: string]: boolean}>({});
  const [copied, setCopied] = useState(false);
  const [showContractorAssignment, setShowContractorAssignment] = useState(false);

  // Query for assigned contractors
  const { data: assignedContractors = [] } = useQuery({
    queryKey: ["/api/applications", id, "assigned-contractors"],
    queryFn: async () => {
      const response = await apiRequest(`/api/applications/${id}/assigned-contractors`, "GET");
      return response.json();
    },
    enabled: !!id,
  });

  // Handle file deletion with confirmation
  const handleDeleteFile = async (docId: number) => {
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        await queryClient.refetchQueries({
          queryKey: ['/api/documents/application', parseInt(id as string)],
        });
        toast({
          title: "Success",
          description: "File deleted successfully"
        });
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
    setDeleteConfirm({ open: false, docId: null, filename: '' });
  };

  // Fetch application details
  const { data: application, isLoading } = useQuery({
    queryKey: ['/api/applications', id],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${id}`);
      if (!response.ok) throw new Error('Failed to fetch application');
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch form templates for this activity type using the new endpoint
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/activity-templates', application?.activityType, 'v2'], // Add version to force cache refresh
    queryFn: async () => {
      console.log('Fetching templates for activity type:', application?.activityType);
      const response = await fetch(`/api/activity-templates/${application?.activityType}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      console.log('Activity templates response:', data);
      return data;
    },
    enabled: !!application?.activityType,
  });

  // Debug logging
  console.log('Application data:', application);
  console.log('Activity type:', application?.activityType);
  console.log('Templates enabled:', !!application?.activityType);
  console.log('Templates data:', templates);

  // Fetch application submissions (pre/post activity)
  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/applications', id, 'submissions'],
    queryFn: async () => {
      console.log('Fetching submissions for application:', id);
      const response = await fetch(`/api/applications/${id}/submissions`);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      console.log('Submissions fetched:', data);
      return data;
    },
    enabled: !!id,
  });

  // Debug submissions
  console.log('Submissions data:', submissions);

  // Start phase mutation
  const startPhaseMutation = useMutation({
    mutationFn: async ({ applicationId, phase }: { applicationId: number, phase: string }) => {
      const response = await fetch(`/api/applications/${applicationId}/start-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phase }),
      });
      if (!response.ok) throw new Error('Failed to start phase');
      return response.json();
    },
    onSuccess: () => {
      // Only invalidate specific application data, not the entire applications list
      queryClient.invalidateQueries({ queryKey: ['/api/applications', id] });
    },
  });



  // Save template as draft (for both contractors and company members)
  const saveTemplateMutation = useMutation({
    mutationFn: async ({ templateId, formData }: { templateId: number, formData: any }) => {
      console.log('Saving template draft with form data:', formData);
      const response = await fetch(`/api/activity-template-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: parseInt(id!),
          activityTemplateId: templateId,
          formData: formData,
          submissionData: JSON.stringify(formData),
          templateSnapshot: '{}',
          submittedBy: user?.id,
          status: 'draft'
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save template');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', id, 'submissions'] });
      
      // Send notification to company admins if contractor saved progress
      if (user?.role?.startsWith('contractor_')) {
        // Get the current template name for the notification using the templateId from the save operation
        const currentTemplate = templates?.find((t: any) => t.id === variables.templateId);
        const templateName = currentTemplate?.name || 'an activity';
        
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: parseInt(id!),
            templateName: templateName,
            notificationType: 'contractor_work_completed'
          }),
        }).then(response => {
          if (response.ok) {
            toast({ 
              title: "Progress Saved", 
              description: "Your work has been saved and the company has been notified it's ready for review." 
            });
          } else {
            toast({ 
              title: "Progress Saved", 
              description: "Your work has been saved successfully." 
            });
          }
        }).catch(() => {
          toast({ 
            title: "Progress Saved", 
            description: "Your work has been saved successfully." 
          });
        });
      } else {
        toast({ title: "Success", description: "Progress saved successfully" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save progress", variant: "destructive" });
    },
  });

  // Handle save operation for templates
  const handleSave = (formData: any, templateId: number) => {
    saveTemplateMutation.mutate({ templateId, formData });
  };

  // Submit template (only for company admins/managers, not contractors)
  const submitTemplateMutation = useMutation({
    mutationFn: async ({ templateId, formData }: { templateId: number, formData: any }) => {
      // Prevent contractors from submitting
      if (user?.role?.startsWith('contractor_')) {
        throw new Error('Contractors cannot submit activities. Only company admins and managers can submit.');
      }
      
      // Get the template to check for required file uploads
      const template = templates?.find((t: any) => t.id === templateId);
      if (template && template.fields) {
        const requiredFileFields = template.fields.filter((field: any) => 
          field.type === 'file' && field.required
        );
        
        if (requiredFileFields.length > 0) {
          // Check if files have been uploaded for this application
          const documentsResponse = await fetch(`/api/documents/application/${parseInt(id!)}`, {
            credentials: 'include'
          });
          
          if (documentsResponse.ok) {
            const documents = await documentsResponse.json();
            console.log('[VALIDATION] Checking required file uploads. Documents found:', documents.length);
            
            if (documents.length === 0) {
              throw new Error('Please upload the required files before submitting this activity.');
            }
          } else {
            console.warn('[VALIDATION] Could not verify file uploads, proceeding with submission');
          }
        }
      }
      
      console.log('Submitting template with form data:', formData);
      const response = await fetch(`/api/activity-template-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: parseInt(id!),
          activityTemplateId: templateId,
          formData: formData,
          submissionData: JSON.stringify(formData),
          templateSnapshot: '{}',
          submittedBy: user?.id,
          status: 'submitted'
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit template');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to update the rejection status
      queryClient.invalidateQueries({ queryKey: ['/api/applications', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', id, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] }); // Also refresh main applications list
      toast({ title: "Success", description: "Activity submitted successfully" });
      setShowConfirmDialog(false);
      setPendingSubmission(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit activity", 
        variant: "destructive" 
      });
    },
  });

  // File upload for documents
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ files, documentType }: { files: FileList, documentType: string }) => {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('files', file));
      formData.append('applicationId', id!);
      formData.append('documentType', documentType);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/application', id] });
      toast({ title: "Success", description: "Documents uploaded successfully" });
      setUploadingFiles({});
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload documents", variant: "destructive" });
      setUploadingFiles({});
    },
  });

  const handleFileUpload = (files: FileList, documentType: string) => {
    if (files.length === 0) return;
    
    setUploadingFiles(prev => ({ ...prev, [documentType]: true }));
    uploadDocumentMutation.mutate({ files, documentType });
  };

  const getApplicationProgress = () => {
    if (!templates || templates.length === 0) {
      return 33; // Application started but no templates available
    }
    
    // Calculate progress based on completed templates for this application only
    const applicationSubmissions = submissions.filter((s: any) => (s as any).applicationId === application.id);
    const completedTemplates = templates.filter((template: any) => {
      return applicationSubmissions.some((s: any) => 
        (s as any).formTemplateId === template.id && (s as any).status === 'submitted'
      );
    });
    
    const progressPerTemplate = 70 / templates.length; // 70% of progress is for template completion
    const baseProgress = 30; // 30% for application creation
    
    return Math.round(baseProgress + (completedTemplates.length * progressPerTemplate));
  };

  const getPhaseStatus = (phase: 'pre_activity' | 'post_activity') => {
    const submission = submissions.find((s: any) => s.phase === phase);
    if (!submission) return 'not_started';
    return submission.status;
  };

  // Enhanced permission checking for contractors
  const canEditApplication = canCreateEdit(user);
  
  // Company admins, system admins, and contractors can submit applications
  // Team members need editor permission or higher
  const canSubmitApplication = (
    user?.role === 'company_admin' || 
    user?.role === 'system_admin' || 
    user?.role?.startsWith('contractor_') ||
    canEditApplication
  );

  // Template-driven status logic
  const getDetailedStatusLabel = () => {
    // Check for completion status
    if (application?.status === 'approved' || application?.status === 'completed') {
      return 'All Activities Approved';
    }
    
    // Use backend-calculated detailed status when available
    if (application && (application as any).detailedStatus) {
      return (application as any).detailedStatus;
    }
    
    // Fallback: Use backend-calculated status label if available
    if (application && (application as any).detailedStatusLabel) {
      return (application as any).detailedStatusLabel;
    }
    
    // Check if we can calculate from submissions
    if (templates && templates.length > 0 && submissions) {
      const applicationSubmissions = submissions.filter((s: any) => s.applicationId === application.id);
      const approvedActivities = applicationSubmissions.filter((s: any) => 
        s.status === 'submitted' && s.approvalStatus === 'approved'
      );
      
      if (approvedActivities.length === templates.length) {
        return 'All Activities Approved';
      } else if (approvedActivities.length > 0) {
        return `${approvedActivities.length}/${templates.length} Activities Approved`;
      }
      
      const submittedActivities = applicationSubmissions.filter((s: any) => s.status === 'submitted');
      if (submittedActivities.length > 0) {
        return `${submittedActivities.length} Activities Under Review`;
      }
    }
    
    // Final fallback to basic status
    return application?.status === 'draft' ? 'Draft' : 'In Progress';
  };

  // Copy application ID to clipboard
  const copyApplicationId = async () => {
    try {
      await navigator.clipboard.writeText(application.applicationId);
      setCopied(true);
      toast({ title: "Copied", description: "Application ID copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Error", description: "Failed to copy application ID", variant: "destructive" });
    }
  };

  // Handle tab changes and automatically mark phases as started
  // Helper function to check if a template can be accessed
  const canAccessTemplate = (template: any, templateIndex: number) => {
    // System admins can access all tabs for oversight
    if (user?.role === 'system_admin') {
      return true;
    }
    
    if (templateIndex === 0) return true; // First template is always accessible
    
    // Progressive unlocking: Check if previous template is completed AND approved
    // This applies to both regular users AND contractors
    const sortedTemplates = templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    const previousTemplate = sortedTemplates?.[templateIndex - 1];
    if (!previousTemplate) return true;
    
    // Check if the previous template has been submitted AND approved for this specific application
    return submissions.some((s: any) => 
      s.formTemplateId === previousTemplate.id && 
      s.applicationId === application.id && 
      s.status === 'submitted' &&
      s.approvalStatus === 'approved'
    );
  };

  const handleTabChange = async (newTab: string) => {
    setActiveTab(newTab);
    
    // If switching to a template tab, check access and mark as started
    if (newTab.startsWith('template_')) {
      const templateId = parseInt(newTab.replace('template_', ''));
      const template = templates?.find((t: any) => t.id === templateId);
      
      if (template) {
        const sortedTemplates = templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        const templateIndex = sortedTemplates?.findIndex((t: any) => t.id === templateId) || 0;
        
        // Check if user can access this template
        if (!canAccessTemplate(template, templateIndex)) {
          const sortedTemplates = templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          const previousTemplate = sortedTemplates?.[templateIndex - 1];
          const previousSubmission = submissions.find((s: any) => 
            s.formTemplateId === previousTemplate?.id && 
            s.applicationId === application.id
          );
          
          let message = "Please complete the previous activity first.";
          if (previousSubmission?.status === 'submitted' && previousSubmission?.approvalStatus === 'pending') {
            message = `Please wait for "${previousTemplate?.name}" to be approved before accessing this activity.`;
          } else if (previousSubmission?.status === 'submitted' && previousSubmission?.approvalStatus === 'rejected') {
            message = `The previous activity "${previousTemplate?.name}" was rejected. Please address the feedback and resubmit before proceeding.`;
          } else if (!previousSubmission || previousSubmission?.status !== 'submitted') {
            message = `Please complete and submit "${previousTemplate?.name}" before accessing this activity.`;
          }
          
          toast({
            title: "Activity Locked",
            description: message,
            variant: "destructive"
          });
          setActiveTab('overview');
          return;
        }
        
        // Mark template as started if not already submitted
        const existingSubmission = submissions.find(s => 
          s.formTemplateId === templateId && s.applicationId === application.id
        );
        
        if (!existingSubmission || existingSubmission.status !== 'submitted') {
          try {
            await apiRequest(`/api/activity-templates/${templateId}/start`, 'POST', { applicationId: application.id });
            
            // Only invalidate submissions to prevent status recalculation interference
            queryClient.invalidateQueries({ queryKey: ['/api/applications', id, 'submissions'] });
          } catch (error) {
            console.error('Failed to mark template as started:', error);
          }
        }
      }
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading application...</div>;
  }

  if (!application) {
    return <div className="p-6">Application not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        {/* Rejection Message */}
        {(application.status === 'revision_required' || application.status === 'rejected') && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-red-900">Application Rejected</h3>
                  {/* Show rejection notes from latest rejected submission with activity name */}
                  {submissions
                    .filter((s: any) => s.approvalStatus === 'rejected')
                    .sort((a: any, b: any) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())
                    .slice(0, 1)
                    .map((rejection: any) => {
                      const rejectedTemplate = templates?.find((t: any) => t.id === rejection.formTemplateId);
                      return (
                        <div key={rejection.id}>
                          <p className="text-red-800">
                            Your "{rejectedTemplate?.name || 'activity'}" activity has been rejected and requires revision. 
                            Please review the feedback below, make necessary changes, and resubmit.
                          </p>
                          <div className="mt-3 p-3 bg-white border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-gray-900">Review Comments:</p>
                            <p className="text-sm text-gray-700 mt-1">
                              {rejection.reviewNotes || 'No specific comments provided.'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Reviewed on {new Date(rejection.reviewedAt).toLocaleDateString()} by {rejection.reviewedBy || 'Admin'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="space-y-6">
          {/* Facility Name - Primary Header */}
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{application.facility?.name}</h1>
            <h2 className="text-2xl font-bold text-gray-800">{application.description}</h2>
          </div>
          
          {/* Application Details Row */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left side - Application Type and ID */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Application Type - Boxed */}
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                <span className="text-sm font-medium text-blue-800">{application.activityType} Application</span>
              </div>
              
              {/* Application ID with Copy Button */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                <span className="text-sm font-mono font-medium text-gray-800">{application.applicationId}</span>
                <button
                  onClick={copyApplicationId}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy Application ID"
                >
                  {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-500" />}
                </button>
              </div>

              {/* Status Badge */}
              <Badge 
                variant={getDetailedStatusLabel() === 'Draft' ? 'secondary' : 'default'}
                className="text-sm"
              >
                {getDetailedStatusLabel()}
              </Badge>
            </div>
            
            {/* Right side - Contractor Assignment */}
            <div className="flex items-center gap-4">
              {/* Assigned Contractors Display */}
              {assignedContractors.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Assigned Contractors:</span>
                  <div className="flex flex-wrap gap-1">
                    {assignedContractors.map((assignment: any) => (
                      <Badge key={assignment.id} variant="outline" className="text-xs">
                        {assignment.contractorCompany?.name || 'Unknown Contractor'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Assign Contractor Button - Only show for company admins/team members */}
              {['company_admin', 'team_member'].includes(user?.role || '') && (
                <Button
                  onClick={() => setShowContractorAssignment(true)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {assignedContractors.length > 0 ? 'Manage Contractors' : 'Assign Contractor'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Approved Message */}
        {(() => {
          const approvedSubmissions = submissions.filter((s: any) => 
            s.status === 'submitted' && s.approvalStatus === 'approved'
          );
          const latestApproved = approvedSubmissions
            .sort((a: any, b: any) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())[0];
          
          if (latestApproved) {
            const approvedTemplate = templates?.find((t: any) => t.id === latestApproved.formTemplateId);
            const allTemplatesApproved = templates?.every((template: any) => 
              submissions.some((s: any) => 
                s.formTemplateId === template.id && 
                s.status === 'submitted' && 
                s.approvalStatus === 'approved'
              )
            );
            
            // Check if next activity has been started (has any submission data)
            if (!allTemplatesApproved) {
              const sortedTemplates = templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              const approvedTemplateIndex = sortedTemplates?.findIndex((t: any) => t.id === latestApproved.formTemplateId);
              const nextTemplate = sortedTemplates?.[approvedTemplateIndex + 1];
              
              if (nextTemplate) {
                const nextActivityStarted = submissions.some((s: any) => 
                  s.formTemplateId === nextTemplate.id && s.applicationId === application.id
                );
                
                // Hide the approved message if the next activity has been started
                if (nextActivityStarted) {
                  return null;
                }
              }
            }
            
            return (
              <Card className="mb-6 mt-8 border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="space-y-2">
                      {allTemplatesApproved ? (
                        <div>
                          <h3 className="font-semibold text-green-900">All Activities Approved!</h3>
                          <p className="text-green-800">
                            <strong>Congratulations!</strong> You have completed all required activities for this application.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-semibold text-green-900">Activity Approved!</h3>
                          <p className="text-green-800">
                            Your "{approvedTemplate?.name}" activity has been approved by the system administrator.
                          </p>
                          {latestApproved.reviewedAt && (
                            <p className="text-xs text-green-600 mt-2">
                              Approved on {new Date(latestApproved.reviewedAt).toLocaleDateString()} by {latestApproved.reviewedBy || 'System Admin'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {/* Progress Bar */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Application Progress</h3>
                <span className="text-sm text-gray-500">{getApplicationProgress()}% Complete</span>
              </div>
              <Progress value={getApplicationProgress()} className="w-full" />
              
              <div className="flex justify-between items-center">
                {/* Started Step */}
                <div className="flex flex-col items-center space-y-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    getApplicationProgress() >= 30 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {getApplicationProgress() >= 30 ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div className="text-xs text-center">
                    <div className="font-medium">Started</div>
                    <div className="text-gray-500">Application created</div>
                  </div>
                </div>

                {/* Template Steps */}
                {templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((template: any, index: number) => {
                  const applicationSubmissions = submissions.filter((s: any) => (s as any).applicationId === application.id);
                  const submission = applicationSubmissions.find((s: any) => 
                    (s as any).formTemplateId === template.id
                  );
                  
                  const isSubmitted = submission && submission.status === 'submitted';
                  const isApproved = isSubmitted && submission.approvalStatus === 'approved';
                  const isRejected = isSubmitted && submission.approvalStatus === 'rejected';
                  const isPending = isSubmitted && submission.approvalStatus === 'pending';
                  const isAccessible = canAccessTemplate(template, index);
                  
                  let bgColor, textColor, icon, statusText;
                  
                  if (isApproved) {
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-600';
                    icon = <CheckCircle className="h-4 w-4" />;
                    statusText = 'Approved';
                  } else if (isRejected) {
                    bgColor = 'bg-red-100';
                    textColor = 'text-red-600';
                    icon = <AlertCircle className="h-4 w-4" />;
                    statusText = 'Rejected';
                  } else if (isPending) {
                    bgColor = 'bg-yellow-100';
                    textColor = 'text-yellow-600';
                    icon = <Clock className="h-4 w-4" />;
                    statusText = 'Under Review';
                  } else if (isSubmitted) {
                    bgColor = 'bg-blue-100';
                    textColor = 'text-blue-600';
                    icon = <CheckCircle className="h-4 w-4" />;
                    statusText = 'Submitted';
                  } else if (isAccessible) {
                    bgColor = 'bg-gray-100';
                    textColor = 'text-gray-400';
                    icon = <Clock className="h-4 w-4" />;
                    statusText = 'Available';
                  } else {
                    bgColor = 'bg-gray-50';
                    textColor = 'text-gray-300';
                    icon = <Clock className="h-4 w-4" />;
                    statusText = 'Locked';
                  }
                  
                  return (
                    <div key={template.id} className="flex flex-col items-center space-y-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor} ${textColor} ${!isAccessible ? 'opacity-50' : ''}`}>
                        {icon}
                      </div>
                      <div className="text-xs text-center">
                        <div className={`font-medium ${!isAccessible ? 'text-gray-300' : ''}`}>{template.name}</div>
                        <div className={`${!isAccessible ? 'text-gray-300' : 'text-gray-500'}`}>{statusText}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min((templates?.length || 0) + 2, 6)}, 1fr)` }}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((template: any, index: number) => {
            const submission = submissions.find((s: any) => s.formTemplateId === template.id);
            const isAccessible = canAccessTemplate(template, index);
            const isStarted = submission && submission.status === 'in_progress';
            const isCompleted = submission && submission.status === 'submitted';
            
            let statusText = '';
            if (isCompleted) statusText = ' ✓';
            else if (isStarted) statusText = ' •';
            
            return (
              <TabsTrigger 
                key={template.id} 
                value={`template_${template.id}`}
                disabled={!isAccessible}
                className={`${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''} ${isCompleted ? 'text-green-600' : isStarted ? 'text-blue-600' : ''}`}
              >
                {template.name}{statusText}
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Activity Type</label>
                  <p className="text-sm text-gray-900">{application.activityType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getDetailedStatusLabel() === 'Draft' ? 'secondary' : 'default'}
                      className="text-sm"
                    >
                      {getDetailedStatusLabel()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Facility Name</label>
                  <p className="text-sm text-gray-900">{application.facility?.name || 'Not available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created Date</label>
                  <p className="text-sm text-gray-900">
                    {application.createdAt ? new Date(application.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'Not available'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Modified</label>
                  <p className="text-sm text-gray-900">
                    {application.updatedAt ? new Date(application.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'Not available'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created By</label>
                  <p className="text-sm text-gray-900">
                    {application.createdByUser 
                      ? `${application.createdByUser.firstName} ${application.createdByUser.lastName}` 
                      : 'Not available'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Application ID</label>
                  <p className="text-sm text-gray-900 font-mono">{application.applicationId}</p>
                </div>
              </div>

              {user?.role?.startsWith('contractor_') && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Contractor Access</p>
                      <p className="text-sm text-blue-700">
                        You can view and edit application details and save your progress. 
                        The company admin will handle final submissions.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((template: any, index: number) => {
          const submission = submissions.find((s: any) => s.formTemplateId === template.id);
          const isApproved = submission?.status === 'submitted' && submission?.approvalStatus === 'approved';
          const isPending = submission?.status === 'submitted' && submission?.approvalStatus === 'pending';
          const isRejected = submission?.status === 'submitted' && submission?.approvalStatus === 'rejected';
          const sortedTemplates = templates?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          const isLastTemplate = index === sortedTemplates.length - 1;
          const nextTemplate = sortedTemplates[index + 1];
          
          return (
            <TabsContent key={template.id} value={`template_${template.id}`} className="space-y-6">

              <TemplateSection 
                template={template}
                application={application}
                submissions={submissions}
                onFileUpload={(files: FileList) => handleFileUpload(files, `template_${template.id}`)}
                onSubmit={(formData: any) => {
                  setPendingSubmission({ phase: `template_${template.id}`, formData, templateId: template.id });
                  setShowConfirmDialog(true);
                }}
                onSave={(formData: any, templateId: number) => {
                  saveTemplateMutation.mutate({
                    templateId: templateId,
                    formData: formData
                  });
                }}
                canSubmit={canSubmitApplication}
                uploading={uploadingFiles[`template_${template.id}`]}
                user={user}
              />
            </TabsContent>
          );
        })}

        <TabsContent value="documents" className="space-y-6">
          <DocumentsSection 
            applicationId={id!} 
            onDeleteFile={(docId: number, filename: string) => {
              setDeleteConfirm({ open: true, docId, filename });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this activity? Once submitted, it cannot be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
              setPendingSubmission(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingSubmission && pendingSubmission.templateId) {
                submitTemplateMutation.mutate({
                  templateId: pendingSubmission.templateId,
                  formData: pendingSubmission.formData
                });
              }
            }}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, docId: null, filename: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm.docId) {
                  handleDeleteFile(deleteConfirm.docId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contractor Assignment Dialog */}
      <ContractorAssignmentDialog
        open={showContractorAssignment}
        onOpenChange={setShowContractorAssignment}
        applicationId={parseInt(id as string)}
        activityType={application?.activityType || ''}
        applicationTitle={application?.title || ''}
      />
    </div>
  );
}

// Template-based section component
function TemplateSection({ 
  template, 
  application, 
  submissions, 
  onFileUpload, 
  onSubmit, 
  onSave,
  canSubmit, 
  uploading, 
  user 
}: {
  template: any;
  application: any;
  submissions: any[];
  onFileUpload: (files: FileList) => void;
  onSubmit: (formData: any) => void;
  onSave: (formData: any, templateId: number) => void;
  canSubmit: boolean;
  uploading: boolean;
  user: any;
}) {
  // Check if this template has been submitted for this specific application
  // Prioritize submitted submissions over draft ones, but for contractors use the most recent draft
  const templateSubmissions = submissions.filter((s: any) => s.formTemplateId === template.id && s.applicationId === application.id);
  const submittedSubmission = templateSubmissions.find((s: any) => s.status === 'submitted');
  
  // For contractors, prioritize the most recent draft to allow progress saving
  let submission;
  if (user?.role?.startsWith('contractor_') && !submittedSubmission) {
    // Get the most recent draft submission for contractors
    const draftSubmissions = templateSubmissions.filter((s: any) => s.status === 'draft');
    submission = draftSubmissions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  } else {
    // For company users, prefer submitted over draft
    submission = submittedSubmission || templateSubmissions[0];
  }
  const isSubmitted = submission && submission.status === 'submitted';

  // Initialize form data with previously submitted values if available
  const [formData, setFormData] = useState<any>(() => {
    // For company admins, always show the most recent contractor data first
    if (user?.role === 'company_admin') {
      // Get all submissions for this template sorted by creation date
      const allTemplateSubmissions = templateSubmissions.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Check for contractor submissions first
      const contractorSubmission = allTemplateSubmissions.find((s: any) => {
        const submittedBy = s.submittedBy;
        // Check if submittedBy is a contractor (we'll need to verify this via user data)
        return s.status === 'draft'; // Contractor submissions are saved as drafts
      });
      
      if (contractorSubmission) {
        console.log('Company admin viewing contractor submission:', contractorSubmission);
        try {
          if (contractorSubmission.data && Object.keys(contractorSubmission.data).length > 0) {
            console.log('Loading contractor data for company admin:', contractorSubmission.data);
            return contractorSubmission.data;
          }
        } catch (error) {
          console.error('Error loading contractor data:', error);
        }
      }
    }
    
    if (submission) {
      console.log('Found submission for template', template.id, ':', submission);
      try {
        // PRIORITY 1: Check data field (current system)
        if (submission.data && Object.keys(submission.data).length > 0) {
          console.log('Using submission.data:', submission.data);
          return submission.data;
        }
        
        // PRIORITY 2: Check reviewNotes field (legacy fallback)
        if (submission.reviewNotes) {
          console.log('Using reviewNotes:', submission.reviewNotes);
          const parsedData = typeof submission.reviewNotes === 'string' 
            ? JSON.parse(submission.reviewNotes) 
            : submission.reviewNotes;
          console.log('Parsed reviewNotes:', parsedData);
          return parsedData || {};
        }
        
        console.log('No form data found in submission');
      } catch (error) {
        console.error('Error parsing submission data:', error);
        return {};
      }
    } else {
      console.log('No submission found for template', template.id);
    }
    return {};
  });

  // Update form data when submission changes (for real-time updates)
  useEffect(() => {
    if (submission) {
      try {
        if (submission.data && Object.keys(submission.data).length > 0) {
          setFormData(submission.data);
        } else if (submission.reviewNotes) {
          const parsedData = typeof submission.reviewNotes === 'string' 
            ? JSON.parse(submission.reviewNotes) 
            : submission.reviewNotes;
          setFormData(parsedData || {});
        }
      } catch (error) {
        console.error('Error updating form data:', error);
      }
    }
  }, [submission]);

  // Parse form fields from template
  const formFields = template.fields || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitted) {
      onSubmit(formData);
    }
  };

  // Company admins, system admins, and contractors should never be treated as viewers regardless of permission level
  const isViewer = !['company_admin', 'system_admin'].includes(user?.role || '') && 
                   !user?.role?.startsWith('contractor_') && 
                   (user?.permissionLevel ?? 'viewer') === 'viewer';
  const renderField = (field: any) => {
    // Disable all fields for viewers, or if submitted
    const isDisabled = isViewer || isSubmitted;
    const fieldClassName = `w-full p-2 border border-gray-300 rounded-md ${
      isDisabled ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
    }`;

    switch (field.type) {
      case 'text':
        return (
          <input
            key={field.id}
            type="text"
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, [field.id]: e.target.value }))}
            className={fieldClassName}
            required={field.required}
            disabled={isDisabled}
          />
        );
      case 'textarea':
        return (
          <textarea
            key={field.id}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, [field.id]: e.target.value }))}
            className={fieldClassName}
            rows={4}
            required={field.required}
            disabled={isDisabled}
          />
        );
      case 'number':
        return (
          <input
            key={field.id}
            type="number"
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, [field.id]: e.target.value }))}
            className={fieldClassName}
            required={field.required}
            disabled={isDisabled}
          />
        );
      case 'select':
        return (
          <select
            key={field.id}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, [field.id]: e.target.value }))}
            className={fieldClassName}
            required={field.required}
            disabled={isDisabled}
          >
            <option value="">Select an option</option>
            {field.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'file_download':
        // Download buttons should always be enabled
        return (
          <div key={field.id} className="space-y-2">
            {field.downloadUrl ? (
              <div className="flex items-center gap-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">{field.fileName || 'Download File'}</p>
                  <p className="text-xs text-blue-600">Template file available for download</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(field.downloadUrl, '_blank')}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            ) : (
              <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-600">
                No file available for download
              </div>
            )}
          </div>
        );
      case 'file':
        return (
          <div key={field.id}>
            {isSubmitted ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Uploaded Files</span>
                </div>
                <UploadedFilesDisplay 
                  applicationId={application.id} 
                  documentType={template.name.toLowerCase() === 'preactivity' ? 'pre_activity' : template.name.toLowerCase() === 'post' ? 'post_activity' : 'other'} 
                />
              </div>
            ) : (
              <SimpleFileUpload 
                applicationId={application.id} 
                canUpload={canSubmit || user?.role?.startsWith('contractor_')} 
                documentType={template.name.toLowerCase() === 'preactivity' ? 'pre_activity' : template.name.toLowerCase() === 'post' ? 'post_activity' : 'other'}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{template.name}</span>
          {isSubmitted && (
            <Badge variant="default" className="bg-green-600">
              Submitted
            </Badge>
          )}
        </CardTitle>
        {template.description && template.description.trim() && (
          <p className="text-sm text-gray-600">{template.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {isSubmitted && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg mb-4">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Template submitted successfully</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={`space-y-4 ${isSubmitted ? 'opacity-75' : ''}`}>
          {formFields.map((field: any) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {field.description && (
                <p className="text-xs text-gray-500 mt-1">{field.description}</p>
              )}
            </div>
          ))}

          {(!isSubmitted && !isViewer) &&(
            <div className="flex justify-end gap-3 pt-4">
              {/* Save Progress Button - Available for contractors and company members */}
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  onSave(formData, template.id);
                }}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Save Progress'}
              </Button>
              
              {/* Submit Button - Available for all authorized users including contractors */}
              {['company_admin', 'team_member', 'system_admin', 'contractor_account_owner', 'contractor_manager', 'contractor_team_member'].includes(user?.role || '') && canSubmit && (
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </div>
          )}
          
          {/* View-only mode for contractors when application is submitted */}
          {isSubmitted && user?.role?.startsWith('contractor_') && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700">
                  This template has been submitted and is in view-only mode.
                </p>
              </div>
            </div>
          )}
          
          {/* Already submitted message for company members */}
          {isSubmitted && !user?.role?.startsWith('contractor_') && (
            <div className="flex justify-end pt-4">
              <Button type="button" disabled variant="outline">
                Already Submitted
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// Simple inline file upload component for forms
function SimpleFileUpload({ applicationId, canUpload, documentType = 'other', onDeleteFile }: { 
  applicationId: number, 
  canUpload: boolean, 
  documentType?: string,
  onDeleteFile?: (docId: number, filename: string) => void 
}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // Query to get uploaded documents for this application
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents/application', applicationId],
    queryFn: () => fetch(`/api/documents/application/${applicationId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!applicationId,
  });

  // Debug log to see what documents we're getting
  console.log('Documents for application', applicationId, ':', documents);

  const handleFileUpload = async (files: FileList) => {
    console.log('[FILE UPLOAD] Starting upload with files:', Array.from(files).map(f => f.name));
    
    if (!canUpload || files.length === 0) {
      console.log('[FILE UPLOAD] Upload blocked - canUpload:', canUpload, 'files.length:', files.length);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('applicationId', applicationId.toString());
    formData.append('documentType', documentType);

    console.log('[FILE UPLOAD] FormData prepared for application:', applicationId, 'documentType:', documentType);

    try {
      console.log('[FILE UPLOAD] Making fetch request to /api/documents/upload');
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('[FILE UPLOAD] Response status:', response.status, 'ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FILE UPLOAD] Upload failed with response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('[FILE UPLOAD] Success response:', responseData);

      console.log('[FILE UPLOAD] Invalidating queries...');
      // Refresh documents after upload
      await queryClient.invalidateQueries({
        queryKey: ['/api/documents/application', applicationId],
      });
      
      console.log('[FILE UPLOAD] Refetching queries...');
      // Also refetch immediately to ensure UI updates
      await queryClient.refetchQueries({
        queryKey: ['/api/documents/application', applicationId],
      });
      
      console.log('[FILE UPLOAD] Showing success toast');
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    } catch (error) {
      console.error('[FILE UPLOAD] Error occurred:', error);
      toast({
        title: "Error", 
        description: `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      console.log('[FILE UPLOAD] Upload process complete');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
        <div className="space-y-2">
          <label className="cursor-pointer">
            <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
              {isUploading ? 'Uploading...' : 'Choose files to upload'}
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
              disabled={!canUpload || isUploading}
            />
          </label>
          <p className="text-xs text-gray-500">
            PDF, Excel, Word files supported
          </p>
        </div>
      </div>
      
      {/* Show uploaded files */}
      {documentsLoading ? (
        <div className="text-sm text-gray-500">Loading files...</div>
      ) : (
        Array.isArray(documents) && documents.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Uploaded Files ({documents.length}):</p>
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 border rounded">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-700">{doc.originalName || doc.filename}</span>
                    <p className="text-xs text-gray-500">{Math.round(doc.size / 1024)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(`/api/documents/${doc.id}/download`, '_blank');
                    }}
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  {canUpload && onDeleteFile && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteFile(doc.id, doc.originalName || doc.filename);
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No files uploaded yet</div>
        )
      )}
    </div>
  );
}

// Component to display uploaded files for submitted forms
function UploadedFilesDisplay({ applicationId, documentType, onDeleteFile }: { applicationId: number, documentType?: string, onDeleteFile?: (docId: number, filename: string) => void }) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents/application', applicationId],
    queryFn: () => fetch(`/api/documents/application/${applicationId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!applicationId,
  });

  console.log('UploadedFilesDisplay - applicationId:', applicationId, 'documents:', documents);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading files...</p>;
  }

  // Filter documents by type if specified
  const filteredDocuments = documentType 
    ? documents?.filter((doc: any) => doc.documentType === documentType) || []
    : documents || [];

  if (!filteredDocuments || !Array.isArray(filteredDocuments) || filteredDocuments.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No files uploaded</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
      {filteredDocuments.map((doc: any) => (
        <div key={doc.id} className="flex items-center justify-between p-2 bg-white border rounded">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <div>
              <span className="text-sm text-gray-700">{doc.originalName || doc.filename}</span>
              <p className="text-xs text-gray-500">{Math.round(doc.size / 1024)} KB</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`/api/documents/${doc.id}/download`, '_blank');
            }}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}

// Dynamic Form Component
function DynamicForm({ fields, onSubmit, canSubmit, submitLabel, submitButtonClass, isSubmitted, userRole, submittedData, applicationId, phase }: any) {
  const [formData, setFormData] = useState<Record<string, any>>(submittedData || {});

  const handleFieldChange = (fieldId: string, value: any) => {
    if (isSubmitted) return; // Don't allow changes if already submitted
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted) return;
    
    // Filter out file fields from form data since files are uploaded separately
    const filteredFormData = Object.entries(formData).reduce((acc, [key, value]) => {
      const field = fields.find((f: any) => f.id === key);
      if (field?.type !== 'file') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    onSubmit(filteredFormData);
  };

  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No form fields configured</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field: any) => (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'text' && (
            <input
              type="text"
              placeholder={field.placeholder}
              required={field.required}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              disabled={isSubmitted}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSubmitted ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
              }`}
            />
          )}
          
          {field.type === 'textarea' && (
            <textarea
              placeholder={field.placeholder}
              required={field.required}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              rows={4}
              disabled={isSubmitted}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSubmitted ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
              }`}
            />
          )}
          
          {field.type === 'number' && (
            <input
              type="number"
              placeholder={field.placeholder}
              required={field.required}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              disabled={isSubmitted}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSubmitted ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
              }`}
            />
          )}
          
          {field.type === 'select' && (
            <select
              required={field.required}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              disabled={isSubmitted}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSubmitted ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select an option</option>
              {field.options?.map((option: string, index: number) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {field.type === 'file' && (
            <div>
              {isSubmitted ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Uploaded Files</span>
                  </div>
                  <UploadedFilesDisplay 
                    applicationId={applicationId} 
                    documentType={phase} 
                  />
                </div>
              ) : (
                <SimpleFileUpload 
                  applicationId={applicationId} 
                  canUpload={canSubmit || userRole === 'contractor'} 
                  documentType={phase}
                />
              )}
            </div>
          )}
          
          {field.type === 'radio' && (
            <div className="space-y-2">
              {field.options?.map((option: string, index: number) => (
                <label key={index} className={`flex items-center ${isSubmitted ? 'text-gray-600' : ''}`}>
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={formData[field.id] === option}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    disabled={isSubmitted}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}

          {field.type === 'file_download' && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">{field.fileName || field.label}</p>
                  <p className="text-xs text-gray-500">{field.description}</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  field.downloadUrl && window.open(field.downloadUrl, '_blank');
                }}
                disabled={!field.downloadUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
          
          {field.description && field.type !== 'file_download' && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      ))}
      
      <div className="flex justify-end space-x-4 pt-4">
        {canSubmit && (
          <Button
            type="submit"
            className={submitButtonClass}
          >
            {submitLabel}
          </Button>
        )}
        
        {!canSubmit && (
          <div className="text-sm text-gray-600">
            {isSubmitted 
              ? "This activity has already been submitted and cannot be modified"
              : (userRole === 'contractor' 
                ? "Only company members can submit activities"
                : "You do not have permission to submit activities"
              )
            }
          </div>
        )}
      </div>
    </form>
  );
}

// Pre-Activity Section Component
function PreActivitySection({ 
  application, 
  templates, 
  submissions, 
  onFileUpload, 
  onSubmit, 
  canSubmit, 
  uploading,
  user
}: any) {
  const preSubmission = submissions.find((s: any) => s.phase === 'pre_activity');
  const status = preSubmission?.status || 'not_started';
  const preTemplates = templates.filter((t: any) => t.phase === 'pre_activity');
  
  // Get submitted form data from the submission's reviewNotes field
  const getSubmittedData = (templateId: number) => {
    if (!preSubmission || !preSubmission.reviewNotes) return {};
    try {
      return JSON.parse(preSubmission.reviewNotes);
    } catch {
      return {};
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pre-Activity Submission</span>
          <Badge variant={status === 'submitted' ? 'default' : 'secondary'}>
            {status.replace('_', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === 'submitted' && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Pre-activity submission completed</span>
          </div>
        )}

        {preTemplates.map((template: any) => (
          <div key={template.id} className="space-y-4">
            <div>
              <h4 className="font-medium">{template.name}</h4>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
            
            <DynamicForm 
              fields={template.fields || template.form_fields || []}
              onSubmit={onSubmit}
              canSubmit={canSubmit && status !== 'submitted'}
              submitLabel="Submit Pre-Activity"
              submitButtonClass="bg-green-600 hover:bg-green-700"
              isSubmitted={status === 'submitted'}
              userRole={user?.role}
              submittedData={getSubmittedData(template.id)}
              applicationId={application?.id}
              phase="pre_activity"
            />
          </div>
        ))}

        {preTemplates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No pre-activity form template configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Post-Activity Section Component
function PostActivitySection({ 
  application, 
  templates, 
  submissions, 
  onFileUpload, 
  onSubmit, 
  canSubmit, 
  uploading,
  preActivityCompleted,
  user
}: any) {
  const postTemplates = templates.filter((t: any) => t.phase === 'post_activity');
  const postSubmission = submissions.find((s: any) => s.phase === 'post_activity');
  const status = postSubmission?.status || 'not_started';
  
  // Get submitted form data from the submission's reviewNotes field
  const getSubmittedData = (templateId: number) => {
    if (!postSubmission || !postSubmission.reviewNotes) return {};
    try {
      return JSON.parse(postSubmission.reviewNotes);
    } catch {
      return {};
    }
  };

  if (!preActivityCompleted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pre-Activity Required</h3>
            <p className="text-gray-600">
              Complete and submit the pre-activity phase before accessing post-activity submission.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Post-Activity Submission</span>
          <Badge variant={status === 'submitted' ? 'default' : 'secondary'}>
            {status.replace('_', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === 'submitted' && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Post-activity submission completed</span>
          </div>
        )}

        {postTemplates.map((template: any) => (
          <div key={template.id} className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              )}
            </div>
            
            <DynamicForm
              fields={template.formFields}
              onSubmit={onSubmit}
              canSubmit={canSubmit && status !== 'submitted'}
              submitLabel="Submit Post-Activity"
              submitButtonClass="w-full bg-green-600 hover:bg-green-700"
              isSubmitted={status === 'submitted'}
              userRole={user?.role}
              submittedData={getSubmittedData(template.id)}
              applicationId={application?.id}
              phase="post_activity"
            />
          </div>
        ))}

        {postTemplates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No post-activity form template configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Documents Section Component
function DocumentsSection({ applicationId, onDeleteFile }: { applicationId: string; onDeleteFile: (docId: number, filename: string) => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const { data: documents = [], refetch, isLoading } = useQuery({
    queryKey: ['/api/documents/application', applicationId],
    queryFn: async () => {
      console.log('Fetching documents for applicationId:', applicationId);
      const response = await fetch(`/api/documents/application/${applicationId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      console.log('Documents fetched:', data);
      return data;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
    enabled: !!applicationId,
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('applicationId', applicationId);
      formData.append('documentType', 'supporting');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${files.length} file(s) uploaded successfully`,
        });
        // Force immediate refetch
        await refetch();
        // Also invalidate cache
        queryClient.invalidateQueries({
          queryKey: ['/api/documents/application', applicationId]
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document deleted successfully",
        });
        // Force immediate refetch
        await refetch();
        // Also invalidate cache
        queryClient.invalidateQueries({
          queryKey: ['/api/documents/application', applicationId]
        });
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Documents</CardTitle>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="document-upload"
              disabled={uploading}
            />
            <label
              htmlFor="document-upload"
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Add Files'}
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No documents uploaded yet</p>
            <p className="text-sm text-gray-400">Click "Add Files" to upload supporting documents</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc: any) => {
              // Check if this document is from a form submission (pre_activity or post_activity)
              const isFormSubmissionDocument = doc.documentType === 'pre_activity' || doc.documentType === 'post_activity';
              
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{doc.originalName || doc.filename}</p>
                      <p className="text-xs text-gray-500">
                        {doc.documentType.replace('_', ' ')} • {new Date(doc.createdAt).toLocaleDateString()} • {Math.round(doc.size / 1024)} KB
                        {isFormSubmissionDocument && <span className="ml-2 text-orange-600 font-medium">(Form Submission)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!isFormSubmissionDocument && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onDeleteFile(doc.id, doc.originalName || doc.filename);
                        }}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}