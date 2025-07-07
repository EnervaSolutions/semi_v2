import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Building2, CheckCircle, ChevronsUpDown, Info } from "lucide-react";
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
});

type AdminFacilityFormData = z.infer<typeof facilitySchema>;

interface AdminEnhancedFacilityFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingFacility?: any;
  companyId?: number;
}

const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", 
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", 
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", 
  "Saskatchewan", "Yukon"
];

export default function AdminEnhancedFacilityForm({ onSuccess, onCancel, editingFacility, companyId }: AdminEnhancedFacilityFormProps) {
  const { toast } = useToast();
  
  // Initialize categories and types based on existing facility data
  const initialCategories = editingFacility?.facilitySector 
    ? getFacilityCategoriesBySector(editingFacility.facilitySector)
    : (FACILITY_CATEGORIES || []);
  const initialTypes = editingFacility?.facilityCategory
    ? getFacilityTypesByCategory(editingFacility.facilityCategory) 
    : (FACILITY_TYPES || []);
    
  const [availableCategories, setAvailableCategories] = useState(initialCategories);
  const [availableTypes, setAvailableTypes] = useState(initialTypes);
  const [generatedNAICS, setGeneratedNAICS] = useState<string>(editingFacility?.naicsCode || "");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [naicsDescription, setNAICSDescription] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(!!editingFacility);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const isResettingRef = useRef(false);

  // Initialize NAICS description for existing facility
  useEffect(() => {
    if (editingFacility?.facilitySector && editingFacility?.facilityCategory && editingFacility?.facilityType) {
      try {
        const naicsCode = generateNAICSCode(editingFacility.facilitySector, editingFacility.facilityCategory, editingFacility.facilityType);
        const description = getNAICSDescription(naicsCode);
        setNAICSDescription(description);
        setGeneratedNAICS(naicsCode);
      } catch (error) {
        console.warn('Error initializing NAICS data for editing facility:', error);
        setNAICSDescription("");
        setGeneratedNAICS(editingFacility.naicsCode || "");
      }
    }
  }, [editingFacility]);

  const form = useForm<AdminFacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: editingFacility?.name || "",
      facilitySector: editingFacility?.facilitySector || "",
      facilityCategory: editingFacility?.facilityCategory || "",
      facilityType: editingFacility?.facilityType || "",
      naicsCode: editingFacility?.naicsCode || "",
      address: editingFacility?.address || "",
      city: editingFacility?.city || "",
      province: editingFacility?.province || "Alberta",
      country: editingFacility?.country || "Canada",
      postalCode: editingFacility?.postalCode || "",
      grossFloorArea: editingFacility?.grossFloorArea?.toString() || "",
      grossFloorAreaUnit: editingFacility?.grossFloorAreaUnit || "sq_ft",
      grossFloorAreaIsTemporary: editingFacility?.grossFloorAreaIsTemporary || false,
      yearBuilt: editingFacility?.yearBuilt?.toString() || "",
      weeklyOperatingHours: editingFacility?.weeklyOperatingHours?.toString() || "",
      weeklyOperatingHoursIsTemporary: editingFacility?.weeklyOperatingHoursIsTemporary || false,
      numberOfWorkersMainShift: editingFacility?.numberOfWorkersMainShift?.toString() || "",
      numberOfWorkersMainShiftIsTemporary: editingFacility?.numberOfWorkersMainShiftIsTemporary || false,
      typeOfOperation: editingFacility?.typeOfOperation || "continuous",
      hasEMIS: editingFacility?.hasEMIS || false,
      emisRealtimeMonitoring: editingFacility?.emisRealtimeMonitoring || false,
      emisDescription: editingFacility?.emisDescription || "",
      hasEnergyManager: editingFacility?.hasEnergyManager || false,
      energyManagerFullTime: editingFacility?.energyManagerFullTime || false,
      processCombinedHeatPower: editingFacility?.processCombinedHeatPower || false,
      processCompressedAir: editingFacility?.processCompressedAir || false,
      processControlSystem: editingFacility?.processControlSystem || false,
      processElectrochemical: editingFacility?.processElectrochemical || false,
      processFacilityNonProcess: editingFacility?.processFacilityNonProcess || false,
      processFacilitySubmetering: editingFacility?.processFacilitySubmetering || false,
      processHVAC: editingFacility?.processHVAC || false,
      processIndustrialGases: editingFacility?.processIndustrialGases || false,
      processLighting: editingFacility?.processLighting || false,
      processMotors: editingFacility?.processMotors || false,
      processOther: editingFacility?.processOther || false,
      processPumpingFans: editingFacility?.processPumpingFans || false,
      processRefrigeration: editingFacility?.processRefrigeration || false,
      processWasteHeatRecovery: editingFacility?.processWasteHeatRecovery || false,
      processMaterialProcessing: editingFacility?.processMaterialProcessing || false,
      processProcessCooling: editingFacility?.processProcessCooling || false,
      processProcessHeating: editingFacility?.processProcessHeating || false,
      processPumps: editingFacility?.processPumps || false,
      processSteamSystem: editingFacility?.processSteamSystem || false,
      processOtherSystems: editingFacility?.processOtherSystems || false,
    }
  });

  const { watch, setValue, reset } = form;
  const watchedSector = watch("facilitySector");
  const watchedCategory = watch("facilityCategory");
  const watchedType = watch("facilityType");
  const watchedHasEMIS = watch("hasEMIS");
  const watchedHasEnergyManager = watch("hasEnergyManager");

  // Initialize NAICS data and form reset for editing mode
  useEffect(() => {
    if (editingFacility && isInitializing) {
      console.log('[ADMIN FORM RESET] Starting initialization for editing facility:', {
        facilitySector: editingFacility.facilitySector,
        facilityCategory: editingFacility.facilityCategory,
        facilityType: editingFacility.facilityType,
        naicsCode: editingFacility.naicsCode,
        hasEMIS: editingFacility.hasEMIS,
        emisRealtimeMonitoring: editingFacility.emisRealtimeMonitoring,
        hasEnergyManager: editingFacility.hasEnergyManager,
        energyManagerFullTime: editingFacility.energyManagerFullTime
      });
      
      // Set up NAICS dropdowns
      if (editingFacility.facilitySector) {
        const categories = getFacilityCategoriesBySector(editingFacility.facilitySector);
        console.log('[ADMIN FORM RESET] Setting available categories:', categories.length, 'categories for sector', editingFacility.facilitySector);
        setAvailableCategories(categories);
      }
      
      if (editingFacility.facilityCategory) {
        const types = getFacilityTypesByCategory(editingFacility.facilityCategory);
        console.log('[ADMIN FORM RESET] Setting available types:', types.length, 'types for category', editingFacility.facilityCategory);
        setAvailableTypes(types);
      }
      
      if (editingFacility.naicsCode) {
        const description = getNAICSDescription(editingFacility.naicsCode);
        console.log('[ADMIN FORM RESET] Setting NAICS description for code', editingFacility.naicsCode, ':', description);
        setNAICSDescription(description);
        setGeneratedNAICS(editingFacility.naicsCode);
      }

      // Prepare form data for reset
      const formData = {
        name: editingFacility.name || "",
        facilitySector: editingFacility.facilitySector || "",
        facilityCategory: editingFacility.facilityCategory || "",
        facilityType: editingFacility.facilityType || "",
        naicsCode: editingFacility.naicsCode || "",
        address: editingFacility.address || "",
        city: editingFacility.city || "",
        province: editingFacility.province || "Alberta",
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
      };

      console.log('[ADMIN FORM RESET] Prepared form data:', {
        facilitySector: formData.facilitySector,
        facilityCategory: formData.facilityCategory,
        facilityType: formData.facilityType,
        hasEMIS: formData.hasEMIS,
        emisRealtimeMonitoring: formData.emisRealtimeMonitoring,
        energyManagerFullTime: formData.energyManagerFullTime,
      });
      
      // Use setTimeout to ensure reset happens after the state updates
      setTimeout(() => {
        console.log('[ADMIN FORM RESET] Calling reset with formData and setting isResetting flag');
        isResettingRef.current = true;
        reset(formData);
        
        // Force form values to be set explicitly for critical fields
        console.log('[ADMIN FORM RESET] Setting explicit values for NAICS and energy management fields');
        console.log('[ADMIN FORM RESET] About to set NAICS values:', {
          sector: editingFacility.facilitySector,
          category: editingFacility.facilityCategory,
          type: editingFacility.facilityType
        });
        
        setValue("facilitySector", editingFacility.facilitySector || "");
        console.log('[ADMIN FORM RESET] Set facilitySector to:', editingFacility.facilitySector, 'current watch value:', watch("facilitySector"));
        
        setValue("facilityCategory", editingFacility.facilityCategory || "");
        console.log('[ADMIN FORM RESET] Set facilityCategory to:', editingFacility.facilityCategory, 'current watch value:', watch("facilityCategory"));
        
        setValue("facilityType", editingFacility.facilityType || "");
        console.log('[ADMIN FORM RESET] Set facilityType to:', editingFacility.facilityType, 'current watch value:', watch("facilityType"));
        
        setValue("emisRealtimeMonitoring", !!editingFacility.emisRealtimeMonitoring);
        setValue("energyManagerFullTime", !!editingFacility.energyManagerFullTime);
        setValue("hasEMIS", !!editingFacility.hasEMIS);
        setValue("hasEnergyManager", !!editingFacility.hasEnergyManager);
        setValue("emisDescription", editingFacility.emisDescription || "");
        
        // Verify values after setting
        setTimeout(() => {
          console.log('[ADMIN FORM RESET] Values after explicit setValue (100ms delay):', {
            facilitySector: watch("facilitySector"),
            facilityCategory: watch("facilityCategory"),
            facilityType: watch("facilityType"),
            emisRealtimeMonitoring: watch("emisRealtimeMonitoring"),
            energyManagerFullTime: watch("energyManagerFullTime"),
            hasEMIS: watch("hasEMIS"),
            hasEnergyManager: watch("hasEnergyManager"),
            emisDescription: watch("emisDescription"),
          });
          
          // Also log form state
          const formValues = form.getValues();
          console.log('[ADMIN FORM RESET] Complete form values (100ms delay):', {
            facilitySector: formValues.facilitySector,
            facilityCategory: formValues.facilityCategory,
            facilityType: formValues.facilityType,
          });
        }, 100);
        
        // Also check immediately and clear isResetting flag
        setTimeout(() => {
          console.log('[ADMIN FORM RESET] Values after explicit setValue (500ms delay):', {
            facilitySector: watch("facilitySector"),
            facilityCategory: watch("facilityCategory"),
            facilityType: watch("facilityType"),
          });
          console.log('[ADMIN FORM RESET] Clearing isResetting flag');
          isResettingRef.current = false;
        }, 500);
      }, 0);
      
      // Mark initialization as complete
      setIsInitializing(false);
      console.log('[ADMIN FORM RESET] Initialization complete');
    }
  }, [editingFacility, isInitializing, reset]);

  // Update available categories when sector changes
  useEffect(() => {
    console.log('[NAICS SECTOR EFFECT] Triggered with:', {
      watchedSector,
      isInitializing,
      isSubmitting: form.formState.isSubmitting,
      hasErrors: Object.keys(form.formState.errors).length > 0,
      errors: form.formState.errors,
      editingFacilitySector: editingFacility?.facilitySector,
      currentCategory: watch("facilityCategory"),
      currentType: watch("facilityType")
    });
    
    if (watchedSector && !isInitializing) {
      const categories = getFacilityCategoriesBySector(watchedSector);
      console.log('[NAICS SECTOR EFFECT] Setting categories for sector', watchedSector, '- found', categories.length, 'categories');
      setAvailableCategories(categories);
      
      // Only clear if this is a user-initiated change, not during form validation, submission, or reset
      if (!form.formState.isSubmitting && !Object.keys(form.formState.errors).length && !formSubmitted && !isResettingRef.current) {
        console.log('[NAICS SECTOR EFFECT] About to clear category and type fields due to sector change');
        console.log('[NAICS SECTOR EFFECT] Clearing category/type fields due to sector change');
        setValue("facilityCategory", "");
        setValue("facilityType", "");
        setGeneratedNAICS("");
        setNAICSDescription("");
      } else {
        console.log('[NAICS SECTOR EFFECT] Skipping clear due to form submission, validation errors, recent form submission, or reset in progress');
      }
    }
  }, [watchedSector, setValue, isInitializing, form.formState.isSubmitting, form.formState.errors, formSubmitted]);

  // Update available types when category changes
  useEffect(() => {
    console.log('[NAICS CATEGORY EFFECT] Triggered with:', {
      watchedCategory,
      isInitializing,
      editingFacilityCategory: editingFacility?.facilityCategory,
      currentType: watch("facilityType"),
      isSubmitting: form.formState.isSubmitting,
      hasErrors: Object.keys(form.formState.errors).length > 0
    });
    
    if (watchedCategory && !isInitializing) {
      const types = getFacilityTypesByCategory(watchedCategory);
      console.log('[NAICS CATEGORY EFFECT] Setting types for category', watchedCategory, '- found', types.length, 'types');
      setAvailableTypes(types);
      
      // Only clear if this is a user-initiated change, not during form validation, submission, or reset
      if (!form.formState.isSubmitting && !Object.keys(form.formState.errors).length && !formSubmitted && !isResettingRef.current) {
        console.log('[NAICS CATEGORY EFFECT] About to clear facilityType due to category change');
        setValue("facilityType", "");
        setGeneratedNAICS("");
        setNAICSDescription("");
      } else {
        console.log('[NAICS CATEGORY EFFECT] Skipping clear due to form submission, validation errors, recent form submission, or reset in progress');
      }
    } else if (!watchedCategory && !isInitializing) {
      console.log('[NAICS CATEGORY EFFECT] No category selected, clearing types array');
      setAvailableTypes([]);
    }
  }, [watchedCategory, setValue, isInitializing, form.formState.isSubmitting, form.formState.errors, formSubmitted]);

  // Generate NAICS code when all selections are made
  useEffect(() => {
    if (watchedSector && watchedCategory && watchedType && !isInitializing) {
      try {
        const naicsCode = generateNAICSCode(watchedSector, watchedCategory, watchedType);
        const description = getNAICSDescription(naicsCode);
        setGeneratedNAICS(naicsCode);
        setNAICSDescription(description);
        setValue("naicsCode", naicsCode);
        console.log('[NAICS GENERATION] Generated NAICS code:', naicsCode, 'for', watchedSector, watchedCategory, watchedType);
      } catch (error) {
        console.error("Error generating NAICS code:", error);
        setGeneratedNAICS("");
        setNAICSDescription("");
      }
    }
  }, [watchedSector, watchedCategory, watchedType, setValue, isInitializing]);

  const getSectorDisplayText = () => {
    if (!watchedSector || !FACILITY_SECTORS) return "Select facility sector";
    const sector = FACILITY_SECTORS.find(s => s.code === watchedSector);
    return sector ? sector.title : "Select facility sector";
  };

  const getCategoryDisplayText = () => {
    const categoryFound = availableCategories.find(c => c.code === watchedCategory);
    console.log('[NAICS DISPLAY] getCategoryDisplayText called with:', {
      watchedSector,
      watchedCategory,
      availableCategories: availableCategories.length,
      availableCategoryNames: availableCategories.map(c => `${c.code}: ${c.title}`),
      categoryFound: categoryFound ? `${categoryFound.code}: ${categoryFound.title}` : 'NOT FOUND',
      editingFacilityCategory: editingFacility?.facilityCategory
    });
    
    if (!watchedSector) return "Select sector first";
    if (!watchedCategory) return "Select facility category";
    const category = availableCategories.find(c => c.code === watchedCategory);
    return category ? category.title : "Select facility category";
  };

  const getTypeDisplayText = () => {
    const typeFound = availableTypes.find(t => t.code === watchedType);
    console.log('[NAICS DISPLAY] getTypeDisplayText called with:', {
      watchedCategory,
      watchedType,
      availableTypes: availableTypes.length,
      availableTypeNames: availableTypes.map(t => `${t.code}: ${t.title}`),
      typeFound: typeFound ? `${typeFound.code}: ${typeFound.title}` : 'NOT FOUND',
      editingFacilityType: editingFacility?.facilityType
    });
    
    if (!watchedCategory) return "Select category first";
    if (!watchedType) return "Select facility type";
    const type = availableTypes.find(t => t.code === watchedType);
    return type ? type.title : "Select facility type";
  };

  const facilityMutation = useMutation({
    mutationFn: async (formValues: AdminFacilityFormData) => {
      console.log('[ADMIN FACILITY MUTATION] Starting mutation with form values:', formValues);
      console.log('[ADMIN FACILITY MUTATION] Company ID for API call:', companyId);
      console.log('[ADMIN FACILITY MUTATION] Editing facility:', editingFacility);
      
      // Build process and systems array
      const processAndSystems = [];
      if (formValues.processCombinedHeatPower) processAndSystems.push("Combined Heat and Power");
      if (formValues.processCompressedAir) processAndSystems.push("Compressed Air");
      if (formValues.processControlSystem) processAndSystems.push("Control System");
      if (formValues.processElectrochemical) processAndSystems.push("Electrochemical");
      if (formValues.processFacilityNonProcess) processAndSystems.push("Facility (Non-Process)");
      if (formValues.processFacilitySubmetering) processAndSystems.push("Facility Submetering");
      if (formValues.processHVAC) processAndSystems.push("HVAC");
      if (formValues.processIndustrialGases) processAndSystems.push("Industrial Gases");
      if (formValues.processLighting) processAndSystems.push("Lighting");
      if (formValues.processMotors) processAndSystems.push("Motors");
      if (formValues.processOther) processAndSystems.push("Other");
      if (formValues.processPumpingFans) processAndSystems.push("Pumping/Fans");
      if (formValues.processRefrigeration) processAndSystems.push("Refrigeration");
      if (formValues.processWasteHeatRecovery) processAndSystems.push("Waste Heat Recovery");
      if (formValues.processMaterialProcessing) processAndSystems.push("Material Processing");
      if (formValues.processProcessCooling) processAndSystems.push("Process Cooling");
      if (formValues.processProcessHeating) processAndSystems.push("Process Heating");
      if (formValues.processPumps) processAndSystems.push("Pumps");
      if (formValues.processSteamSystem) processAndSystems.push("Steam System");
      if (formValues.processOtherSystems) processAndSystems.push("Other Systems");

      const facilityData = {
        name: formValues.name,
        
        // NAICS Classification - ensure these are preserved
        facilitySector: formValues.facilitySector,
        facilityCategory: formValues.facilityCategory,
        facilityType: formValues.facilityType,
        naicsCode: generatedNAICS || formValues.naicsCode,
        
        // Address Information - ensure these are preserved
        address: formValues.address,
        city: formValues.city,
        province: formValues.province,
        country: formValues.country,
        postalCode: formValues.postalCode,
        
        // Facility Details
        grossFloorArea: formValues.grossFloorArea,
        grossFloorAreaUnit: formValues.grossFloorAreaUnit,
        grossFloorAreaIsTemporary: formValues.grossFloorAreaIsTemporary,
        yearBuilt: formValues.yearBuilt,
        weeklyOperatingHours: formValues.weeklyOperatingHours,
        weeklyOperatingHoursIsTemporary: formValues.weeklyOperatingHoursIsTemporary,
        numberOfWorkersMainShift: formValues.numberOfWorkersMainShift,
        numberOfWorkersMainShiftIsTemporary: formValues.numberOfWorkersMainShiftIsTemporary,
        typeOfOperation: formValues.typeOfOperation,
        
        // Energy Management
        hasEMIS: formValues.hasEMIS,
        emisRealtimeMonitoring: formValues.emisRealtimeMonitoring,
        emisDescription: formValues.emisDescription,
        hasEnergyManager: formValues.hasEnergyManager,
        energyManagerFullTime: formValues.energyManagerFullTime,
        
        // All Process and Systems checkboxes
        processCombinedHeatPower: formValues.processCombinedHeatPower,
        processCompressedAir: formValues.processCompressedAir,
        processControlSystem: formValues.processControlSystem,
        processElectrochemical: formValues.processElectrochemical,
        processFacilityNonProcess: formValues.processFacilityNonProcess,
        processFacilitySubmetering: formValues.processFacilitySubmetering,
        processHVAC: formValues.processHVAC,
        processIndustrialGases: formValues.processIndustrialGases,
        processLighting: formValues.processLighting,
        processMotors: formValues.processMotors,
        processOther: formValues.processOther,
        processPumpingFans: formValues.processPumpingFans,
        processRefrigeration: formValues.processRefrigeration,
        processWasteHeatRecovery: formValues.processWasteHeatRecovery,
        processMaterialProcessing: formValues.processMaterialProcessing,
        processProcessCooling: formValues.processProcessCooling,
        processProcessHeating: formValues.processProcessHeating,
        processPumps: formValues.processPumps,
        processSteamSystem: formValues.processSteamSystem,
        processOtherSystems: formValues.processOtherSystems,
        
        // Process and Systems (legacy array field for backward compatibility)
        processAndSystems: processAndSystems,
        
        // Description for admin context
        description: editingFacility?.description || `Facility managed by system admin`,
      };
      
      console.log('[ADMIN FACILITY MUTATION] Facility data being sent to API:', facilityData);
      
      try {
        let apiUrl;
        let method;
        
        if (editingFacility) {
          apiUrl = `/api/admin/facilities/${editingFacility.id}`;
          method = "PATCH";
        } else {
          apiUrl = `/api/admin/companies/${companyId}/facilities`;
          method = "POST";
        }
        
        console.log('[ADMIN FACILITY MUTATION] Making API request:', method, apiUrl);
        
        const response = await apiRequest(apiUrl, method, facilityData);
        console.log('[ADMIN FACILITY MUTATION] Raw API response received');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ADMIN FACILITY MUTATION] API response not OK:', response.status, errorText);
          throw new Error(`API request failed: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[ADMIN FACILITY MUTATION] API response parsed successfully:', result);
        return result;
      } catch (error: any) {
        console.error('[ADMIN FACILITY MUTATION] API request failed with error:', error);
        console.error('[ADMIN FACILITY MUTATION] Error details:', error?.message, error?.stack);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[ADMIN FACILITY MUTATION] Success - setting formSubmitted flag to prevent field clearing');
      setFormSubmitted(true);
      
      // Clear the formSubmitted flag after 2 seconds to allow normal operation
      setTimeout(() => {
        console.log('[ADMIN FACILITY MUTATION] Clearing formSubmitted flag');
        setFormSubmitted(false);
      }, 2000);
      
      toast({
        title: editingFacility ? "Facility updated successfully" : "Facility created successfully",
        description: `The facility has been ${editingFacility ? 'updated' : 'added'} with NAICS code ${generatedNAICS}.`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Facility mutation error:', error);
      toast({
        title: `Failed to ${editingFacility ? 'update' : 'create'} facility`,
        description: error.message || `An error occurred while ${editingFacility ? 'updating' : 'creating'} the facility.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminFacilityFormData) => {
    console.log('[ADMIN FACILITY FORM] Form submitted with data:', data);
    console.log('[ADMIN FACILITY FORM] NAICS fields in submission:', {
      facilitySector: data.facilitySector,
      facilityCategory: data.facilityCategory,
      facilityType: data.facilityType,
      naicsCode: data.naicsCode
    });
    console.log('[ADMIN FACILITY FORM] Energy management fields in submission:', {
      hasEMIS: data.hasEMIS,
      emisRealtimeMonitoring: data.emisRealtimeMonitoring,
      emisDescription: data.emisDescription,
      hasEnergyManager: data.hasEnergyManager,
      energyManagerFullTime: data.energyManagerFullTime
    });
    console.log('[ADMIN FACILITY FORM] Form errors:', form.formState.errors);
    console.log('[ADMIN FACILITY FORM] Form state:', {
      isSubmitting: form.formState.isSubmitting,
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty
    });
    console.log('[ADMIN FACILITY FORM] Current watched values:', {
      watchedSector,
      watchedCategory,
      watchedType,
      generatedNAICS,
      naicsDescription
    });
    console.log('[ADMIN FACILITY FORM] Company ID:', companyId);
    console.log('[ADMIN FACILITY FORM] Mutation pending state:', facilityMutation.isPending);
    
    if (!companyId) {
      console.error('[ADMIN FACILITY FORM] No company ID provided');
      toast({
        title: "Error",
        description: "Company ID is required to create a facility",
        variant: "destructive",
      });
      return;
    }
    
    facilityMutation.mutate(data);
  };

  const processSystemsOptions = [
    { key: "processCombinedHeatPower", label: "Combined Heat and Power" },
    { key: "processCompressedAir", label: "Compressed Air" },
    { key: "processControlSystem", label: "Control System" },
    { key: "processElectrochemical", label: "Electrochemical" },
    { key: "processFacilityNonProcess", label: "Facility (Non-Process)" },
    { key: "processFacilitySubmetering", label: "Facility Submetering" },
    { key: "processHVAC", label: "HVAC" },
    { key: "processIndustrialGases", label: "Industrial Gases" },
    { key: "processLighting", label: "Lighting" },
    { key: "processMotors", label: "Motors" },
    { key: "processOther", label: "Other" },
    { key: "processPumpingFans", label: "Pumping/Fans" },
    { key: "processRefrigeration", label: "Refrigeration" },
    { key: "processWasteHeatRecovery", label: "Waste Heat Recovery" },
    { key: "processMaterialProcessing", label: "Material Processing" },
    { key: "processProcessCooling", label: "Process Cooling" },
    { key: "processProcessHeating", label: "Process Heating" },
    { key: "processPumps", label: "Pumps" },
    { key: "processSteamSystem", label: "Steam System" },
    { key: "processOtherSystems", label: "Other Systems" }
  ];

  return (
    <div className="space-y-6">
      {/* Debug Info - Show validation errors */}
      {Object.keys(form.formState.errors).length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Form Validation Errors:</strong>
            <ul className="mt-2 list-disc list-inside">
              {Object.entries(form.formState.errors).map(([field, error]) => (
                <li key={field}>
                  {field}: {error?.message || 'Invalid value'}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* NAICS Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">NAICS Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    {getSectorDisplayText()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0">
                  <Command>
                    <CommandInput placeholder="Search sectors..." />
                    <CommandEmpty>No sector found.</CommandEmpty>
                    <CommandGroup>
                      {FACILITY_SECTORS && FACILITY_SECTORS.map((sector) => (
                        <CommandItem
                          key={sector.code}
                          value={sector.title}
                          onSelect={() => {
                            setValue("facilitySector", sector.code);
                            setSectorOpen(false);
                          }}
                        >
                          <CheckCircle
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
                <PopoverContent className="w-[600px] p-0">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {availableCategories && availableCategories
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
                          <CheckCircle
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
                <PopoverContent className="w-[600px] p-0">
                  <Command>
                    <CommandInput placeholder="Search facility types..." />
                    <CommandEmpty>No facility type found.</CommandEmpty>
                    <CommandGroup>
                      {availableTypes && availableTypes
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
                          <CheckCircle
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

            {/* NAICS Code Display */}
            {generatedNAICS && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Generated NAICS Code:</strong> <Badge variant="outline">{generatedNAICS}</Badge></p>
                    {naicsDescription && <p className="text-sm text-gray-600">{naicsDescription}</p>}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="Enter street address"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  placeholder="Enter city"
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

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...form.register("country")}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Facility Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Facility Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gross Floor Area with Unit Selection and Temporary Flag */}
              <div className="space-y-2">
                <Label>Gross Floor Area *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    {...form.register("grossFloorArea")}
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
                  {...form.register("yearBuilt")}
                  placeholder="2020"
                />
                {form.formState.errors.yearBuilt && (
                  <p className="text-sm text-red-600">{form.formState.errors.yearBuilt.message}</p>
                )}
                <div className="h-6"></div>
              </div>

              {/* Weekly Operating Hours with Temporary Flag */}
              <div className="space-y-2">
                <Label>Weekly Operating Hours *</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("weeklyOperatingHours")}
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

              {/* Number of Workers Main Shift with Temporary Flag */}
              <div className="space-y-2">
                <Label>Number of Workers (Main Shift) *</Label>
                <Input
                  type="number"
                  {...form.register("numberOfWorkersMainShift")}
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
            </div>

            <div>
              <Label>Type of Operation *</Label>
              <Select value={watch("typeOfOperation")} onValueChange={(value: any) => setValue("typeOfOperation", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continuous">Continuous</SelectItem>
                  <SelectItem value="semi_continuous">Semi-Continuous</SelectItem>
                  <SelectItem value="batch">Batch</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.typeOfOperation && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.typeOfOperation.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Energy Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Energy Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* EMIS Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasEMIS"
                    checked={watchedHasEMIS}
                    onCheckedChange={(checked) => setValue("hasEMIS", !!checked)}
                  />
                  <Label htmlFor="hasEMIS" className="text-sm font-medium">
                    Facility has an energy management information system (EMIS)
                  </Label>
                </div>
                
                {watchedHasEMIS && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="emisRealtimeMonitoring"
                        {...form.register("emisRealtimeMonitoring")}
                        checked={watch("emisRealtimeMonitoring")}
                        onCheckedChange={(checked) => setValue("emisRealtimeMonitoring", !!checked)}
                      />
                      <Label htmlFor="emisRealtimeMonitoring" className="text-sm">
                        Real-time monitoring capability
                      </Label>
                    </div>
                    
                    <div>
                      <Label htmlFor="emisDescription" className="text-sm">
                        Provide a brief description of existing EMIS and its capabilities
                      </Label>
                      <Textarea
                        id="emisDescription"
                        {...form.register("emisDescription")}
                        placeholder="Describe the current EMIS system, its capabilities, monitoring scope, and data collection features..."
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
                    checked={watchedHasEnergyManager}
                    onCheckedChange={(checked) => setValue("hasEnergyManager", !!checked)}
                  />
                  <Label htmlFor="hasEnergyManager" className="text-sm font-medium">
                    Facility has a designated Energy Manager
                  </Label>
                </div>
                
                {watchedHasEnergyManager && (
                  <div className="ml-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="energyManagerFullTime"
                        {...form.register("energyManagerFullTime")}
                        checked={watch("energyManagerFullTime")}
                        onCheckedChange={(checked) => setValue("energyManagerFullTime", !!checked)}
                      />
                      <Label htmlFor="energyManagerFullTime" className="text-sm">
                        Does the energy manager work full time? (unchecked = part time)
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facility Processes and Systems */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Facility Processes and Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {processSystemsOptions.map((option) => (
                <div key={option.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.key}
                    checked={watch(option.key as any)}
                    onCheckedChange={(checked) => setValue(option.key as any, !!checked)}
                  />
                  <Label htmlFor={option.key} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={facilityMutation.isPending}
          >
            {facilityMutation.isPending 
              ? "Saving..." 
              : editingFacility ? "Update Facility" : "Create Facility"
            }
          </Button>
        </div>
      </form>
    </div>
  );
}