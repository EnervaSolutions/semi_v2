import React, { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TestLimits() {
  const { toast } = useToast();

  const { data: activitySettings = [], isLoading } = useQuery({
    queryKey: ['/api/activity-settings'],
  });

  const updateActivityLimitMutation = useMutation({
    mutationFn: async ({ activityType, maxApplications }: { activityType: string; maxApplications: number | null }) => {
      const res = await apiRequest("PATCH", `/api/admin/activity-settings/${activityType}`, {
        maxApplications,
        updatedBy: 'test-user'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity-settings'] });
      toast({
        title: "Application limit updated",
        description: "The application limit has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update limit",
        description: "Could not update the application limit. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading application settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Test: Application Limits Configuration</CardTitle>
          <CardDescription>
            Configure maximum application limits per activity type for each facility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activitySettings.map((setting: any) => (
              <div key={setting.activityType} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900">{setting.activityType}</h3>
                    <Badge variant={setting.isEnabled ? "default" : "secondary"}>
                      {setting.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {setting.description || `Configure application limits for ${setting.activityType} activity`}
                  </p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-600">
                      Current limit: {setting.maxApplications ? `${setting.maxApplications} per facility` : 'Unlimited'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Max Applications:</label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      placeholder={setting.activityType === 'FRA' ? '1' : 'No limit'}
                      defaultValue={setting.maxApplications || ''}
                      disabled={!setting.isEnabled || updateActivityLimitMutation.isPending}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      onBlur={(e) => {
                        const value = e.target.value;
                        const maxApplications = value ? parseInt(value) : null;
                        
                        // Only update if the value changed
                        if (maxApplications !== setting.maxApplications) {
                          updateActivityLimitMutation.mutate({
                            activityType: setting.activityType,
                            maxApplications
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!setting.isEnabled || updateActivityLimitMutation.isPending}
                    onClick={() => {
                      updateActivityLimitMutation.mutate({
                        activityType: setting.activityType,
                        maxApplications: null
                      });
                    }}
                  >
                    Remove Limit
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Application Limit Guidelines</h4>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <p>• FRA activities are limited to 1 application per facility by default</p>
                  <p>• Other activities have no limit unless specified</p>
                  <p>• Limits apply per facility, not per company</p>
                  <p>• Changes take effect immediately for new applications</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}