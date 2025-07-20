import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Archive, Database, AlertTriangle, Trash2, RefreshCw, Info, Building, MapPin, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import EntityDetailsDialog from '@/components/ArchiveDialog';

// Helper functions for entity visualization
function getEntityIcon(type: string) {
  switch (type) {
    case 'company': return Building;
    case 'facility': return MapPin;
    case 'application': return FileText;
    default: return Archive;
  }
}

function getEntityColor(type: string) {
  switch (type) {
    case 'company': return 'bg-blue-500';
    case 'facility': return 'bg-green-500';
    case 'application': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
}

interface ArchivedEntity {
  id: number;
  type: string;
  name: string;
  archivedAt: string;
  reason?: string;
  createdAt: string;
}

interface EntityRowProps {
  entity: ArchivedEntity;
  isSelected: boolean;
  onSelect: (entityId: number, checked: boolean) => void;
  onViewDetails: (entityId: number, entityType: string) => void;
  level: 'company' | 'facility' | 'application';
}

function EntityRow({ entity, isSelected, onSelect, onViewDetails, level }: EntityRowProps) {
  const EntityIcon = getEntityIcon(entity.type);
  const indentClass = level === 'facility' ? 'ml-8' : level === 'application' ? 'ml-16' : '';

  return (
    <div className={`flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 ${indentClass}`}>
      <div className="flex items-center space-x-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(entity.id, checked as boolean)}
        />
        <div className={`w-2 h-2 rounded-full ${getEntityColor(entity.type)}`} />
        <EntityIcon className="w-4 h-4 text-gray-600" />
        <div>
          <p className="font-medium text-sm">{entity.displayName}</p>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Badge variant="outline" className="capitalize text-xs">
              {entity.type}
            </Badge>
            <span>Archived {new Date(entity.archivedAt).toLocaleDateString()}</span>
            {entity.parentCompany && (
              <span className="text-blue-600">• {entity.parentCompany}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(entity.id, entity.type)}
        >
          <Info className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminArchiveSettingsPage() {
  const { toast } = useToast();
  const [selectedEntities, setSelectedEntities] = useState<number[]>([]);
  const [showEntityDetailsDialog, setShowEntityDetailsDialog] = useState(false);
  const [selectedEntityDetails, setSelectedEntityDetails] = useState<any>(null);

  // Fetch archived entities
  const { data: archivedEntities, isLoading: loadingArchived, refetch: refetchArchived, error: archiveError } = useQuery({
    queryKey: ['/api/admin/archive/entities'],
    refetchOnWindowFocus: false,
    retry: 3,
    onError: (error) => {
      console.error('Error fetching archived entities:', error);
      toast({ title: "Error", description: "Failed to fetch archived entities", variant: "destructive" });
    },
    onSuccess: (data) => {
      console.log('Archive entities loaded:', data);
    }
  });

  // Fetch ghost application IDs
  const { data: ghostApplicationIds, isLoading: loadingGhostIds, refetch: refetchGhostIds } = useQuery({
    queryKey: ['/api/admin/ghost-application-ids'],
    refetchOnWindowFocus: false
  });

  // Mutations for archive operations
  const restoreEntitiesMutation = useMutation({
    mutationFn: async (entityIds: number[]) => {
      const response = await fetch('/api/admin/archive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityIds })
      });
      if (!response.ok) throw new Error('Failed to restore entities');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Entities restored successfully" });
      setSelectedEntities([]);
      refetchArchived();
      // Invalidate all related queries so restored entities appear throughout the system
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore entities", variant: "destructive" });
    }
  });

  const deleteEntitiesMutation = useMutation({
    mutationFn: async (entityIds: number[]) => {
      const response = await fetch('/api/admin/archive/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityIds })
      });
      if (!response.ok) throw new Error('Failed to delete entities');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Entities deleted successfully" });
      setSelectedEntities([]);
      refetchArchived();
      // Invalidate all related queries to refresh the system after permanent deletion
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete entities", variant: "destructive" });
    }
  });

  const clearAllGhostIdsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/ghost-application-ids', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to clear ghost IDs');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "All ghost application IDs cleared" });
      refetchGhostIds();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to clear ghost IDs", variant: "destructive" });
    }
  });

  const clearSingleGhostIdMutation = useMutation({
    mutationFn: async (ghostId: number) => {
      const response = await fetch(`/api/admin/ghost-application-ids/${ghostId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to clear ghost ID');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Ghost application ID cleared" });
      refetchGhostIds();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to clear ghost ID", variant: "destructive" });
    }
  });

  // Handler functions
  const handleEntitySelection = (entityId: number, checked: boolean) => {
    if (checked) {
      setSelectedEntities([...selectedEntities, entityId]);
    } else {
      setSelectedEntities(selectedEntities.filter(id => id !== entityId));
    }
  };

  const fetchEntityDetails = async (entityId: number, entityType: string) => {
    try {
      const response = await fetch(`/api/admin/archive/entities/${entityId}/${entityType}`);
      if (!response.ok) throw new Error('Failed to fetch entity details');
      const details = await response.json();
      setSelectedEntityDetails(details);
      setShowEntityDetailsDialog(true);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch entity details", variant: "destructive" });
    }
  };

  const handleBulkRestore = () => {
    if (selectedEntities.length === 0) {
      toast({ title: "Warning", description: "Please select entities to restore", variant: "destructive" });
      return;
    }
    restoreEntitiesMutation.mutate(selectedEntities);
  };

  const handleBulkDelete = () => {
    if (selectedEntities.length === 0) {
      toast({ title: "Warning", description: "Please select entities to delete", variant: "destructive" });
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete ${selectedEntities.length} entities? This cannot be undone.`)) {
      deleteEntitiesMutation.mutate(selectedEntities);
    }
  };

  const selectAllEntities = () => {
    if (Array.isArray(archivedEntities) && archivedEntities.length > 0) {
      setSelectedEntities(archivedEntities.map((entity: ArchivedEntity) => entity.id));
    }
  };

  const clearSelection = () => {
    setSelectedEntities([]);
  };

  // Flatten and group the hierarchical archived entities structure
  const groupedEntities = useMemo(() => {
    console.log('ARCHIVE DEBUG - Raw archived entities data:', archivedEntities);

    if (!archivedEntities || !Array.isArray(archivedEntities) || archivedEntities.length === 0) {
      console.log('ARCHIVE DEBUG - No data to group');
      return {};
    }

    const flatEntities: any[] = [];

    // Process the hierarchical structure from backend
    archivedEntities.forEach((entity: any) => {
      console.log('ARCHIVE DEBUG - Processing entity:', entity);

      if (entity.type === 'company') {
        // Add the company itself
        flatEntities.push({
          ...entity,
          displayName: entity.name,
          type: 'company'
        });

        // Add nested facilities if they exist
        if (entity.facilities && Array.isArray(entity.facilities)) {
          entity.facilities.forEach((facility: any) => {
            flatEntities.push({
              ...facility,
              displayName: facility.name,
              type: 'facility',
              parentCompany: entity.name
            });
          });
        }

        // Add nested applications if they exist
        if (entity.applications && Array.isArray(entity.applications)) {
          entity.applications.forEach((application: any) => {
            flatEntities.push({
              ...application,
              displayName: application.name || application.applicationId,
              type: 'application',
              parentCompany: entity.name
            });
          });
        }
      } else {
        // Handle orphaned facilities and applications
        flatEntities.push({
          ...entity,
          displayName: entity.name || entity.applicationId || entity.title,
          type: entity.type
        });
      }
    });

    // Group the flattened entities by type
    const grouped = flatEntities.reduce((acc: any, entity: any) => {
      const entityType = entity.type;

      if (!acc[entityType]) {
        acc[entityType] = [];
      }

      acc[entityType].push(entity);
      return acc;
    }, {});

    console.log('ARCHIVE DEBUG - Flattened entities:', flatEntities.length);
    console.log('ARCHIVE DEBUG - Final grouped entities:', grouped);
    return grouped;
  }, [archivedEntities]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Archive className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Archive Management</h1>
      </div>

      <Tabs defaultValue="archived" className="space-y-4">
        <TabsList>
          <TabsTrigger value="archived">Archived Entities</TabsTrigger>
          <TabsTrigger value="ghost-ids">Ghost ID Management</TabsTrigger>
        </TabsList>

        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5" />
                  Archived Entities ({archivedEntities?.length || 0})
                </div>
                <div className="flex items-center gap-2">
                  {selectedEntities.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkRestore}
                        disabled={restoreEntitiesMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Restore ({selectedEntities.length})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={deleteEntitiesMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete ({selectedEntities.length})
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={selectAllEntities}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingArchived ? (
                <div className="text-center py-8">Loading archived entities...</div>
              ) : !archivedEntities ? (
                <div className="text-center py-8 text-gray-500">
                  No archived entities data received
                </div>
              ) : !Array.isArray(archivedEntities) ? (
                <div className="text-center py-8 text-red-500">
                  Error: Invalid data format received. Data type: {typeof archivedEntities}
                </div>
              ) : archivedEntities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No archived entities found
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="mb-4 text-sm text-gray-600">
                    Found {archivedEntities.length} archived entities
                  </div>
                  {Object.entries(groupedEntities).map(([type, entities]) => (
                    <div key={type}>
                      <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide py-2">
                        {type}s ({Array.isArray(entities) ? entities.length : 0})
                      </h3>
                      {Array.isArray(entities) && entities.map((entity: ArchivedEntity) => (
                        <EntityRow
                          key={`${entity.type}-${entity.id}`}
                          entity={entity}
                          isSelected={selectedEntities.includes(entity.id)}
                          onSelect={handleEntitySelection}
                          onViewDetails={fetchEntityDetails}
                          level={entity.type as 'company' | 'facility' | 'application'}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ghost-ids" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Ghost Application IDs
                </div>
                {ghostApplicationIds && ghostApplicationIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Clear all ghost application IDs? This will make them available for reuse.')) {
                        clearAllGhostIdsMutation.mutate();
                      }
                    }}
                    disabled={clearAllGhostIdsMutation.isPending}
                  >
                    Clear All Ghost IDs
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGhostIds ? (
                <div className="text-center py-8">Loading ghost IDs...</div>
              ) : !ghostApplicationIds || ghostApplicationIds.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500">All application IDs are available for reuse</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ghostApplicationIds.map((ghostId: any) => (
                    <div key={ghostId.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{ghostId.applicationId}</p>
                        <p className="text-sm text-gray-500">
                          {ghostId.companyName} • {ghostId.facilityName} • {ghostId.activityType}
                        </p>
                        <p className="text-xs text-gray-400">
                          Deleted: {new Date(ghostId.deletedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{ghostId.activityType}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Clear ghost ID ${ghostId.applicationId}? This will make it available for reuse.`)) {
                              clearSingleGhostIdMutation.mutate(ghostId.id);
                            }
                          }}
                          disabled={clearSingleGhostIdMutation.isPending}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entity Details Dialog */}
      <EntityDetailsDialog
        open={showEntityDetailsDialog}
        onOpenChange={setShowEntityDetailsDialog}
        entityDetails={selectedEntityDetails}
      />
    </div>
  );
}