import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User, LogOut, Shield, MapPin, Phone, Globe, Building, UserCheck, Trophy } from "lucide-react";
import { USER_ROLES } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { NotificationBell } from "./NotificationBell";
import strategicEnergyLogo from "@/assets/strategic-energy.svg";

export default function Header() {
  const { user } = useAuth();
  
  // Fetch current company data
  const { data: company } = useQuery({
    queryKey: ['/api/companies/current'],
    enabled: !!user,
  });





  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include"
      });
      
      if (response.ok) {
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  const getUserRoleInfo = (role: string) => {
    return USER_ROLES[role as keyof typeof USER_ROLES] || USER_ROLES.team_member;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <Building className="h-8 w-8 text-gray-600" />
            <div>
              {company?.name && (
                <h1 className="text-xl font-semibold text-gray-900">
                  {company.name}
                </h1>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                {/* Address */}
                {(company?.address || company?.streetAddress || company?.city) && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {company.address || [company.streetAddress, company.city, company.province].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                
                {/* Phone */}
                {company?.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>{company.phone}</span>
                  </div>
                )}
                
                {/* Website */}
                {company?.website && (
                  <div className="flex items-center space-x-1">
                    <Globe className="h-4 w-4" />
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {/* Account Owner and Current User Role */}
                {user && (
                  <div className="flex items-center space-x-1">
                    <UserCheck className="h-4 w-4" />
                    <span>
                      Account Owner: {user.firstName} {user.lastName} 
                      {user.role && (
                        <Badge 
                          variant="outline" 
                          className={`ml-2 border-${getUserRoleInfo(user.role).color}-200 text-${getUserRoleInfo(user.role).color}-800 text-xs`}
                        >
                          {getUserRoleInfo(user.role).label}
                        </Badge>
                      )}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Business Number */}
              {company?.businessNumber && (
                <p className="text-xs text-gray-500 mt-1">
                  Business Number: {company.businessNumber}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Real-time Notifications */}
          <NotificationBell />
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 h-auto p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                  <AvatarFallback>
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  {user?.role && (
                    <div className="mt-2">
                      <Badge 
                        variant="outline" 
                        className={`border-${getUserRoleInfo(user.role).color}-200 text-${getUserRoleInfo(user.role).color}-800 text-xs`}
                      >
                        {getUserRoleInfo(user.role).label}
                      </Badge>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = "/profile"}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = "/security"}>
                <Shield className="mr-2 h-4 w-4" />
                Security
              </DropdownMenuItem>
              {user?.role && !user.role.includes('contractor') && user.role !== 'contractor_individual' && (
                <DropdownMenuItem onClick={() => window.location.href = "/recognition"}>
                  <Trophy className="mr-2 h-4 w-4" />
                  Recognition
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
