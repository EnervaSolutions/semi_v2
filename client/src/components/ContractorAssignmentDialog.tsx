import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Building2, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Contractor {
  id: number;
  name: string;
  shortName: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  businessMobile: string;
  supportedActivities: string[];
  serviceRegions: string[];
  capitalRetrofitTechnologies: string[];
  contractorDetails?: {
    supportedActivities: string[];
    serviceRegions: string[];
    technologyCapabilities: string[];
  };
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    businessMobile: string;
    role: string;
  }>;
}

interface ContractorAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: number;
  activityType: string;
  applicationTitle: string;
}

const ACTIVITY_LABELS = {
  FRA: "Facility Readiness Assessment",
  EAA: "Energy Assessments and Audits", 
  SEM: "Strategic Energy Management",
  EMIS: "Energy Management Information Systems",
  CR: "Capital Retrofits"
};

const REGIONS = [
  "Calgary and Area", "Edmonton and Area", "Lethbridge and Area", 
  "Medicine Hat and Area", "Red Deer and Area", "Fort McMurray and Area", 
  "Other Parts of Alberta"
];

export default function ContractorAssignmentDialog({
  open,
  onOpenChange,
  applicationId,
  activityType,
  applicationTitle
}: ContractorAssignmentDialogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedContractors, setSelectedContractors] = useState<Set<number>>(new Set());

  // Query for assigned contractors to pre-populate selection
  const { data: assignedContractors = [] } = useQuery({
    queryKey: ["/api/applications", applicationId, "assigned-contractors"],
    queryFn: async () => {
      const response = await apiRequest(`/api/applications/${applicationId}/assigned-contractors`, "GET");
      return response.json();
    },
    enabled: open && !!applicationId,
  });

  // Pre-populate selected contractors when dialog opens
  React.useEffect(() => {
    if (open && assignedContractors.length > 0) {
      const assignedCompanyIds = new Set<number>(
        assignedContractors.map((assignment: any) => assignment.contractorCompany?.id).filter((id): id is number => Boolean(id))
      );
      setSelectedContractors(assignedCompanyIds);
    }
  }, [open, assignedContractors]);

  // Fetch contractors based on activity type and filters
  const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
    queryKey: ["/api/contractors/search", activityType, selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activityType && activityType !== 'FRA' && activityType !== 'SEM') {
        params.append('activityType', activityType);
      }
      if (selectedRegion && selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      const response = await apiRequest(`/api/contractors/search?${params.toString()}`, "GET");
      return response.json();
    },
    enabled: open,
  });

  // Enhanced filtering and sorting logic
  const filteredContractors = contractors
    .filter(contractor => {
      // Basic search term filtering
      const matchesSearch = !searchTerm || 
        contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.supportedActivities?.some(activity => 
          activity.toLowerCase().includes(searchTerm.toLowerCase())
        );

      return matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical sorting

  // Assign multiple contractors mutation
  const assignContractorsMutation = useMutation({
    mutationFn: async (contractorCompanyIds: number[]) => {
      const response = await apiRequest(`/api/applications/${applicationId}/assign-contractor`, "POST", {
        contractorCompanyIds
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contractors Assigned",
        description: `${selectedContractors.size} contractor(s) assigned successfully`,
      });
      // Invalidate both applications and assigned contractors queries
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "assigned-contractors"] });
      resetAndClose();
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign contractors",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (selectedContractors.size > 0) {
      assignContractorsMutation.mutate(Array.from(selectedContractors));
    }
  };

  const toggleContractorSelection = (contractorId: number) => {
    const newSelection = new Set(selectedContractors);
    if (newSelection.has(contractorId)) {
      newSelection.delete(contractorId);
    } else {
      newSelection.add(contractorId);
    }
    setSelectedContractors(newSelection);
  };

  const resetAndClose = () => {
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedContractors(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Contractor</DialogTitle>
          <DialogDescription>
            Select a contractor to assign to "{applicationTitle}" ({ACTIVITY_LABELS[activityType as keyof typeof ACTIVITY_LABELS]})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search and Filter Controls */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contractors by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {isLoading ? "Loading contractors..." : `${filteredContractors.length} contractor(s) available`}
              {activityType !== 'FRA' && activityType !== 'SEM' && (
                <span className="ml-2">
                  <Badge variant="outline">Supporting {activityType}</Badge>
                </span>
              )}
            </p>
          </div>

          {/* Contractor List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading contractors...</div>
              </div>
            ) : filteredContractors.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No contractors found matching your criteria</p>
                  <p className="text-sm mt-2">Try adjusting your search or region filter</p>
                </div>
              </div>
            ) : (
              filteredContractors.map((contractor) => (
                <Card 
                  key={contractor.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedContractors.has(contractor.id)
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => toggleContractorSelection(contractor.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold text-lg">{contractor.name}</h3>
                          <Badge variant="secondary">{contractor.shortName}</Badge>
                          {selectedContractors.has(contractor.id) && (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>

                        {/* Company Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          {/* Contact Information */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Contact Information</h4>
                            {(contractor.streetAddress || contractor.city) && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                                <div className="text-sm text-gray-600">
                                  {contractor.streetAddress && <div>{contractor.streetAddress}</div>}
                                  {contractor.city && (
                                    <div>
                                      {contractor.city}
                                      {contractor.province && `, ${contractor.province}`}
                                      {contractor.postalCode && ` ${contractor.postalCode}`}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {(contractor.phone || contractor.businessMobile) && (
                              <div className="text-sm text-gray-600">
                                <strong>Phone:</strong> {contractor.phone || contractor.businessMobile}
                              </div>
                            )}
                            {contractor.users && contractor.users.length > 0 && (
                              <>
                                <div className="text-sm text-gray-600">
                                  <strong>Email:</strong> {contractor.users[0].email}
                                </div>
                                {contractor.users[0].businessMobile && (
                                  <div className="text-sm text-gray-600">
                                    <strong>Mobile:</strong> {contractor.users[0].businessMobile}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Services & Capabilities */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Services & Capabilities</h4>
                            
                            {/* Supported Activities */}
                            {(contractor.supportedActivities || contractor.contractorDetails?.supportedActivities) && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Supported Activities:</p>
                                <div className="flex flex-wrap gap-1">
                                  {(contractor.supportedActivities || contractor.contractorDetails?.supportedActivities || []).map((activity) => (
                                    <Badge key={activity} variant="outline" className="text-xs">
                                      {activity}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Service Regions */}
                            {(contractor.serviceRegions || contractor.contractorDetails?.serviceRegions) && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Service Regions:</p>
                                <div className="flex flex-wrap gap-1">
                                  {(contractor.serviceRegions || contractor.contractorDetails?.serviceRegions || []).map((region) => (
                                    <Badge key={region} variant="secondary" className="text-xs">
                                      {region}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Capital Retrofit Technologies */}
                            {contractor.capitalRetrofitTechnologies && contractor.capitalRetrofitTechnologies.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Capital Retrofit Technologies:</p>
                                <div className="flex flex-wrap gap-1">
                                  {contractor.capitalRetrofitTechnologies.map((tech) => (
                                    <Badge key={tech} variant="outline" className="text-xs bg-green-50 text-green-700">
                                      {tech}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedContractors.size > 0 && (
                <span>{selectedContractors.size} contractor{selectedContractors.size === 1 ? '' : 's'} selected</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssign}
                disabled={selectedContractors.size === 0 || assignContractorsMutation.isPending}
              >
                {assignContractorsMutation.isPending 
                  ? "Assigning..." 
                  : `Assign ${selectedContractors.size === 0 ? '' : selectedContractors.size + ' '}Contractor${selectedContractors.size === 1 ? '' : 's'}`
                }
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}