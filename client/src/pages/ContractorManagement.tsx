import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  MapPin, 
  Wrench, 
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  ExternalLink
} from "lucide-react";

export default function ContractorManagement() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all contractors
  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ["/api/contractors"],
  });

  const albertaRegions = [
    "Calgary and Area",
    "Edmonton and Area", 
    "Lethbridge and Area",
    "Medicine Hat and Area",
    "Red Deer and Area",
    "Fort McMurray and Area",
    "Other Parts of Alberta"
  ];

  const supportedActivities = [
    "Capital Retrofit",
    "Energy Management Information System",
    "Energy Auditing and Assessment"
  ];

  const capitalRetrofitTechnologies = [
    "Building Envelope",
    "Compressed Air Systems",
    "Fan Driven Systems", 
    "Geothermal",
    "HVAC Systems",
    "Lighting Systems",
    "Process Cooling and Refrigeration Systems",
    "Process Heating Systems",
    "Pump Driven Systems",
    "Solar PV Systems",
    "Other"
  ];

  const filteredContractors = contractors.filter((contractor: any) =>
    contractor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.serviceRegions?.some((region: string) => 
      region.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getRegionBadgeColor = (region: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800", 
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
      "bg-gray-100 text-gray-800"
    ];
    return colors[albertaRegions.indexOf(region)] || "bg-gray-100 text-gray-800";
  };

  const getActivityBadgeColor = (activity: string) => {
    switch (activity) {
      case "Capital Retrofit": return "bg-red-100 text-red-800";
      case "Energy Management Information System": return "bg-blue-100 text-blue-800";
      case "Energy Auditing and Assessment": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contractor Management</h1>
          <p className="text-gray-600">Manage registered contractors and their service capabilities</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Invite Contractor
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contractors.length}</div>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(contractors.flatMap((c: any) => c.serviceRegions || [])).size}
            </div>
            <p className="text-xs text-muted-foreground">Coverage areas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retrofit Specialists</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contractors.filter((c: any) => 
                c.supportedActivities?.includes("Capital Retrofit")
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Capital retrofit providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contractors.length > 0 
                ? Math.round((contractors.filter((c: any) => 
                    c.codeOfConductAgreed && c.gstWcbInsuranceConfirmed
                  ).length / contractors.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Fully compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="contractors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contractors">All Contractors</TabsTrigger>
          <TabsTrigger value="regions">By Region</TabsTrigger>
          <TabsTrigger value="activities">By Activity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* All Contractors Tab */}
        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Contractors</CardTitle>
              <CardDescription>
                Complete list of contractors registered in the SEMI program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contractors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Service Regions</TableHead>
                    <TableHead>Activities</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContractors.map((contractor: any) => (
                    <TableRow key={contractor.id}>
                      <TableCell className="font-medium">
                        {contractor.companyName || "Individual Contractor"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {contractor.user?.firstName} {contractor.user?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{contractor.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contractor.serviceRegions?.slice(0, 2).map((region: string) => (
                            <Badge key={region} className={getRegionBadgeColor(region)} variant="outline">
                              {region.replace(" and Area", "")}
                            </Badge>
                          ))}
                          {contractor.serviceRegions?.length > 2 && (
                            <Badge variant="outline">+{contractor.serviceRegions.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contractor.supportedActivities?.map((activity: string) => (
                            <Badge key={activity} className={getActivityBadgeColor(activity)} variant="outline">
                              {activity === "Energy Management Information System" ? "EMIS" : 
                               activity === "Energy Auditing and Assessment" ? "EAA" : "CR"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {contractor.codeOfConductAgreed && (
                            <Badge className="bg-green-100 text-green-800" variant="outline">
                              Code
                            </Badge>
                          )}
                          {contractor.gstWcbInsuranceConfirmed && (
                            <Badge className="bg-blue-100 text-blue-800" variant="outline">
                              Insurance
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Region Tab */}
        <TabsContent value="regions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albertaRegions.map((region) => {
              const regionContractors = contractors.filter((c: any) => 
                c.serviceRegions?.includes(region)
              );
              
              return (
                <Card key={region}>
                  <CardHeader>
                    <CardTitle className="text-lg">{region}</CardTitle>
                    <CardDescription>
                      {regionContractors.length} contractors available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {regionContractors.slice(0, 3).map((contractor: any) => (
                        <div key={contractor.id} className="flex items-center justify-between">
                          <span className="text-sm">{contractor.companyName}</span>
                          <div className="flex gap-1">
                            {contractor.supportedActivities?.map((activity: string) => (
                              <Badge key={activity} variant="outline" className="text-xs">
                                {activity === "Capital Retrofit" ? "CR" : 
                                 activity === "Energy Management Information System" ? "EMIS" : "EAA"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {regionContractors.length > 3 && (
                        <div className="text-sm text-gray-500 text-center">
                          +{regionContractors.length - 3} more
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Overview</CardTitle>
              <CardDescription>
                Contractor compliance with code of conduct and insurance requirements
                <a 
                  href="https://seminonprodfiles.z9.web.core.windows.net/contractor-code-of-conduct.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  View Code of Conduct <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Code of Conduct</TableHead>
                    <TableHead>GST, WCB, Insurance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractors.map((contractor: any) => (
                    <TableRow key={contractor.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contractor.companyName}</div>
                          <div className="text-sm text-gray-500">{contractor.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contractor.codeOfConductAgreed ? (
                          <Badge className="bg-green-100 text-green-800">Agreed</Badge>
                        ) : (
                          <Badge variant="destructive">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {contractor.gstWcbInsuranceConfirmed ? (
                          <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                        ) : (
                          <Badge variant="destructive">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {contractor.codeOfConductAgreed && contractor.gstWcbInsuranceConfirmed ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Compliant
                          </Badge>
                        ) : (
                          <Badge variant="outline">Incomplete</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}