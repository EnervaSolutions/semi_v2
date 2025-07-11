import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Edit, MoreHorizontal, Settings, Check } from "lucide-react";
import { APPLICATION_STATUSES, ACTIVITY_TYPES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

interface Application {
  id: number;
  applicationId: string;
  title: string;
  activityType: string;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
  createdAt: string;
  updatedAt?: string;
  facilityName?: string;
  description?: string;
  detailedStatus?: string;
  detailedStatusLabel?: string;
  hasPreActivitySubmission?: boolean;
  hasPostActivitySubmission?: boolean;
  assignedContractors?: any[];
}

interface ApplicationTableProps {
  applications: Application[];
  showColumnSelector?: boolean;
  compact?: boolean;
  columnVisibility?: ColumnVisibility;
}

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

export function ApplicationTable({ applications, showColumnSelector = false, compact = false, columnVisibility: propColumnVisibility }: ApplicationTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(DEFAULT_COLUMNS);

  // For compact mode (dashboard), override column visibility
  const effectiveColumnVisibility = compact ? {
    applicationId: true,
    title: false,
    activityType: true,
    status: true,
    facilityName: true,
    description: false,
    createdAt: true,
    updatedAt: false,
    submittedAt: false,
    contractors: false,
  } : (propColumnVisibility || columnVisibility);

  // Load saved column preferences (only for non-compact mode)
  useEffect(() => {
    if (!compact) {
      const saved = localStorage.getItem('applicationTable_columnVisibility');
      if (saved) {
        try {
          const parsedColumns = JSON.parse(saved);
          setColumnVisibility({ ...DEFAULT_COLUMNS, ...parsedColumns });
        } catch (error) {
          console.error('Failed to parse saved column preferences:', error);
        }
      }
    }
  }, [compact]);

  // Save column preferences when they change
  const updateColumnVisibility = (column: keyof ColumnVisibility, visible: boolean) => {
    const newVisibility = { ...columnVisibility, [column]: visible };
    setColumnVisibility(newVisibility);
    localStorage.setItem('applicationTable_columnVisibility', JSON.stringify(newVisibility));
  };
  // Enhanced status logic to show detailed workflow stages
  const getDetailedStatus = (application: Application) => {
    // First priority: Use the calculated detailedStatus from backend (includes template names)
    if ((application as any).detailedStatus) {
      const status = (application as any).detailedStatus;
      
      // Handle template-specific status messages
      if (status.includes('Submitted')) {
        return { label: status, color: 'bg-blue-100 text-blue-800' };
      }
      if (status.includes('Started')) {
        return { label: status, color: 'bg-orange-100 text-orange-800' };
      }
      if (status === 'draft' || status === 'Draft') {
        return { label: 'Draft', color: 'bg-gray-100 text-gray-800' };
      }
      if (status.includes('Activities')) {
        return { label: status, color: 'bg-blue-100 text-blue-800' };
      }
      // Default for any detailed status
      return { label: status, color: 'bg-blue-100 text-blue-800' };
    }

    // Fallback: Use the detailedStatusLabel from backend if available
    if ((application as any).detailedStatusLabel) {
      const label = (application as any).detailedStatusLabel;
      
      // Determine color based on status content
      if (label.includes('Submitted')) {
        return { label, color: 'bg-blue-100 text-blue-800' };
      }
      if (label.includes('Started')) {
        return { label, color: 'bg-orange-100 text-orange-800' };
      }
      if (label === 'Draft') {
        return { label, color: 'bg-gray-100 text-gray-800' };
      }
      if (label.includes('Approved')) {
        return { label, color: 'bg-green-100 text-green-800' };
      }
      if (label.includes('Rejected')) {
        return { label, color: 'bg-red-100 text-red-800' };
      }
      if (label.includes('Review')) {
        return { label, color: 'bg-yellow-100 text-yellow-800' };
      }
      return { label, color: 'bg-blue-100 text-blue-800' };
    }
    
    // Fallback to basic status logic
    if (application.status === 'draft') {
      return { label: 'Draft', color: 'bg-gray-100 text-gray-800' };
    }
    
    if (application.status === 'submitted') {
      return { label: 'Pre-Activity Submitted', color: 'bg-blue-100 text-blue-800' };
    }
    
    if (application.status === 'under_review') {
      return { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    if (application.status === 'approved') {
      return { label: 'Approved', color: 'bg-green-100 text-green-800' };
    }
    
    if (application.status === 'rejected') {
      return { label: 'Rejected', color: 'bg-red-100 text-red-800' };
    }
    
    if (application.status === 'needs_revision') {
      return { label: 'Needs Revision', color: 'bg-orange-100 text-orange-800' };
    }
    
    return { label: 'Draft', color: 'bg-gray-100 text-gray-800' };
  };

  const getStatusBadge = (application: Application) => {
    const status = getDetailedStatus(application);
    return (
      <Badge className={status.color}>
        {status.label}
      </Badge>
    );
  };

  const getActivityBadge = (activityType: string) => {
    const activity = ACTIVITY_TYPES[activityType as keyof typeof ACTIVITY_TYPES];
    if (!activity) return <Badge variant="outline">{activityType}</Badge>;

    const colorClass = {
      blue: "bg-blue-100 text-blue-800",
      purple: "bg-purple-100 text-purple-800",
      indigo: "bg-indigo-100 text-indigo-800",
      green: "bg-green-100 text-green-800",
      teal: "bg-teal-100 text-teal-800",
      orange: "bg-orange-100 text-orange-800"
    }[activity.color];

    return (
      <Badge className={colorClass}>
        {activity.name}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper to determine submission status based on detailed status
  const getSubmissionStatus = (application: Application) => {
    const statusLabel = application.detailedStatusLabel || application.detailedStatus || application.status;
    
    console.log(`Checking submission status for ${application.applicationId}: statusLabel="${statusLabel}", status="${application.status}"`);
    
    // CRITICAL FIX: Rejected applications should show as "Not submitted" to allow resubmission
    if (statusLabel && statusLabel.includes('Rejected')) {
      return 'Not submitted';
    }
    
    // Check if the status indicates completion (all activities submitted)
    if (statusLabel && statusLabel.includes('Submitted') && !statusLabel.includes('Started')) {
      // If it's a final submission (like "PreActivity Submitted" or template name + "Submitted")
      return 'Submitted';
    }
    
    // Check for approval status
    if (statusLabel && statusLabel.includes('Approved')) {
      return 'Submitted';
    }
    
    // Check for partial completion or in progress
    if (statusLabel && (statusLabel.includes('Started') || statusLabel === 'Draft') || application.status === 'draft') {
      return 'Not submitted';
    }
    
    // For other statuses like approved, under review, etc.
    if (['approved', 'under_review', 'needs_revision', 'in_progress'].includes(application.status)) {
      return 'Submitted';
    }
    
    // Special case: if status is in_progress but detailedStatusLabel shows submission
    if (application.status === 'in_progress' && statusLabel && statusLabel.includes('Submitted')) {
      return 'Submitted';
    }
    
    return 'Not submitted';
  };

  // Helper to display assigned contractors with smart truncation
  const getContractorsDisplay = (application: Application) => {
    const contractors = application.assignedContractors;
    if (!contractors || contractors.length === 0) {
      return <span className="text-gray-400 text-sm">None assigned</span>;
    }
    
    // Extract contractor names - handle both string and object formats
    const contractorNames = contractors.map(c =>
      typeof c === 'string'
        ? c
        : (c.companyName || c.name || (c.userFirstName && c.userLastName ? c.userFirstName + ' ' + c.userLastName : 'Unknown Contractor'))
    ).filter(name => name && name.trim());
    
    if (contractorNames.length === 0) {
      return <span className="text-gray-400 text-sm">Assigned (Name unavailable)</span>;
    }
    
    // If only one contractor, show full name
    if (contractorNames.length === 1) {
      return (
        <div className="text-sm text-gray-700">
          {contractorNames[0]}
        </div>
      );
    }
    
    // If multiple contractors, show first name with count and expandable popup
    return (
      <div className="relative group">
        <div className="text-sm text-gray-700 cursor-pointer hover:text-blue-600">
          {contractorNames[0]} +{contractorNames.length - 1} more
        </div>
        {/* Tooltip popup with all contractor names */}
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap max-w-xs">
          <div className="space-y-1">
            {contractorNames.map((name, index) => (
              <div key={index}>{name}</div>
            ))}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900">No applications</h3>
        <p className="text-sm text-gray-500">Get started by creating your first application.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {showColumnSelector && (
        <div className="mb-4 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
                Facility
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
                Date Created
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.updatedAt}
                onCheckedChange={(checked) => updateColumnVisibility('updatedAt', checked)}
              >
                Date Updated
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.submittedAt}
                onCheckedChange={(checked) => updateColumnVisibility('submittedAt', checked)}
              >
                Date Submitted
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
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            {effectiveColumnVisibility.applicationId && <TableHead>Application ID</TableHead>}
            {effectiveColumnVisibility.facilityName && <TableHead>Facility</TableHead>}
            {effectiveColumnVisibility.activityType && <TableHead>Activity Type</TableHead>}
            {effectiveColumnVisibility.status && <TableHead>Status</TableHead>}
            {effectiveColumnVisibility.createdAt && <TableHead>Created</TableHead>}
            {effectiveColumnVisibility.title && <TableHead>Title</TableHead>}
            {effectiveColumnVisibility.description && <TableHead>Description</TableHead>}
            {effectiveColumnVisibility.updatedAt && <TableHead>Updated</TableHead>}
            {effectiveColumnVisibility.submittedAt && <TableHead>Submitted</TableHead>}
            {effectiveColumnVisibility.contractors && <TableHead>Contractors</TableHead>}
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id} className="table-row-hover">
              {effectiveColumnVisibility.applicationId && (
                <TableCell className="font-medium">
                  <button
                    onClick={() => window.location.href = `/applications/${application.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {application.applicationId}
                  </button>
                </TableCell>
              )}
              {effectiveColumnVisibility.facilityName && (
                <TableCell className="text-sm text-gray-600">
                  {application.facilityName || '-'}
                </TableCell>
              )}
              {effectiveColumnVisibility.activityType && (
                <TableCell>
                  {getActivityBadge(application.activityType)}
                </TableCell>
              )}
              {effectiveColumnVisibility.status && (
                <TableCell>
                  {getStatusBadge(application)}
                </TableCell>
              )}
              {effectiveColumnVisibility.createdAt && (
                <TableCell className="text-sm text-gray-500">
                  {formatDate(application.createdAt)}
                </TableCell>
              )}
              {effectiveColumnVisibility.title && (
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{application.title}</p>
                  </div>
                </TableCell>
              )}
              {effectiveColumnVisibility.description && (
                <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                  {application.description || '-'}
                </TableCell>
              )}
              {effectiveColumnVisibility.updatedAt && (
                <TableCell className="text-sm text-gray-500">
                  {application.updatedAt ? formatDate(application.updatedAt) : '-'}
                </TableCell>
              )}
              {effectiveColumnVisibility.submittedAt && (
                <TableCell className="text-sm text-gray-500">
                  {getSubmissionStatus(application)}
                </TableCell>
              )}
              {effectiveColumnVisibility.contractors && (
                <TableCell>
                  {getContractorsDisplay(application)}
                </TableCell>
              )}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => window.location.href = `/applications/${application.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {(application.status === 'draft' || application.status === 'needs_revision') && (
                      <DropdownMenuItem onClick={() => window.location.href = `/applications/${application.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Application
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(application.applicationId)}>
                      Copy Application ID
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
