import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  MoreHorizontal,
  CheckSquare,
  Square,
  FileText,
  Building,
  Calendar,
  User
} from "lucide-react";

interface Application {
  id: number;
  applicationId: string;
  title: string;
  activityType: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: {
    id: number;
    name: string;
    shortName: string;
  };
  facility: {
    id: number;
    name: string;
  };
  submittedBy: string | null;
  reviewNotes: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "submitted":
      return "bg-blue-100 text-blue-800";
    case "under_review":
      return "bg-yellow-100 text-yellow-800";
    case "draft":
      return "bg-gray-100 text-gray-800";
    case "in_progress":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getActivityTypeColor = (activityType: string) => {
  switch (activityType) {
    case "FRA":
      return "bg-purple-100 text-purple-800";
    case "SEM":
      return "bg-blue-100 text-blue-800";
    case "EAA":
      return "bg-green-100 text-green-800";
    case "EMIS":
      return "bg-orange-100 text-orange-800";
    case "CR":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function AdminApplicationsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { toast } = useToast();

  // Fetch all applications with company details
  const { data: applicationsData, isLoading, error } = useQuery({
    queryKey: ["/api/admin/applications"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/applications", "GET");
      const data = await response.json();
      return data;
    },
  });

  // Ensure applications is always an array
  const applications = Array.isArray(applicationsData) ? applicationsData : [];

  // Debug logging for received data
  React.useEffect(() => {
    if (applications.length > 0) {
      console.log('AdminApplicationsManagement loaded', applications.length, 'applications');
    }
  }, [applications]);

  // Delete application mutation
  const deleteApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      await apiRequest(`/api/admin/applications/${applicationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Success",
        description: "Application deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete application.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (applicationIds: number[]) => {
      await apiRequest("/api/admin/applications/bulk-delete", "DELETE", {
        applicationIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      setSelectedApplications([]);
      toast({
        title: "Success",
        description: "Applications deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete applications.",
        variant: "destructive",
      });
    },
  });

  // Filter and search applications
  const filteredApplications = useMemo(() => {
    // Ensure we have a valid array before filtering
    if (!Array.isArray(applications) || applications.length === 0) {
      return [];
    }
    
    let filtered = applications.filter((app: any) => {
      // Search term filter
      const searchMatch = searchTerm === "" || 
        app.applicationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.companyName || app.company?.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.facilityName || app.facility?.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.activityType?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === "all" || app.status === statusFilter;

      // Activity type filter
      const activityMatch = activityFilter === "all" || app.activityType === activityFilter;

      return searchMatch && statusMatch && activityMatch;
    });

    // Sort applications
    filtered.sort((a: Application, b: Application) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case "applicationId":
          valueA = a.applicationId;
          valueB = b.applicationId;
          break;
        case "company":
          valueA = a.company?.name || "";
          valueB = b.company?.name || "";
          break;
        case "status":
          valueA = a.status;
          valueB = b.status;
          break;
        case "submittedAt":
          valueA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          valueB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          break;
        default:
          valueA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valueB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }

      if (sortOrder === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return filtered;
  }, [applications, searchTerm, statusFilter, activityFilter, sortBy, sortOrder]);

  const handleSelectAll = () => {
    if (selectedApplications.length === filteredApplications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(filteredApplications.map((app: Application) => app.id));
    }
  };

  const handleSelectApplication = (applicationId: number) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId) 
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleDeleteApplication = async (applicationId: number) => {
    await deleteApplicationMutation.mutateAsync(applicationId);
  };

  const handleBulkDelete = async () => {
    if (selectedApplications.length > 0) {
      await bulkDeleteMutation.mutateAsync(selectedApplications);
    }
  };

  const uniqueStatuses = [...new Set(applications.map((app: any) => app.status))];
  const uniqueActivityTypes = [...new Set(applications.map((app: any) => app.activityType))];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Application Management
        </CardTitle>
        <CardDescription>
          Review and manage all SEMI program applications system-wide
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applications, companies, facilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {uniqueActivityTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedApplications.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-md">
              <span className="text-sm font-medium">
                {selectedApplications.length} application(s) selected
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Delete</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedApplications.length} selected application(s)? 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      Delete Applications
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Applications Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 w-8 p-0"
                  >
                    {selectedApplications.length === filteredApplications.length && filteredApplications.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("applicationId");
                  setSortOrder(sortBy === "applicationId" && sortOrder === "asc" ? "desc" : "asc");
                }}>
                  Application ID
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("company");
                  setSortOrder(sortBy === "company" && sortOrder === "asc" ? "desc" : "asc");
                }}>
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    Company
                  </div>
                </TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Activity Type</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("status");
                  setSortOrder(sortBy === "status" && sortOrder === "asc" ? "desc" : "asc");
                }}>
                  Status
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("submittedAt");
                  setSortOrder(sortBy === "submittedAt" && sortOrder === "asc" ? "desc" : "asc");
                }}>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Submitted
                  </div>
                </TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <FileText className="mx-auto h-12 w-12" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">No applications found</h3>
                    <p className="text-sm text-gray-500">
                      {searchTerm || statusFilter !== "all" || activityFilter !== "all" 
                        ? "Try adjusting your search or filter criteria."
                        : "No applications have been created yet."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app: any) => {
                  // Debug log specific app
                  if (app.id === 23) {
                    console.log('App 23 detailed data:', {
                      id: app.id,
                      applicationId: app.applicationId,
                      companyName: app.companyName,
                      companyShortName: app.companyShortName,
                      facilityName: app.facilityName,
                      company: app.company,
                      facility: app.facility,
                      allKeys: Object.keys(app)
                    });
                  }
                  return (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedApplications.includes(app.id)}
                        onCheckedChange={() => handleSelectApplication(app.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/admin/applications/${app.id}`}>
                        <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                          {app.applicationId}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{app.companyName || 'Company data unavailable'}</div>
                      <div className="text-sm text-gray-500">{app.companyShortName || 'No short name'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{app.facilityName || 'Facility data unavailable'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActivityTypeColor(app.activityType)}>
                        {app.activityType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.replace('_', ' ').charAt(0).toUpperCase() + app.status.slice(1).replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {app.detailedStatus && app.detailedStatus !== 'Draft' ? (
                        <div>
                          <div className="font-medium text-blue-600">
                            {app.detailedStatus}
                          </div>
                          {app.submittedAt && (
                            <div className="text-sm text-gray-500">
                              {new Date(app.submittedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Draft</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.submitterName || app.submittedBy ? (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{app.submitterName || app.submittedBy}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/applications/${app.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Application
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete application {app.applicationId}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteApplication(app.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Application
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredApplications.length} of {applications.length} total applications
        </div>
      </CardContent>
    </Card>
  );
}