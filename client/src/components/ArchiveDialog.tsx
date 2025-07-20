import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EntityDetails {
  type: 'company' | 'facility' | 'application';
  id: number;
  name: string;
  archiveReason?: string;
  archivedAt: string;
  archivedBy?: string;
  
  // Company specific
  businessNumber?: string;
  website?: string;
  phone?: string;
  
  // Facility specific
  naicsCode?: string;
  
  // Application specific
  applicationId?: string;
  activityType?: string;
  status?: string;
  submittedBy?: string;
  
  // Common location fields
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  
  // Associated data
  applications?: Array<{
    id: number;
    applicationId: string;
    activityType: string;
    title: string;
    status: string;
  }>;
  
  facilities?: Array<{
    id: number;
    name: string;
    naicsCode?: string;
  }>;
  
  company?: {
    id: number;
    name: string;
  };
  
  facility?: {
    id: number;
    name: string;
  };
}

interface EntityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityDetails: EntityDetails | null;
}

const EntityDetailsDialog: React.FC<EntityDetailsDialogProps> = ({
  open,
  onOpenChange,
  entityDetails,
}) => {
  if (!entityDetails) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entity Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-sm capitalize">{entityDetails.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-sm">{entityDetails.name}</p>
                </div>
                
                {/* Type-specific fields */}
                {entityDetails.type === 'application' && entityDetails.applicationId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Application ID</label>
                    <p className="text-sm">{entityDetails.applicationId}</p>
                  </div>
                )}
                {entityDetails.type === 'application' && entityDetails.activityType && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Activity Type</label>
                    <p className="text-sm">{entityDetails.activityType}</p>
                  </div>
                )}
                {entityDetails.type === 'facility' && entityDetails.naicsCode && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">NAICS Code</label>
                    <p className="text-sm">{entityDetails.naicsCode}</p>
                  </div>
                )}
                {entityDetails.type === 'company' && entityDetails.businessNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business Number</label>
                    <p className="text-sm">{entityDetails.businessNumber}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Archive Reason</label>
                  <p className="text-sm">{entityDetails.archiveReason || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Archived Date</label>
                  <p className="text-sm">{new Date(entityDetails.archivedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Additional Details</h3>
              <div className="space-y-2">
                {entityDetails.type === 'company' && entityDetails.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Website</label>
                    <p className="text-sm">{entityDetails.website}</p>
                  </div>
                )}
                {entityDetails.type === 'company' && entityDetails.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-sm">{entityDetails.phone}</p>
                  </div>
                )}
                {(entityDetails.type === 'company' || entityDetails.type === 'facility') && entityDetails.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-sm">{entityDetails.address}</p>
                  </div>
                )}
                {(entityDetails.type === 'company' || entityDetails.type === 'facility') && entityDetails.city && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">City</label>
                    <p className="text-sm">{entityDetails.city}</p>
                  </div>
                )}
                {(entityDetails.type === 'company' || entityDetails.type === 'facility') && entityDetails.province && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Province</label>
                    <p className="text-sm">{entityDetails.province}</p>
                  </div>
                )}
                {(entityDetails.type === 'company' || entityDetails.type === 'facility') && entityDetails.postalCode && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Postal Code</label>
                    <p className="text-sm">{entityDetails.postalCode}</p>
                  </div>
                )}
                {entityDetails.type === 'application' && entityDetails.status && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="text-sm">{entityDetails.status}</p>
                  </div>
                )}
                {entityDetails.type === 'application' && entityDetails.submittedBy && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Submitted By</label>
                    <p className="text-sm">{entityDetails.submittedBy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Associated Applications */}
          {entityDetails.applications && entityDetails.applications.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Associated Applications</h3>
              <div className="grid gap-4">
                {entityDetails.applications.map((app) => (
                  <div key={app.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <label className="font-medium text-gray-600">Application ID</label>
                        <p>{app.applicationId}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Activity Type</label>
                        <p>{app.activityType}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Title</label>
                        <p>{app.title}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Status</label>
                        <p>{app.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated Facilities */}
          {entityDetails.facilities && entityDetails.facilities.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Associated Facilities</h3>
              <div className="grid gap-4">
                {entityDetails.facilities.map((facility) => (
                  <div key={facility.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <label className="font-medium text-gray-600">Name</label>
                        <p>{facility.name}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">NAICS Code</label>
                        <p>{facility.naicsCode || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated Company */}
          {entityDetails.company && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Associated Company</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="font-medium text-gray-600">Company Name</label>
                    <p>{entityDetails.company.name}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-600">Company ID</label>
                    <p>{entityDetails.company.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Associated Facility */}
          {entityDetails.facility && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Associated Facility</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="font-medium text-gray-600">Facility Name</label>
                    <p>{entityDetails.facility.name}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-600">Facility ID</label>
                    <p>{entityDetails.facility.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(EntityDetailsDialog);