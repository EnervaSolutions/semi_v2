import React, { useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3 } from "lucide-react";

interface FacilityMetricsChartProps {
  height?: number;
  className?: string;
  isEditMode?: boolean;
  cardSize?: string;
  onSizeChange?: (size: string) => void;
  onVisibilityToggle?: () => void;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  grid: '#E2E8F0',
  text: '#475569'
};

export function FacilityMetricsChart({ 
  height = 300, 
  className = "", 
  isEditMode = false,
  cardSize = "medium",
  onSizeChange,
  onVisibilityToggle 
}: FacilityMetricsChartProps) {
  const { data: companies = [] } = useQuery({ queryKey: ["/api/admin/companies"] });
  const { data: applications = [] } = useQuery({ queryKey: ["/api/admin/applications"] });
  const { data: facilities = [], isLoading: facilitiesLoading, error: facilitiesError } = useQuery({ queryKey: ["/api/admin/facilities"] });

  // Debug logging
  React.useEffect(() => {
    console.log('Facility Metrics Debug:', {
      facilitiesCount: facilities.length,
      facilitiesLoading,
      facilitiesError,
      firstFacility: facilities[0],
      applicationsCount: applications.length
    });
  }, [facilities, applications, facilitiesLoading, facilitiesError]);
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Use facilities data directly from API

  // Early return if data is loading
  if (facilitiesLoading) {
    return (
      <div className={`w-full ${className} flex items-center justify-center`} style={{ height }}>
        <div className="text-gray-500">Loading facilities data...</div>
      </div>
    );
  }

  if (facilitiesError) {
    return (
      <div className={`w-full ${className} flex items-center justify-center`} style={{ height }}>
        <div className="text-red-500">Error loading facilities: {facilitiesError.message}</div>
      </div>
    );
  }

  // Generate data based on view mode
  const generateData = () => {
    if (viewMode === 'monthly') {
      const startDate = startOfYear(new Date(selectedYear, 0, 1));
      const endDate = endOfYear(new Date(selectedYear, 11, 31));
      
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      
      return months.map(month => {
        // Count facilities created up to this month
        const facilitiesUpToMonth = facilities.filter(facility => {
          if (!facility.created_at && !facility.createdAt) return false;
          const facilityDate = new Date(facility.created_at || facility.createdAt);
          return facilityDate <= endOfMonth(month);
        }).length;
        
        // Count new facilities in this month
        const newFacilitiesInMonth = facilities.filter(facility => {
          if (!facility.created_at && !facility.createdAt) return false;
          const facilityDate = new Date(facility.created_at || facility.createdAt);
          return facilityDate >= startOfMonth(month) && facilityDate <= endOfMonth(month);
        }).length;

        // Count total applications created up to this month
        const totalApplicationsUpToMonth = applications.filter(app => {
          if (!app.createdAt && !app.created_at) return false;
          const appDate = new Date(app.createdAt || app.created_at);
          return appDate <= endOfMonth(month);
        }).length;
        
        return {
          period: format(month, 'MMM'),
          date: format(month, 'yyyy-MM'),
          newFacilities: newFacilitiesInMonth,
          totalFacilities: facilitiesUpToMonth,
          totalApplications: totalApplicationsUpToMonth,
          fullDate: month
        };
      });
    } else {
      // Daily view for selected month
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);
      
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      return days.map(day => {
        // Count facilities created up to this day
        const facilitiesUpToDay = facilities.filter(facility => {
          if (!facility.created_at && !facility.createdAt) return false;
          const facilityDate = new Date(facility.created_at || facility.createdAt);
          return facilityDate <= endOfDay(day);
        }).length;
        
        // Count new facilities on this day
        const newFacilitiesOnDay = facilities.filter(facility => {
          if (!facility.created_at && !facility.createdAt) return false;
          const facilityDate = new Date(facility.created_at || facility.createdAt);
          return facilityDate >= startOfDay(day) && facilityDate <= endOfDay(day);
        }).length;

        // Count total applications created up to this day
        const totalApplicationsUpToDay = applications.filter(app => {
          if (!app.createdAt && !app.created_at) return false;
          const appDate = new Date(app.createdAt || app.created_at);
          return appDate <= endOfDay(day);
        }).length;
        
        return {
          period: format(day, 'd'),
          date: format(day, 'yyyy-MM-dd'),
          newFacilities: newFacilitiesOnDay,
          totalFacilities: facilitiesUpToDay,
          totalApplications: totalApplicationsUpToDay,
          fullDate: day
        };
      });
    }
  };

  const data = generateData();

  // Dynamic margins based on chart size
  const getMargins = () => {
    if (height <= 350) { // Medium size
      return { top: 20, right: 25, left: 25, bottom: 70 };
    } else { // Large size
      return { top: 25, right: 35, left: 25, bottom: 55 };
    }
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'newFacilities') return [`${value} new facilities`, 'New Facilities'];
    if (name === 'totalFacilities') return [`${value} total facilities`, 'Total Facilities'];
    if (name === 'totalApplications') return [`${value} applications`, 'Total Applications'];
    return [value, name];
  };

  const formatLabelTooltip = (label: string) => {
    const itemData = data.find(d => d.period === label);
    if (itemData) {
      if (viewMode === 'monthly') {
        return format(itemData.fullDate, 'MMMM yyyy');
      } else {
        return format(itemData.fullDate, 'MMMM d, yyyy');
      }
    }
    return label;
  };

  // Handle month selection for daily view
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };

  // Handle year selection for monthly view
  const handleYearChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={`w-full ${className} flex items-center justify-center`} style={{ height }}>
        <p className="text-gray-500 text-sm">No facility data available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Facility & Company Metrics</h3>
          <div className="text-sm text-gray-500">
            Facility creation and application growth trends
          </div>
        </div>
        {isEditMode && (
          <div className="flex items-center space-x-1">
            <div className="flex items-center space-x-1 bg-gray-100 rounded p-1">
              <select
                value={cardSize}
                onChange={(e) => onSizeChange?.(e.target.value)}
                className="text-xs border-0 bg-transparent focus:ring-0 px-1"
              >
                <option value="medium">M</option>
                <option value="large">L</option>
              </select>
              <button
                onClick={onVisibilityToggle}
                className="h-5 w-5 p-0 bg-transparent border-0 text-gray-500 hover:text-gray-700"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.757 7.757M12 12l2.121 2.121M7.757 7.757l2.122 2.122" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* View Toggle Controls */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('monthly')}
            className="flex items-center space-x-1"
          >
            <BarChart3 className="h-3 w-3" />
            <span>Yearly</span>
          </Button>
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('daily')}
            className="flex items-center space-x-1"
          >
            <Calendar className="h-3 w-3" />
            <span>Monthly</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {viewMode === 'monthly' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleYearChange('prev')}
                className="px-2"
              >
                ←
              </Button>
              <div className="text-sm font-medium text-gray-600 min-w-[60px] text-center">
                {selectedYear}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleYearChange('next')}
                className="px-2"
              >
                →
              </Button>
            </>
          )}
          {viewMode === 'daily' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('prev')}
                className="px-2"
              >
                ←
              </Button>
              <div className="text-sm font-medium text-gray-600 min-w-[100px] text-center">
                {format(selectedMonth, 'MMM yyyy')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('next')}
                className="px-2"
              >
                →
              </Button>
            </>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="75%">
        <ComposedChart 
          data={data} 
          margin={getMargins()}
        >
            <defs>
              <linearGradient id="facilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="period" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 11, fill: COLORS.text }}
              dy={8}
              interval={viewMode === 'daily' ? 2 : 0}
              angle={viewMode === 'daily' ? -45 : 0}
              textAnchor={viewMode === 'daily' ? 'end' : 'middle'}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 11, fill: COLORS.text }}
              width={35}
              label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 11, fill: COLORS.text }}
              width={35}
              label={{ value: 'Applications', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 11 } }}
            />
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={COLORS.grid}
              vertical={false}
              opacity={0.7}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={formatLabelTooltip}
              contentStyle={{
                backgroundColor: 'white',
                border: `1px solid ${COLORS.grid}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
            />
            <Legend 
              wrapperStyle={{ 
                fontSize: '11px',
                paddingTop: '15px'
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="newFacilities" 
              fill="url(#facilityGradient)"
              name="New Facilities"
              radius={[3, 3, 0, 0]}
              maxBarSize={viewMode === 'daily' ? 25 : 40}
              stroke={COLORS.primary}
              strokeWidth={1}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="totalFacilities" 
              stroke={COLORS.secondary}
              strokeWidth={3}
              name="Total Facilities"
              dot={{ fill: COLORS.secondary, r: 3 }}
              activeDot={{ r: 5, fill: COLORS.secondary }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="totalApplications" 
              stroke={COLORS.accent}
              strokeWidth={3}
              name="Total Applications"
              dot={{ fill: COLORS.accent, r: 3 }}
              activeDot={{ r: 5, fill: COLORS.accent }}
            />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}