import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Calendar, Filter, TrendingUp, AlertTriangle, Users, Building2, FileText, CheckCircle, XCircle, PauseCircle, Search, Maximize2, Settings } from 'lucide-react';

interface ChartProps {
  height?: number;
  className?: string;
  cardSize?: 'medium' | 'large';
}

const COLORS = {
  draft: '#94a3b8',
  preActivity: '#3b82f6',
  postActivity: '#10b981',
  review: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
  overdue: '#dc2626',
  contractor: '#8b5cf6',
  background: '#fafbfc'
};

const PHASE_COLORS = {
  'Application Created': '#e2e8f0',
  'Pre-Activity Phase': '#dbeafe',
  'Post-Activity Phase': '#dcfce7',
  'Under Review': '#fef3c7',
  'Approved': '#bbf7d0',
  'Rejected': '#fecaca',
  'Contractor Work': '#e9d5ff'
};

const ACTIVITY_NAMES = {
  'FRA': 'Facility Readiness',
  'EAA': 'Energy Assessments', 
  'SEM': 'Strategic Energy',
  'EMIS': 'Energy Mgmt Systems',
  'CR': 'Capital Retrofits'
};

export function ProcessingTimeChart({ height = 280, className, cardSize = 'medium' }: ChartProps) {
  const [viewMode, setViewMode] = useState<'gantt' | 'timeline' | 'phases'>('gantt');
  const [timeFilter, setTimeFilter] = useState<'all' | '30d' | '90d' | '6m'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'FRA' | 'EAA' | 'SEM' | 'EMIS' | 'CR'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [overdueThreshold, setOverdueThreshold] = useState(30);
  const [showFullDialog, setShowFullDialog] = useState(false);
  
  // Calculate chart dimensions based on card size
  const chartHeight = cardSize === 'large' ? 500 : 350;
  const headerHeight = 60;
  const controlsHeight = 100;
  const totalContentHeight = headerHeight + controlsHeight + chartHeight;
  
  console.log(`ProcessingTimeChart - height: ${height}, cardSize: ${cardSize}, className: ${className}`);
  console.log(`Chart dimensions - chartHeight: ${chartHeight}, totalContentHeight: ${totalContentHeight}`);
  const { data: applications } = useQuery({
    queryKey: ["/api/admin/applications"],
    enabled: true
  });

  const { data: submissions } = useQuery({
    queryKey: ["/api/admin/pending-submissions"],
    enabled: true
  });

  const { data: companies } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: true
  });

  const { data: facilities } = useQuery({
    queryKey: ["/api/admin/facilities"], 
    enabled: true
  });

  // Get form templates for dynamic phase detection
  const { data: formTemplates } = useQuery({
    queryKey: ["/api/admin/form-templates"],
    enabled: true
  });

  const processGanttData = (isFullView = false) => {
    if (!applications || !Array.isArray(applications)) return [];
    
    let filteredApps = applications;
    
    // Apply filters
    if (timeFilter !== 'all') {
      const days = timeFilter === '30d' ? 30 : timeFilter === '90d' ? 90 : 180;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filteredApps = applications.filter((app: any) => {
        const appDate = new Date(app.createdAt || app.created_at);
        return appDate >= cutoffDate;
      });
    }
    
    if (activityFilter !== 'all') {
      filteredApps = filteredApps.filter((app: any) => app.activityType === activityFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filteredApps = filteredApps.filter((app: any) => {
        const company = companies?.find((c: any) => c.id === app.companyId);
        const facility = facilities?.find((f: any) => f.id === app.facilityId);
        const searchableText = `${app.applicationId} ${company?.name} ${facility?.name} ${app.title}`.toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
      });
    }
    
    // Process each application into Gantt chart format
    return filteredApps.map((app: any, index: number) => {
      const createdDate = new Date(app.createdAt || app.created_at);
      const submittedDate = app.submittedAt ? new Date(app.submittedAt) : null;
      const reviewedDate = app.reviewedAt ? new Date(app.reviewedAt) : null;
      const currentDate = new Date();
      
      // Get company and facility info
      const company = companies?.find((c: any) => c.id === app.companyId);
      const facility = facilities?.find((f: any) => f.id === app.facilityId);
      
      // Get dynamic phases based on actual submissions and templates
      const appSubmissions = submissions?.filter((sub: any) => sub.applicationId === app.applicationId) || [];
      const dynamicPhases = [];
      let dayOffset = 0;
      
      // Phase 1: Application Created (always present)
      const creationDuration = appSubmissions.length > 0 ? 
        Math.ceil((new Date(appSubmissions[0].submittedAt || appSubmissions[0].createdAt).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : 
        Math.ceil((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
      dynamicPhases.push({
        phase: 'Application Created',
        start: dayOffset,
        duration: Math.max(1, Math.min(creationDuration, 30)),
        status: appSubmissions.length > 0 ? 'completed' : 'active',
        color: PHASE_COLORS['Application Created'],
        startDate: createdDate,
        endDate: appSubmissions.length > 0 ? new Date(appSubmissions[0].submittedAt || appSubmissions[0].createdAt) : currentDate
      });
      dayOffset += dynamicPhases[0].duration;
      
      // Dynamic phases based on actual form templates and submissions
      if (appSubmissions.length > 0) {
        appSubmissions.forEach((submission: any, subIndex: number) => {
          const template = formTemplates?.find((t: any) => t.id === submission.templateId);
          const templateName = template?.name || `Phase ${subIndex + 1}`;
          const submissionDate = new Date(submission.submittedAt || submission.createdAt);
          
          const nextSubmission = appSubmissions[subIndex + 1];
          const phaseDuration = nextSubmission ? 
            Math.ceil((new Date(nextSubmission.submittedAt || nextSubmission.createdAt).getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24)) :
            app.status === 'approved' || app.status === 'rejected' ? 
              Math.ceil((reviewedDate?.getTime() || currentDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24)) :
              Math.ceil((currentDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          dynamicPhases.push({
            phase: templateName,
            start: dayOffset,
            duration: Math.max(1, Math.min(phaseDuration, 45)),
            status: nextSubmission || app.status === 'approved' || app.status === 'rejected' ? 'completed' : 'active',
            color: PHASE_COLORS[templateName] || PHASE_COLORS['Pre-Activity Phase'],
            startDate: submissionDate,
            endDate: nextSubmission ? new Date(nextSubmission.submittedAt || nextSubmission.createdAt) : currentDate
          });
          dayOffset += dynamicPhases[dynamicPhases.length - 1].duration;
        });
      }
      
      // Final review phase if under review or completed
      if (app.status === 'under_review' || app.status === 'approved' || app.status === 'rejected') {
        const reviewStartDate = appSubmissions.length > 0 ? 
          new Date(appSubmissions[appSubmissions.length - 1].submittedAt || appSubmissions[appSubmissions.length - 1].createdAt) : createdDate;
        
        const reviewDuration = reviewedDate ? 
          Math.ceil((reviewedDate.getTime() - reviewStartDate.getTime()) / (1000 * 60 * 60 * 24)) : 
          Math.ceil((currentDate.getTime() - reviewStartDate.getTime()) / (1000 * 60 * 60 * 24));
          
        dynamicPhases.push({
          phase: app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Under Review',
          start: dayOffset,
          duration: Math.max(1, Math.min(reviewDuration, 20)),
          status: app.status === 'approved' ? 'approved' : app.status === 'rejected' ? 'rejected' : 'review',
          color: PHASE_COLORS[app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Under Review'],
          startDate: reviewStartDate,
          endDate: reviewedDate || currentDate
        });
        dayOffset += dynamicPhases[dynamicPhases.length - 1].duration;
      }
      
      // Calculate total duration and status with configurable overdue threshold
      const totalDuration = dayOffset;
      const isOverdue = totalDuration > overdueThreshold && !reviewedDate;
      const daysInProcess = Math.ceil((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Apply status filter
      const appStatus = app.status === 'approved' || app.status === 'rejected' ? 'completed' : 
                       isOverdue ? 'overdue' : 'active';
      
      if (statusFilter === 'completed' && appStatus !== 'completed') return null;
      if (statusFilter === 'active' && appStatus !== 'active') return null;
      if (statusFilter === 'overdue' && appStatus !== 'overdue') return null;
      
      return {
        id: app.applicationId || `app-${app.id}`,
        applicationId: app.applicationId,
        title: `${app.applicationId} - ${ACTIVITY_NAMES[app.activityType as keyof typeof ACTIVITY_NAMES] || app.activityType}`,
        activityType: app.activityType,
        companyName: company?.name || 'Unknown Company',
        facilityName: facility?.name || app.facilityName || 'Unknown Facility',
        status: appStatus,
        totalDuration,
        daysInProcess,
        phases: dynamicPhases,
        createdAt: createdDate,
        submittedAt: submittedDate,
        reviewedAt: reviewedDate,
        isOverdue,
        priority: isOverdue ? 'high' : totalDuration > 30 ? 'medium' : 'low',
        // Gantt chart specific fields
        y: index * 60, // Row position
        height: 40, // Bar height
      };
    }).filter(Boolean).slice(0, isFullView ? undefined : 5); // Show 5 items in card, unlimited in popup
  };

  const data = processGanttData(false);
  const fullData = processGanttData(true);
  const avgProcessingTime = fullData.length > 0 ? 
    Math.round(fullData.reduce((sum, item) => sum + item.daysInProcess, 0) / fullData.length) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-72">
          <div className="mb-3">
            <p className="font-semibold text-gray-800 flex items-center gap-2">
              {data.title}
              {data.isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-blue-600 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {data.companyName}
              </p>
              <p className="text-green-600 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {data.facilityName}
              </p>
              <p className="text-gray-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {data.daysInProcess} days in process
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-purple-600">{`Status: ${data.status}`}</p>
              <p className="text-gray-500">{`Priority: ${data.priority}`}</p>
              <p className="text-gray-500">{`Phases: ${data.phases.length}`}</p>
              {data.createdAt && (
                <p className="text-gray-400 text-xs">
                  Created: {new Date(data.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          {/* Phase breakdown */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-700 mb-2">Phase Timeline:</p>
            <div className="space-y-1">
              {data.phases.map((phase: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{phase.phase}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">
                      {phase.startDate && new Date(phase.startDate).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      phase.status === 'completed' ? 'bg-green-100 text-green-700' :
                      phase.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      phase.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {phase.duration}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Gantt Chart Component
  const GanttChart = ({ data: chartData, isFullView = false }: { data: any[], isFullView?: boolean }) => {
    if (chartData.length === 0) return null;
    
    const maxDuration = Math.max(...chartData.map(d => d.totalDuration));
    const effectiveHeight = isFullView ? 600 : chartHeight;
    
    return (
      <div className="relative overflow-auto border border-gray-200 rounded-lg bg-white">
        {/* Timeline Header */}
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Application Timeline (Days)</div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Pre-Activity</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Post-Activity</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Under Review</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span>Overdue</span>
              </div>
            </div>
          </div>
          
          {/* Time scale */}
          <div className="mt-2 relative h-6">
            <svg width="100%" height="100%" className="absolute">
              {Array.from({ length: Math.ceil(maxDuration / 10) + 1 }, (_, i) => i * 10).map(day => (
                <g key={day}>
                  <line 
                    x1={`${(day / maxDuration) * 100}%`} 
                    y1="0" 
                    x2={`${(day / maxDuration) * 100}%`} 
                    y2="24" 
                    stroke="#e5e7eb" 
                    strokeWidth="1"
                  />
                  <text 
                    x={`${(day / maxDuration) * 100}%`} 
                    y="16" 
                    textAnchor="middle" 
                    className="text-xs fill-gray-500"
                  >
                    {day}d
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
        
        {/* Gantt Rows */}
        <div className="p-0" style={{ maxHeight: isFullView ? 'auto' : `${effectiveHeight - 100}px`, overflowY: isFullView ? 'visible' : 'auto' }}>
          {chartData.map((app, index) => (
            <div key={app.id} className={`flex items-center border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
              {/* Application Info */}
              <div className="w-80 p-3 border-r border-gray-200 bg-white sticky left-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {app.applicationId}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {app.companyName} - {app.facilityName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        app.activityType === 'FRA' ? 'bg-blue-100 text-blue-800' :
                        app.activityType === 'EAA' ? 'bg-green-100 text-green-800' :
                        app.activityType === 'SEM' ? 'bg-purple-100 text-purple-800' :
                        app.activityType === 'EMIS' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {app.activityType}
                      </span>
                      {app.isOverdue && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {app.daysInProcess}d
                  </div>
                </div>
              </div>
              
              {/* Timeline Bar */}
              <div className="flex-1 p-2 relative h-16 min-w-0">
                <div className="relative h-8 bg-gray-100 rounded">
                  <svg width="100%" height="100%" className="absolute">
                    {app.phases.map((phase, phaseIndex) => {
                      const startPercent = (phase.start / maxDuration) * 100;
                      const widthPercent = (phase.duration / maxDuration) * 100;
                      
                      return (
                        <g key={phaseIndex}>
                          <rect
                            x={`${startPercent}%`}
                            y="4"
                            width={`${widthPercent}%`}
                            height="24"
                            fill={phase.color}
                            stroke={phase.status === 'active' ? '#3b82f6' : 
                                   phase.status === 'completed' ? '#22c55e' :
                                   phase.status === 'review' ? '#f59e0b' : '#6b7280'}
                            strokeWidth="1"
                            rx="3"
                            className="cursor-pointer"
                          />
                          {widthPercent > 15 && (
                            <text
                              x={`${startPercent + widthPercent / 2}%`}
                              y="20"
                              textAnchor="middle"
                              className="text-xs fill-gray-700 font-medium"
                            >
                              {phase.duration}d
                            </text>
                          )}
                        </g>
                      );
                    })}
                    
                    {/* SLA reference line at configurable threshold */}
                    <line 
                      x1={`${(overdueThreshold / maxDuration) * 100}%`} 
                      y1="0" 
                      x2={`${(overdueThreshold / maxDuration) * 100}%`} 
                      y2="32" 
                      stroke="#ef4444" 
                      strokeWidth="2" 
                      strokeDasharray="3,3"
                      opacity="0.7"
                    />
                  </svg>
                </div>
                
                {/* Status indicator */}
                <div className="absolute right-2 top-1 flex items-center gap-1">
                  {app.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {app.status === 'active' && <PauseCircle className="h-4 w-4 text-blue-500" />}
                  {app.status === 'overdue' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* View All Button for card view */}
        {!isFullView && fullData.length > 5 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFullDialog(true)}
              className="w-full flex items-center gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              View All {fullData.length} Applications
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`} style={{ minHeight: `${totalContentHeight}px` }}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Processing Time Analysis
          </h3>
          <p className="text-sm text-gray-600">Application review timeframes and bottleneck identification</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 h-8"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Activity:</span>
          <Select value={activityFilter} onValueChange={(value: 'all' | 'FRA' | 'EAA' | 'SEM' | 'EMIS' | 'CR') => setActivityFilter(value)}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="FRA">FRA</SelectItem>
              <SelectItem value="EAA">EAA</SelectItem>
              <SelectItem value="SEM">SEM</SelectItem>
              <SelectItem value="EMIS">EMIS</SelectItem>
              <SelectItem value="CR">CR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Time:</span>
          <Select value={timeFilter} onValueChange={(value: 'all' | '30d' | '90d' | '6m') => setTimeFilter(value)}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
              <SelectItem value="90d">90d</SelectItem>
              <SelectItem value="6m">6m</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'completed' | 'overdue') => setStatusFilter(value)}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Overdue:</span>
          <Select value={overdueThreshold.toString()} onValueChange={(value) => setOverdueThreshold(parseInt(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15d</SelectItem>
              <SelectItem value="30">30d</SelectItem>
              <SelectItem value="45">45d</SelectItem>
              <SelectItem value="60">60d</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3 text-sm ml-auto">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-gray-600">Avg: {avgProcessingTime}d</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-gray-600">{data.length} shown</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-gray-600">{fullData.filter(d => d.isOverdue).length} overdue</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No applications match current filters</p>
            <p className="text-sm">Total Applications: {applications?.length || 0}</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ height: chartHeight }}>
            <GanttChart data={data} isFullView={false} />
          </div>
          
          {/* Full Dialog */}
          <Dialog open={showFullDialog} onOpenChange={setShowFullDialog}>
            <DialogContent className="max-w-[95vw] max-h-[90vh] p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Complete Application Timeline Analysis
                </DialogTitle>
              </DialogHeader>
              
              {/* Full view controls */}
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48 h-8"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Activity:</span>
                    <Select value={activityFilter} onValueChange={(value: 'all' | 'FRA' | 'EAA' | 'SEM' | 'EMIS' | 'CR') => setActivityFilter(value)}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="FRA">FRA</SelectItem>
                        <SelectItem value="EAA">EAA</SelectItem>
                        <SelectItem value="SEM">SEM</SelectItem>
                        <SelectItem value="EMIS">EMIS</SelectItem>
                        <SelectItem value="CR">CR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'completed' | 'overdue') => setStatusFilter(value)}>
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Time:</span>
                    <Select value={timeFilter} onValueChange={(value: 'all' | '30d' | '90d' | '6m') => setTimeFilter(value)}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="30d">30d</SelectItem>
                        <SelectItem value="90d">90d</SelectItem>
                        <SelectItem value="6m">6m</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Overdue:</span>
                    <Select value={overdueThreshold.toString()} onValueChange={(value) => setOverdueThreshold(parseInt(value))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15d</SelectItem>
                        <SelectItem value="30">30d</SelectItem>
                        <SelectItem value="45">45d</SelectItem>
                        <SelectItem value="60">60d</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm ml-auto">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-600">{fullData.length} total</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-gray-600">{fullData.filter(d => d.isOverdue).length} overdue</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Full Gantt Chart */}
              <div className="flex-1 p-6 pt-0 overflow-hidden">
                <GanttChart data={fullData} isFullView={true} />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      
    </div>
  );
}