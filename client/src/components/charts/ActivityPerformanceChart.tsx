import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';

interface ActivityPerformanceChartProps {
  height?: number;
  className?: string;
  isEditMode?: boolean;
  cardSize?: string;
  onSizeChange?: (size: string) => void;
  onVisibilityToggle?: () => void;
}

const COLORS = {
  draft: '#9CA3AF',     // Grey for draft
  inProgress: '#3B82F6', // Blue for in progress  
  submitted: '#F59E0B',  // Amber for submitted
  completed: '#10B981',  // Green for completed
  grid: '#E2E8F0',
  text: '#475569'
};

const ACTIVITY_TYPES = {
  1: 'FRA',
  2: 'EAA', 
  3: 'SEM',
  4: 'EMIS',
  5: 'CR'
};

export function ActivityPerformanceChart({ 
  height = 300, 
  className = "", 
  isEditMode = false,
  cardSize = "medium",
  onSizeChange,
  onVisibilityToggle 
}: ActivityPerformanceChartProps) {
  const { data: applications = [] } = useQuery({ queryKey: ["/api/admin/applications"] });
  const { data: submissions = [] } = useQuery({ queryKey: ["/api/admin/pending-submissions"] });

  const normalizeActivityType = (activityType: any): string => {
    if (typeof activityType === 'number') {
      return ACTIVITY_TYPES[activityType as keyof typeof ACTIVITY_TYPES] || String(activityType);
    }
    return String(activityType || 'Unknown');
  };

  const generateData = () => {
    const activityStats: Record<string, {
      draft: number;
      inProgress: number; 
      submitted: number;
      completed: number;
      total: number;
    }> = {};

    // Initialize activity types
    Object.values(ACTIVITY_TYPES).forEach(activity => {
      activityStats[activity] = {
        draft: 0,
        inProgress: 0,
        submitted: 0,
        completed: 0,
        total: 0
      };
    });

    // Process applications
    applications.forEach(app => {
      const activity = normalizeActivityType(app.activityType);
      if (activityStats[activity]) {
        activityStats[activity].total++;
        
        // Determine status based on application and submission data
        const hasSubmission = submissions.some(sub => sub.applicationId === app.applicationId);
        
        if (app.status === 'draft' && !hasSubmission) {
          activityStats[activity].draft++;
        } else if (app.status === 'in_progress' || (app.status === 'draft' && hasSubmission)) {
          activityStats[activity].inProgress++;
        } else if (app.status === 'submitted') {
          activityStats[activity].submitted++;
        } else if (app.status === 'approved' || app.status === 'completed') {
          activityStats[activity].completed++;
        } else {
          // Default to draft for unknown status
          activityStats[activity].draft++;
        }
      }
    });

    // Convert to chart data format
    return Object.entries(activityStats)
      .filter(([_, stats]) => stats.total > 0) // Only show activities with data
      .map(([activity, stats]) => ({
        activity,
        draft: stats.draft,
        inProgress: stats.inProgress,
        submitted: stats.submitted,
        completed: stats.completed,
        total: stats.total
      }));
  };

  const data = generateData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label} Activity</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-600 capitalize">
                    {entry.dataKey === 'inProgress' ? 'In Progress' : entry.dataKey}
                  </span>
                </div>
                <span className="text-sm font-medium">{entry.value}</span>
              </div>
            ))}
            <div className="pt-1 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Total</span>
                <span className="text-sm font-bold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className={`w-full ${className} flex items-center justify-center`} style={{ height }}>
        <p className="text-gray-500 text-sm">No activity performance data available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity Performance Metrics</h3>
          <div className="text-sm text-gray-500">
            Application status breakdown by activity type
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

      <ResponsiveContainer width="100%" height="75%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barCategoryGap="25%"
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={COLORS.grid}
            horizontal={true}
            vertical={false}
          />
          <XAxis 
            dataKey="activity" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: COLORS.text }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: COLORS.text }}
            tickFormatter={(value) => value.toString()}
            label={{ 
              value: 'Applications', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: '12px', fill: COLORS.text }
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
          
          {/* Stacked bars - draft at bottom, then in progress, submitted, completed */}
          <Bar 
            dataKey="draft" 
            stackId="a" 
            fill={COLORS.draft}
            name="Draft"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="inProgress" 
            stackId="a" 
            fill={COLORS.inProgress}
            name="In Progress"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="submitted" 
            stackId="a" 
            fill={COLORS.submitted}
            name="Submitted"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="completed" 
            stackId="a" 
            fill={COLORS.completed}
            name="Completed"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Custom Legend */}
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.draft }} />
          <span className="text-xs text-gray-600">Draft</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.inProgress }} />
          <span className="text-xs text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.submitted }} />
          <span className="text-xs text-gray-600">Submitted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.completed }} />
          <span className="text-xs text-gray-600">Completed</span>
        </div>
      </div>
    </div>
  );
}