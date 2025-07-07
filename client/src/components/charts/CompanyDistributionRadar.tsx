import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useQuery } from "@tanstack/react-query";

interface ChartProps {
  height?: number;
  className?: string;
}

const COLORS = {
  companies: '#3b82f6',
  applications: '#10b981',
  contractors: '#f59e0b',
  background: '#fafbfc'
};

export function CompanyDistributionRadar({ height = 280, className }: ChartProps) {
  const { data: companies } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: true
  });

  const { data: applications } = useQuery({
    queryKey: ["/api/admin/applications"],
    enabled: true
  });

  const processRadarData = () => {
    if (!companies || !Array.isArray(companies)) return [];
    
    const provinceData = companies.reduce((acc: any, company: any) => {
      const province = company.province || 'Other';
      if (province === 'Other') return acc;
      
      if (!acc[province]) {
        acc[province] = {
          province: province.length > 12 ? province.substring(0, 12) : province,
          companies: 0,
          contractors: 0,
          applications: 0
        };
      }
      
      acc[province].companies++;
      if (company.isContractor) {
        acc[province].contractors++;
      }
      
      return acc;
    }, {});

    // Add application data
    if (applications && Array.isArray(applications)) {
      applications.forEach((app: any) => {
        const company = companies.find((c: any) => c.id === app.companyId);
        if (company && company.province && provinceData[company.province]) {
          provinceData[company.province].applications++;
        }
      });
    }

    const maxCompanies = Math.max(...Object.values(provinceData).map((p: any) => p.companies));
    const maxApplications = Math.max(...Object.values(provinceData).map((p: any) => p.applications));
    const maxContractors = Math.max(...Object.values(provinceData).map((p: any) => p.contractors));

    return Object.values(provinceData).map((data: any) => ({
      province: data.province,
      companies: data.companies,
      contractors: data.contractors,
      applications: data.applications,
      companyScore: maxCompanies > 0 ? Math.round((data.companies / maxCompanies) * 100) : 0,
      applicationScore: maxApplications > 0 ? Math.round((data.applications / maxApplications) * 100) : 0,
      contractorScore: maxContractors > 0 ? Math.round((data.contractors / maxContractors) * 100) : 0
    }));
  };

  const data = processRadarData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">{`Companies: ${data?.companies || 0}`}</p>
            <p className="text-green-600">{`Applications: ${data?.applications || 0}`}</p>
            <p className="text-yellow-600">{`Contractors: ${data?.contractors || 0}`}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 40, right: 50, left: 50, bottom: 50 }}>
          <PolarGrid 
            stroke="#d1d5db" 
            strokeWidth={1}
            radialLines={true}
          />
          <PolarAngleAxis 
            dataKey="province" 
            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
            className="text-xs"
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickCount={5}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Radar
            name="Companies"
            dataKey="companyScore"
            stroke={COLORS.companies}
            fill={COLORS.companies}
            fillOpacity={0.1}
            strokeWidth={3}
            dot={{ fill: COLORS.companies, strokeWidth: 2, r: 5, stroke: '#ffffff' }}
          />
          <Radar
            name="Applications"
            dataKey="applicationScore"
            stroke={COLORS.applications}
            fill={COLORS.applications}
            fillOpacity={0.1}
            strokeWidth={3}
            dot={{ fill: COLORS.applications, strokeWidth: 2, r: 5, stroke: '#ffffff' }}
          />
          <Radar
            name="Contractors"
            dataKey="contractorScore"
            stroke={COLORS.contractors}
            fill={COLORS.contractors}
            fillOpacity={0.1}
            strokeWidth={3}
            dot={{ fill: COLORS.contractors, strokeWidth: 2, r: 5, stroke: '#ffffff' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 500 }}
            iconType="line"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}