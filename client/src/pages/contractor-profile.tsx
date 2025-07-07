import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Globe, Phone, MapPin, Edit, Save, X, Eye, EyeOff } from "lucide-react";

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
  isActive: boolean;
  phone?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

export default function ContractorProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: "",
    phone: "",
    website: ""
  });

  // Fetch current user
  const { data: user } = useQuery<ContractorUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch contractor company info
  const { data: contractorCompany, isLoading: companyLoading } = useQuery<ContractorCompany>({
    queryKey: ["/api/contractor/company"],
    enabled: !!user?.id,
  });



  // Update company info mutation
  const updateCompanyMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; website: string }) =>
      apiRequest(`/api/companies/current`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/company"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] });
      toast({ title: "Company information updated successfully" });
      setIsEditingCompany(false);
    },
    onError: () => {
      toast({ title: "Failed to update company information", variant: "destructive" });
    },
  });

  const startEditingCompany = () => {
    setCompanyData({
      name: contractorCompany?.name || "",
      phone: contractorCompany?.phone || "",
      website: contractorCompany?.website || ""
    });
    setIsEditingCompany(true);
  };

  const cancelEditingCompany = () => {
    setIsEditingCompany(false);
    setCompanyData({ name: "", phone: "", website: "" });
  };

  const saveCompanyChanges = () => {
    updateCompanyMutation.mutate(companyData);
  };



  if (companyLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const canEdit = user?.role === "contractor_individual";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your contracting company information and visibility settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Company Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {contractorCompany?.isActive ? (
                <Eye className="h-5 w-5 text-green-600" />
              ) : (
                <EyeOff className="h-5 w-5 text-red-600" />
              )}
              Company Status
            </CardTitle>
            <CardDescription>
              Your company's current visibility status in the SEMI platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {contractorCompany?.isActive ? (
                    <>
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-green-900">Active Contractor</div>
                        <div className="text-sm text-green-700">
                          Visible to participating companies for project assignments
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-red-900">Inactive Contractor</div>
                        <div className="text-sm text-red-700">
                          Not visible to participating companies - contact SEMI administrators
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  {contractorCompany?.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="text-blue-600 mt-0.5">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">Status Management</div>
                    <div>
                      Your contractor status is managed by SEMI administrators. If you need to change your 
                      visibility status, please contact support through the platform messaging system.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Company Information
              </div>
              {canEdit && !isEditingCompany && (
                <Button variant="outline" onClick={startEditingCompany}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {isEditingCompany && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelEditingCompany}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveCompanyChanges}
                    disabled={updateCompanyMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateCompanyMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Basic company information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  {isEditingCompany ? (
                    <Input
                      id="companyName"
                      value={companyData.name}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter company name"
                    />
                  ) : (
                    <div className="mt-1 text-sm font-medium">{contractorCompany?.name}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor="shortName">Short Name</Label>
                  <div className="mt-1 text-sm font-medium">{contractorCompany?.shortName}</div>
                  <div className="text-xs text-gray-500">Short name cannot be changed</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditingCompany ? (
                    <Input
                      id="phone"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <div className="mt-1 text-sm">{contractorCompany?.phone || "Not provided"}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  {isEditingCompany ? (
                    <Input
                      id="website"
                      value={companyData.website}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="Enter website URL"
                    />
                  ) : (
                    <div className="mt-1 text-sm">
                      {contractorCompany?.website ? (
                        <a 
                          href={contractorCompany.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {contractorCompany.website}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your personal account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <div className="mt-1 text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="mt-1 text-sm">{user?.email}</div>
              </div>
              <div>
                <Label>Role</Label>
                <div className="mt-1 text-sm font-medium">
                  {user?.role === "contractor_individual" ? "Account Owner" : "Team Member"}
                </div>
              </div>
              <div>
                <Label>Permission Level</Label>
                <div className="mt-1 text-sm capitalize">{user?.permissionLevel}</div>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}