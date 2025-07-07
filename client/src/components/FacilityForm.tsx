import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Search, Plus } from "lucide-react";

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  primaryNaicsCode: z.string().min(1, "Primary NAICS code is required"),
  secondaryNaicsCodes: z.array(z.string()).optional(),
  facilityType: z.enum(["manufacturing", "office", "warehouse", "retail", "other"]),
  operationalStatus: z.enum(["operational", "under_construction", "planned", "decommissioned"]),
  yearEstablished: z.string().optional(),
  employeeCount: z.string().optional(),
  description: z.string().optional(),
  hasEnergyManagementSystem: z.boolean().default(false),
  energyManagementSystemType: z.string().optional(),
  energyManagementSystemDescription: z.string().optional(),
  annualEnergyConsumption: z.string().optional(),
  primaryEnergySource: z.string().optional(),
  hasCogenerationSystem: z.boolean().default(false),
  cogenerationDescription: z.string().optional(),
});

type FacilityFormData = z.infer<typeof facilitySchema>;

interface FacilityFormProps {
  open: boolean;
  onClose: () => void;
  facility?: any;
}

// Mock NAICS codes data - in production, this would come from the Excel file you provided
const mockNaicsCodes = [
  { code: "111110", title: "Soybean Farming", description: "This industry comprises establishments primarily engaged in growing soybeans." },
  { code: "111120", title: "Oilseed (except Soybean) Farming", description: "This industry comprises establishments primarily engaged in growing oilseeds, except soybeans." },
  { code: "111130", title: "Dry Pea and Bean Farming", description: "This industry comprises establishments primarily engaged in growing dry peas, beans, and lentils." },
  { code: "211110", title: "Oil and Gas Extraction", description: "This industry comprises establishments primarily engaged in the exploration, development and/or the production of petroleum or natural gas from wells." },
  { code: "221111", title: "Hydroelectric Power Generation", description: "This industry comprises establishments primarily engaged in operating hydroelectric power generation facilities." },
  { code: "221112", title: "Fossil Fuel Electric Power Generation", description: "This industry comprises establishments primarily engaged in operating fossil fuel powered electric power generation facilities." },
  { code: "221113", title: "Nuclear Electric Power Generation", description: "This industry comprises establishments primarily engaged in operating nuclear electric power generation facilities." },
  { code: "311111", title: "Dog and Cat Food Manufacturing", description: "This industry comprises establishments primarily engaged in manufacturing dog and cat food from cereal, meat, and other ingredients." },
  { code: "331110", title: "Iron and Steel Mills and Ferro-Alloy Manufacturing", description: "This industry comprises establishments primarily engaged in one or more of the following manufacturing activities." },
];

export function FacilityForm({ open, onClose, facility }: FacilityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNaicsCodes, setSelectedNaicsCodes] = useState<string[]>(facility?.secondaryNaicsCodes || []);
  const [naicsSearchTerm, setNaicsSearchTerm] = useState("");
  const isEditing = !!facility;

  const form = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: facility?.name || "",
      address: facility?.address || "",
      city: facility?.city || "",
      province: facility?.province || "Alberta",
      postalCode: facility?.postalCode || "",
      primaryNaicsCode: facility?.primaryNaicsCode || "",
      secondaryNaicsCodes: facility?.secondaryNaicsCodes || [],
      facilityType: facility?.facilityType || "manufacturing",
      operationalStatus: facility?.operationalStatus || "operational",
      yearEstablished: facility?.yearEstablished || "",
      employeeCount: facility?.employeeCount || "",
      description: facility?.description || "",
      hasEnergyManagementSystem: facility?.hasEnergyManagementSystem || false,
      energyManagementSystemType: facility?.energyManagementSystemType || "",
      energyManagementSystemDescription: facility?.energyManagementSystemDescription || "",
      annualEnergyConsumption: facility?.annualEnergyConsumption || "",
      primaryEnergySource: facility?.primaryEnergySource || "",
      hasCogenerationSystem: facility?.hasCogenerationSystem || false,
      cogenerationDescription: facility?.cogenerationDescription || "",
    }
  });

  const hasEnergyManagementSystem = form.watch("hasEnergyManagementSystem");
  const hasCogenerationSystem = form.watch("hasCogenerationSystem");

  const facilityMutation = useMutation({
    mutationFn: async (data: FacilityFormData) => {
      const url = isEditing ? `/api/facilities/${facility.id}` : "/api/facilities";
      const method = isEditing ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          secondaryNaicsCodes: selectedNaicsCodes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} facility`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: `Facility ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      onClose();
      form.reset();
      setSelectedNaicsCodes([]);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} facility`,
      });
    },
  });

  const onSubmit = (data: FacilityFormData) => {
    facilityMutation.mutate(data);
  };

  const filteredNaicsCodes = mockNaicsCodes.filter(
    naics =>
      naics.code.includes(naicsSearchTerm) ||
      naics.title.toLowerCase().includes(naicsSearchTerm.toLowerCase()) ||
      naics.description.toLowerCase().includes(naicsSearchTerm.toLowerCase())
  );

  const addSecondaryNaicsCode = (code: string) => {
    if (!selectedNaicsCodes.includes(code) && code !== form.getValues("primaryNaicsCode")) {
      setSelectedNaicsCodes([...selectedNaicsCodes, code]);
    }
  };

  const removeSecondaryNaicsCode = (code: string) => {
    setSelectedNaicsCodes(selectedNaicsCodes.filter(c => c !== code));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Facility</DialogTitle>
          <DialogDescription>
            Create a new facility for your organization. All required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter facility name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Facility Code:</strong> Will be automatically generated (e.g., 001, 002, 003) for application IDs
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facilityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select facility type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="office">Office</SelectItem>
                            <SelectItem value="warehouse">Warehouse</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="operationalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operational Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="under_construction">Under Construction</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="decommissioned">Decommissioned</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the facility's purpose and operations"
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select province" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Alberta">Alberta</SelectItem>
                            <SelectItem value="British Columbia">British Columbia</SelectItem>
                            <SelectItem value="Manitoba">Manitoba</SelectItem>
                            <SelectItem value="New Brunswick">New Brunswick</SelectItem>
                            <SelectItem value="Newfoundland and Labrador">Newfoundland and Labrador</SelectItem>
                            <SelectItem value="Northwest Territories">Northwest Territories</SelectItem>
                            <SelectItem value="Nova Scotia">Nova Scotia</SelectItem>
                            <SelectItem value="Nunavut">Nunavut</SelectItem>
                            <SelectItem value="Ontario">Ontario</SelectItem>
                            <SelectItem value="Prince Edward Island">Prince Edward Island</SelectItem>
                            <SelectItem value="Quebec">Quebec</SelectItem>
                            <SelectItem value="Saskatchewan">Saskatchewan</SelectItem>
                            <SelectItem value="Yukon">Yukon</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="T1X 0L3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* NAICS Classification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Industry Classification (NAICS)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="primaryNaicsCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary NAICS Code *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary NAICS code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockNaicsCodes.map((naics) => (
                            <SelectItem key={naics.code} value={naics.code}>
                              {naics.code} - {naics.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the primary industry classification for this facility
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label>Secondary NAICS Codes (Optional)</Label>
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search NAICS codes..."
                        value={naicsSearchTerm}
                        onChange={(e) => setNaicsSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {naicsSearchTerm && (
                      <div className="border rounded-md max-h-32 overflow-y-auto">
                        {filteredNaicsCodes.slice(0, 5).map((naics) => (
                          <div
                            key={naics.code}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              addSecondaryNaicsCode(naics.code);
                              setNaicsSearchTerm("");
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{naics.code}</span> - {naics.title}
                              </div>
                              <Plus className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedNaicsCodes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedNaicsCodes.map((code) => {
                          const naics = mockNaicsCodes.find(n => n.code === code);
                          return (
                            <Badge key={code} variant="secondary" className="flex items-center gap-1">
                              {code} - {naics?.title}
                              <X 
                                className="h-3 w-3 cursor-pointer" 
                                onClick={() => removeSecondaryNaicsCode(code)}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facility Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Facility Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="yearEstablished"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Established</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2020" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employeeCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Employees</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Energy Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Energy Management Systems</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="hasEnergyManagementSystem"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Energy Management System (EMS) Present
                        </FormLabel>
                        <FormDescription>
                          Check if this facility has an energy management system
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {hasEnergyManagementSystem && (
                  <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                    <FormField
                      control={form.control}
                      name="energyManagementSystemType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EMS Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Building Automation System, ISO 50001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="energyManagementSystemDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EMS Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the energy management system capabilities and coverage"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="annualEnergyConsumption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Energy Consumption (GJ)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10000" {...field} />
                        </FormControl>
                        <FormDescription>
                          Total annual energy consumption in gigajoules
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryEnergySource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Energy Source</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Natural Gas, Electricity" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="hasCogenerationSystem"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Cogeneration System Present
                        </FormLabel>
                        <FormDescription>
                          Check if this facility has a cogeneration (combined heat and power) system
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {hasCogenerationSystem && (
                  <div className="pl-6 border-l-2 border-green-200">
                    <FormField
                      control={form.control}
                      name="cogenerationDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cogeneration System Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the cogeneration system capacity and configuration"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={facilityMutation.isPending}>
                {facilityMutation.isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Facility" : "Create Facility")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}