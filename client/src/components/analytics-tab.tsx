import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = {
  CODE1: '#10b981',
  CODE2: '#3b82f6', 
  CODE3: '#f59e0b',
  'UR(ATJV)': '#8b5cf6',
  'AR(ATJV)': '#ec4899',
  'UR(DAR)': '#ef4444',
  'RTN(ATLS)': '#6366f1',
  '---': '#94a3b8'
};

export default function AnalyticsTab() {
  const { data: statusDistribution, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/analytics/status-distribution'],
  });

  const { data: vendorPerformance, isLoading: vendorLoading } = useQuery({
    queryKey: ['/api/analytics/vendor-performance'],
  });

  const { data: overview } = useQuery({
    queryKey: ['/api/analytics/overview'],
  });

  // Transform data for charts
  const statusChartData = statusDistribution ? Object.entries(statusDistribution).map(([status, count]) => ({
    status: status === '---' ? 'Pending' : status,
    count: Number(count) || 0,
    fill: COLORS[status as keyof typeof COLORS] || '#94a3b8'
  })) : [];

  const vendorChartData = vendorPerformance ? Object.entries(vendorPerformance).map(([vendor, count]) => ({
    vendor,
    count: Number(count) || 0,
    approvalRate: Math.floor(Math.random() * 30 + 70) // Mock approval rate
  })) : [];

  // Mock timeline data - in real implementation, this would come from API
  const timelineData = [
    { week: 'Week 1', submitted: 12, approved: 8, pending: 4 },
    { week: 'Week 2', submitted: 19, approved: 15, pending: 4 },
    { week: 'Week 3', submitted: 15, approved: 12, pending: 3 },
    { week: 'Week 4', submitted: 25, approved: 20, pending: 5 },
    { week: 'Week 5', submitted: 22, approved: 18, pending: 4 },
    { week: 'Week 6', submitted: 18, approved: 15, pending: 3 },
  ];

  if (statusLoading || vendorLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Code Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Status Code Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {statusChartData.length > 0 ? (
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No status data available
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Vendor Document Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {vendorChartData.length > 0 ? (
                  <BarChart data={vendorChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="vendor" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No vendor data available
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Document Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {statusChartData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No status data available
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Approval Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Vendor Approval Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {vendorChartData.length > 0 ? (
                  <BarChart data={vendorChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="vendor" type="category" width={120} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Approval Rate']} />
                    <Bar dataKey="approvalRate" fill="#10b981" />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No vendor data available
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Submission Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Document Submission Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="submitted" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  name="Submitted"
                />
                <Line 
                  type="monotone" 
                  dataKey="approved" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Approved"
                />
                <Line 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  name="Pending"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {overview?.activeDocuments || 0}
            </div>
            <p className="text-sm text-gray-600">Active Documents</p>
            <p className="text-xs text-green-600 mt-1">
              {((overview?.activeDocuments || 0) / (overview?.totalDocuments || 1) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {overview?.pendingDocuments || 0}
            </div>
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="text-xs text-yellow-600 mt-1">
              {((overview?.pendingDocuments || 0) / (overview?.totalDocuments || 1) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {overview?.underReview || 0}
            </div>
            <p className="text-sm text-gray-600">Under Review</p>
            <p className="text-xs text-blue-600 mt-1">
              {((overview?.underReview || 0) / (overview?.totalDocuments || 1) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
