import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationTable } from "@/components/ApplicationTable";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, Settings } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface ColumnVisibility {
  applicationId: boolean;
  title: boolean;
  activityType: boolean;
  status: boolean;
  facilityName: boolean;
  description: boolean;
  createdAt: boolean;
  updatedAt: boolean;
  submittedAt: boolean;
  contractors: boolean;
}

const DEFAULT_COLUMNS: ColumnVisibility = {
  applicationId: true,
  title: false,
  activityType: true,
  status: true,
  facilityName: true,
  description: false,
  createdAt: true,
  updatedAt: false,
  submittedAt: true,
  contractors: true,
};

export default function Applications() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(DEFAULT_COLUMNS);

  // Load saved column preferences
  useEffect(() => {
    const saved = localStorage.getItem('applicationTable_columnVisibility');
    if (saved) {
      try {
        const parsedColumns = JSON.parse(saved);
        setColumnVisibility({ ...DEFAULT_COLUMNS, ...parsedColumns });
      } catch (error) {
        console.error('Failed to parse saved column preferences:', error);
      }
    }
  }, []);

  // Save column preferences when they change
  const updateColumnVisibility = (column: keyof ColumnVisibility, visible: boolean) => {
    const newVisibility = { ...columnVisibility, [column]: visible };
    setColumnVisibility(newVisibility);
    localStorage.setItem('applicationTable_columnVisibility', JSON.stringify(newVisibility));
  };

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['/api/applications'],
  });

  const { data: assignedApplications = [] } = useQuery({
    queryKey: ['/api/applications/assigned'],
    enabled: user?.role === 'contractor_individual',
  });

  const applicationsToShow = user?.role === 'contractor_individual' ? assignedApplications : applications;

  // Filter and search applications
  const filteredApplications = useMemo(() => {
    return applicationsToShow.filter((app: any) => {
      // Search term filter (case insensitive)
      const searchMatch = searchTerm === "" || 
        app.applicationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.facility?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.activityType?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === "all" || app.status === statusFilter;

      // Activity type filter
      const activityMatch = activityFilter === "all" || app.activityType === activityFilter;

      return searchMatch && statusMatch && activityMatch;
    });
  }, [applicationsToShow, searchTerm, statusFilter, activityFilter]);

  // Get unique statuses and activity types for filter options
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(applicationsToShow.map((app: any) => app.status))];
    return statuses.filter(Boolean);
  }, [applicationsToShow]);

  const uniqueActivityTypes = useMemo(() => {
    const types = [...new Set(applicationsToShow.map((app: any) => app.activityType))];
    return types.filter(Boolean);
  }, [applicationsToShow]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setActivityFilter("all");
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || activityFilter !== "all";

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">All Applications</h1>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Applications ({filteredApplications.length} of {applicationsToShow.length})</CardTitle>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
          
          {/* Search and Filter Controls */}
          <div className="mt-16 pt-4 border-t border-gray-100">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by Application ID, Facility, Description, or Activity Type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Activity Type Filter */}
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filter by Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  {uniqueActivityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Column Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="lg:w-auto">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.applicationId}
                    onCheckedChange={(checked) => updateColumnVisibility('applicationId', checked)}
                  >
                    Application ID
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.title}
                    onCheckedChange={(checked) => updateColumnVisibility('title', checked)}
                  >
                    Title
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.activityType}
                    onCheckedChange={(checked) => updateColumnVisibility('activityType', checked)}
                  >
                    Activity Type
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.status}
                    onCheckedChange={(checked) => updateColumnVisibility('status', checked)}
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.facilityName}
                    onCheckedChange={(checked) => updateColumnVisibility('facilityName', checked)}
                  >
                    Facility Name
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.description}
                    onCheckedChange={(checked) => updateColumnVisibility('description', checked)}
                  >
                    Description
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.createdAt}
                    onCheckedChange={(checked) => updateColumnVisibility('createdAt', checked)}
                  >
                    Created At
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.updatedAt}
                    onCheckedChange={(checked) => updateColumnVisibility('updatedAt', checked)}
                  >
                    Updated At
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.submittedAt}
                    onCheckedChange={(checked) => updateColumnVisibility('submittedAt', checked)}
                  >
                    Submission Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.contractors}
                    onCheckedChange={(checked) => updateColumnVisibility('contractors', checked)}
                  >
                    Contractors
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ApplicationTable 
            applications={filteredApplications} 
            columnVisibility={columnVisibility}
          />
        </CardContent>
      </Card>
    </div>
  );
}