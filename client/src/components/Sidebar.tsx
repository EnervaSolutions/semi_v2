import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import strategicEnergyLogo from "@/assets/strategic-energy.svg";
import { 
  Home,
  FileText, 
  Upload,
  Users,
  HardHat,
  Settings,
  Building2,
  Shield,
  Building,
  BarChart,
  Download,
  Wrench,
  MessageSquare,
  Trash2,
  Bell,
  Archive,
  Trophy
} from "lucide-react";
import { hasPermissionLevel, canInviteUsers } from "@/lib/permissions";

const iconMap = {
  Home,
  FileText,
  Upload, 
  Users,
  HardHat,
  Settings,
  Building2,
  Shield,
  Building,
  BarChart,
  Download,
  Wrench,
  MessageSquare,
  Trash2,
  Bell,
  Archive,
  Trophy
};

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Navigation items for regular company users
  const regularNavigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: "Home",
      roles: ["company_admin", "team_member", "system_admin"]
    },
    {
      name: "Applications", 
      href: "/applications",
      icon: "FileText",
      roles: ["company_admin", "team_member", "system_admin"]
    },
    {
      name: "Documents",
      href: "/documents", 
      icon: "Upload",
      roles: ["company_admin", "team_member", "system_admin"]
    },
    {
      name: "Team Management",
      href: "/team",
      icon: "Users",
      roles: ["company_admin", "system_admin", "team_member"] // allow team_member, but filter below
    },
    {
      name: "Support",
      href: "/messages",
      icon: "MessageSquare",
      roles: ["company_admin", "team_member", "system_admin"]
    }
  ];

  // Navigation items for contractors (separate structure)
  const contractorNavigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: "Home",
      roles: ["contractor_individual", "contractor_team_member", "contractor_account_owner", "contractor_manager"]
    },
    {
      name: "Applications", 
      href: "/applications",
      icon: "FileText",
      roles: ["contractor_individual", "contractor_team_member", "contractor_account_owner", "contractor_manager"]
    },

    {
      name: "Services & Regions",
      href: "/services",
      icon: "Wrench",
      roles: ["contractor_individual", "contractor_team_member", "contractor_account_owner", "contractor_manager"]
    },
    {
      name: "Team Management",
      href: "/team",
      icon: "Users",
      roles: ["contractor_individual", "contractor_account_owner", "contractor_manager"]
    },
    {
      name: "Support",
      href: "/messages",
      icon: "MessageSquare",
      roles: ["contractor_individual", "contractor_team_member", "contractor_account_owner", "contractor_manager"]
    }
  ];

  const adminNavigationItems = [
    {
      name: "Analytics Dashboard",
      href: "/admin",
      icon: "BarChart",
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
      icon: "Settings",
      roles: ["system_admin"]
    },
    {
      name: "Recognition",
      href: "/admin/recognition",
      icon: "Trophy",
      roles: ["system_admin"]
    },
    {
      name: "Form Builder",
      href: "/form-builder",
      icon: "Wrench",
      roles: ["system_admin"]
    },
    {
      name: "Ghost Application ID Manager",
      href: "/admin/ghost-ids",
      icon: "Trash2",
      roles: ["system_admin"]
    }
  ];

  // Admin management items (moved from dashboard)
  const adminManagementItems = [
    {
      name: "Users",
      href: "/admin/users",
      icon: "Users",
      roles: ["system_admin"]
    },
    {
      name: "Companies", 
      href: "/admin/companies",
      icon: "Building",
      roles: ["system_admin"]
    },
    {
      name: "Facility Activities",
      href: "/admin/facility-activities",
      icon: "Settings",
      roles: ["system_admin"]
    },
    {
      name: "Application Limits",
      href: "/admin/application-limits",
      icon: "Shield",
      roles: ["system_admin"]
    },
    {
      name: "Contractor Assignment",
      href: "/admin/contractor-assignment",
      icon: "HardHat",
      roles: ["system_admin"]
    },
    {
      name: "System Notifications",
      href: "/admin/system-notifications",
      icon: "Bell",
      roles: ["system_admin"]
    },
    {
      name: "Archive Settings",
      href: "/admin/archive-settings",
      icon: "Archive",
      roles: ["system_admin"]
    }
  ];

  // Determine which navigation set to use based on user role
  const isContractor = user?.role === 'contractor_individual' || user?.role === 'contractor_team_member' || user?.role === 'contractor_account_owner' || user?.role === 'contractor_manager';
  const isSystemAdmin = user?.role === 'system_admin';
  const isViewer = user?.permissionLevel === 'viewer';
  
  // System admins only see admin navigation items
  const navigationItems = isSystemAdmin ? [] : (isContractor ? contractorNavigationItems : regularNavigationItems);
  
  const filteredNavItems = navigationItems.filter(item => {
    if (!user?.role || !item.roles.includes(user.role)) return false;
    // Hide facility/application creation/editing links for viewers
    if (isViewer && (item.name === 'Facilities' || item.name === 'Add Facility' || item.name === 'Create Application' || item.name === 'Start Application')) return false;
    // Special logic for Team Management tab
    if (item.name === "Team Management") {
      return user.role === "company_admin" || user.role === "system_admin" || canInviteUsers(user);
    }
    return true;
  });

  const filteredAdminItems = adminNavigationItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  const filteredAdminManagementItems = adminManagementItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 fixed left-0 top-0 h-full z-50 overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-full h-20 mb-2">
            <img 
              src={strategicEnergyLogo} 
              alt="Strategic Energy Management Initiative" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">SEMI Portal</h2>
            <p className="text-xs text-gray-500">Strategic Energy Management</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        {/* Main Navigation - Only show for non-system admin users */}
        <div className="space-y-8">
          {!isSystemAdmin && filteredNavItems.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</h3>
              <div className="mt-2 space-y-1">
                {filteredNavItems.map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap];
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  
                  return (
                    <Link key={item.name} href={item.href}>
                      <div className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                        isActive 
                          ? "bg-primary text-white" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}>
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Admin Section */}
          {filteredAdminItems.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</h3>
              <div className="mt-2 space-y-1">
                {filteredAdminItems.map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap];
                  // Enhanced highlighting logic for admin routes
                  const isActive = (() => {
                    // Exact match for Analytics Dashboard
                    if (item.href === "/admin" && location === "/admin") return true;
                    
                    // Exact match for other admin routes with sub-paths
                    if (item.href === "/admin/approvals" && location.startsWith("/admin/approvals")) return true;
                    if (item.href === "/admin/ghost-ids" && location.startsWith("/admin/ghost-ids")) return true;
                    
                    // For other routes, check if current location starts with the href (but not for root admin)
                    if (item.href !== "/" && item.href !== "/admin" && location.startsWith(item.href)) return true;
                    
                    // Exact match fallback
                    return location === item.href;
                  })();
                  
                  return (
                    <Link key={item.name} href={item.href}>
                      <div className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                        isActive 
                          ? "bg-primary text-white" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}>
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin Management Section */}
          {filteredAdminManagementItems.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</h3>
              <div className="mt-2 space-y-1">
                {filteredAdminManagementItems.map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap];
                  const isActive = location === item.href || 
                    (item.href !== "/" && location.startsWith(item.href));
                  
                  return (
                    <Link key={item.name} href={item.href}>
                      <div className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                        isActive 
                          ? "bg-primary text-white" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}>
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
