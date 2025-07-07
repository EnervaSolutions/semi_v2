import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Wrench, Plus, X, Edit, Save } from "lucide-react";

interface ContractorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissionLevel: string;
  isActive: boolean;
  company?: {
    id: number;
    name: string;
    shortName: string;
  };
}

interface ContractorCompany {
  id: number;
  name: string;
  shortName: string;
  serviceRegions: string[];
  supportedActivities: string[];
  capitalRetrofitTechnologies?: string[];
  isActive: boolean;
  phone?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

const AVAILABLE_REGIONS = [
  "Calgary and Area",
  "Edmonton and Area", 
  "Lethbridge and Area",
  "Medicine Hat and Area",
  "Red Deer and Area",
  "Fort McMurray and Area",
  "Other Parts of Alberta"
];

const AVAILABLE_ACTIVITIES = [
  "Capital Retrofit",
  "Energy Management Information System",
  "Energy Auditing and Assessment"
];

const CAPITAL_RETROFIT_TECHNOLOGIES = [
  "Lighting",
  "Solar PV", 
  "HVAC",
  "Process Heating",
  "Geothermal",
  "Process Cooling and Refrigeration",
  "Pump Driven Systems",
  "Fan Driven Systems", 
  "Compressed Air",
  "Building Envelope",
  "Other"
];

export default function ContractorServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    serviceRegions: [] as string[],
    supportedActivities: [] as string[],
    capitalRetrofitTechnologies: [] as string[]
  });
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(false);

  // Fetch current user
  const { data: user } = useQuery<ContractorUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch contractor company info
  const { data: contractorCompany, isLoading: companyLoading } = useQuery<ContractorCompany>({
    queryKey: ["/api/contractor/company"],
    enabled: !!user?.id,
  });

  // Update services mutation
  const updateServicesMutation = useMutation({
    mutationFn: (data: { serviceRegions: string[]; supportedActivities: string[]; capitalRetrofitTechnologies: string[] }) =>
      apiRequest(`/api/contractor/services`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/company"] });
      toast({ title: "Services updated successfully" });
      setIsEditing(false);
      setCodeOfConductAccepted(false);
    },
    onError: () => {
      toast({ title: "Failed to update services", variant: "destructive" });
    },
  });

  const startEditing = () => {
    setEditData({
      serviceRegions: contractorCompany?.serviceRegions || [],
      supportedActivities: contractorCompany?.supportedActivities || [],
      capitalRetrofitTechnologies: contractorCompany?.capitalRetrofitTechnologies || []
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setCodeOfConductAccepted(false);
    setEditData({
      serviceRegions: [],
      supportedActivities: [],
      capitalRetrofitTechnologies: []
    });
  };

  const saveChanges = () => {
    if (!codeOfConductAccepted) {
      toast({ 
        title: "Code of conduct acceptance required", 
        description: "You must accept the contractor code of conduct before updating services.",
        variant: "destructive" 
      });
      return;
    }
    updateServicesMutation.mutate(editData);
  };

  const toggleRegion = (region: string) => {
    setEditData(prev => ({
      ...prev,
      serviceRegions: prev.serviceRegions.includes(region)
        ? prev.serviceRegions.filter(r => r !== region)
        : [...prev.serviceRegions, region]
    }));
  };

  const toggleActivity = (activity: string) => {
    setEditData(prev => ({
      ...prev,
      supportedActivities: prev.supportedActivities.includes(activity)
        ? prev.supportedActivities.filter(a => a !== activity)
        : [...prev.supportedActivities, activity]
    }));
  };

  const toggleCapitalRetrofitTechnology = (technology: string) => {
    setEditData(prev => ({
      ...prev,
      capitalRetrofitTechnologies: prev.capitalRetrofitTechnologies.includes(technology)
        ? prev.capitalRetrofitTechnologies.filter(t => t !== technology)
        : [...prev.capitalRetrofitTechnologies, technology]
    }));
  };

  if (companyLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const canEdit = user?.role === "contractor_individual";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services & Regions</h1>
          <p className="text-gray-600 mt-1">
            Manage your company's service offerings and regional coverage
          </p>
        </div>
        {canEdit && !isEditing && (
          <Button onClick={startEditing} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Services
          </Button>
        )}
        {isEditing && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="codeOfConduct"
                checked={codeOfConductAccepted}
                onCheckedChange={(checked) => setCodeOfConductAccepted(checked as boolean)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="codeOfConduct" className="text-sm font-medium cursor-pointer">
                I accept the Contractor Code of Conduct and agree to comply with all requirements
              </Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={saveChanges} 
                disabled={updateServicesMutation.isPending || !codeOfConductAccepted}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateServicesMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Regions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Service Regions
            </CardTitle>
            <CardDescription>
              Select the regions where your company provides services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                {AVAILABLE_REGIONS.map((region) => (
                  <div key={region} className="flex items-center space-x-2">
                    <Checkbox
                      id={`region-${region}`}
                      checked={editData.serviceRegions.includes(region)}
                      onCheckedChange={() => toggleRegion(region)}
                    />
                    <Label htmlFor={`region-${region}`} className="text-sm">
                      {region}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {contractorCompany?.serviceRegions?.length ? (
                  contractorCompany.serviceRegions.map((region, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{region}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No service regions configured</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supported Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-600" />
              Supported Activities
            </CardTitle>
            <CardDescription>
              Select the types of energy efficiency activities your company offers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                {AVAILABLE_ACTIVITIES.map((activity) => (
                  <div key={activity}>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`activity-${activity}`}
                        checked={editData.supportedActivities.includes(activity)}
                        onCheckedChange={() => toggleActivity(activity)}
                      />
                      <Label htmlFor={`activity-${activity}`} className="text-sm font-medium">
                        {activity}
                      </Label>
                    </div>
                    
                    {/* Capital Retrofit Technologies Sub-options */}
                    {activity === "Capital Retrofit" && editData.supportedActivities.includes("Capital Retrofit") && (
                      <div className="ml-6 mt-3 space-y-2">
                        <Label className="text-xs text-gray-600 font-medium">Select specific technologies:</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {CAPITAL_RETROFIT_TECHNOLOGIES.map((technology) => (
                            <div key={technology} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tech-${technology}`}
                                checked={editData.capitalRetrofitTechnologies.includes(technology)}
                                onCheckedChange={() => toggleCapitalRetrofitTechnology(technology)}
                              />
                              <Label htmlFor={`tech-${technology}`} className="text-xs">
                                {technology}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {contractorCompany?.supportedActivities?.length ? (
                  contractorCompany.supportedActivities.map((activity, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                        <Wrench className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{activity}</span>
                      </div>
                      
                      {/* Show Capital Retrofit Technologies if they exist */}
                      {activity === "Capital Retrofit" && contractorCompany?.capitalRetrofitTechnologies?.length ? (
                        <div className="ml-6 space-y-1">
                          <span className="text-xs text-gray-600 font-medium">Technologies:</span>
                          <div className="grid grid-cols-2 gap-1">
                            {contractorCompany.capitalRetrofitTechnologies.map((tech, techIndex) => (
                              <div key={techIndex} className="flex items-center gap-1 text-xs text-gray-700">
                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                {tech}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No supported activities configured</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage Summary */}
      {!isEditing && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Service Coverage Summary</CardTitle>
            <CardDescription>
              Overview of your company's current service capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {contractorCompany?.serviceRegions?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Service Regions</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {contractorCompany?.supportedActivities?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Activity Types</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {contractorCompany?.isActive ? "Active" : "Inactive"}
                </div>
                <div className="text-sm text-gray-600">Visibility Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}