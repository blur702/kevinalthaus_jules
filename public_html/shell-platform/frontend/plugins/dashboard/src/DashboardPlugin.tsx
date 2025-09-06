import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  Calendar,
  Bell,
  Settings,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import clsx from 'clsx';

interface DashboardProps {
  pluginAPI?: any;
}

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

interface ChartData {
  name: string;
  value: number;
  users?: number;
  revenue?: number;
  sessions?: number;
}

const DashboardPlugin: React.FC<DashboardProps> = ({ pluginAPI }) => {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [pieData, setPieData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Simulate loading data - in real app, this would come from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock metrics data
      const mockMetrics: MetricCard[] = [
        {
          id: 'users',
          title: 'Total Users',
          value: '12,543',
          change: '+12%',
          trend: 'up',
          icon: Users,
          color: 'bg-blue-500'
        },
        {
          id: 'sessions',
          title: 'Active Sessions',
          value: '1,234',
          change: '+5%',
          trend: 'up',
          icon: Activity,
          color: 'bg-green-500'
        },
        {
          id: 'revenue',
          title: 'Revenue',
          value: '$45,678',
          change: '+8%',
          trend: 'up',
          icon: TrendingUp,
          color: 'bg-purple-500'
        },
        {
          id: 'events',
          title: 'Events Today',
          value: '89',
          change: '-3%',
          trend: 'down',
          icon: Calendar,
          color: 'bg-orange-500'
        }
      ];

      // Mock chart data
      const mockChartData: ChartData[] = [
        { name: 'Jan', users: 400, revenue: 2400, sessions: 300 },
        { name: 'Feb', users: 300, revenue: 1398, sessions: 250 },
        { name: 'Mar', users: 600, revenue: 9800, sessions: 450 },
        { name: 'Apr', users: 800, revenue: 3908, sessions: 600 },
        { name: 'May', users: 700, revenue: 4800, sessions: 550 },
        { name: 'Jun', users: 900, revenue: 3800, sessions: 700 },
        { name: 'Jul', users: 1100, revenue: 4300, sessions: 850 }
      ];

      const mockPieData: ChartData[] = [
        { name: 'Desktop', value: 45 },
        { name: 'Mobile', value: 35 },
        { name: 'Tablet', value: 20 }
      ];

      setMetrics(mockMetrics);
      setChartData(mockChartData);
      setPieData(mockPieData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      pluginAPI?.showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleMetricClick = (metric: MetricCard) => {
    pluginAPI?.showNotification(`Clicked on ${metric.title}`, 'info');
  };

  const handleSettingsClick = () => {
    pluginAPI?.navigate('/settings');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={clsx(
                "flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors",
                isLoading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              )}
            >
              <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={handleSettingsClick}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              onClick={() => handleMetricClick(metric)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                </div>
                <div className={clsx("p-3 rounded-full", metric.color)}>
                  <metric.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div className="flex items-center mt-4">
                <span
                  className={clsx(
                    "inline-flex items-center text-sm font-medium",
                    metric.trend === 'up' ? "text-green-600" : 
                    metric.trend === 'down' ? "text-red-600" : "text-gray-600"
                  )}
                >
                  {metric.change}
                </span>
                <span className="text-gray-500 text-sm ml-2">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Line Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Device Usage</h3>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            <div className="mt-4 space-y-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm text-gray-600">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {[
                { id: 1, user: 'John Doe', action: 'logged in', time: '2 minutes ago', type: 'success' },
                { id: 2, user: 'Jane Smith', action: 'updated profile', time: '5 minutes ago', type: 'info' },
                { id: 3, user: 'Mike Johnson', action: 'uploaded file', time: '8 minutes ago', type: 'info' },
                { id: 4, user: 'Sarah Wilson', action: 'deleted item', time: '12 minutes ago', type: 'warning' },
                { id: 5, user: 'Tom Brown', action: 'created report', time: '15 minutes ago', type: 'success' },
              ].map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 py-2">
                  <div
                    className={clsx(
                      "w-2 h-2 rounded-full",
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    )}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span>{' '}
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPlugin;