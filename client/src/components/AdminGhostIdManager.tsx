import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Search, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GhostApplicationId {
  applicationId: string;
  companyName: string;
  facilityName: string;
  activityType: string;
  deletedAt: string;
}

export function AdminGhostIdManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [applicationIdToDelete, setApplicationIdToDelete] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGhostIds, setSelectedGhostIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Query for companies
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/admin/companies'],
  });

  // Query for ghost application IDs
  const { data: ghostIds = [], isLoading: isLoadingGhosts, refetch: refetchGhosts } = useQuery({
    queryKey: ['/api/admin/ghost-application-ids'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/ghost-application-ids', 'GET');
      if (!response.ok) throw new Error('Failed to fetch ghost IDs');
      return response.json();
    },
  });

  // Mutation to clear ghost application ID
  const clearGhostIdMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await apiRequest(`/api/admin/clear-ghost-application-id`, 'DELETE', {
        applicationId
      });
      if (!response.ok) throw new Error('Failed to clear ghost application ID');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ghost ID Cleared",
        description: "The application ID is now available for reuse.",
      });
      refetchGhosts();
      setIsDeleteDialogOpen(false);
      setApplicationIdToDelete("");
      // Remove from selected set if it was selected
      setSelectedGhostIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicationIdToDelete);
        return newSet;
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear ghost application ID.",
        variant: "destructive",
      });
    },
  });

  // Mutation for bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (applicationIds: string[]) => {
      const response = await apiRequest('/api/admin/bulk-clear-ghost-application-ids', 'DELETE', {
        applicationIds
      });
      if (!response.ok) throw new Error('Failed to bulk clear ghost application IDs');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ghost IDs Cleared",
        description: `Successfully cleared ${data.clearedCount} ghost application IDs.`,
      });
      refetchGhosts();
      setSelectedGhostIds(new Set());
      setIsBulkDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to bulk clear ghost application IDs.",
        variant: "destructive",
      });
    },
  });

  const handleClearGhostId = (applicationId: string) => {
    setApplicationIdToDelete(applicationId);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedGhostIds.size === 0) return;
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedGhostIds));
  };

  const handleSelectGhostId = (applicationId: string, checked: boolean) => {
    setSelectedGhostIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(applicationId);
      } else {
        newSet.delete(applicationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGhostIds(new Set(filteredGhostIds.map((ghost: any) => ghost.applicationId)));
    } else {
      setSelectedGhostIds(new Set());
    }
  };

  // Filter ghost IDs by selected company
  const filteredGhostIds = selectedCompanyId === "all" 
    ? ghostIds 
    : ghostIds.filter((ghost: any) => ghost.companyId === parseInt(selectedCompanyId));

  const isAllSelected = filteredGhostIds.length > 0 && selectedGhostIds.size === filteredGhostIds.length;
  const isPartiallySelected = selectedGhostIds.size > 0 && selectedGhostIds.size < filteredGhostIds.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Ghost Application ID Manager
        </CardTitle>
        <CardDescription>
          Manage application IDs from deleted applications. Clear ghost IDs to make them available for reuse.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Filter */}
        <div className="space-y-2">
          <Label htmlFor="company-filter">Filter by Company</Label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Select company to filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {(companies as any[]).map((company: any) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name} ({company.shortName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {filteredGhostIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selectedGhostIds.size > 0 
                  ? `${selectedGhostIds.size} of ${filteredGhostIds.length} selected`
                  : selectedCompanyId === "all"
                    ? `${ghostIds.length} ghost IDs total`
                    : `${filteredGhostIds.length} ghost IDs for selected company`
                }
              </span>
            </div>
            {selectedGhostIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Selected ({selectedGhostIds.size})
              </Button>
            )}
          </div>
        )}

        {/* Ghost IDs Display */}
        {isLoadingGhosts ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading ghost application IDs...</p>
          </div>
        ) : ghostIds.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No ghost application IDs found.</p>
          </div>
        ) : filteredGhostIds.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No ghost application IDs found for the selected company.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Ghost Application IDs
                {selectedCompanyId !== "all" && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({(companies as any[]).find(c => c.id.toString() === selectedCompanyId)?.name || 'Unknown Company'})
                  </span>
                )}
              </h3>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all ghost IDs"
                        {...(isPartiallySelected && { "data-state": "indeterminate" })}
                      />
                    </TableHead>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Original Title</TableHead>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Deleted Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGhostIds
                    .sort((a: any, b: any) => a.applicationId.localeCompare(b.applicationId))
                    .map((ghostId: any) => (
                    <TableRow key={ghostId.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedGhostIds.has(ghostId.applicationId)}
                          onCheckedChange={(checked) => handleSelectGhostId(ghostId.applicationId, checked as boolean)}
                          aria-label={`Select ${ghostId.applicationId}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {ghostId.applicationId}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {ghostId.companyName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {ghostId.originalTitle || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {ghostId.activityType}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(ghostId.deletedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearGhostId(ghostId.applicationId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Clear
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Ghost ID Clearance</DialogTitle>
              <DialogDescription>
                Are you sure you want to clear the ghost application ID "{applicationIdToDelete}"? 
                This will make the ID available for reuse in new applications.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => clearGhostIdMutation.mutate(applicationIdToDelete)}
                disabled={clearGhostIdMutation.isPending}
              >
                {clearGhostIdMutation.isPending ? "Clearing..." : "Clear Ghost ID"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Bulk Ghost ID Clearance</DialogTitle>
              <DialogDescription>
                Are you sure you want to clear {selectedGhostIds.size} ghost application IDs? 
                This will make all selected IDs available for reuse in new applications.
                <br /><br />
                <strong>Selected IDs:</strong>
                <div className="mt-2 p-2 bg-gray-100 rounded text-sm font-mono max-h-32 overflow-y-auto">
                  {Array.from(selectedGhostIds).sort().join(', ')}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsBulkDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? "Clearing..." : `Clear ${selectedGhostIds.size} Ghost IDs`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}