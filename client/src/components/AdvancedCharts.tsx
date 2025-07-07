import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement, TimeScale, RadialLinearScale, Filler } from 'chart.js';
import { Bar, Pie, Line, Doughnut, PolarArea, Radar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  TimeScale,
  RadialLinearScale,
  Filler
);

interface ChartProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'polar' | 'radar';
  data: any;
  options?: any;
  height?: number;
}

export function AdvancedChart({ type, data, options = {}, height = 300 }: ChartProps) {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    ...options
  };

  // Add scales for chart types that need them
  if (['bar', 'line'].includes(type)) {
    defaultOptions.scales = {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(0, 0, 0, 0.7)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(0, 0, 0, 0.7)'
        }
      },
      ...defaultOptions.scales
    };
  }

  const renderChart = () => {
    const containerStyle = { height: `${height}px`, width: '100%', position: 'relative' as const };
    
    switch (type) {
      case 'bar':
        return <div style={containerStyle}><Bar data={data} options={defaultOptions} /></div>;
      case 'line':
        return <div style={containerStyle}><Line data={data} options={defaultOptions} /></div>;
      case 'pie':
        return <div style={containerStyle}><Pie data={data} options={defaultOptions} /></div>;
      case 'doughnut':
        return <div style={containerStyle}><Doughnut data={data} options={defaultOptions} /></div>;
      case 'polar':
        return <div style={containerStyle}><PolarArea data={data} options={defaultOptions} /></div>;
      case 'radar':
        return <div style={containerStyle}><Radar data={data} options={defaultOptions} /></div>;
      default:
        return <div style={containerStyle}><Bar data={data} options={defaultOptions} /></div>;
    }
  };

  return <div className="w-full h-full">{renderChart()}</div>;
}

// Specialized chart components for specific data analysis
export function UserGrowthChart() {
  const { data: users = [] } = useQuery({ queryKey: ["/api/admin/users"] });

  const processGrowthData = () => {
    const monthlyGrowth = users.reduce((acc: any, user: any) => {
      const month = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyGrowth).sort();
    let cumulative = 0;
    
    return {
      labels: sortedMonths,
      datasets: [
        {
          label: 'New Users',
          data: sortedMonths.map(month => monthlyGrowth[month]),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Total Users',
          data: sortedMonths.map(month => {
            cumulative += monthlyGrowth[month];
            return cumulative;
          }),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: false
        }
      ]
    };
  };

  return (
    <div className="w-full h-full">
      <AdvancedChart
        type="line"
        data={processGrowthData()}
        options={{
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Users'
              }
            }
          }
        }}
        height={250}
      />
    </div>
  );
}

export function ApplicationStatusDistribution() {
  const { data: applications = [] } = useQuery({ queryKey: ["/api/admin/applications"] });

  const processStatusData = () => {
    const statusCounts = applications.reduce((acc: any, app: any) => {
      const status = app.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(statusCounts).map(status => 
        status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      ),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  return (
    <div className="w-full h-full">
      <AdvancedChart
        type="doughnut"
        data={processStatusData()}
        options={{
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom' as const
            }
          }
        }}
        height={200}
      />
    </div>
  );
}

export function ActivityTypePerformance() {
  const { data: applications = [] } = useQuery({ queryKey: ["/api/admin/applications"] });

  const processActivityData = () => {
    const activityStats = applications.reduce((acc: any, app: any) => {
      const activity = app.activityType || 'unknown';
      if (!acc[activity]) {
        acc[activity] = { total: 0, completed: 0, inProgress: 0 };
      }
      acc[activity].total += 1;
      if (app.status === 'completed') acc[activity].completed += 1;
      if (app.status === 'in_progress') acc[activity].inProgress += 1;
      return acc;
    }, {});

    const activities = Object.keys(activityStats);
    
    return {
      labels: activities,
      datasets: [
        {
          label: 'Total Applications',
          data: activities.map(activity => activityStats[activity].total),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3B82F6',
          borderWidth: 1
        },
        {
          label: 'Completed',
          data: activities.map(activity => activityStats[activity].completed),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: '#10B981',
          borderWidth: 1
        },
        {
          label: 'In Progress',
          data: activities.map(activity => activityStats[activity].inProgress),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: '#F59E0B',
          borderWidth: 1
        }
      ]
    };
  };

  return (
    <div className="w-full h-full">
      <AdvancedChart
        type="bar"
        data={processActivityData()}
        options={{
          scales: {
            x: {
              title: {
                display: true,
                text: 'Activity Type'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Number of Applications'
              }
            }
          }
        }}
        height={250}
      />
    </div>
  );
}

export function CompanyDistributionRadar() {
  const { data: companies = [] } = useQuery({ queryKey: ["/api/admin/companies"] });

  const processRadarData = () => {
    // Mock data for demonstration - in real app, this would come from actual company analysis
    return {
      labels: ['Manufacturing', 'Agriculture', 'Construction', 'Mining', 'Transportation', 'Energy'],
      datasets: [
        {
          label: 'Participant Companies',
          data: [65, 59, 90, 81, 56, 78],
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3B82F6',
          pointBackgroundColor: '#3B82F6',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3B82F6'
        },
        {
          label: 'Contractor Companies',
          data: [28, 48, 40, 19, 96, 27],
          fill: true,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: '#10B981',
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#10B981'
        }
      ]
    };
  };

  return (
    <div className="w-full h-full">
      <AdvancedChart
        type="radar"
        data={processRadarData()}
        options={{
          scales: {
            r: {
              angleLines: {
                display: true
              },
              suggestedMin: 0,
              suggestedMax: 100
            }
          }
        }}
        height={250}
      />
    </div>
  );
}