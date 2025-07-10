import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Trash2, Search, Filter, Download, FileText, Building2, Calendar, User, MapPin, Eye, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import AddApplicationDialog from '@/components/AddApplicationDialog';

export default function AdminApplicationsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<any>(null);

  // Fetch applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["/api/admin/applications"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/applications", "GET");
      return response.json();
    },
  });

  // Individual delete mutation
  const deleteApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest(`/api/admin/applications/${applicationId}`, "DELETE");
      if (!response.ok) throw new Error('Failed to delete application');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Deleted",
        description: "The application has been successfully deleted and added to ghost IDs.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      setShowDeleteDialog(false);
      setApplicationToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (applicationIds: number[]) => {
      const promises = applicationIds.map(id => 
        apiRequest(`/api/admin/applications/${id}`, "DELETE")
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      setSelectedApplications([]);
      setShowBulkDeleteDialog(false);
      toast({
        title: "Success",
        description: `${selectedApplications.length} applications deleted successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete some applications",
        variant: "destructive",
      });
    },
  });

  // Get unique companies for filter
  const uniqueCompanies = [...new Set(applications.map((app: any) => app.companyName))];

  // Individual delete functions
  const handleDeleteApplication = (application: any) => {
    setApplicationToDelete(application);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (applicationToDelete) {
      deleteApplicationMutation.mutate(applicationToDelete.id);
    }
  };

  // Status counts
  const getStatusCount = (status: string) => {
    return applications.filter((app: any) => app.status === status).length;
  };

  // Status badge variants
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'submitted': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'draft': return 'secondary';
      case 'in_progress': return 'default';
      default: return 'outline';
    }
  };

  // Filter applications
  const filteredApplications = applications.filter((application: any) => {
    const matchesSearch = 
      application.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.facilityName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || application.status === statusFilter;
    const matchesActivity = activityFilter === "all" || application.activityType === activityFilter;
    const matchesCompany = companyFilter === "all" || application.companyName === companyFilter;
    
    return matchesSearch && matchesStatus && matchesActivity && matchesCompany;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Application Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and oversee all system applications
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {/* Add export functionality */}}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Professional Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Applications</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{applications.length}</p>
                </div>
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Active</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{getStatusCount('in_progress')}</p>
                </div>
                <div className="h-5 w-5 bg-green-500 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Submitted</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{getStatusCount('submitted')}</p>
                </div>
                <div className="h-5 w-5 bg-blue-500 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Draft</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{getStatusCount('draft')}</p>
                </div>
                <div className="h-5 w-5 bg-gray-400 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professional Search and Filters */}
        <Card className="mb-6 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search applications, companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="FRA">FRA</SelectItem>
                  <SelectItem value="SEM">SEM</SelectItem>
                  <SelectItem value="EAA">EAA</SelectItem>
                  <SelectItem value="EMIS">EMIS</SelectItem>
                  <SelectItem value="CR">CR</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Professional Applications Table */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <CardTitle className="text-gray-900 dark:text-gray-100">
                Applications ({filteredApplications.length})
              </CardTitle>
              <div className="flex gap-2">
                <AddApplicationDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/applications'] })} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApplications(selectedApplications.length === filteredApplications.length ? [] : filteredApplications.map((app: any) => app.id))}
                >
                  {selectedApplications.length === filteredApplications.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedApplications.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedApplications.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">
                      <Checkbox
                        checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedApplications(filteredApplications.map((app: any) => app.id));
                          } else {
                            setSelectedApplications([]);
                          }
                        }}
                      />
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Application ID</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Company</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Facility</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Activity</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Submitter</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Created</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application: any, index) => (
                    <tr key={application.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedApplications.includes(application.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedApplications([...selectedApplications, application.id]);
                            } else {
                              setSelectedApplications(selectedApplications.filter(id => id !== application.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-4">
                        <Link href={`/applications/${application.id}`}>
                          <Button variant="link" className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            {application.applicationId}
                          </Button>
                        </Link>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {application.companyName}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900 dark:text-gray-100">
                          {application.facilityName}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {application.activityType}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(application.detailedStatus || application.status)} className="text-xs">
                          {application.detailedStatus || application.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900 dark:text-gray-100">
                          {application.submitterFirstName} {application.submitterLastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {application.submitterEmail}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900 dark:text-gray-100">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/applications/${application.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteApplication(application)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteApplicationMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredApplications.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No applications found</h3>
                  <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or filters.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Individual Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Application</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete application "{applicationToDelete?.applicationId}"? 
                This action cannot be undone. The application will be permanently removed and its ID will be added to the ghost IDs list to prevent reuse.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteApplicationMutation.isPending}
              >
                {deleteApplicationMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Dialog */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Applications</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedApplications.length} selected applications? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDeleteMutation.mutate(selectedApplications)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Applications
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}