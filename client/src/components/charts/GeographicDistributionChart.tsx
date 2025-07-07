import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Building2, FileText, Users } from 'lucide-react';

interface ChartProps {
  height?: number;
  className?: string;
  cardSize?: 'medium' | 'large';
}

const COLORS = {
  companies: '#3b82f6',
  applications: '#10b981',
  contractors: '#f59e0b',
  density: '#8b5cf6',
  background: '#fafbfc'
};

export function GeographicDistributionChart({ height = 280, className, cardSize = 'medium' }: ChartProps) {
  const [viewMode, setViewMode] = useState<'count' | 'density'>('count');

  const [showContractors, setShowContractors] = useState(true);
  
  // Calculate chart dimensions based on card size
  const chartHeight = cardSize === 'large' ? 400 : 300;
  const headerHeight = 60;
  const controlsHeight = 60;
  const totalContentHeight = headerHeight + controlsHeight + chartHeight;
  
  console.log(`GeographicDistributionChart - height: ${height}, cardSize: ${cardSize}, className: ${className}`);
  console.log(`Chart dimensions - chartHeight: ${chartHeight}, totalContentHeight: ${totalContentHeight}`);
  const { data: companies } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: true
  });

  const { data: applications } = useQuery({
    queryKey: ["/api/admin/applications"],
    enabled: true
  });

  const processGeographicData = () => {
    if (!companies || !applications || !Array.isArray(companies) || !Array.isArray(applications)) return [];
    
    const provinceData = companies.reduce((acc: any, company: any) => {
      const province = company.province || 'Unknown';
      if (province === 'Unknown') return acc;
      
      if (!acc[province]) {
        acc[province] = { 
          province, 
          companies: 0, 
          applications: 0, 
          contractors: 0,
          completedApps: 0
        };
      }
      acc[province].companies++;
      
      if (company.isContractor) {
        acc[province].contractors++;
      }
      
      return acc;
    }, {});

    // Add application data
    Object.keys(provinceData).forEach(province => {
      const provinceCompanies = companies.filter((c: any) => c.province === province);
      const companyIds = provinceCompanies.map((c: any) => c.id);
      const provinceApps = applications.filter((app: any) => 
        companyIds.includes(app.companyId)
      );
      
      provinceData[province].applications = provinceApps.length;
      provinceData[province].completedApps = provinceApps.filter((app: any) => 
        app.status === 'approved' || app.status === 'completed'
      ).length;
      
      // Calculate application density (apps per company)
      provinceData[province].density = provinceData[province].companies > 0 ? 
        Math.round((provinceData[province].applications / provinceData[province].companies) * 10) / 10 : 0;
        
      // Calculate completion rate
      provinceData[province].completionRate = provinceData[province].applications > 0 ? 
        Math.round((provinceData[province].completedApps / provinceData[province].applications) * 100) : 0;
    });

    // Sort by companies (most active provinces first) and limit items
    const sortedData = Object.values(provinceData)
      .sort((a: any, b: any) => b.companies - a.companies);
    
    const maxItems = cardSize === 'large' ? 10 : 8;
    return sortedData.slice(0, maxItems);
  };

  const data = processGeographicData();
  const avgDensity = data.length > 0 ? 
    Math.round((data.reduce((sum: any, item: any) => sum + item.density, 0) / data.length) * 10) / 10 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-48">
          <p className="font-semibold text-gray-800 mb-3">{label}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-1">
              <p className="text-blue-600">{`Companies: ${data?.companies || 0}`}</p>
              <p className="text-green-600">{`Applications: ${data?.applications || 0}`}</p>
              <p className="text-yellow-600">{`Contractors: ${data?.contractors || 0}`}</p>
            </div>
            <div className="space-y-1">
              <p className="text-purple-600">{`Density: ${data?.density || 0}`}</p>
              <p className="text-gray-600">{`Completed: ${data?.completedApps || 0}`}</p>
              <p className="text-gray-600">{`Success: ${data?.completionRate || 0}%`}</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${className}`} style={{ minHeight: `${totalContentHeight}px` }}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Geographic Distribution
          </h3>
          <p className="text-sm text-gray-600">Provincial distribution of companies, applications, and contractors</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <Select value={viewMode} onValueChange={(value: 'count' | 'density') => setViewMode(value)}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="density">Density</SelectItem>
            </SelectContent>
          </Select>
        </div>
        

        
        <Button
          variant={showContractors ? "default" : "outline"}
          size="sm"
          onClick={() => setShowContractors(!showContractors)}
          className="h-8 px-3"
        >
          <Users className="h-4 w-4 mr-1" />
          Contractors
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No geographic data available</p>
            <p className="text-sm">Companies: {companies?.length || 0}, Applications: {applications?.length || 0}</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart 
            data={data} 
            margin={{ top: 25, right: 40, left: 25, bottom: 70 }}
          >
          <defs>
            <linearGradient id="companyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.companies} stopOpacity={0.9}/>
              <stop offset="95%" stopColor={COLORS.companies} stopOpacity={0.6}/>
            </linearGradient>
            <linearGradient id="contractorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.contractors} stopOpacity={0.9}/>
              <stop offset="95%" stopColor={COLORS.contractors} stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" opacity={0.4} />
          <XAxis 
            dataKey="province" 
            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            angle={-35}
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12, fontWeight: 600 } }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            label={{ value: 'Apps/Company', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 12, fontWeight: 600 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 500 }}
            iconType="rect"
          />
          <ReferenceLine 
            yAxisId="right"
            y={avgDensity} 
            stroke={COLORS.density} 
            strokeDasharray="3 3" 
            strokeOpacity={0.6}
            label={{ value: `Avg Density: ${avgDensity}`, position: "topRight", fontSize: 10 }}
          />
          <Bar 
            yAxisId="left" 
            dataKey="companies" 
            fill="url(#companyGradient)"
            name="Companies" 
            radius={[4, 4, 0, 0]}
            stroke={COLORS.companies}
            strokeWidth={1}
          />
          {showContractors && (
            <Bar 
              yAxisId="left" 
              dataKey="contractors" 
              fill="url(#contractorGradient)"
              name="Contractors" 
              radius={[4, 4, 0, 0]}
              stroke={COLORS.contractors}
              strokeWidth={1}
            />
          )}
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="applications" 
            stroke={COLORS.applications} 
            strokeWidth={4}
            name="Applications"
            dot={{ fill: COLORS.applications, strokeWidth: 3, r: 6, stroke: '#ffffff' }}
            activeDot={{ r: 8, stroke: COLORS.applications, strokeWidth: 3, fill: '#ffffff' }}
          />
          {viewMode === 'density' && (
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="density" 
              stroke={COLORS.density} 
              strokeWidth={3}
              strokeDasharray="4 4"
              name="App Density"
              dot={{ fill: COLORS.density, strokeWidth: 2, r: 4, stroke: '#ffffff' }}
            />
          )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
      
    </div>
  );
}