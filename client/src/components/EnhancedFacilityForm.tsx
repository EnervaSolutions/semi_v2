import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, AlertCircle, CheckCircle, Info, HelpCircle, Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { 
  FACILITY_SECTORS, 
  FACILITY_CATEGORIES, 
  FACILITY_TYPES,
  getFacilityCategoriesBySector,
  getFacilityTypesByCategory,
  generateNAICSCode,
  getNAICSDescription 
} from "@shared/naics-data";

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  
  // NAICS Information
  facilitySector: z.string().min(1, "Facility sector is required"),
  facilityCategory: z.string().min(1, "Facility category is required"),
  facilityType: z.string().min(1, "Facility type is required"),
  naicsCode: z.string().optional(),
  
  // Address Information
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  country: z.string().default("Canada"),
  postalCode: z.string()
    .min(1, "Postal code is required")
    .regex(/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, "Please enter a valid Canadian postal code (e.g., A1A 1A1)"),
  
  // Facility Details
  grossFloorArea: z.string().min(1, "Gross floor area is required").transform((val) => parseFloat(val)),
  grossFloorAreaUnit: z.enum(["sq_ft", "sq_m"]).default("sq_ft"),
  grossFloorAreaIsTemporary: z.boolean().default(false),
  yearBuilt: z.string().min(1, "Year built is required").transform((val) => parseInt(val)),
  weeklyOperatingHours: z.string().min(1, "Weekly operating hours is required").transform((val) => parseFloat(val)),
  weeklyOperatingHoursIsTemporary: z.boolean().default(false),
  numberOfWorkersMainShift: z.string().min(1, "Number of workers on main shift is required").transform((val) => parseInt(val)),
  numberOfWorkersMainShiftIsTemporary: z.boolean().default(false),
  typeOfOperation: z.enum(["continuous", "semi_continuous", "batch"], {
    required_error: "Type of operation is required"
  }),
  
  // Energy Management
  hasEMIS: z.boolean().default(false),
  emisRealtimeMonitoring: z.boolean().default(false),
  emisDescription: z.string().optional(),
  hasEnergyManager: z.boolean().default(false),
  energyManagerFullTime: z.boolean().default(false),
  
  // Facility Process and Systems
  processCombinedHeatPower: z.boolean().default(false),
  processCompressedAir: z.boolean().default(false),
  processControlSystem: z.boolean().default(false),
  processElectrochemical: z.boolean().default(false),
  processFacilityNonProcess: z.boolean().default(false),
  processFacilitySubmetering: z.boolean().default(false),
  processHVAC: z.boolean().default(false),
  processIndustrialGases: z.boolean().default(false),
  processLighting: z.boolean().default(false),
  processMotors: z.boolean().default(false),
  processOther: z.boolean().default(false),
  processPumpingFans: z.boolean().default(false),
  processRefrigeration: z.boolean().default(false),
  processWasteHeatRecovery: z.boolean().default(false),
  processMaterialProcessing: z.boolean().default(false),
  processProcessCooling: z.boolean().default(false),
  processProcessHeating: z.boolean().default(false),
  processPumps: z.boolean().default(false),
  processSteamSystem: z.boolean().default(false),
  processOtherSystems: z.boolean().default(false),
  
  // Additional Information
  description: z.string().optional(),
});

type FacilityFormData = z.infer<typeof facilitySchema>;

interface EnhancedFacilityFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingFacility?: any;
}

const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", 
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", 
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", 
  "Saskatchewan", "Yukon"
];

export default function EnhancedFacilityForm({ onSuccess, onCancel, editingFacility }: EnhancedFacilityFormProps) {
  const { toast } = useToast();
  
  // Initialize categories and types based on existing facility data
  const initialCategories = editingFacility?.facilitySector 
    ? getFacilityCategoriesBySector(editingFacility.facilitySector)
    : FACILITY_CATEGORIES;
  const initialTypes = editingFacility?.facilityCategory
    ? getFacilityTypesByCategory(editingFacility.facilityCategory) 
    : FACILITY_TYPES;
    
  const [availableCategories, setAvailableCategories] = useState(initialCategories);
  const [availableTypes, setAvailableTypes] = useState(initialTypes);
  const [generatedNAICS, setGeneratedNAICS] = useState<string>(editingFacility?.naicsCode || "");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [naicsDescription, setNAICSDescription] = useState<string>(editingFacility?.naicsDescription || "");
  const [isInitializing, setIsInitializing] = useState(!!editingFacility);

  const form = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: editingFacility ? {
      name: editingFacility.name || "",
      facilitySector: editingFacility.facilitySector || "",
      facilityCategory: editingFacility.facilityCategory || "",
      facilityType: editingFacility.facilityType || "",
      naicsCode: editingFacility.naicsCode || "",
      address: editingFacility.address || "",
      city: editingFacility.city || "",
      province: editingFacility.province || "",
      country: editingFacility.country || "Canada",
      postalCode: editingFacility.postalCode || "",
      grossFloorArea: editingFacility.grossFloorArea?.toString() || "",
      grossFloorAreaUnit: editingFacility.grossFloorAreaUnit || "sq_ft",
      grossFloorAreaIsTemporary: editingFacility.grossFloorAreaIsTemporary || false,
      yearBuilt: editingFacility.yearBuilt?.toString() || "",
      weeklyOperatingHours: editingFacility.weeklyOperatingHours?.toString() || "",
      weeklyOperatingHoursIsTemporary: editingFacility.weeklyOperatingHoursIsTemporary || false,
      numberOfWorkersMainShift: editingFacility.numberOfWorkersMainShift?.toString() || "",
      numberOfWorkersMainShiftIsTemporary: editingFacility.numberOfWorkersMainShiftIsTemporary || false,
      typeOfOperation: editingFacility.typeOfOperation || "continuous",
      hasEMIS: editingFacility.hasEMIS || false,
      emisRealtimeMonitoring: editingFacility.emisRealtimeMonitoring || false,
      emisDescription: editingFacility.emisDescription || "",
      hasEnergyManager: editingFacility.hasEnergyManager || false,
      energyManagerFullTime: editingFacility.energyManagerFullTime || false,
      processCombinedHeatPower: editingFacility.processCombinedHeatPower || false,
      processCompressedAir: editingFacility.processCompressedAir || false,
      processControlSystem: editingFacility.processControlSystem || false,
      processElectrochemical: editingFacility.processElectrochemical || false,
      processFacilityNonProcess: editingFacility.processFacilityNonProcess || false,
      processFacilitySubmetering: editingFacility.processFacilitySubmetering || false,
      processHVAC: editingFacility.processHVAC || false,
      processIndustrialGases: editingFacility.processIndustrialGases || false,
      processLighting: editingFacility.processLighting || false,
      processMotors: editingFacility.processMotors || false,
      processOther: editingFacility.processOther || false,
      processPumpingFans: editingFacility.processPumpingFans || false,
      processRefrigeration: editingFacility.processRefrigeration || false,
      processWasteHeatRecovery: editingFacility.processWasteHeatRecovery || false,
      processMaterialProcessing: editingFacility.processMaterialProcessing || false,
      processProcessCooling: editingFacility.processProcessCooling || false,
      processProcessHeating: editingFacility.processProcessHeating || false,
      processPumps: editingFacility.processPumps || false,
      processSteamSystem: editingFacility.processSteamSystem || false,
      processOtherSystems: editingFacility.processOtherSystems || false,
      description: editingFacility.description || "",
    } : {
      name: "",
      facilitySector: "",
      facilityCategory: "",
      facilityType: "",
      naicsCode: "",
      address: "",
      city: "",
      province: "",
      country: "Canada",
      postalCode: "",
      grossFloorArea: "",
      grossFloorAreaUnit: "sq_ft",
      grossFloorAreaIsTemporary: false,
      yearBuilt: "",
      weeklyOperatingHours: "",
      weeklyOperatingHoursIsTemporary: false,
      numberOfWorkersMainShift: "",
      numberOfWorkersMainShiftIsTemporary: false,
      typeOfOperation: "continuous",
      hasEMIS: false,
      emisRealtimeMonitoring: false,
      emisDescription: "",
      hasEnergyManager: false,
      energyManagerFullTime: false,
      processCombinedHeatPower: false,
      processCompressedAir: false,
      processControlSystem: false,
      processElectrochemical: false,
      processFacilityNonProcess: false,
      processFacilitySubmetering: false,
      processHVAC: false,
      processIndustrialGases: false,
      processLighting: false,
      processMotors: false,
      processOther: false,
      processPumpingFans: false,
      processRefrigeration: false,
      processWasteHeatRecovery: false,
      processMaterialProcessing: false,
      processProcessCooling: false,
      processProcessHeating: false,
      processPumps: false,
      processSteamSystem: false,
      processOtherSystems: false,
      description: "",
    },
  });

  const { watch, setValue, getValues, reset } = form;
  const watchedSector = watch("facilitySector");
  const watchedCategory = watch("facilityCategory");
  const watchedType = watch("facilityType");

  // Force component to re-render when form values change
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // Force re-render when watched values change
    forceUpdate({});
  }, [watchedCategory, watchedType, availableCategories, availableTypes]);

  // Helper functions to get display text - called on each render
  const getCategoryDisplayText = () => {
    if (!watchedCategory) return "Select facility category";
    
    const foundInAvailable = availableCategories.find(cat => cat.code === watchedCategory);
    const foundInAll = FACILITY_CATEGORIES.find(cat => cat.code === watchedCategory);
    
    const found = foundInAvailable || foundInAll;
    return found?.title || "Select facility category";
  };

  const getTypeDisplayText = () => {
    if (!watchedType) return "Select facility type";
    
    const foundInAvailable = availableTypes.find(type => type.code === watchedType);
    const foundInAll = FACILITY_TYPES.find(type => type.code === watchedType);
    
    const found = foundInAvailable || foundInAll;
    return found?.title || "Select facility type";
  };

  // Initialize NAICS data for editing mode
  useEffect(() => {
    console.log('[FORM INIT] useEffect triggered:', { 
      editingFacility: !!editingFacility, 
      isInitializing,
      facilityId: editingFacility?.id 
    });
    
    if (editingFacility && isInitializing) {
      
      // Set available categories based on existing sector
      if (editingFacility.facilitySector) {
        const categories = getFacilityCategoriesBySector(editingFacility.facilitySector);
        setAvailableCategories(categories);
      }
      
      // Set available types based on existing category
      if (editingFacility.facilityCategory) {
        const types = getFacilityTypesByCategory(editingFacility.facilityCategory);
        setAvailableTypes(types);
      }
      
      // Set NAICS description if available
      if (editingFacility.naicsCode) {
        const description = getNAICSDescription(editingFacility.naicsCode);
        setNAICSDescription(description);
      }
      
      // Reset form with all data to ensure proper state synchronization
      // Convert numeric fields to strings to match schema expectations
      const formData = {
        ...editingFacility,
        facilitySector: editingFacility.facilitySector || "",
        facilityCategory: editingFacility.facilityCategory || "",
        facilityType: editingFacility.facilityType || "",
        // Convert numeric fields to strings for schema validation
        grossFloorArea: editingFacility.grossFloorArea?.toString() || "",
        yearBuilt: editingFacility.yearBuilt?.toString() || "",
        weeklyOperatingHours: editingFacility.weeklyOperatingHours?.toString() || "",
        numberOfWorkersMainShift: editingFacility.numberOfWorkersMainShift?.toString() || "",
        // Ensure boolean fields are properly set
        emisRealtimeMonitoring: !!editingFacility.emisRealtimeMonitoring,
        energyManagerFullTime: !!editingFacility.energyManagerFullTime,
        hasEMIS: !!editingFacility.hasEMIS,
        hasEnergyManager: !!editingFacility.hasEnergyManager,
        emisDescription: editingFacility.emisDescription || "",
      };
      
      console.log('[FORM RESET] Raw facility data:', {
        emisRealtimeMonitoring: editingFacility.emisRealtimeMonitoring,
        energyManagerFullTime: editingFacility.energyManagerFullTime,
        hasEMIS: editingFacility.hasEMIS,
        hasEnergyManager: editingFacility.hasEnergyManager,
        emisDescription: editingFacility.emisDescription,
      });
      
      console.log('[FORM RESET] Prepared form data:', {
        emisRealtimeMonitoring: formData.emisRealtimeMonitoring,
        energyManagerFullTime: formData.energyManagerFullTime,
        hasEMIS: formData.hasEMIS,
        hasEnergyManager: formData.hasEnergyManager,
        emisDescription: formData.emisDescription,
      });
      
      // Use setTimeout to ensure reset happens after the state updates
      setTimeout(() => {
        console.log('[FORM RESET] Calling reset with formData');
        reset(formData);
        
        // Force form values to be set explicitly for energy management fields
        console.log('[FORM RESET] Setting explicit values for energy management fields');
        setValue("emisRealtimeMonitoring", !!editingFacility.emisRealtimeMonitoring);
        setValue("energyManagerFullTime", !!editingFacility.energyManagerFullTime);
        setValue("hasEMIS", !!editingFacility.hasEMIS);
        setValue("hasEnergyManager", !!editingFacility.hasEnergyManager);
        setValue("emisDescription", editingFacility.emisDescription || "");
        
        // Verify values after setting
        setTimeout(() => {
          console.log('[FORM RESET] Values after explicit setValue:', {
            emisRealtimeMonitoring: watch("emisRealtimeMonitoring"),
            energyManagerFullTime: watch("energyManagerFullTime"),
            hasEMIS: watch("hasEMIS"),
            hasEnergyManager: watch("hasEnergyManager"),
            emisDescription: watch("emisDescription"),
          });
        }, 100);
      }, 0);
      
      // Mark initialization as complete
      setIsInitializing(false);
    }
  }, [editingFacility, isInitializing, reset]);

  // Update available categories when sector changes
  useEffect(() => {
    if (watchedSector && !isInitializing) {
      const categories = getFacilityCategoriesBySector(watchedSector);
      setAvailableCategories(categories);
      setValue("facilityCategory", "");
      setValue("facilityType", "");
      setGeneratedNAICS("");
      setNAICSDescription("");
    }
  }, [watchedSector, setValue, isInitializing]);

  // Update available types when category changes
  useEffect(() => {
    if (watchedCategory && !isInitializing) {
      const types = getFacilityTypesByCategory(watchedCategory);
      setAvailableTypes(types);
      setValue("facilityType", "");
      setGeneratedNAICS("");
      setNAICSDescription("");
    } else if (!watchedCategory && !isInitializing) {
      setAvailableTypes([]);
    }
  }, [watchedCategory, setValue, isInitializing]);

  // Generate NAICS code when all selections are made
  useEffect(() => {
    if (watchedSector && watchedCategory && watchedType) {
      try {
        const naicsCode = generateNAICSCode(watchedSector, watchedCategory, watchedType);
        const description = getNAICSDescription(naicsCode);
        setGeneratedNAICS(naicsCode);
        setNAICSDescription(description);
        setValue("naicsCode", naicsCode);
      } catch (error) {
        console.error("Error generating NAICS code:", error);
        setGeneratedNAICS("");
        setNAICSDescription("");
      }
    }
  }, [watchedSector, watchedCategory, watchedType, setValue]);



  const facilityMutation = useMutation({
    mutationFn: async (data: FacilityFormData) => {
      // Convert process checkboxes to array for database storage
      const processAndSystems = [];
      if (data.processCombinedHeatPower) processAndSystems.push("Combined Heat and Power (CHP)");
      if (data.processCompressedAir) processAndSystems.push("Compressed Air Systems");
      if (data.processControlSystem) processAndSystems.push("Control Systems");
      if (data.processElectrochemical) processAndSystems.push("Electrochemical Processes");
      if (data.processFacilityNonProcess) processAndSystems.push("Facility Non-Process Equipment");
      if (data.processFacilitySubmetering) processAndSystems.push("Facility Sub-metering");
      if (data.processHVAC) processAndSystems.push("HVAC Systems");
      if (data.processIndustrialGases) processAndSystems.push("Industrial Gases");
      if (data.processLighting) processAndSystems.push("Lighting Systems");
      if (data.processMotors) processAndSystems.push("Motors and Drives");
      if (data.processOther) processAndSystems.push("Other Process Equipment");
      if (data.processPumpingFans) processAndSystems.push("Pumping and Fan Systems");
      if (data.processRefrigeration) processAndSystems.push("Refrigeration Systems");
      if (data.processWasteHeatRecovery) processAndSystems.push("Waste Heat Recovery");

      // Get raw form values to ensure we have the actual input data
      const formValues = form.getValues();
      
      console.log('[FORM SUBMISSION] Energy management values:', {
        emisRealtimeMonitoring: formValues.emisRealtimeMonitoring,
        energyManagerFullTime: formValues.energyManagerFullTime,
        hasEMIS: formValues.hasEMIS,
        hasEnergyManager: formValues.hasEnergyManager,
      });
      
      // Map form data to existing database schema fields only
      const facilityData = {
        name: formValues.name,
        address: formValues.address,
        city: formValues.city,
        province: formValues.province,
        country: formValues.country || "Canada",
        postalCode: formValues.postalCode,
        
        // NAICS Information
        naicsCode: generatedNAICS || formValues.naicsCode,
        facilitySector: formValues.facilitySector,
        facilityCategory: formValues.facilityCategory,
        facilityType: formValues.facilityType,
        
        // Facility Details (convert string inputs to numbers for database)
        grossFloorArea: formValues.grossFloorArea ? Number(formValues.grossFloorArea) : 0,
        grossFloorAreaUnit: formValues.grossFloorAreaUnit,
        grossFloorAreaIsTemporary: Boolean(formValues.grossFloorAreaIsTemporary),
        yearBuilt: formValues.yearBuilt ? Number(formValues.yearBuilt) : new Date().getFullYear(),
        weeklyOperatingHours: formValues.weeklyOperatingHours ? Number(formValues.weeklyOperatingHours) : 0,
        weeklyOperatingHoursIsTemporary: Boolean(formValues.weeklyOperatingHoursIsTemporary),
        numberOfWorkersMainShift: formValues.numberOfWorkersMainShift ? Number(formValues.numberOfWorkersMainShift) : 0,
        numberOfWorkersMainShiftIsTemporary: Boolean(formValues.numberOfWorkersMainShiftIsTemporary),
        typeOfOperation: formValues.typeOfOperation,
        
        // Energy Management - using correct database field names
        hasEMIS: Boolean(formValues.hasEMIS),
        emisRealtimeMonitoring: Boolean(formValues.emisRealtimeMonitoring),
        emisDescription: formValues.emisDescription || "",
        hasEnergyManager: Boolean(formValues.hasEnergyManager),
        energyManagerFullTime: Boolean(formValues.energyManagerFullTime),
        
        // All Process and Systems checkboxes - aligned with admin form
        processCombinedHeatPower: Boolean(formValues.processCombinedHeatPower),
        processCompressedAir: Boolean(formValues.processCompressedAir),
        processControlSystem: Boolean(formValues.processControlSystem),
        processElectrochemical: Boolean(formValues.processElectrochemical),
        processFacilityNonProcess: Boolean(formValues.processFacilityNonProcess),
        processFacilitySubmetering: Boolean(formValues.processFacilitySubmetering),
        processHVAC: Boolean(formValues.processHVAC),
        processIndustrialGases: Boolean(formValues.processIndustrialGases),
        processLighting: Boolean(formValues.processLighting),
        processMotors: Boolean(formValues.processMotors),
        processOther: Boolean(formValues.processOther),
        processPumpingFans: Boolean(formValues.processPumpingFans),
        processRefrigeration: Boolean(formValues.processRefrigeration),
        processWasteHeatRecovery: Boolean(formValues.processWasteHeatRecovery),
        processMaterialProcessing: Boolean(formValues.processMaterialProcessing),
        processProcessCooling: Boolean(formValues.processProcessCooling),
        processProcessHeating: Boolean(formValues.processProcessHeating),
        processPumps: Boolean(formValues.processPumps),
        processSteamSystem: Boolean(formValues.processSteamSystem),
        processOtherSystems: Boolean(formValues.processOtherSystems),
        
        // Process and Systems (legacy array field for backward compatibility)
        processAndSystems: processAndSystems,
        
        // Description - store additional info here
        description: formValues.description || `Contact: ${formValues.primaryContactName || 'N/A'} (${formValues.primaryContactEmail || 'N/A'})`,
      };
      
      if (editingFacility) {
        const response = await apiRequest(`/api/facilities/${editingFacility.id}`, "PATCH", facilityData);
        if (!response.ok) {
          throw new Error(`Failed to update facility: ${response.status}`);
        }
        return response.json();
      } else {
        const response = await apiRequest("/api/facilities", "POST", facilityData);
        if (!response.ok) {
          throw new Error(`Failed to create facility: ${response.status}`);
        }
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: editingFacility ? "Facility updated successfully" : "Facility created successfully",
        description: `The facility has been ${editingFacility ? 'updated' : 'added'} with NAICS code ${generatedNAICS}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: `Failed to ${editingFacility ? 'update' : 'create'} facility`,
        description: error.message || `An error occurred while ${editingFacility ? 'updating' : 'creating'} the facility.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FacilityFormData) => {
    facilityMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="relative">
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-red-50 transition-colors z-10 border border-gray-200 bg-white shadow-sm"
              aria-label="Close form"
            >
              <X className="h-5 w-5 text-red-500 hover:text-red-600" />
            </button>
          )}
          <CardTitle className="flex items-center gap-2 pr-12">
            <Building2 className="h-5 w-5" />
            {editingFacility ? 'Edit Facility' : 'Add New Facility'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Facility Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Enter facility name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* NAICS Classification */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">NAICS Classification</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="facilitySector">Facility Sector *</Label>
                  <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={sectorOpen}
                        className="w-full justify-between"
                      >
                        {watchedSector
                          ? FACILITY_SECTORS.find(
                              (sector) => sector.code === watchedSector
                            )?.title
                          : "Select facility sector"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search sectors..." />
                        <CommandEmpty>No sector found.</CommandEmpty>
                        <CommandGroup>
                          {FACILITY_SECTORS.map((sector) => (
                            <CommandItem
                              key={sector.code}
                              value={sector.title}
                              onSelect={() => {
                                setValue("facilitySector", sector.code);
                                setSectorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchedSector === sector.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {sector.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.facilitySector && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.facilitySector.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="facilityCategory">Facility Category *</Label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        className="w-full justify-between"
                        disabled={!watchedSector}
                      >
                        {getCategoryDisplayText()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search categories..." />
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {availableCategories
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((category) => (
                            <CommandItem
                              key={category.code}
                              value={category.title}
                              onSelect={() => {
                                setValue("facilityCategory", category.code);
                                setCategoryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchedCategory === category.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {category.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.facilityCategory && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.facilityCategory.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="facilityType">Facility Type *</Label>
                  <Popover open={typeOpen} onOpenChange={setTypeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={typeOpen}
                        className="w-full justify-between"
                        disabled={!watchedCategory}
                      >
                        {getTypeDisplayText()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0">
                      <Command>
                        <CommandInput placeholder="Search facility types..." />
                        <CommandEmpty>No facility type found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {availableTypes
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((type) => (
                            <CommandItem
                              key={type.code}
                              value={type.title}
                              onSelect={() => {
                                setValue("facilityType", type.code);
                                setTypeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchedType === type.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {type.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.facilityType && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.facilityType.message}</p>
                  )}
                </div>

                {/* Generated NAICS Code Display */}
                {generatedNAICS && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">Generated NAICS Code</h4>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-lg font-mono">
                            {generatedNAICS}
                          </Badge>
                        </div>
                        <p className="text-sm text-blue-700 mt-2">{naicsDescription}</p>
                        
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">
                            If this NAICS code doesn't accurately represent your facility, please contact our team for assistance.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="123 Main Street, Unit 101"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.address.message}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    {...form.register("city")}
                    placeholder="City"
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="province">Province *</Label>
                  <Select value={watch("province")} onValueChange={(value) => setValue("province", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.province && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.province.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    {...form.register("country")}
                    disabled
                  />
                </div>
                
                <div>
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    {...form.register("postalCode")}
                    placeholder="A1B 2C3"
                  />
                  {form.formState.errors.postalCode && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.postalCode.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Facility Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Facility Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gross Floor Area with Unit Selection and Temporary Flag */}
                <div className="space-y-2">
                  <Label>Gross Floor Area *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={watch("grossFloorArea") || ""}
                      onChange={(e) => setValue("grossFloorArea", e.target.value)}
                      placeholder="10000"
                      className="flex-1"
                    />
                    <Select value={watch("grossFloorAreaUnit")} onValueChange={(value: any) => setValue("grossFloorAreaUnit", value)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sq_ft">sq ft</SelectItem>
                        <SelectItem value="sq_m">sq m</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="grossFloorAreaIsTemporary"
                      checked={watch("grossFloorAreaIsTemporary")}
                      onCheckedChange={(checked) => setValue("grossFloorAreaIsTemporary", !!checked)}
                    />
                    <Label htmlFor="grossFloorAreaIsTemporary" className="text-sm text-gray-600">
                      This is a temporary value
                    </Label>
                  </div>
                  {form.formState.errors.grossFloorArea && (
                    <p className="text-sm text-red-600">{form.formState.errors.grossFloorArea.message}</p>
                  )}
                </div>

                {/* Year Built */}
                <div className="space-y-2">
                  <Label htmlFor="yearBuilt">Year Built *</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    value={watch("yearBuilt") || ""}
                    onChange={(e) => setValue("yearBuilt", e.target.value)}
                    placeholder="2020"
                  />
                  {form.formState.errors.yearBuilt && (
                    <p className="text-sm text-red-600">{form.formState.errors.yearBuilt.message}</p>
                  )}
                  {/* Empty div to maintain alignment with other fields that have temporary checkboxes */}
                  <div className="h-6"></div>
                </div>

                {/* Weekly Operating Hours with Temporary Flag */}
                <div className="space-y-2">
                  <Label>Weekly Operating Hours *</Label>
                  <Input
                    type="number"
                    value={watch("weeklyOperatingHours") || ""}
                    onChange={(e) => setValue("weeklyOperatingHours", e.target.value)}
                    placeholder="168"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weeklyOperatingHoursIsTemporary"
                      checked={watch("weeklyOperatingHoursIsTemporary")}
                      onCheckedChange={(checked) => setValue("weeklyOperatingHoursIsTemporary", !!checked)}
                    />
                    <Label htmlFor="weeklyOperatingHoursIsTemporary" className="text-sm text-gray-600">
                      This is a temporary value
                    </Label>
                  </div>
                  {form.formState.errors.weeklyOperatingHours && (
                    <p className="text-sm text-red-600">{form.formState.errors.weeklyOperatingHours.message}</p>
                  )}
                </div>

                {/* Number of Workers with Temporary Flag */}
                <div className="space-y-2">
                  <Label>Number of Workers (Main Shift) *</Label>
                  <Input
                    type="number"
                    value={watch("numberOfWorkersMainShift") || ""}
                    onChange={(e) => setValue("numberOfWorkersMainShift", e.target.value)}
                    placeholder="50"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="numberOfWorkersMainShiftIsTemporary"
                      checked={watch("numberOfWorkersMainShiftIsTemporary")}
                      onCheckedChange={(checked) => setValue("numberOfWorkersMainShiftIsTemporary", !!checked)}
                    />
                    <Label htmlFor="numberOfWorkersMainShiftIsTemporary" className="text-sm text-gray-600">
                      This is a temporary value
                    </Label>
                  </div>
                  {form.formState.errors.numberOfWorkersMainShift && (
                    <p className="text-sm text-red-600">{form.formState.errors.numberOfWorkersMainShift.message}</p>
                  )}
                </div>

                {/* Type of Operation */}
                <div className="space-y-2">
                  <Label htmlFor="typeOfOperation">Type of Operation *</Label>
                  <Select value={watch("typeOfOperation")} onValueChange={(value: any) => setValue("typeOfOperation", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="semi_continuous">Semi-continuous</SelectItem>
                      <SelectItem value="batch">Batch</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.typeOfOperation && (
                    <p className="text-sm text-red-600">{form.formState.errors.typeOfOperation.message}</p>
                  )}
                  {/* Empty div to maintain alignment with other fields that have temporary checkboxes */}
                  <div className="h-6"></div>
                </div>
              </div>
            </div>

            {/* Energy Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Energy Management</h3>
              <div className="space-y-4">
                {/* EMIS Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasEMIS"
                      {...form.register("hasEMIS")}
                      checked={watch("hasEMIS")}
                      onCheckedChange={(checked) => {
                        console.log('[CHECKBOX] hasEMIS changed to:', checked);
                        setValue("hasEMIS", checked as boolean);
                      }}
                    />
                    <Label htmlFor="hasEMIS" className="text-sm font-medium">
                      Facility has an energy management information system (EMIS)
                    </Label>
                  </div>
                  
                  {watch("hasEMIS") && (
                    <div className="ml-6 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="emisRealtimeMonitoring"
                          {...form.register("emisRealtimeMonitoring")}
                          checked={watch("emisRealtimeMonitoring")}
                          onCheckedChange={(checked) => {
                            console.log('[CHECKBOX] emisRealtimeMonitoring changed to:', checked);
                            setValue("emisRealtimeMonitoring", checked as boolean);
                          }}
                        />
                        <Label htmlFor="emisRealtimeMonitoring" className="text-sm">
                          Real-time monitoring capability
                        </Label>
                      </div>
                      
                      <div>
                        <Label htmlFor="emisDescription" className="text-sm">
                          EMIS Description (optional)
                        </Label>
                        <Textarea
                          id="emisDescription"
                          {...form.register("emisDescription")}
                          value={watch("emisDescription") || ""}
                          onChange={(e) => {
                            console.log('[TEXTAREA] emisDescription changed to:', e.target.value);
                            setValue("emisDescription", e.target.value);
                          }}
                          placeholder="Describe the energy management information system"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Energy Manager Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasEnergyManager"
                      {...form.register("hasEnergyManager")}
                      checked={watch("hasEnergyManager")}
                      onCheckedChange={(checked) => {
                        console.log('[CHECKBOX] hasEnergyManager changed to:', checked);
                        setValue("hasEnergyManager", checked as boolean);
                      }}
                    />
                    <Label htmlFor="hasEnergyManager" className="text-sm font-medium">
                      Facility has a designated Energy Manager
                    </Label>
                  </div>
                  
                  {watch("hasEnergyManager") && (
                    <div className="ml-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="energyManagerFullTime"
                          {...form.register("energyManagerFullTime")}
                          checked={watch("energyManagerFullTime")}
                          onCheckedChange={(checked) => {
                            console.log('[CHECKBOX] energyManagerFullTime changed to:', checked);
                            setValue("energyManagerFullTime", checked as boolean);
                          }}
                        />
                        <Label htmlFor="energyManagerFullTime" className="text-sm">
                          Does the energy manager work full time? (unchecked = part time)
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Facility Process and Systems */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Facility Process and Systems</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processCombinedHeatPower"
                    checked={watch("processCombinedHeatPower")}
                    onCheckedChange={(checked) => setValue("processCombinedHeatPower", !!checked)}
                  />
                  <Label htmlFor="processCombinedHeatPower">
                    Combined Heat and Power
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processCompressedAir"
                    checked={watch("processCompressedAir")}
                    onCheckedChange={(checked) => setValue("processCompressedAir", !!checked)}
                  />
                  <Label htmlFor="processCompressedAir">
                    Compressed Air
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processControlSystem"
                    checked={watch("processControlSystem")}
                    onCheckedChange={(checked) => setValue("processControlSystem", !!checked)}
                  />
                  <Label htmlFor="processControlSystem">
                    Control System
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processElectrochemical"
                    checked={watch("processElectrochemical")}
                    onCheckedChange={(checked) => setValue("processElectrochemical", !!checked)}
                  />
                  <Label htmlFor="processElectrochemical">
                    Electrochemical Processes
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processFacilityNonProcess"
                    checked={watch("processFacilityNonProcess")}
                    onCheckedChange={(checked) => setValue("processFacilityNonProcess", !!checked)}
                  />
                  <Label htmlFor="processFacilityNonProcess">
                    Facility Non-process Energy Users (e.g. Lighting, HVAC, Others)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processFacilitySubmetering"
                    checked={watch("processFacilitySubmetering")}
                    onCheckedChange={(checked) => setValue("processFacilitySubmetering", !!checked)}
                  />
                  <Label htmlFor="processFacilitySubmetering">
                    Facility Submetering
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processFansBlowers"
                    checked={watch("processFansBlowers")}
                    onCheckedChange={(checked) => setValue("processFansBlowers", !!checked)}
                  />
                  <Label htmlFor="processFansBlowers">
                    Fans and Blowers
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processMaterialHandling"
                    checked={watch("processMaterialHandling")}
                    onCheckedChange={(checked) => setValue("processMaterialHandling", !!checked)}
                  />
                  <Label htmlFor="processMaterialHandling">
                    Material Handling
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processMaterialProcessing"
                    checked={watch("processMaterialProcessing")}
                    onCheckedChange={(checked) => setValue("processMaterialProcessing", !!checked)}
                  />
                  <Label htmlFor="processMaterialProcessing">
                    Material Processing
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processProcessCooling"
                    checked={watch("processProcessCooling")}
                    onCheckedChange={(checked) => setValue("processProcessCooling", !!checked)}
                  />
                  <Label htmlFor="processProcessCooling">
                    Process Cooling and/or Refrigeration
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processProcessHeating"
                    checked={watch("processProcessHeating")}
                    onCheckedChange={(checked) => setValue("processProcessHeating", !!checked)}
                  />
                  <Label htmlFor="processProcessHeating">
                    Process Heating
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processPumps"
                    checked={watch("processPumps")}
                    onCheckedChange={(checked) => setValue("processPumps", !!checked)}
                  />
                  <Label htmlFor="processPumps">
                    Pumps / Pumping System
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processSteamSystem"
                    checked={watch("processSteamSystem")}
                    onCheckedChange={(checked) => setValue("processSteamSystem", !!checked)}
                  />
                  <Label htmlFor="processSteamSystem">
                    Steam System (Generation, Distribution, Consumption)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processOtherSystems"
                    checked={watch("processOtherSystems")}
                    onCheckedChange={(checked) => setValue("processOtherSystems", !!checked)}
                  />
                  <Label htmlFor="processOtherSystems">
                    Other Process or Utility Systems
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={facilityMutation.isPending}
                className="min-w-[120px]"
              >
                {facilityMutation.isPending ? (
                  editingFacility ? "Updating..." : "Creating..."
                ) : (
                  editingFacility ? "Update Facility" : "Create Facility"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}