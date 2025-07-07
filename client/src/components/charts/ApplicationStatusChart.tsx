import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';

interface ApplicationStatusChartProps {
  height?: number;
  className?: string;
  isEditMode?: boolean;
  cardSize?: string;
  onSizeChange?: (size: string) => void;
  onVisibilityToggle?: () => void;
}

// Status colors for inner ring - vibrant, distinct colors
const STATUS_COLORS = {
  draft: '#6B7280',        // Neutral gray for draft
  in_progress: '#3B82F6',  // Bright blue for in progress  
  submitted: '#F59E0B',    // Amber for submitted
  approved: '#10B981',     // Emerald for approved
  rejected: '#EF4444',     // Red for rejected
  under_review: '#8B5CF6'  // Purple for under review
};

// Activity type colors for outer ring - coordinated palette
const ACTIVITY_COLORS = {
  FRA: '#1E40AF',     // Deep blue
  EAA: '#059669',     // Deep emerald  
  SEM: '#D97706',     // Deep amber
  EMIS: '#7C3AED',    // Deep purple
  CR: '#DC2626'       // Deep red
};

const STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress', 
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  under_review: 'Under Review'
};

export function ApplicationStatusChart({ 
  height = 300, 
  className = "", 
  isEditMode = false,
  cardSize = "medium",
  onSizeChange,
  onVisibilityToggle 
}: ApplicationStatusChartProps) {
  const { data: applications = [] } = useQuery({ queryKey: ["/api/admin/applications"] });
  const { data: submissions = [] } = useQuery({ queryKey: ["/api/admin/pending-submissions"] });

  const normalizeActivityType = (activityType: any): string => {
    if (!activityType) return 'FRA';
    
    if (typeof activityType === 'number') {
      const numericMap: Record<number, string> = {
        1: 'FRA', 2: 'EAA', 3: 'SEM', 4: 'EMIS', 5: 'CR'
      };
      return numericMap[activityType] || 'FRA';
    }
    
    const stringType = String(activityType).toUpperCase();
    if (stringType.includes('ASSESSMENT') || stringType.includes('READINESS')) return 'FRA';
    if (stringType.includes('ENERGY') && stringType.includes('AUDIT')) return 'EAA';
    if (stringType.includes('STRATEGIC') || stringType.includes('MANAGEMENT')) return 'SEM';
    if (stringType.includes('INFORMATION') || stringType.includes('SYSTEMS')) return 'EMIS';
    if (stringType.includes('CAPITAL') || stringType.includes('RETROFIT')) return 'CR';
    
    return 'FRA';
  };

  const processStatusData = () => {
    const allItems = [...applications, ...submissions];
    
    const statusCounts = {
      draft: 0, in_progress: 0, submitted: 0, approved: 0, rejected: 0, under_review: 0
    };

    const statusActivityBreakdown: Record<string, Record<string, number>> = {};

    allItems.forEach(item => {
      let status = item.status?.toLowerCase() || 'draft';
      if (status === 'in progress' || status === 'inprogress' || status === 'in_progress') {
        status = 'in_progress';
      } else if (status === 'pending') {
        status = 'submitted';
      } else if (status === 'under review' || status === 'reviewing' || status === 'under_review') {
        status = 'under_review';
      }

      if (!(status in statusCounts)) {
        status = 'draft';
      }

      statusCounts[status as keyof typeof statusCounts]++;
      const activityType = normalizeActivityType(item.activityType || item.activity_type);

      if (!statusActivityBreakdown[status]) {
        statusActivityBreakdown[status] = {};
      }
      statusActivityBreakdown[status][activityType] = (statusActivityBreakdown[status][activityType] || 0) + 1;
    });

    // Inner ring data (status overview)
    const innerData = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
        value: count,
        status: status,
        fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280',
        percentage: 0
      }));

    // Outer ring data (activity breakdown) - deduplicated for legend
    const outerData: any[] = [];
    const activityTotals: Record<string, number> = {};
    
    Object.entries(statusActivityBreakdown).forEach(([status, activities]) => {
      Object.entries(activities).forEach(([activity, count]) => {
        outerData.push({
          name: activity,
          value: count,
          status: status,
          activity: activity,
          parentStatus: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
          fill: ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS] || '#6B7280'
        });
        
        activityTotals[activity] = (activityTotals[activity] || 0) + count;
      });
    });

    // Calculate percentages for inner data
    const total = allItems.length;
    innerData.forEach(item => {
      item.percentage = total > 0 ? (item.value / total) * 100 : 0;
    });

    return { innerData, outerData, activityTotals, total };
  };

  const { innerData, outerData, activityTotals } = processStatusData();

  // Get chart radius based on available space
  const getRadius = () => {
    const baseRadius = height <= 300 ? 50 : height <= 350 ? 60 : 75;
    return {
      inner: baseRadius - 20,
      outer: baseRadius,
      outerInner: baseRadius + 8,
      outerOuter: baseRadius + 25
    };
  };

  const radius = getRadius();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium">{data.value}</span>
          </p>
          {data.parentStatus && (
            <p className="text-xs text-gray-500">
              Status: {data.parentStatus}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.08) return null; // Hide labels for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!innerData.length) {
    return (
      <div className={`w-full ${className} flex items-center justify-center`} style={{ height }}>
        <p className="text-gray-500 text-sm">No application status data available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Application Status Distribution</h3>
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
      
      <ResponsiveContainer width="100%" height="70%">
        <PieChart>
          <defs>
            <linearGradient id="statusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.05)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
            </linearGradient>
          </defs>
          
          {/* Inner ring - Status distribution */}
          <Pie
            data={innerData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            innerRadius={radius.inner}
            outerRadius={radius.outer}
            fill="#8884d8"
            dataKey="value"
            stroke="#ffffff"
            strokeWidth={3}
          >
            {innerData.map((entry, index) => (
              <Cell 
                key={`inner-cell-${index}`} 
                fill={entry.fill}
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Pie>

          {/* Outer ring - Activity breakdown */}
          {outerData.length > 0 && (
            <Pie
              data={outerData}
              cx="50%"
              cy="50%"
              innerRadius={radius.outerInner}
              outerRadius={radius.outerOuter}
              fill="#8884d8"
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={2}
            >
              {outerData.map((entry, index) => (
                <Cell 
                  key={`outer-cell-${index}`} 
                  fill={entry.fill}
                  style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Pie>
          )}

          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend - positioned below chart */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 mt-1">
        {/* Status legend items */}
        {innerData.map((entry, index) => (
          <div key={`status-${index}`} className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
              {entry.name} ({entry.value})
            </span>
          </div>
        ))}
        {/* Activity legend items */}
        {Object.entries(activityTotals).map(([activity, count]) => (
          <div key={`activity-${activity}`} className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS] || '#6B7280' }}
            />
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
              {activity} ({count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}