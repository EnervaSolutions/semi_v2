import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddApplicationDialogProps {
  onSuccess?: () => void;
}

export default function AddApplicationDialog({ onSuccess }: AddApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    companyId: '',
    facilityId: '',
    activityType: ''
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/admin/companies'],
    queryFn: async () => {
      console.log('Fetching companies for admin');
      const response = await apiRequest('/api/admin/companies', 'GET');
      const data = await response.json();
      console.log('Companies response:', data);
      return data;
    },
    enabled: open,
  });

  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
    queryKey: ['/api/admin/facilities', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      console.log('Fetching facilities for company:', selectedCompanyId);
      const response = await apiRequest(`/api/admin/facilities/${selectedCompanyId}`, 'GET');
      const data = await response.json();
      console.log('Facilities response:', data);
      return data;
    },
    enabled: !!selectedCompanyId,
  });

  // Get enabled activity types (hardcoded for now as API may not exist)
  const activitySettings = [
    { activityType: 'FRA', isEnabled: true },
    { activityType: 'SEM', isEnabled: true },
    { activityType: 'EAA', isEnabled: true },
    { activityType: 'EMIS', isEnabled: true },
    { activityType: 'CR', isEnabled: true }
  ];

  // Query for predicted application ID
  const { data: predictedApplicationId, isLoading: predictingId } = useQuery({
    queryKey: ['/api/admin/predict-application-id', selectedCompanyId, formData.facilityId, formData.activityType],
    queryFn: async () => {
      if (selectedCompanyId && formData.facilityId && formData.activityType) {
        console.log('Predicting application ID for:', { selectedCompanyId, facilityId: formData.facilityId, activityType: formData.activityType });
        const response = await apiRequest(`/api/admin/predict-application-id?companyId=${selectedCompanyId}&facilityId=${formData.facilityId}&activityType=${formData.activityType}`, 'GET');
        if (!response.ok) {
          throw new Error('Failed to predict application ID');
        }
        const data = await response.text();
        console.log('Predicted application ID:', data);
        return data;
      }
      return null;
    },
    enabled: !!(selectedCompanyId && formData.facilityId && formData.activityType),
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating application with data:', data);
      const response = await apiRequest('/api/admin/applications', 'POST', data);
      const result = await response.json();
      console.log('Application creation result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Application created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/applications'] });
      setOpen(false);
      setFormData({
        companyId: '',
        facilityId: '',
        activityType: ''
      });
      setSelectedCompanyId(null);
      toast({
        title: "Success",
        description: `Application ${data.applicationId || 'created'} successfully`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Application creation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create application",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.companyId || !formData.facilityId || !formData.activityType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (company, facility, and activity type)",
        variant: "destructive",
      });
      return;
    }

    // Validate that facilities are available for the selected company
    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
      toast({
        title: "Error", 
        description: "The selected company has no facilities. Please select a company with facilities.",
        variant: "destructive",
      });
      return;
    }

    // Validate selected facility exists in the facilities list
    const selectedFacility = facilities.find((f: any) => f.id.toString() === formData.facilityId);
    if (!selectedFacility) {
      toast({
        title: "Error",
        description: "Please select a valid facility.",
        variant: "destructive",
      });
      return;
    }

    createApplicationMutation.mutate({
      companyId: parseInt(formData.companyId),
      facilityId: parseInt(formData.facilityId),
      activityType: formData.activityType
    });
  };

  const handleCompanyChange = (companyId: string) => {
    setFormData({ ...formData, companyId, facilityId: '', activityType: '' });
    setSelectedCompanyId(parseInt(companyId));
  };

  const handleFacilityChange = (facilityId: string) => {
    setFormData({ ...formData, facilityId, activityType: '' });
  };

  const handleActivityTypeChange = (activityType: string) => {
    setFormData({ ...formData, activityType });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          size="sm"
          className="text-gray-600 border-gray-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Application</DialogTitle>
          <DialogDescription>
            Add a new application for a company and facility.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Company *</Label>
            <Select value={formData.companyId} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companiesLoading ? (
                  <div className="px-2 py-1 text-sm text-gray-500">Loading companies...</div>
                ) : companies && Array.isArray(companies) && companies.length > 0 ? (
                  companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name} ({company.shortName})
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm text-gray-500">
                    No companies found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="facility">Facility *</Label>
            <Select 
              value={formData.facilityId} 
              onValueChange={handleFacilityChange}
              disabled={!selectedCompanyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCompanyId ? "Select facility" : "Select company first"} />
              </SelectTrigger>
              <SelectContent>
                {facilitiesLoading ? (
                  <div className="px-2 py-1 text-sm text-gray-500">Loading facilities...</div>
                ) : facilities && Array.isArray(facilities) && facilities.length > 0 ? (
                  facilities.map((facility: any) => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      {facility.name} {facility.naicsCode ? `(${facility.naicsCode})` : ''}
                    </SelectItem>
                  ))
                ) : (
                  selectedCompanyId && (
                    <div className="px-2 py-1 text-sm text-gray-500">
                      No facilities found for this company
                    </div>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activityType">Activity Type *</Label>
            <Select 
              value={formData.activityType} 
              onValueChange={handleActivityTypeChange}
              disabled={!formData.facilityId}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.facilityId ? "Select activity type" : "Select facility first"} />
              </SelectTrigger>
              <SelectContent>
                {activitySettings && Array.isArray(activitySettings) && activitySettings.length > 0 ? (
                  activitySettings
                    .filter((setting: any) => setting.isEnabled)
                    .map((setting: any) => {
                      const activityLabels: { [key: string]: string } = {
                        'FRA': 'Facility Readiness Assessment (FRA)',
                        'SEM': 'Strategic Energy Management (SEM)',
                        'EAA': 'Energy Assessments and Audits (EAA)',
                        'EMIS': 'Energy Management Information Systems (EMIS)',
                        'CR': 'Capital Retrofits (CR)'
                      };
                      return (
                        <SelectItem key={setting.activityType} value={setting.activityType}>
                          {activityLabels[setting.activityType] || setting.activityType}
                        </SelectItem>
                      );
                    })
                ) : (
                  <div className="px-2 py-1 text-sm text-gray-500">
                    No activity types available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Predicted Application ID Display */}
          {(predictingId || predictedApplicationId) && (
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-green-700">Predicted Application ID</Label>
              <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                {predictingId ? (
                  <div className="text-sm text-gray-600">Generating ID...</div>
                ) : (
                  <code className="text-sm font-mono text-green-800">{predictedApplicationId}</code>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={createApplicationMutation.isPending}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {createApplicationMutation.isPending ? 'Creating...' : 'Create Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}