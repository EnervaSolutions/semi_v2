import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building2, Settings, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_TYPES } from "@/lib/constants";

export default function AdminFacilityActivitiesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);

  // Fetch all companies
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/admin/companies"],
  });

  // Fetch facilities for selected company
  const { data: companyFacilities = [] } = useQuery({
    queryKey: ["/api/admin/facilities", selectedCompany?.id],
    queryFn: () => fetch(`/api/admin/facilities/${selectedCompany?.id}`).then(res => res.json()),
    enabled: !!selectedCompany?.id,
  });

  // Fetch facility activity settings for selected facility
  const { data: facilityActivitySettings = [] } = useQuery({
    queryKey: ["/api/admin/facility-activities", selectedFacility?.id],
    queryFn: () => fetch(`/api/admin/facility-activities/${selectedFacility?.id}`).then(res => res.json()),
    enabled: !!selectedFacility?.id,
  });

  // Mutation to toggle facility activity settings
  const toggleFacilityActivityMutation = useMutation({
    mutationFn: async ({ facilityId, activityType, isEnabled }: { facilityId: number; activityType: string; isEnabled: boolean }) => {
      return await apiRequest(`/api/admin/facility-activities/${facilityId}/${activityType}`, "PATCH", {
        isEnabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/facility-activities", selectedFacility?.id] });
      toast({
        title: "Success",
        description: "Facility activity setting updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not update facility activity setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredCompanies = companies.filter((company: any) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleActivity = (activityType: string, currentEnabled: boolean) => {
    if (!selectedFacility) return;
    
    toggleFacilityActivityMutation.mutate({
      facilityId: selectedFacility.id,
      activityType,
      isEnabled: !currentEnabled
    });
  };

  const getActivityColor = (activityType: string) => {
    const activity = ACTIVITY_TYPES[activityType as keyof typeof ACTIVITY_TYPES];
    return activity?.color || 'gray';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facility Activity Management</h1>
          <p className="text-gray-600">Enable/disable activities for specific facilities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCompanies.map((company: any) => (
                  <div
                    key={company.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCompany?.id === company.id
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedCompany(company);
                      setSelectedFacility(null);
                    }}
                  >
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-gray-500">{company.shortName}</div>
                    {company.isContractor && (
                      <Badge className="mt-1 bg-orange-100 text-orange-800">Contractor</Badge>
                    )}
                  </div>
                ))}
              </div>

              {filteredCompanies.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No companies found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Facility Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Select Facility
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCompany ? (
              <div className="text-center text-gray-500 py-8">
                Select a company to view facilities
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companyFacilities.map((facility: any) => (
                  <div
                    key={facility.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFacility?.id === facility.id
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFacility(facility)}
                  >
                    <div className="font-medium">{facility.name}</div>
                    <div className="text-sm text-gray-500">Code: {facility.code}</div>
                    {facility.naicsCode && (
                      <div className="text-xs text-gray-400">NAICS: {facility.naicsCode}</div>
                    )}
                  </div>
                ))}

                {companyFacilities.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No facilities found for this company
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Activity Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedFacility ? (
              <div className="text-center text-gray-500 py-8">
                Select a facility to manage activities
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="font-medium">{selectedFacility.name}</h4>
                  <p className="text-sm text-gray-500">{selectedCompany.name}</p>
                </div>

                {Object.entries(ACTIVITY_TYPES).map(([activityType, activity]) => {
                  const setting = facilityActivitySettings.find((s: any) => s.activityType === activityType);
                  // FRA is enabled by default if no explicit setting exists (matches user experience)
                  const isEnabled = setting?.isEnabled || (activityType === 'FRA' && !setting);

                  return (
                    <div
                      key={activityType}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={`bg-${activity.color}-100 text-${activity.color}-800`}
                          >
                            {activity.icon}
                          </Badge>
                          <span className="font-medium">{activity.name}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {activity.description}
                          {activityType === 'FRA' && (
                            <span className="text-blue-600 font-medium"> (Enabled by default)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEnabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleActivity(activityType, isEnabled)}
                          disabled={toggleFacilityActivityMutation.isPending}
                        />
                      </div>
                    </div>
                  );
                })}

                {facilityActivitySettings.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    Loading activity settings...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Selection Summary */}
      {selectedCompany && selectedFacility && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(ACTIVITY_TYPES).map(([activityType, activity]) => {
                const setting = facilityActivitySettings.find((s: any) => s.activityType === activityType);
                // FRA is enabled by default if no explicit setting exists (matches user experience)
                const isEnabled = setting?.isEnabled || (activityType === 'FRA' && !setting);

                return (
                  <div key={activityType} className="text-center">
                    <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold
                      ${isEnabled ? `bg-${activity.color}-600` : 'bg-gray-400'}`}>
                      {activity.icon}
                    </div>
                    <div className="font-medium text-sm">{activityType}</div>
                    <div className={`text-xs ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}