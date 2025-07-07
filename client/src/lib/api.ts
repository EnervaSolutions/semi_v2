import { apiRequest } from "./queryClient";

export interface CreateCompanyData {
  name: string;
  shortName: string;
  address?: string;
  phone?: string;
  website?: string;
}

export interface CreateFacilityData {
  name: string;
  code: string;
  address?: string;
  description?: string;
}

export interface CreateApplicationData {
  facilityId: number;
  activityType: string;
  title: string;
  description?: string;
}

export interface UpdateApplicationData {
  status?: string;
  title?: string;
  description?: string;
  reviewNotes?: string;
}

export interface UploadDocumentData {
  files: FileList;
  applicationId?: number;
  documentType: string;
}

// Company API
export const companyApi = {
  create: async (data: CreateCompanyData) => {
    const response = await apiRequest('/api/companies', 'POST', data);
    return response.json();
  },

  getCurrent: async () => {
    const response = await apiRequest('/api/companies/current', 'GET');
    return response.json();
  }
};

// Facility API
export const facilityApi = {
  create: async (data: CreateFacilityData) => {
    const response = await apiRequest('/api/facilities', 'POST', data);
    return response.json();
  },

  getAll: async () => {
    const response = await apiRequest('/api/facilities', 'GET');
    return response.json();
  }
};

// Application API
export const applicationApi = {
  create: async (data: CreateApplicationData) => {
    const response = await apiRequest('/api/applications', 'POST', data);
    return response.json();
  },

  getAll: async () => {
    const response = await apiRequest('/api/applications', 'GET');
    return response.json();
  },

  update: async (id: number, data: UpdateApplicationData) => {
    const response = await apiRequest(`/api/applications/${id}`, 'PATCH', data);
    return response.json();
  },

  submit: async (id: number) => {
    const response = await apiRequest(`/api/applications/${id}`, 'PATCH', {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
    return response.json();
  }
};

// Document API
export const documentApi = {
  upload: async (data: UploadDocumentData) => {
    const formData = new FormData();
    
    Array.from(data.files).forEach(file => {
      formData.append('files', file);
    });
    
    if (data.applicationId) {
      formData.append('applicationId', data.applicationId.toString());
    }
    formData.append('documentType', data.documentType);

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  },

  getByApplication: async (applicationId: number) => {
    const response = await apiRequest(`/api/documents/application/${applicationId}`, 'GET');
    return response.json();
  },

  getTemplates: async () => {
    const response = await apiRequest('/api/documents/templates', 'GET');
    return response.json();
  },

  download: async (id: number) => {
    const response = await fetch(`/api/documents/${id}/download`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  },

  delete: async (id: number) => {
    await apiRequest(`/api/documents/${id}`, 'DELETE');
  }
};

// Team API
export const teamApi = {
  getMembers: async () => {
    const response = await apiRequest('/api/team', 'GET');
    return response.json();
  },

  updateRole: async (userId: string, role: string) => {
    const response = await apiRequest(`/api/users/${userId}/role`, 'PATCH', { role });
    return response.json();
  }
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const response = await apiRequest('/api/dashboard/stats', 'GET');
    return response.json();
  }
};

// Activity Settings API
export const activityApi = {
  getSettings: async () => {
    const response = await apiRequest('/api/activity-settings', 'GET');
    return response.json();
  },

  updateSettings: async (activityType: string, updates: any) => {
    const response = await apiRequest(`/api/activity-settings/${activityType}`, 'PATCH', updates);
    return response.json();
  }
};

// Admin API
export const adminApi = {
  getAllUsers: async () => {
    const response = await apiRequest('/api/admin/users', 'GET');
    return response.json();
  },

  getAllApplications: async () => {
    const response = await apiRequest('/api/admin/applications', 'GET');
    return response.json();
  },

  getApplicationStats: async () => {
    const response = await apiRequest('/api/admin/stats', 'GET');
    return response.json();
  }
};
