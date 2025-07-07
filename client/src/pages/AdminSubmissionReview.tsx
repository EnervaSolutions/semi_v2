import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Building, 
  Factory, 
  User, 
  Calendar, 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  Phone,
  Mail,
  Users,
  Settings,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface SubmissionData {
  id: number;
  applicationId: string;
  templateId: number;
  submittedBy: string;
  submittedAt: string;
  data: any;
  status: string;
  application: any;
  company: any;
  facility: any;
  template: any;
  submitter: any;
  documents: any[];
  contractorAssignments: any[];
  teamMembers: any[];
}

export default function AdminSubmissionReview() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const submissionId = params.id;

  // Fetch detailed submission data
  const { data: submission, isLoading } = useQuery({
    queryKey: ['/api/admin/submission-details', submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/submission-details/${submissionId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch submission details');
      return response.json();
    },
    enabled: !!submissionId
  });

  // Approve submission mutation
  const approveMutation = useMutation({
    mutationFn: async ({ notes }: { notes: string }) => {
      return apiRequest(`/api/admin/submissions/${submissionId}/approve`, 'POST', { reviewNotes: notes });
    },
    onSuccess: () => {
      toast({ title: "Submission approved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-submissions'] });
      setLocation('/admin/approvals');
    },
    onError: () => {
      toast({ title: "Failed to approve submission", variant: "destructive" });
    }
  });

  // Reject submission mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ notes }: { notes: string }) => {
      return apiRequest(`/api/admin/submissions/${submissionId}/reject`, 'POST', { reviewNotes: notes });
    },
    onSuccess: () => {
      toast({ title: "Submission rejected" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-submissions'] });
      setLocation('/admin/approvals');
    },
    onError: () => {
      toast({ title: "Failed to reject submission", variant: "destructive" });
    }
  });

  // Parse template fields for structured display
  const templateFields = useMemo(() => {
    if (!submission?.template?.formFields) return [];
    try {
      return JSON.parse(submission.template.formFields);
    } catch {
      return [];
    }
  }, [submission?.template?.formFields]);

  // Get field responses from submission data
  const getFieldResponse = (fieldId: string) => {
    if (!submission?.data) return null;
    return submission.data[fieldId] || null;
  };

  // Format field response for display
  const formatFieldResponse = (field: any, response: any) => {
    if (response === null || response === undefined || response === '') {
      return <span className="text-gray-400 italic">No response provided</span>;
    }

    switch (field.type) {
      case 'checkbox':
        return (
          <div className="space-y-1">
            {Array.isArray(response) ? response.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{item}</span>
              </div>
            )) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{response}</span>
              </div>
            )}
          </div>
        );
      case 'radio':
      case 'select':
        return (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
            {response}
          </Badge>
        );
      case 'number':
        return <span className="font-mono text-lg">{response}</span>;
      case 'textarea':
        return (
          <div className="bg-gray-50 p-3 rounded border text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
            {response}
          </div>
        );
      case 'boolean':
        return (
          <Badge variant={response ? "default" : "secondary"} className={response ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {response ? "Yes" : "No"}
          </Badge>
        );
      case 'date':
        return <span className="font-mono">{format(new Date(response), 'MMM dd, yyyy')}</span>;
      default:
        return <span>{String(response)}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Submission not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/admin/approvals')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Approvals</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Submission Review
                </h1>
                {submission.application?.applicationId && (
                  <p className="text-lg font-medium text-blue-600">
                    Application ID: {submission.application.applicationId}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  {submission.company?.name} • {submission.template?.name || submission.template?.templateName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant="secondary" 
                className="bg-yellow-100 text-yellow-800 border-yellow-200"
              >
                <Clock className="h-3 w-3 mr-1" />
                Pending Review
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(submission.submittedAt), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Panel - Navigation & Quick Info */}
          <div className="xl:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Review Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button
                    variant={activeTab === "overview" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("overview")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Overview
                  </Button>
                  <Button
                    variant={activeTab === "responses" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("responses")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Form Responses
                  </Button>
                  <Button
                    variant={activeTab === "documents" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("documents")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Documents
                  </Button>
                  <Button
                    variant={activeTab === "team" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("team")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Team & Contractors
                  </Button>
                </div>

                <Separator />

                {/* Quick Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Documents</span>
                    <Badge variant="outline">{submission.documents?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Team Members</span>
                    <Badge variant="outline">{submission.teamMembers?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Contractors</span>
                    <Badge variant="outline">{submission.contractorAssignments?.length || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Application Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Application Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Application ID</Label>
                        <p className="text-lg font-mono">{submission.application?.applicationId || submission.applicationId}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Activity Type</Label>
                        <Badge className="ml-2">{submission.application?.activityType}</Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Template</Label>
                        <p>{submission.template?.name || submission.template?.templateName}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Submitted By</Label>
                        <p>{submission.submitter?.firstName} {submission.submitter?.lastName}</p>
                        <p className="text-sm text-gray-600">{submission.submitter?.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Submission Date</Label>
                        <p>
                          {submission.submittedAt && submission.submittedAt !== '1970-01-01T00:00:00.000Z'
                            ? format(new Date(submission.submittedAt), 'MMMM dd, yyyy at h:mm a')
                            : submission.createdAt
                            ? format(new Date(submission.createdAt), 'MMMM dd, yyyy at h:mm a')
                            : 'Date not available'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Company Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Company Name</Label>
                        <p className="text-lg font-semibold">{submission.company?.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Short Name</Label>
                        <p className="font-mono">{submission.company?.shortName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Business Number</Label>
                        <p className="font-mono">{submission.company?.businessNumber || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Address</Label>
                        <div className="text-sm">
                          {submission.company?.streetAddress ? (
                            <>
                              <p>{submission.company.streetAddress}</p>
                              <p>{submission.company.city}, {submission.company.province} {submission.company.postalCode}</p>
                              <p>{submission.company.country}</p>
                            </>
                          ) : (
                            <p className="text-gray-400 italic">Address not provided</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Contact Information</Label>
                        <div className="text-sm space-y-1">
                          <p className="flex items-center">
                            <Phone className="h-3 w-3 mr-2" />
                            {submission.company?.phoneNumber || 'Not provided'}
                          </p>
                          <p className="flex items-center">
                            <Mail className="h-3 w-3 mr-2" />
                            {submission.company?.contactEmail || 'Not provided'}
                          </p>
                          <p><strong>Website:</strong> {submission.company?.website || 'Not provided'}</p>
                          <p><strong>Employees:</strong> {submission.company?.numberOfEmployees || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Facility Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Factory className="h-5 w-5 mr-2" />
                      Facility Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Facility Name</Label>
                        <p className="text-lg font-semibold">{submission.facility?.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Facility Code</Label>
                        <p className="font-mono">{submission.facility?.code}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Floor Area</Label>
                        <p>
                          {submission.facility?.grossFloorArea 
                            ? `${submission.facility.grossFloorArea.toLocaleString()} sq ft` 
                            : 'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">NAICS Code</Label>
                        <p className="font-mono">{submission.facility?.naicsCode}</p>
                        <div className="text-sm text-gray-600">
                          <p><strong>Sector:</strong> {submission.facility?.facilitySector || 'N/A'}</p>
                          <p><strong>Category:</strong> {submission.facility?.facilityCategory || 'N/A'}</p>
                          <p><strong>Type:</strong> {submission.facility?.facilityType || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Facility Address</Label>
                        <div className="text-sm">
                          {submission.facility?.streetNumber && submission.facility?.streetName ? (
                            <>
                              <p>{submission.facility.streetNumber} {submission.facility.streetName}</p>
                              <p>{submission.facility.city}, {submission.facility.province} {submission.facility.postalCode}</p>
                            </>
                          ) : (
                            <p className="text-gray-400 italic">Address not provided</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Operating Hours</Label>
                        <p>
                          {submission.facility?.weeklyOperatingHours 
                            ? `${submission.facility.weeklyOperatingHours} hours/week` 
                            : 'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Energy Systems</Label>
                        <div className="text-sm space-y-1">
                          <p><strong>Has EMIS:</strong> {submission.facility?.hasEMIS ? 'Yes' : 'No'}</p>
                          <p><strong>Has Energy Manager:</strong> {submission.facility?.hasEnergyManager ? 'Yes' : 'No'}</p>
                          <p><strong>Year Built:</strong> {submission.facility?.yearBuilt || 'Not provided'}</p>
                          <p><strong>Main Shift Workers:</strong> {submission.facility?.numberOfWorkersMainShift || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "responses" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Form Responses
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Review all field responses from the submitted template
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-6">
                      {submission.data && typeof submission.data === 'object' && Object.keys(submission.data).length > 0 ? (
                        <div className="space-y-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-800 mb-2">Template Information</h4>
                            <p className="text-sm text-blue-700">
                              <strong>Template:</strong> {submission.template?.name || submission.template?.templateName}
                            </p>
                            <p className="text-sm text-blue-700">
                              <strong>Activity Type:</strong> {submission.template?.activityType}
                            </p>
                          </div>
                          
                          {Object.entries(submission.data as Record<string, any>).map(([key, value]) => (
                            <div key={key} className="border-l-4 border-blue-200 pl-4 py-3 bg-gray-50 rounded-r">
                              <div className="flex flex-col space-y-2">
                                <Label className="text-sm font-medium text-blue-800 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </Label>
                                <div className="bg-white p-3 rounded border">
                                  {Array.isArray(value) ? (
                                    <div className="space-y-1">
                                      {value.map((item, index) => (
                                        <div key={index} className="flex items-center">
                                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                          <span>{typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : typeof value === 'object' && value !== null ? (
                                    <pre className="text-xs bg-gray-100 p-2 rounded border whitespace-pre-wrap overflow-x-auto">
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : typeof value === 'boolean' ? (
                                    <Badge className={value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                      {value ? 'Yes' : 'No'}
                                    </Badge>
                                  ) : (
                                    <span className="break-words">{String(value)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No form response data available</p>
                          <p className="text-sm">Form may not have been completed yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {activeTab === "documents" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Download className="h-5 w-5 mr-2" />
                    Uploaded Documents
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    All documents uploaded for this application
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {submission.documents && submission.documents.length > 0 ? (
                      submission.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="font-medium">{doc.filename || doc.originalName}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>{doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Unknown size'}</span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.category || doc.documentType}
                                </Badge>
                                <span>Uploaded {doc.createdAt ? format(new Date(doc.createdAt), 'MMM dd, yyyy') : 'Unknown date'}</span>
                                {doc.uploadedBy && (
                                  <span>by {doc.uploadedBy}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Download className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No documents uploaded</p>
                        <p className="text-sm">Documents will appear here when uploaded</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "team" && (
              <div className="space-y-6">
                {/* Team Members */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Company Team Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {submission.teamMembers && submission.teamMembers.length > 0 ? (
                        submission.teamMembers.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-3">
                              <User className="h-8 w-8 text-gray-400" />
                              <div>
                                <p className="font-medium">
                                  {member.firstName} {member.lastName}
                                  {member.id === submission.submittedBy && (
                                    <Badge className="ml-2 bg-blue-100 text-blue-800">Account Owner</Badge>
                                  )}
                                </p>
                                <p className="text-sm text-gray-600">{member.email}</p>
                                <p className="text-xs text-gray-500">
                                  Active: {member.isActive ? 'Yes' : 'No'} • 
                                  Joined: {member.createdAt ? format(new Date(member.createdAt), 'MMM yyyy') : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{member.role}</Badge>
                              {member.permissionLevel && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {member.permissionLevel}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No team members found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contractor Assignments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Contractor Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {submission.contractorAssignments && submission.contractorAssignments.length > 0 ? (
                        submission.contractorAssignments.map((assignment: any) => (
                          <div key={assignment.userId} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-3">
                              <User className="h-8 w-8 text-green-400" />
                              <div>
                                <p className="font-medium">{assignment.user.firstName} {assignment.user.lastName}</p>
                                <p className="text-sm text-gray-600">{assignment.user.email}</p>
                                <p className="text-xs text-gray-500">
                                  Assigned {assignment.assignedAt ? format(new Date(assignment.assignedAt), 'MMM dd, yyyy') : 'Unknown date'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary">{assignment.user.role}</Badge>
                              <div className="flex gap-1 mt-1">
                                {Array.isArray(assignment.permissions) ? assignment.permissions.map((perm: string) => (
                                  <Badge key={perm} variant="outline" className="text-xs">
                                    {perm}
                                  </Badge>
                                )) : (
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.permissions}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No contractors assigned</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Activity Log */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Activity Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {submission.activityLog && submission.activityLog.length > 0 ? (
                        submission.activityLog.map((activity: any, index: number) => (
                          <div key={index} className="flex items-center space-x-3 p-3 border-l-4 border-gray-200 bg-gray-50">
                            <Calendar className="h-5 w-5 text-gray-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                              <div className="text-xs text-gray-600">
                                <p>By: {activity.user ? `${activity.user.firstName} ${activity.user.lastName} (${activity.user.role})` : 'System'}</p>
                                <p>When: {activity.timestamp ? format(new Date(activity.timestamp), "PPP 'at' p") : 'Unknown'}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No activity log available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Approval Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Review Decision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reviewNotes">Review Notes</Label>
                  <Textarea
                    id="reviewNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your review decision..."
                    className="mt-1"
                    rows={4}
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => approveMutation.mutate({ notes: reviewNotes })}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve Submission
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate({ notes: reviewNotes })}
                    disabled={rejectMutation.isPending}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject Submission
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}