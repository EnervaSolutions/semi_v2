export const ACTIVITY_TYPES = {
  FRA: {
    code: "1",
    name: "Facility Readiness Assessment (FRA)",
    description: "Activity 1 - Facility Readiness Assessment",
    color: "blue",
    icon: "F"
  },
  EAA: {
    code: "2",
    name: "Energy Assessments and Audits (EAA)",
    description: "Activity 2 - Energy Assessments and Audits",
    color: "teal",
    icon: "A"
  },
  SEM: {
    code: "3",
    name: "Strategic Energy Manager (SEM)", 
    description: "Activity 3 - Strategic Energy Manager",
    color: "purple",
    icon: "S"
  },
  EMIS: {
    code: "4",
    name: "Energy Management Information Systems (EMIS)",
    description: "Activity 4 - Energy Management Information Systems",
    color: "indigo", 
    icon: "E"
  },
  CR: {
    code: "5",
    name: "Capital Retrofits (CR)",
    description: "Activity 5 - Capital Retrofits",
    color: "green",
    icon: "R"
  }
} as const;

export const APPLICATION_STATUSES = {
  draft: {
    label: "Draft",
    color: "gray",
    description: "Application is being prepared"
  },
  submitted: {
    label: "Submitted", 
    color: "blue",
    description: "Application has been submitted for review"
  },
  under_review: {
    label: "Under Review",
    color: "yellow", 
    description: "Application is being reviewed by admin"
  },
  approved: {
    label: "Approved",
    color: "green",
    description: "Application has been approved"
  },
  rejected: {
    label: "Rejected",
    color: "red", 
    description: "Application has been rejected"
  },
  needs_revision: {
    label: "Needs Revision",
    color: "orange",
    description: "Application requires revisions"
  }
} as const;

export const USER_ROLES = {
  company_admin: {
    label: "Company Admin",
    color: "blue",
    permissions: ["manage_team", "create_applications", "upload_documents", "view_all_company_data"]
  },
  team_member: {
    label: "Team Member", 
    color: "gray",
    permissions: ["create_applications", "upload_documents", "view_assigned_data"]
  },
  contractor_account_owner: {
    label: "Contractor Account Owner",
    color: "purple", 
    permissions: ["manage_contractor_team", "view_all_applications", "edit_all_applications", "assign_applications", "delete_managers"]
  },
  contractor_manager: {
    label: "Contractor Manager",
    color: "blue",
    permissions: ["manage_contractor_team", "view_all_applications", "edit_all_applications", "assign_applications"]
  },
  contractor_team_member: {
    label: "Contractor Team Member",
    color: "green",
    permissions: ["view_assigned_applications", "upload_documents"]
  },
  contractor_individual: {
    label: "Contractor",
    color: "green",
    permissions: ["view_assigned_applications", "upload_documents"]
  },
  system_admin: {
    label: "System Admin",
    color: "red",
    permissions: ["manage_all_users", "manage_all_applications", "system_configuration"]
  }
} as const;

export const PERMISSION_LEVELS = {
  view: {
    label: "View",
    color: "gray",
    description: "Can view data but cannot make changes"
  },
  editor: {
    label: "Editor", 
    color: "blue",
    description: "Can view and edit data but cannot manage users"
  },
  manager: {
    label: "Manager",
    color: "orange",
    description: "Can view, edit, and manage team members"
  },
  owner: {
    label: "Owner",
    color: "red", 
    description: "Full access including user management and settings"
  }
} as const;

export const DOCUMENT_TYPES = {
  pre_activity: {
    label: "Pre-Activity Document",
    description: "Documents required before activity approval",
    icon: "FileText"
  },
  post_activity: {
    label: "Post-Activity Document", 
    description: "Documents required after activity completion",
    icon: "FileCheck"
  },
  supporting: {
    label: "Supporting Documentation",
    description: "Additional supporting documents",
    icon: "File"
  },
  template: {
    label: "Template",
    description: "Standard forms and templates", 
    icon: "FileTemplate"
  },
  other: {
    label: "Other",
    description: "Miscellaneous documents",
    icon: "FileText"
  }
} as const;

export const FILE_UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png'
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png']
};

export const NAVIGATION_ITEMS = [
  {
    name: "Dashboard",
    href: "/",
    icon: "Home",
    roles: ["company_admin", "team_member", "contractor_account_owner", "contractor_individual", "system_admin"]
  },
  {
    name: "Applications", 
    href: "/applications",
    icon: "FileText",
    roles: ["company_admin", "team_member", "contractor_account_owner", "contractor_individual", "system_admin"]
  },
  {
    name: "Documents",
    href: "/documents", 
    icon: "Upload",
    roles: ["company_admin", "team_member", "contractor_account_owner", "contractor_individual", "system_admin"]
  },
  {
    name: "Team Management",
    href: "/team",
    icon: "Users",
    roles: ["company_admin", "system_admin"]
  },
  {
    name: "Contractors",
    href: "/contractors", 
    icon: "HardHat",
    roles: ["company_admin", "contractor_account_owner", "system_admin"]
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "Settings", 
    roles: ["company_admin", "team_member", "contractor_account_owner", "contractor_individual", "system_admin"]
  }
];

export const ADMIN_NAVIGATION_ITEMS = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: "LayoutDashboard",
    roles: ["system_admin"]
  },
  {
    name: "Applications",
    href: "/applications",
    icon: "FileText",
    roles: ["system_admin"]
  },
  {
    name: "Approvals",
    href: "/admin/approvals",
    icon: "CheckCircle",
    roles: ["system_admin"]
  },
  {
    name: "Companies", 
    href: "/admin/companies",
    icon: "Building",
    roles: ["system_admin"]
  },
  {
    name: "Contractors",
    href: "/contractors",
    icon: "Users",
    roles: ["system_admin"]
  },
  {
    name: "Ghost Application IDs",
    href: "/admin/ghost-ids",
    icon: "Database",
    roles: ["system_admin"]
  },
  {
    name: "Reports",
    href: "/admin/reports", 
    icon: "BarChart",
    roles: ["system_admin"]
  }
];
