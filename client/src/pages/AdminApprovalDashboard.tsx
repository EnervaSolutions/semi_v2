import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Eye, 
  Filter,
  AlertCircle,
  ChevronRight,
  Building,
  MapPin,
  User,
  Calendar,
  FileText,
  Users
} from "lucide-react";

export default function AdminApprovalDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectionDialog, setRejectionDialog] = useState<{open: boolean, submissionId: number | null, rejectionNotes: string}>({
    open: false,
    submissionId: null,
    rejectionNotes: ""
  });
  const [loadingStates, setLoadingStates] = useState<{[key: number]: 'approving' | 'rejecting' | null}>({});

  // Fetch pending submissions with auto-refresh
  const { data: pendingSubmissions = [], isLoading, refetch: refetchSubmissions } = useQuery({
    queryKey: ["/api/admin/pending-submissions"],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    refetchOnWindowFocus: true, // Refresh when window gets focus
  });

  // Auto-refresh submissions when page is accessed
  useEffect(() => {
    refetchSubmissions();
  }, [refetchSubmissions]);

  // Process the submissions data to get statistics
  const submissions = (pendingSubmissions as any[]) || [];
  const totalPending = submissions.filter(s => s.approvalStatus === 'pending').length;
  const totalApproved = submissions.filter(s => s.approvalStatus === 'approved').length;
  const totalRejected = submissions.filter(s => s.approvalStatus === 'rejected').length;

  // Quick approve/reject mutations
  const approveMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      setLoadingStates(prev => ({ ...prev, [submissionId]: 'approving' }));
      return apiRequest(`/api/admin/submissions/${submissionId}/approve`, "POST", {
        reviewNotes: "Quick approval from dashboard"
      });
    },
    onSuccess: (_, submissionId) => {
      setLoadingStates(prev => ({ ...prev, [submissionId]: null }));
      // Immediate refetch for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      // Force immediate refresh
      refetchSubmissions();
      toast({
        title: "Submission Approved",
        description: "The submission has been approved successfully.",
      });
    },
    onError: (_, submissionId) => {
      setLoadingStates(prev => ({ ...prev, [submissionId]: null }));
      toast({
        title: "Error",
        description: "Failed to approve submission.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reviewNotes }: { submissionId: number, reviewNotes: string }) => {
      setLoadingStates(prev => ({ ...prev, [submissionId]: 'rejecting' }));
      return apiRequest(`/api/admin/submissions/${submissionId}/reject`, "POST", {
        reviewNotes: reviewNotes || "Rejected from admin dashboard"
      });
    },
    onSuccess: (_, { submissionId }) => {
      setLoadingStates(prev => ({ ...prev, [submissionId]: null }));
      setRejectionDialog({ open: false, submissionId: null, rejectionNotes: "" });
      // Immediate refetch for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      // Force immediate refresh
      refetchSubmissions();
      toast({
        title: "Submission Rejected",
        description: "The submission has been rejected and reverted to draft status for resubmission.",
      });
    },
    onError: (_, { submissionId }) => {
      setLoadingStates(prev => ({ ...prev, [submissionId]: null }));
      toast({
        title: "Error",
        description: "Failed to reject submission.",
        variant: "destructive",
      });
    },
  });

  const handleQuickApprove = (submissionId: number) => {
    approveMutation.mutate(submissionId);
  };

  const handleQuickReject = (submissionId: number) => {
    setRejectionDialog({
      open: true,
      submissionId,
      rejectionNotes: ""
    });
  };

  const handleConfirmReject = () => {
    if (rejectionDialog.submissionId) {
      rejectMutation.mutate({
        submissionId: rejectionDialog.submissionId,
        reviewNotes: rejectionDialog.rejectionNotes
      });
    }
  };

  // Filter submissions based on status and search term
  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = statusFilter === "all" || submission.approvalStatus === statusFilter;
    const matchesSearch = searchTerm === "" || 
      submission.applicationData?.applicationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.template?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading submissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Admin - Submission Approvals</h1>
        <p className="text-gray-600 mt-2">
          Review and approve activity template submissions from all companies in the system
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">All submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
            <p className="text-xs text-muted-foreground">Successfully approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalRejected}</div>
            <p className="text-xs text-muted-foreground">Rejected submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by application ID, company name, or template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions for Review</CardTitle>
          <CardDescription>
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium text-sm">
                        {submission.applicationData?.applicationId || `APP-${submission.applicationId}`}
                      </span>
                    </div>
                    <Badge 
                      variant={
                        submission.approvalStatus === 'pending' ? 'default' :
                        submission.approvalStatus === 'approved' ? 'secondary' : 'destructive'
                      }
                      className={
                        submission.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        submission.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {submission.approvalStatus}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Company:</span>
                      <div className="font-medium">{submission.company?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Template:</span>
                      <div className="font-medium">{submission.template?.name || `Template ${submission.formTemplateId}`}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Activity:</span>
                      <Badge variant="outline" className="text-xs">
                        {submission.applicationData?.activityType || 'FRA'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Submitted:</span>
                      <div className="text-xs">
                        {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : new Date(submission.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation(`/applications/${submission.applicationId}`)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Application
                    </Button>
                    
                    {submission.approvalStatus === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickApprove(submission.id)}
                          disabled={loadingStates[submission.id] === 'approving'}
                          className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {loadingStates[submission.id] === 'approving' ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickReject(submission.id)}
                          disabled={loadingStates[submission.id] === 'rejecting'}
                          className="flex-1 text-red-700 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {loadingStates[submission.id] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Approval Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">
                        {submission.applicationData?.applicationId || `APP-${submission.applicationId}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-600" />
                      <div>
                        <div className="font-medium">{submission.company?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{submission.company?.shortName || 'N/A'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-purple-600" />
                      <span>{submission.template?.name || `Template ${submission.formTemplateId}`}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {submission.applicationData?.activityType || 'FRA'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="text-sm">
                        {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : new Date(submission.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        submission.approvalStatus === 'pending' ? 'default' :
                        submission.approvalStatus === 'approved' ? 'secondary' : 'destructive'
                      }
                      className={
                        submission.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        submission.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {submission.approvalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/applications/${submission.applicationId}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Application
                      </Button>
                      
                      {submission.approvalStatus === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickApprove(submission.id)}
                            disabled={loadingStates[submission.id] === 'approving'}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {loadingStates[submission.id] === 'approving' ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickReject(submission.id)}
                            disabled={loadingStates[submission.id] === 'rejecting'}
                            className="text-red-700 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {loadingStates[submission.id] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredSubmissions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No submissions found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(open) => setRejectionDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Please provide feedback for why this submission is being rejected. This will be shown to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason and feedback for the user..."
              value={rejectionDialog.rejectionNotes}
              onChange={(e) => setRejectionDialog(prev => ({ ...prev, rejectionNotes: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectionDialog({ open: false, submissionId: null, rejectionNotes: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={!rejectionDialog.rejectionNotes.trim() || loadingStates[rejectionDialog.submissionId || 0] === 'rejecting'}
            >
              {loadingStates[rejectionDialog.submissionId || 0] === 'rejecting' ? 'Rejecting...' : 'Reject Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}