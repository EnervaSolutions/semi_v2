import React, { useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Filter, TrendingUp, Building2 } from "lucide-react";

interface ChartProps {
  height?: number;
  className?: string;
  isEditMode?: boolean;
  cardSize?: string;
  onSizeChange?: (size: string) => void;
  onVisibilityToggle?: () => void;
}

const COLORS = {
  companies: '#3b82f6',
  applications: '#10b981', 
  facilities: '#8b5cf6',
  workforce: '#ef4444'
};

const METRIC_OPTIONS = [
  { key: 'companies', label: 'Companies', color: COLORS.companies },
  { key: 'applications', label: 'Applications', color: COLORS.applications },
  { key: 'facilities', label: 'Facilities', color: COLORS.facilities },
  { key: 'workforce', label: 'Workforce', color: COLORS.workforce }
];

// NAICS sector mapping - comprehensive categories
const SECTOR_MAPPING: Record<string, string> = {
  '11': 'Agriculture, Forestry, Fishing',
  '21': 'Mining, Quarrying, Oil & Gas',
  '22': 'Utilities',
  '23': 'Construction',
  '31': 'Manufacturing',
  '32': 'Manufacturing',
  '33': 'Manufacturing',
  '42': 'Wholesale Trade',
  '44': 'Retail Trade',
  '45': 'Retail Trade',
  '48': 'Transportation & Warehousing',
  '49': 'Transportation & Warehousing',
  '51': 'Information & Cultural Industries',
  '52': 'Finance & Insurance',
  '53': 'Real Estate & Rental',
  '54': 'Professional, Scientific & Technical',
  '55': 'Management of Companies',
  '56': 'Administrative & Support Services',
  '61': 'Educational Services',
  '62': 'Health Care & Social Assistance',
  '71': 'Arts, Entertainment & Recreation',
  '72': 'Accommodation & Food Services',
  '81': 'Other Services',
  '91': 'Public Administration'
};

export function IndustrySectorChart({ 
  height = 320, 
  className = "", 
  isEditMode = false,
  cardSize = "medium",
  onSizeChange,
  onVisibilityToggle 
}: ChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['companies', 'applications', 'facilities']);
  
  // Debug logging
  console.log(`IndustrySectorChart - height: ${height}, cardSize: ${cardSize}, className: ${className}`);
  
  // Calculate chart dimensions
  const chartHeight = cardSize === 'large' ? 500 : 400;
  const headerHeight = 60;
  const controlsHeight = 120;
  const legendHeight = 0; // Removed extra spacing as requested
  const totalContentHeight = headerHeight + controlsHeight + chartHeight + legendHeight;
  
  console.log(`Chart dimensions - chartHeight: ${chartHeight}, totalContentHeight: ${totalContentHeight}`);
  const { data: companies } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: true
  });

  const { data: applications } = useQuery({
    queryKey: ["/api/admin/applications"],
    enabled: true
  });

  const { data: facilities } = useQuery({
    queryKey: ["/api/admin/facilities"],
    enabled: true
  });

  const processSectorData = () => {
    if (!facilities || !Array.isArray(facilities)) {
      return [];
    }
    
    const sectorData = facilities.reduce((acc: any, facility: any) => {
      // Extract NAICS sector from the first 2 digits of NAICS code from facility
      const naicsCode = facility.naicsCode || '';
      const sectorCode = naicsCode.toString().substring(0, 2);
      const sectorName = SECTOR_MAPPING[sectorCode] || `Other Industry (${sectorCode})`;
      
      if (!sectorCode || sectorCode.length < 2) return acc;
      
      // Find the company for this facility
      const company = companies?.find((c: any) => c.id === facility.companyId);
      if (!acc[sectorName]) {
        acc[sectorName] = {
          name: sectorName,
          sector: sectorName,
          sectorCode,
          companies: new Set(),
  
          applications: 0,
          totalEmployees: 0,
          facilities: 0
        };
      }
      
      acc[sectorName].facilities++;
      
      // Add company to set to avoid duplicates across facilities
      if (company) {
        acc[sectorName].companies.add(company.id);
        if (company.isContractor) {
          acc[sectorName].contractors++;
        }
      }
      
      // Add employee data from facility
      const employees = facility.numberOfWorkersMainShift || 0;
      acc[sectorName].totalEmployees += employees;
      
      return acc;
    }, {});

    // Add application data
    if (applications && Array.isArray(applications)) {
      applications.forEach((app: any) => {
        const facility = facilities.find((f: any) => f.id === app.facilityId);
        if (facility) {
          const naicsCode = facility.naicsCode || '';
          const sectorCode = naicsCode.toString().substring(0, 2);
          const sectorName = SECTOR_MAPPING[sectorCode] || `Other Industry (${sectorCode})`;
          
          if (sectorData[sectorName]) {
            sectorData[sectorName].applications++;
          }
        }
      });
    }

    // Process data for radar chart with filtering applied
    let processedData = Object.values(sectorData)
      .map((sector: any) => {
        const companyCount = sector.companies.size;
        
        // Calculate normalized values for radar chart (0-100 scale)
        const maxCompanies = Math.max(...Object.values(sectorData).map((s: any) => s.companies.size));
        const maxApplications = Math.max(...Object.values(sectorData).map((s: any) => s.applications));
    
        const maxFacilities = Math.max(...Object.values(sectorData).map((s: any) => s.facilities));
        const maxWorkforce = Math.max(...Object.values(sectorData).map((s: any) => s.totalEmployees));
        
        return {
          sector: sector.name.length > 20 ? sector.name.substring(0, 20) + '...' : sector.name,
          fullName: sector.name,
          companies: Math.round((companyCount / Math.max(maxCompanies, 1)) * 100),
          applications: Math.round((sector.applications / Math.max(maxApplications, 1)) * 100),

          facilities: Math.round((sector.facilities / Math.max(maxFacilities, 1)) * 100),
          workforce: Math.round((sector.totalEmployees / Math.max(maxWorkforce, 1)) * 100),
          rawCompanies: companyCount,
          rawApplications: sector.applications,

          rawFacilities: sector.facilities,
          rawWorkforce: sector.totalEmployees
        };
      })
      .filter((sector: any) => sector.rawCompanies > 0);

    // Sort by companies and take top 6
    processedData.sort((a: any, b: any) => b.rawCompanies - a.rawCompanies);
    
    return processedData.slice(0, 6);
  };

  const data = processSectorData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-64">
          <div className="mb-3">
            <p className="font-semibold text-gray-800 text-base">{data?.fullName || label}</p>
            <p className="text-xs text-gray-500">NAICS Industry Sector</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-blue-600">Companies:</span>
              <span className="font-medium">{data?.rawCompanies || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-600">Applications:</span>
              <span className="font-medium">{data?.rawApplications || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-purple-600">Facilities:</span>
              <span className="font-medium">{data?.rawFacilities || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-600">Total Workforce:</span>
              <span className="font-medium">{data?.rawWorkforce || 0}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">Values shown on chart are normalized (0-100)</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${className}`} style={{ minHeight: `${totalContentHeight}px` }}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Industry Sector Distribution</h3>
          <div className="text-sm text-gray-500">
            NAICS sector analysis with company, contractor, and application metrics
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

      {/* Metric Selection Controls */}
      <div className="mb-4 px-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Display Metrics:</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>Top 6 sectors</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {METRIC_OPTIONS.map((metric) => (
            <label key={metric.key} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMetrics([...selectedMetrics, metric.key]);
                  } else {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== metric.key));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: metric.color }}
              ></div>
              <span className="text-sm text-gray-700">{metric.label}</span>
            </label>
          ))}
        </div>
        

      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No sector data available</p>
            <p className="text-sm">Facilities: {facilities?.length || 0}, Companies: {companies?.length || 0}</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <RadarChart data={data} margin={{ top: 10, right: 80, bottom: 120, left: 80 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis 
              dataKey="sector" 
              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }}
              className="text-sm"
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickCount={4}
              axisLine={false}
            />
            {selectedMetrics.includes('companies') && (
              <Radar
                name="Companies"
                dataKey="companies"
                stroke={COLORS.companies}
                fill={COLORS.companies}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}
            {selectedMetrics.includes('applications') && (
              <Radar
                name="Applications"
                dataKey="applications"
                stroke={COLORS.applications}
                fill={COLORS.applications}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}

            {selectedMetrics.includes('facilities') && (
              <Radar
                name="Facilities"
                dataKey="facilities"
                stroke={COLORS.facilities}
                fill={COLORS.facilities}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}
            {selectedMetrics.includes('workforce') && (
              <Radar
                name="Workforce"
                dataKey="workforce"
                stroke={COLORS.workforce}
                fill={COLORS.workforce}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '25px', 
                fontSize: '13px', 
                fontWeight: 500,
                position: 'absolute',
                bottom: '40px'
              }}
              iconType="line"
              layout="horizontal"
              align="center"
            />
          </RadarChart>
        </ResponsiveContainer>
      )}

    </div>
  );
}