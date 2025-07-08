import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Settings, Key, Shield, ExternalLink, Edit2, Save, X } from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: ""
  });

  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: "",
    address: "",
    phone: "",
    website: ""
  });

  // Fetch user data
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch company data (only for company admins)
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["/api/companies/current"],
    enabled: user?.role === "company_admin",
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Profile Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Company update mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { name: string; address: string; phone: string; website: string }) => {
      const res = await apiRequest("PATCH", "/api/companies/current", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Company Information Updated",
        description: "Company information has been successfully updated.",
      });
      setIsEditingCompany(false);
      queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Company Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileEdit = () => {
    setProfileData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || ""
    });
    setIsEditingProfile(true);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      toast({
        title: "Invalid Input",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({
      firstName: profileData.firstName.trim(),
      lastName: profileData.lastName.trim()
    });
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    setProfileData({ firstName: "", lastName: "" });
  };

  const handleCompanyEdit = () => {
    setCompanyData({
      name: company?.name || "",
      address: company?.address || "",
      phone: company?.phone || "",
      website: company?.website || ""
    });
    setIsEditingCompany(true);
  };

  const handleCompanySave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyData.name.trim()) {
      toast({
        title: "Invalid Input",
        description: "Company name is required.",
        variant: "destructive",
      });
      return;
    }

    updateCompanyMutation.mutate(companyData);
  };

  const handleCompanyCancel = () => {
    setIsEditingCompany(false);
    setCompanyData({
      name: company?.name || "",
      address: company?.address || "",
      phone: company?.phone || "",
      website: company?.website || ""
    });
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "company_admin": return "Company Administrator";
      case "team_member": return "Team Member";
      case "contractor_individual": return "Individual Contractor";
      case "contractor_account_owner": return "Contractor Account Owner";
      case "system_admin": return "System Administrator";
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "company_admin": return "bg-blue-100 text-blue-800";
      case "team_member": return "bg-green-100 text-green-800";
      case "contractor_individual": return "bg-purple-100 text-purple-800";
      case "contractor_account_owner": return "bg-orange-100 text-orange-800";
      case "system_admin": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Helper to construct address from fields
  function getCompanyAddress(company: any) {
    if (company?.address && company.address.trim()) return company.address;
    const parts = [company?.streetAddress, company?.city, company?.province, company?.country, company?.postalCode]
      .map((x: string) => (x && x.trim()) ? x.trim() : null)
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  }

  function getCompanyPhone(company: any) {
    return company?.phone && company.phone.trim() ? company.phone : 'Not Provided';
  }

  function getCompanyWebsite(company: any) {
    return company?.website && company.website.trim() ? company.website : 'Not Provided';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Your basic account information and role within the SEMI program
                  </CardDescription>
                </div>
                {!isEditingProfile && (
                  <Button variant="outline" size="sm" onClick={handleProfileEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditingProfile ? (
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        placeholder="Enter your first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        placeholder="Enter your last name"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleProfileCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={user?.firstName || ""} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={user?.lastName || ""} readOnly />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email || ""} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleBadgeColor(user?.role)} variant="outline">
                    {getRoleDisplay(user?.role)}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-gray-500">User ID</div>
                    <div className="text-sm font-mono">{user?.id}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Account Created</div>
                    <div className="text-sm">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Last Updated</div>
                    <div className="text-sm">
                      {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {user?.role?.includes("contractor") && (
            <Card>
              <CardHeader>
                <CardTitle>Contractor Information</CardTitle>
                <CardDescription>
                  Your contractor registration details and compliance status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Complete your contractor registration to access full features
                  </p>
                  <Button>Complete Registration</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {user?.role === "company_admin" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>
                      Manage your company details and contact information
                    </CardDescription>
                  </div>
                  {!isEditingCompany && (
                    <Button variant="outline" onClick={handleCompanyEdit}>
                      Edit Company
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingCompany ? (
                  <form onSubmit={handleCompanySave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name *</Label>
                        <Input
                          id="companyName"
                          value={companyData.name}
                          onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter company name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyPhone">Phone Number</Label>
                        <Input
                          id="companyPhone"
                          value={companyData.phone}
                          onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyAddress">Address</Label>
                      <Input
                        id="companyAddress"
                        value={companyData.address}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter company address"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Website</Label>
                      <Input
                        id="companyWebsite"
                        value={companyData.website}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="Enter website URL"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        type="submit" 
                        disabled={updateCompanyMutation.isPending}
                      >
                        {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCompanyCancel}
                        disabled={updateCompanyMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input value={company?.name || ""} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={getCompanyPhone(company)} readOnly />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={getCompanyAddress(company) || "Not Provided"} readOnly />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={getCompanyWebsite(company)} readOnly />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure your SEMI program preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">SEMI Program Resources</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Contractor Code of Conduct</div>
                      <div className="text-sm text-gray-500">Review compliance requirements</div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href="https://seminonprodfiles.z9.web.core.windows.net/contractor-code-of-conduct.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View PDF
                      </a>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Program Guidelines</div>
                      <div className="text-sm text-gray-500">Application and submission guidelines</div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Technical Support</div>
                      <div className="text-sm text-gray-500">Get help with technical issues</div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Actions</h3>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-sm text-red-800">
                    <strong>Need help?</strong> Contact your system administrator for account modifications or if you need to change your role within the system.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}