import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import CompanyApplicationDialog from "@/components/CompanyApplicationDialog";
import EnhancedFacilityForm from "@/components/EnhancedFacilityForm";
import DocumentUpload from "@/components/DocumentUpload";
import TwoFactorPrompt from "@/components/TwoFactorPrompt";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Users, 
  Building, 
  Plus, 
  Upload, 
  UserPlus,
  AlertCircle,
  MessageSquare,
  Send,
  BarChart3,
  TrendingUp,
  Lock,
  Unlock,
  Search,
  Calendar,
  ArrowUpDown,
  SortAsc,
  SortDesc
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { canCreateEdit } from "@/lib/permissions";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  const [facilitySearchTerm, setFacilitySearchTerm] = useState("");
  const [facilitySortBy, setFacilitySortBy] = useState<"name" | "date">("name");
  const [facilitySortOrder, setFacilitySortOrder] = useState<"asc" | "desc">("asc");

  // Queries with proper dependency on user being available
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<any[]>({ 
    queryKey: ["/api/applications"], 
    enabled: !!user 
  });
  const { data: facilitiesData = [], isLoading: facilitiesLoadingState } = useQuery<any[]>({ 
    queryKey: ["/api/facilities"], 
    enabled: !!user 
  });
  const { data: companyData } = useQuery<any>({ 
    queryKey: ["/api/companies/current"], 
    enabled: !!user 
  });
  const { data: statsData } = useQuery<any>({ 
    queryKey: ["/api/dashboard/stats"], 
    enabled: !!user 
  });

  const facilities = facilitiesData;
  const facilitiesLoading = facilitiesLoadingState;
  const company = companyData;
  const stats = statsData;
  const { data: activitySettings = [], isLoading: activitySettingsLoading, error: activitySettingsError } = useQuery<any[]>({
    queryKey: ["/api/activity-settings"],
    enabled: !!user
  });

  // DEBUG: Log activity settings data for production troubleshooting
  useEffect(() => {
    console.log('[DASHBOARD DEBUG] Activity Settings State:', {
      data: activitySettings,
      loading: activitySettingsLoading,
      error: activitySettingsError,
      dataLength: activitySettings?.length || 0,
      userExists: !!user,
      userRole: user?.role
    });
    if (activitySettingsError) {
      console.error('[DASHBOARD ERROR] Activity Settings Error:', activitySettingsError);
    }
  }, [activitySettings, activitySettingsLoading, activitySettingsError, user]);

  // Debug activity settings loading
  console.log('Dashboard activity settings debug:', {
    user: user ? `${user.email} (${user.role}/${user.permissionLevel})` : 'none',
    activitySettingsLoading,
    activitySettingsError,
    activitySettings: activitySettings?.length || 0,
    canCreateEdit: user ? canCreateEdit(user) : false
  });

  // Helper function to get enabled activities for a facility
  const { data: facilityActivitiesMap = {} } = useQuery({
    queryKey: ["/api/facilities/activities-map"],
    queryFn: async () => {
      if (!facilities) return {};
      
      const map: Record<number, string[]> = {};
      await Promise.all(
        facilities.map(async (facility: any) => {
          try {
            const response = await fetch(`/api/facilities/${facility.id}/activities`);
            if (response.ok) {
              const data = await response.json();
              map[facility.id] = data.enabledActivities || [];
            } else {
              map[facility.id] = ['FRA']; // Fallback to FRA only
            }
          } catch (error) {
            map[facility.id] = ['FRA']; // Fallback to FRA only
          }
        })
      );
      return map;
    },
    enabled: !!facilities && facilities.length > 0
  });

  // Permission checks
  const canManageFacilities = user?.role === 'company_admin' || user?.role === 'team_member';

  const recentApplications = (applications || []).slice(0, 5);

  // Determine if user is a first-time login (within 24 hours of account creation)
  const isFirstTimeUser = user?.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < 24 * 60 * 60 * 1000;
  const greeting = isFirstTimeUser ? "Welcome" : "Welcome back";

  // Force re-render when data arrives
  useEffect(() => {
    if (applications || facilities || company || stats) {
      setRenderKey(prev => prev + 1);
    }
  }, [applications, facilities, company, stats]);

  // Filter and sort facilities
  const filteredAndSortedFacilities = facilities?.filter((item: any) => {
    const facility = item.facilities || item;
    return (
      facility?.name?.toLowerCase().includes(facilitySearchTerm.toLowerCase()) ||
      facility?.address?.toLowerCase().includes(facilitySearchTerm.toLowerCase()) ||
      facility?.description?.toLowerCase().includes(facilitySearchTerm.toLowerCase())
    );
  }).sort((a: any, b: any) => {
    let comparison = 0;
    const facilityA = a.facilities || a;
    const facilityB = b.facilities || b;
    
    if (facilitySortBy === "name") {
      comparison = facilityA.name?.localeCompare(facilityB.name) || 0;
    } else if (facilitySortBy === "date") {
      const dateA = new Date(facilityA.createdAt || 0);
      const dateB = new Date(facilityB.createdAt || 0);
      comparison = dateA.getTime() - dateB.getTime();
    }
    
    return facilitySortOrder === "desc" ? -comparison : comparison;
  }) || [];
  
  const handleSortChange = (sortBy: "name" | "date") => {
    if (facilitySortBy === sortBy) {
      setFacilitySortOrder(facilitySortOrder === "asc" ? "desc" : "asc");
    } else {
      setFacilitySortBy(sortBy);
      setFacilitySortOrder("asc");
    }
  };

  return (
    <div key={renderKey} className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-100 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {user?.firstName || 'User'}!
            </h1>
            <p className="text-gray-600 mt-1">
              {company?.name ? `Managing ${company.name}` : 'Ready to get started?'}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowDocumentUpload(true)}
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-slate-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalApplications || 0}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-500">
                {((stats?.draftApplications || 0) / Math.max(stats?.totalApplications || 1, 1) * 100).toFixed(0)}% draft
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.approvedApplications || 0}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-500">
                {((stats?.approvedApplications || 0) / Math.max(stats?.totalApplications || 1, 1) * 100).toFixed(0)}% approval rate
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-amber-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pendingApplications || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-slate-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.teamMembers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Width Facilities Section */}
      <div className="space-y-6">
        {/* Facilities */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Building className="h-6 w-6 mr-2 text-slate-600" />
                <div>
                  <h3 className="text-xl text-gray-900">Facilities</h3>
                  <p className="text-sm text-gray-600 font-normal">Manage your facilities and create applications</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {facilities?.length > 0 && (
                  <>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search facilities..."
                        value={facilitySearchTerm}
                        onChange={(e) => setFacilitySearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    
                    {/* Sort Controls */}
                    <div className="flex items-center space-x-1 border rounded-md bg-white">
                      <Button
                        size="sm"
                        variant={facilitySortBy === "name" ? "default" : "ghost"}
                        onClick={() => handleSortChange("name")}
                        className="h-8 px-3 text-xs font-medium border-none"
                      >
                        Name
                        {facilitySortBy === "name" && (
                          facilitySortOrder === "asc" ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={facilitySortBy === "date" ? "default" : "ghost"}
                        onClick={() => handleSortChange("date")}
                        className="h-8 px-3 text-xs font-medium border-none"
                      >
                        Date
                        {facilitySortBy === "date" && (
                          facilitySortOrder === "asc" ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
                {canCreateEdit(user) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFacilityForm(true)}
                    className="h-8 px-3 border-gray-300 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Facility
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {facilitiesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 mx-auto border-2 border-slate-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-sm text-gray-500">Loading facilities...</p>
              </div>
            ) : facilities?.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your First Facility</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                  Before you can start any applications, you need to register at least one facility. 
                  Each facility can have multiple activity applications like FRA, SEM, EMIS, and more.
                </p>
                {canCreateEdit(user) && (
                  <Button
                    onClick={() => setShowFacilityForm(true)}
                    className="bg-slate-700 hover:bg-slate-800 font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Facility
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedFacilities?.map((item: any, index: number) => {
                  const facility = item.facilities || item;
                  return (
                  <div key={facility.id} className="border border-gray-200 rounded-lg p-5 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          {/* Facility Header */}
                          <div className="mb-3">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">{facility.name}</h4>
                            <div className="flex flex-wrap gap-2 items-center mb-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                Facility #{facility.code}
                              </span>
                              {facility.naicsCode && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  NAICS: {facility.naicsCode}
                                </span>
                              )}
                              {facility.createdAt && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(facility.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              )}
                            </div>
                            
                            {/* Address Information */}
                            <div className="flex items-start space-x-2">
                              <span className="text-gray-400 mt-0.5">📍</span>
                              <div className="text-sm text-gray-700">
                                <p>{facility.address}</p>
                                <p>{facility.city}, {facility.province} {facility.postalCode}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {/* Operational Status */}
                            {facility.operationalStatus && (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400">⚡</span>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  facility.operationalStatus === 'operational' ? 'bg-green-100 text-green-800' :
                                  facility.operationalStatus === 'under_construction' ? 'bg-yellow-100 text-yellow-800' :
                                  facility.operationalStatus === 'planned' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {facility.operationalStatus === 'operational' ? 'Operational' :
                                   facility.operationalStatus === 'under_construction' ? 'Under Construction' :
                                   facility.operationalStatus === 'planned' ? 'Planned' : 'Inactive'}
                                </span>
                              </div>
                            )}
                            

                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canCreateEdit(user) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingFacility(facility);
                              setShowFacilityForm(true);
                            }}
                            className="h-8 font-medium border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Applications for this facility */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-700">
                          {applicationsLoading ? (
                            "Applications (Loading...)"
                          ) : (
                            `Applications (${(() => {
                              const facilityApplications = applications?.filter((app: any) => app.facilityId === facility.id) || [];
                              return facilityApplications.length;
                            })()})`
                          )}
                        </h5>
                        {canCreateEdit(user) && (
                          <CompanyApplicationDialog 
                            onSuccess={() => {
                              setRenderKey(prev => prev + 1);
                            }}
                          />
                        )}
                      </div>

                      {/* Activity Limits Display */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                        <h6 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Activity Application Limits
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {applicationsLoading ? (
                            <div className="col-span-full text-center py-4">
                              <div className="text-sm text-gray-500">Loading activity data...</div>
                            </div>
                          ) : (
                            activitySettings?.filter((setting: any) => {
                              // Only show activities that are enabled for this specific facility
                              const enabledActivities = facilityActivitiesMap[facility.id] || ['FRA'];
                              return enabledActivities.includes(setting.activityType);
                            }).sort((a: any, b: any) => {
                              // Sort activities in correct order: FRA, EAA, SEM, EMIS, CR
                              const order = ['FRA', 'EAA', 'SEM', 'EMIS', 'CR'];
                              return order.indexOf(a.activityType) - order.indexOf(b.activityType);
                            }).map((setting: any) => {
                            const facilityApplications = applications?.filter((app: any) => 
                              app.facilityId === facility.id && app.activityType === setting.activityType
                            ) || [];
                            const currentCount = facilityApplications.length;
                            const maxCount = setting.maxApplications;
                            const isUnlimited = maxCount === null;
                            const isAtLimit = !isUnlimited && currentCount >= maxCount;
                            const hasApplications = currentCount > 0;
                            const isDisabled = false; // Activity is enabled since we filtered for enabled ones
                            const canStartActivity = !isAtLimit;
                            
                            let tooltipText = '';
                            if (isDisabled) {
                              tooltipText = 'This activity will be enabled by the Enerva team at a later time';
                            } else if (isAtLimit) {
                              tooltipText = `Application limit reached (${currentCount}/${maxCount}). Cannot create more applications for this activity.`;
                            } else if (canStartActivity) {
                              tooltipText = `Click to start a new ${setting.activityType} application for this facility`;
                            }
                            
                            return (
                              <div 
                                key={setting.activityType} 
                                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all relative group ${
                                  isDisabled ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed' :
                                  isAtLimit ? 'bg-red-50 border-red-200 cursor-not-allowed' : 
                                  hasApplications ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer' : 
                                  'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                                }`}
                                onClick={() => {
                                  if (canStartActivity) {
                                    // Activity tiles now redirect to applications page for creation
                                    window.location.href = '/applications';
                                  }
                                }}
                                title={tooltipText}
                              >
                                <span className={`font-medium text-sm ${
                                  isDisabled ? 'text-gray-500' : 'text-gray-800'
                                }`}>
                                  {setting.activityType}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-sm font-bold ${
                                    isDisabled ? 'text-gray-500' :
                                    isUnlimited ? 'text-green-700' : 
                                    isAtLimit ? 'text-red-700' : 
                                    hasApplications ? 'text-amber-700' : 'text-gray-600'
                                  }`}>
                                    {currentCount}/{isUnlimited ? '∞' : maxCount}
                                  </span>
                                  <div className={`w-3 h-3 rounded-full ${
                                    isDisabled ? 'bg-gray-400' :
                                    isUnlimited ? 'bg-green-500' : 
                                    isAtLimit ? 'bg-red-500' : 
                                    hasApplications ? 'bg-amber-500' : 'bg-gray-400'
                                  }`}></div>
                                </div>
                                
                                {/* Tooltip */}
                                {tooltipText && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                    {tooltipText}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                          )}
                        </div>
                      </div>


                    </div>
                  </div>
                  );
                })}

                {filteredAndSortedFacilities?.length === 0 && facilitySearchTerm && (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No facilities found matching "{facilitySearchTerm}"</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      
      {showDocumentUpload && (
        <DocumentUpload onClose={() => setShowDocumentUpload(false)} />
      )}

      {showFacilityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EnhancedFacilityForm
              onSuccess={() => {
                setShowFacilityForm(false);
                setEditingFacility(null);
                setRenderKey(prev => prev + 1);
              }}
              onCancel={() => {
                setShowFacilityForm(false);
                setEditingFacility(null);
              }}
              editingFacility={editingFacility}
            />
          </div>
        </div>
      )}
    </div>
  );
}