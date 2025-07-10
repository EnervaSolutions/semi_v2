import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
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

interface CompanyApplicationDialogProps {
  onSuccess?: () => void;
}

export default function CompanyApplicationDialog({ onSuccess }: CompanyApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    facilityId: '',
    activityType: ''
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get user's company facilities
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      console.log('Fetching company facilities');
      const response = await apiRequest('/api/facilities', 'GET');
      const data = await response.json();
      console.log('Facilities response:', data);
      return data;
    },
    enabled: open,
  });

  // Get enabled activity types for selected facility
  const { data: enabledActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/facilities', formData.facilityId, 'activities'],
    queryFn: async () => {
      if (!formData.facilityId) return [];
      console.log('Fetching enabled activities for facility:', formData.facilityId);
      const response = await apiRequest(`/api/facilities/${formData.facilityId}/activities`, 'GET');
      const data = await response.json();
      console.log('Activities response:', data);
      return data.enabledActivities || [];
    },
    enabled: !!formData.facilityId,
  });

  // Query for predicted application ID
  const { data: predictedApplicationId, isLoading: predictingId } = useQuery({
    queryKey: ['/api/predict-application-id', formData.facilityId, formData.activityType],
    queryFn: async () => {
      if (formData.facilityId && formData.activityType) {
        console.log('Predicting application ID for:', { facilityId: formData.facilityId, activityType: formData.activityType });
        const response = await apiRequest(`/api/predict-application-id?facilityId=${formData.facilityId}&activityType=${formData.activityType}`, 'GET');
        if (!response.ok) {
          throw new Error('Failed to predict application ID');
        }
        const data = await response.text();
        console.log('Predicted application ID:', data);
        return data;
      }
      return null;
    },
    enabled: !!(formData.facilityId && formData.activityType),
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating application with data:', data);
      const response = await apiRequest('/api/applications', 'POST', data);
      const result = await response.json();
      console.log('Application creation result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Application created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setOpen(false);
      setFormData({
        facilityId: '',
        activityType: ''
      });
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
    if (!formData.facilityId || !formData.activityType) {
      toast({
        title: "Error",
        description: "Please select both facility and activity type",
        variant: "destructive",
      });
      return;
    }

    // Validate that facilities are available
    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
      toast({
        title: "Error", 
        description: "No facilities found. Please create a facility first.",
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
      facilityId: parseInt(formData.facilityId),
      activityType: formData.activityType
    });
  };

  const handleFacilityChange = (facilityId: string) => {
    setFormData({ ...formData, facilityId, activityType: '' });
  };

  const handleActivityTypeChange = (activityType: string) => {
    setFormData({ ...formData, activityType });
  };

  const activityLabels: { [key: string]: string } = {
    'FRA': 'Facility Readiness Assessment (FRA)',
    'SEM': 'Strategic Energy Management (SEM)',
    'EAA': 'Energy Assessments and Audits (EAA)',
    'EMIS': 'Energy Management Information Systems (EMIS)',
    'CR': 'Capital Retrofits (CR)'
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
            Add a new application for your company.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="facility">Facility *</Label>
            <Select 
              value={formData.facilityId} 
              onValueChange={handleFacilityChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select facility" />
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
                  <div className="px-2 py-1 text-sm text-gray-500">
                    No facilities found. Create a facility first.
                  </div>
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
                {activitiesLoading ? (
                  <div className="px-2 py-1 text-sm text-gray-500">Loading activities...</div>
                ) : enabledActivities && Array.isArray(enabledActivities) && enabledActivities.length > 0 ? (
                  enabledActivities.map((activityType: string) => (
                    <SelectItem key={activityType} value={activityType}>
                      {activityLabels[activityType] || activityType}
                    </SelectItem>
                  ))
                ) : (
                  formData.facilityId && (
                    <div className="px-2 py-1 text-sm text-gray-500">
                      No activity types available for this facility
                    </div>
                  )
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