import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, Clock, Search, Users, TrendingUp, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const COLORS = {
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  red: '#ef4444',
  gray: '#6b7280'
};

export default function OverviewTab() {
  const { data: documentsData = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents'],
    refetchInterval: 300000, // 5 minutes - consistent with dashboards
    staleTime: 180000, // Consider data fresh for 3 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  const { data: shopDrawingsData = [], isLoading: shopDrawingsLoading } = useQuery({
    queryKey: ['/api/shop-drawings'],
    refetchInterval: 300000, // 5 minutes - consistent with dashboards
    staleTime: 180000, // Consider data fresh for 3 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  const { data: activities } = useQuery({
    queryKey: ['/api/activities'],
    refetchInterval: 600000, // 10 minutes for activities
    staleTime: 300000, // Consider data fresh for 5 minutes
    gcTime: 1200000, // Keep in cache for 20 minutes
  });

  const documents = Array.isArray(documentsData) ? documentsData : [];
  const shopDrawings = Array.isArray(shopDrawingsData) ? shopDrawingsData : [];
  const isLoading = documentsLoading || shopDrawingsLoading;

  // Show skeleton only if no data at all
  if (isLoading && documents.length === 0) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate real-time status counts from Excel data
  const statusCounts = documents.reduce((acc: Record<string, number>, doc: any) => {
    let status = doc.currentStatus || '---';
    // Normalize --- to Pending for consistency
    if (status === '---') {
      status = 'Pending';
    }
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name === '---' ? 'Pending' : name,
    value,
    color: name === 'Code 1' ? COLORS.green : 
           name === 'Code 2' ? COLORS.blue :
           name === 'Code 3' ? COLORS.yellow :
           name.includes('UR') ? COLORS.purple :
           name === '---' ? COLORS.gray : COLORS.red
  }));

  // Calculate real-time metrics from Excel data with proper status matching
  const totalDocuments = documents.length;
  
  // Removed excessive debug logging for performance
  
  // Use the same logic as statusCounts for consistency
  const code1Count = statusCounts['Code 1'] || 0;
  const code2Count = statusCounts['Code 2'] || 0;
  const code3Count = statusCounts['Code 3'] || 0;
  const pendingCount = (statusCounts['---'] || 0) + (statusCounts['Pending'] || 0);
  const underReviewCount = (statusCounts['UR (ATJV)'] || 0) + (statusCounts['AR (ATJV)'] || 0) + (statusCounts['UR (DAR)'] || 0);
  
  // Removed debug logging for performance

  const monthlyData = [
    { month: 'Jan', submitted: 45, approved: 38 },
    { month: 'Feb', submitted: 52, approved: 43 },
    { month: 'Mar', submitted: 48, approved: 41 },
    { month: 'Apr', submitted: 61, approved: 52 },
    { month: 'May', submitted: 55, approved: 47 },
    { month: 'Jun', submitted: 67, approved: 58 },
  ];

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Real-time Status Cards from Excel Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-purple-700">{totalDocuments}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalDocuments - pendingCount} submitted, {pendingCount} pending
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileCheck className="text-purple-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CODE1 (Approved)</p>
                <p className="text-3xl font-bold text-green-700">{code1Count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalDocuments > 0 ? Math.round((code1Count / totalDocuments) * 100) : 0}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FileCheck className="text-green-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CODE2 (With Comments)</p>
                <p className="text-3xl font-bold text-blue-700">{code2Count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalDocuments > 0 ? Math.round((code2Count / totalDocuments) * 100) : 0}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileCheck className="text-blue-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CODE3 (Revise)</p>
                <p className="text-3xl font-bold text-red-700">{code3Count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalDocuments > 0 ? Math.round((code3Count / totalDocuments) * 100) : 0}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FileCheck className="text-red-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Under Review</p>
                <p className="text-3xl font-bold text-yellow-700">{underReviewCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalDocuments > 0 ? Math.round((underReviewCount / totalDocuments) * 100) : 0}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-gray-700">{pendingCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalDocuments > 0 ? Math.round((pendingCount / totalDocuments) * 100) : 0}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Users className="text-gray-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Document Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-purple-600">Count: {data.value}</p>
                            <p className="text-gray-600">{Math.round((data.value / totalDocuments) * 100)}% of total</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend at bottom */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
              {statusData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {entry.name} {entry.value} ({Math.round((entry.value / totalDocuments) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Submissions Log - Scrollable */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Document Submissions Log
            </CardTitle>
            <CardDescription>
              Latest documents from Excel files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto border rounded-lg p-2">
              <div className="space-y-2">
                {(documents || [])
                .slice(0, 20)
                .map((doc: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        doc.currentStatus === 'Code 1' ? 'bg-green-500' :
                        doc.currentStatus === 'Code 2' ? 'bg-blue-500' :
                        doc.currentStatus === 'Code 3' ? 'bg-red-500' :
                        doc.currentStatus === '---' || doc.currentStatus === 'Pending' ? 'bg-gray-400' :
                        'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.documentNo || 'N/A'}</p>
                        <p className="text-xs text-gray-600">{doc.documentType || 'General'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{doc.currentStatus === '---' || doc.currentStatus === 'Pending' ? 'Pending' : doc.currentStatus || 'Pending'}</p>
                      <p className="text-xs text-gray-500">{doc.vendor || 'Unknown'}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-gray-500 py-8">
                    <p>No documents available</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shop Drawings Submissions Log - Scrollable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Shop Drawings Submissions Log
          </CardTitle>
          <CardDescription>
            Latest shop drawings from Excel files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] overflow-y-auto border rounded-lg p-2">
            <div className="space-y-2">
              {(shopDrawings || []).slice(0, 20).map((drawing: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      drawing.currentStatus === 'Code 1' ? 'bg-green-500' :
                      drawing.currentStatus === 'Code 2' ? 'bg-blue-500' :
                      drawing.currentStatus === 'Code 3' ? 'bg-red-500' :
                      drawing.currentStatus === '---' ? 'bg-gray-400' :
                      'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{drawing.drawingNo || 'N/A'}</p>
                      <p className="text-xs text-gray-600">{drawing.documentType || 'General'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{drawing.currentStatus === '---' ? 'Pending' : drawing.currentStatus || 'Pending'}</p>
                    <p className="text-xs text-gray-500">Rev {drawing.revision || '0'}</p>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  <p>No shop drawings available</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
