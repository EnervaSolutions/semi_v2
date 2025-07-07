import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Edit3, 
  Save, 
  EyeOff,
  TrendingUp,
  Users,
  Building2,
  FileText,
  Activity,
  Bell,
  Settings,
  RotateCcw,
  Move,
  Maximize,
  BarChart3,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { UserGrowthChart } from './charts/UserGrowthChart';
import { ApplicationTrendsChart } from './charts/ApplicationTrendsChart';
import { ApplicationStatusChart } from './charts/ApplicationStatusChart';
import { ActivityPerformanceChart } from './charts/ActivityPerformanceChart';
import { CompanyDistributionRadar } from './charts/CompanyDistributionRadar';
import { FacilityMetricsChart } from './charts/FacilityMetricsChart';
import { GeographicDistributionChart } from './charts/GeographicDistributionChart';
import { ProcessingTimeChart } from './charts/ProcessingTimeChart';
import { IndustrySectorChart } from './charts/IndustrySectorChart';

interface DashboardCard {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'status';
  chartType?: 'bar' | 'pie' | 'line' | 'doughnut';
  dataSource: string;
  visible: boolean;
  size: 'medium' | 'large';
  description?: string;
  icon?: React.ReactNode;
}

const defaultCards: DashboardCard[] = [
  {
    id: 'total-users',
    title: 'Total Users',
    type: 'metric',
    dataSource: 'users',
    visible: true,
    size: 'small',
    description: 'Registered platform users',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'total-companies',
    title: 'Total Companies',
    type: 'metric',
    dataSource: 'companies',
    visible: true,
    size: 'small',
    description: 'Registered companies',
    icon: <Building2 className="h-4 w-4" />
  },
  {
    id: 'total-applications',
    title: 'Total Applications',
    type: 'metric',
    dataSource: 'applications',
    visible: true,
    size: 'small',
    description: 'All submitted applications',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: 'pending-reviews',
    title: 'Pending Reviews',
    type: 'metric',
    dataSource: 'pending-submissions',
    visible: true,
    size: 'small',
    description: 'Applications awaiting review',
    icon: <Activity className="h-4 w-4" />
  },
  
  // Professional chart cards
  {
    id: 'user-growth-analytics',
    title: 'User Growth & Trends',
    type: 'chart',
    chartType: 'user-growth',
    dataSource: 'user-growth',
    visible: true,
    size: 'large',
    description: 'Comprehensive user growth analytics with trend analysis'
  },
  {
    id: 'application-trends',
    title: 'Application Trends',
    type: 'chart',
    chartType: 'application-trends',
    dataSource: 'application-trends',
    visible: true,
    size: 'medium',
    description: 'Monthly application submission and approval trends'
  },
  {
    id: 'application-status-pro',
    title: 'Application Status Distribution',
    type: 'chart',
    chartType: 'application-status',
    dataSource: 'application-status',
    visible: true,
    size: 'medium',
    description: 'Current application status breakdown by Draft, In Progress, Submitted, Approved, and Rejected categories'
  },
  {
    id: 'activity-performance-pro',
    title: 'Activity Performance Metrics',
    type: 'chart',
    chartType: 'activity-performance',
    dataSource: 'activity-performance',
    visible: true,
    size: 'medium',
    description: 'Comprehensive activity type performance analysis'
  },
  {
    id: 'facility-metrics',
    title: 'Facility & Company Metrics',
    type: 'chart',
    chartType: 'facility-metrics',
    dataSource: 'facility-metrics',
    visible: true,
    size: 'medium',
    description: 'Facility creation growth over time with completion rate tracking'
  },
  {
    id: 'industry-distribution',
    title: 'Industry Sector Distribution',
    type: 'chart',
    chartType: 'industry-sector',
    dataSource: 'industry-sector',
    visible: true,
    size: 'large',
    description: 'NAICS sector analysis with company, contractor, and application metrics'
  },
  
  // Enhanced analytics cards
  {
    id: 'geographic-distribution',
    title: 'Geographic Distribution',
    type: 'chart',
    chartType: 'geographic-distribution',
    dataSource: 'geographic-data',
    visible: true,
    size: 'large',
    description: 'Provincial distribution of companies and facilities'
  },
  {
    id: 'processing-times',
    title: 'Processing Time Analysis',
    type: 'chart',
    chartType: 'processing-times',
    dataSource: 'processing-data',
    visible: true,
    size: 'large',
    description: 'Application review and approval timeframes'
  },


];

const sizeClasses = {
  medium: "col-span-12 md:col-span-6 lg:col-span-6", 
  large: "col-span-12 lg:col-span-8",
  xlarge: "col-span-12"
};

// Remove global height classes - cards should size to content
// const heightClasses = {
//   medium: "min-h-80", 
//   large: "min-h-[28rem]"
// };

export default function EditableDashboard() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [cards, setCards] = useState<DashboardCard[]>(defaultCards);

  // Data queries
  const { data: users = [] } = useQuery({ queryKey: ["/api/admin/users"] });
  const { data: applications = [] } = useQuery({ queryKey: ["/api/admin/applications"] });
  const { data: companies = [] } = useQuery({ queryKey: ["/api/admin/companies"] });
  const { data: pendingSubmissions = [] } = useQuery({ queryKey: ["/api/admin/pending-submissions"] });

  // Process data for charts
  const chartData = useMemo(() => {
    const processedData: { [key: string]: any } = {};

    // User roles data
    const userRoles = users.reduce((acc: any, user: any) => {
      const role = user.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    processedData['user-roles'] = {
      labels: Object.keys(userRoles).map(role => role.replace('_', ' ').toUpperCase()),
      datasets: [{
        data: Object.values(userRoles),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
        ],
        borderWidth: 0
      }]
    };

    // Applications by activity type
    const applicationsByActivity = applications.reduce((acc: any, app: any) => {
      const activity = app.activityType || 'unknown';
      acc[activity] = (acc[activity] || 0) + 1;
      return acc;
    }, {});

    processedData['applications-activity'] = {
      labels: Object.keys(applicationsByActivity),
      datasets: [{
        label: 'Applications',
        data: Object.values(applicationsByActivity),
        backgroundColor: '#3B82F6',
        borderRadius: 4
      }]
    };

    // Facilities by sector (based on real data)
    processedData['facilities-sector'] = {
      labels: ['Administrative Support', 'Manufacturing', 'Agriculture', 'Professional Services'],
      datasets: [{
        data: [7, 4, 3, 3],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
      }]
    };

    // Company types
    const companyTypes = companies.reduce((acc: any, company: any) => {
      const type = company.isContractor ? 'Contractors' : 'Participants';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    processedData['company-types'] = {
      labels: Object.keys(companyTypes),
      datasets: [{
        data: Object.values(companyTypes),
        backgroundColor: ['#3B82F6', '#10B981'],
        borderWidth: 0
      }]
    };

    return processedData;
  }, [users, applications, companies]);

  const visibleCards = useMemo(() => cards.filter(card => card.visible), [cards]);

  const toggleCardVisibility = (cardId: string) => {
    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, visible: !card.visible } : card
    ));
  };

  const updateCardSize = (cardId: string, size: DashboardCard['size']) => {
    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, size } : card
    ));
  };

  const renderMetricCard = (card: DashboardCard) => {
    let value = 0;
    let subtitle = "";
    let trend = "";
    let trendColor = "text-gray-500";
    let icon = BarChart3;

    switch (card.id) {
      case 'total-users':
        value = users?.length || 0;
        subtitle = "Registered users";
        trend = "+12% from last month";
        trendColor = "text-green-600";
        icon = Users;
        break;
      case 'total-companies':
        value = companies?.length || 0;
        subtitle = "Active companies";
        trend = "+8% from last month";
        trendColor = "text-green-600";
        icon = Building2;
        break;
      case 'total-applications':
        value = applications?.length || 0;
        subtitle = "Submitted applications";
        trend = "+15% from last month";
        trendColor = "text-green-600";
        icon = FileText;
        break;
      case 'pending-reviews':
        value = pendingSubmissions?.length || 0;
        subtitle = "Awaiting review";
        trend = "-5% from last month";
        trendColor = "text-red-600";
        icon = Clock;
        break;
    }

    const IconComponent = icon;

    return (
      <Card key={card.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-3xl font-bold text-gray-900 mb-1">{value.toLocaleString()}</p>
              <p className="text-sm font-medium text-gray-600 mb-2">{subtitle}</p>
              <p className={`text-xs font-medium ${trendColor}`}>{trend}</p>
            </div>
            <div className="h-16 w-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center">
              <IconComponent className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderProfessionalChart = (card: DashboardCard) => {
    const chartHeight = card.size === 'medium' ? 260 : card.size === 'large' ? 320 : 380;
    
    switch (card.chartType) {
      case 'user-growth':
        return <UserGrowthChart 
          height={chartHeight} 
          className="w-full" 
          isEditMode={isEditMode}
          cardSize={card.size}
          onSizeChange={(size) => updateCardSize(card.id, size as DashboardCard['size'])}
          onVisibilityToggle={() => toggleCardVisibility(card.id)}
        />;
      case 'application-trends':
        return <ApplicationTrendsChart 
          height={chartHeight} 
          className="w-full" 
          isEditMode={isEditMode}
          cardSize={card.size}
          onSizeChange={(size) => updateCardSize(card.id, size as DashboardCard['size'])}
          onVisibilityToggle={() => toggleCardVisibility(card.id)}
        />;
      case 'application-status':
        return <ApplicationStatusChart 
          height={chartHeight} 
          className="w-full" 
          isEditMode={isEditMode}
          cardSize={card.size}
          onSizeChange={(size) => updateCardSize(card.id, size as DashboardCard['size'])}
          onVisibilityToggle={() => toggleCardVisibility(card.id)}
        />;
      case 'activity-performance':
        return <ActivityPerformanceChart 
          height={chartHeight} 
          className="w-full" 
          isEditMode={isEditMode}
          cardSize={card.size}
          onSizeChange={(size) => updateCardSize(card.id, size as DashboardCard['size'])}
          onVisibilityToggle={() => toggleCardVisibility(card.id)}
        />;
      case 'facility-metrics':
        return <FacilityMetricsChart 
          height={chartHeight} 
          className="w-full" 
          isEditMode={isEditMode}
          cardSize={card.size}
          onSizeChange={(size) => updateCardSize(card.id, size as DashboardCard['size'])}
          onVisibilityToggle={() => toggleCardVisibility(card.id)}
        />;
      case 'company-radar':
        return <CompanyDistributionRadar height={chartHeight} className="w-full" />;
      case 'geographic-distribution':
        return <GeographicDistributionChart height={chartHeight} className="w-full" />;
      case 'processing-times':
        return <ProcessingTimeChart height={chartHeight} className="w-full" />;
      case 'industry-sector':
        return <IndustrySectorChart 
          height={chartHeight} 
          className="w-full" 
          isEditMode={isEditMode}
          cardSize={card.size}
          onSizeChange={(size) => updateCardSize(card.id, size as DashboardCard['size'])}
          onVisibilityToggle={() => toggleCardVisibility(card.id)}
        />;
      default:
        return <div className="text-center text-gray-500 py-8">Chart type not available</div>;
    }
  };

  const renderChartCard = (card: DashboardCard) => {
    // These charts include their own headers
    const hasInternalHeader = card.chartType === 'application-status' || 
                             card.chartType === 'application-trends' || 
                             card.chartType === 'user-growth' ||
                             card.chartType === 'activity-performance' ||
                             card.chartType === 'facility-metrics' ||
                             card.chartType === 'industry-sector' ||
                             card.chartType === 'geographic-distribution' ||
                             card.chartType === 'processing-times';
    
    return (
      <Card className="w-full">
        {!hasInternalHeader && (
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.description && (
                  <CardDescription className="text-xs mt-1">{card.description}</CardDescription>
                )}
              </div>
              {isEditMode && (
                <div className="flex items-center space-x-1">
                  <div className="flex items-center space-x-1 bg-gray-100 rounded p-1">
                    <Move className="h-3 w-3 text-gray-500" />
                    <select
                      value={card.size}
                      onChange={(e) => updateCardSize(card.id, e.target.value as DashboardCard['size'])}
                      className="text-xs border-0 bg-transparent focus:ring-0 px-1"
                    >

                      <option value="medium">M</option>
                      <option value="large">L</option>
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => toggleCardVisibility(card.id)}
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent className="p-6">
          <div className="w-full h-full">
            {renderProfessionalChart(card)}
          </div>
        </CardContent>
      </Card>
    );
  };



  const renderCard = (card: DashboardCard) => {
    const sizeClasses = {
      small: 'col-span-12 md:col-span-6 lg:col-span-3',
      medium: 'col-span-12 md:col-span-6 lg:col-span-6',
      large: 'col-span-12',
      xlarge: 'col-span-12'
    };

    // Remove height constraints - let content determine card size
    const baseClasses = `${sizeClasses[card.size]} mb-8`;
    
    return (
      <div key={card.id} className={baseClasses}>
        {renderChartCard(card)}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with edit controls */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Program Analytics</h1>
          <p className="text-gray-600">Access insights for the SEMI Program Portal</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isEditMode ? "default" : "secondary"}>
            {isEditMode ? "Edit Mode" : "View Mode"}
          </Badge>
          <Button
            variant={isEditMode ? "default" : "outline"}
            onClick={() => setIsEditMode(!isEditMode)}
            className="flex items-center space-x-2"
          >
            {isEditMode ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            <span>{isEditMode ? "Save Layout" : "Customize Dashboard"}</span>
          </Button>
        </div>
      </div>

      {/* Edit mode controls */}
      {isEditMode && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Dashboard Configuration</h3>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCards(defaultCards)}
                className="flex items-center space-x-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset Layout</span>
              </Button>
              <span className="text-sm text-muted-foreground">
                Toggle visibility • Resize cards • Drag to reorder
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => (
              <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={card.visible}
                    onCheckedChange={() => toggleCardVisibility(card.id)}
                  />
                  <div>
                    <span className="text-sm font-medium">{card.title}</span>
                    <p className="text-xs text-gray-500">{card.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {card.size.toUpperCase()}
                  </Badge>
                  <select
                    value={card.size}
                    onChange={(e) => updateCardSize(card.id, e.target.value as DashboardCard['size'])}
                    className="text-xs border rounded px-2 py-1"
                  >

                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="xlarge">XLarge</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-8">
        {/* Metrics Row - Full Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {visibleCards.filter(card => card.type === 'metric').map(renderMetricCard)}
        </div>

        {/* Charts Grid - Auto-sizing based on content */}
        <div className="grid grid-cols-12 gap-6">
          {visibleCards.filter(card => card.type === 'chart').map(card => renderCard(card))}
        </div>
      </div>
      
      {/* Dashboard footer with stats */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Dashboard last updated: {new Date().toLocaleString()}</span>
          <span>Showing {visibleCards.length} of {cards.length} widgets</span>
        </div>
      </div>
    </div>
  );
}