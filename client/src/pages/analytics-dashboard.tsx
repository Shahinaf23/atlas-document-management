import { useQuery } from "@tanstack/react-query";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { DisciplineChart } from "@/components/discipline-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, TrendingUp, Users, Clock, Target, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { isSubmittedStatusCode, isPendingStatus } from "@shared/schema";

export default function AnalyticsDashboard() {
  const { data: documentsData = [], isLoading: documentsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['/api/documents'],
    refetchInterval: 300000, // 5 minutes - less aggressive
    staleTime: 180000, // Consider data fresh for 3 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  const { data: shopDrawingsData = [], isLoading: shopDrawingsLoading, refetch: refetchShopDrawings } = useQuery({
    queryKey: ['/api/shop-drawings'],
    refetchInterval: 300000, // 5 minutes - less aggressive
    staleTime: 180000, // Consider data fresh for 3 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  const { data: activitiesData = [] } = useQuery({
    queryKey: ['/api/activities'],
    refetchInterval: 600000, // 10 minutes for activities
    staleTime: 300000, // Consider data fresh for 5 minutes
    gcTime: 1200000, // Keep in cache for 20 minutes
  });

  const isLoading = documentsLoading || shopDrawingsLoading;

  const handleRefresh = async () => {
    try {
      // Refresh Excel data on the server
      const response = await fetch('/api/refresh-excel', { method: 'POST' });
      if (response.ok) {
        // Then refetch the frontend data
        refetchDocuments();
        refetchShopDrawings();
        console.log('✅ Excel data refreshed successfully');
      } else {
        console.error('❌ Failed to refresh Excel data');
      }
    } catch (error) {
      console.error('❌ Error refreshing Excel data:', error);
    }
  };

  // Type-safe data arrays
  const documents = Array.isArray(documentsData) ? documentsData : [];
  const shopDrawings = Array.isArray(shopDrawingsData) ? shopDrawingsData : [];
  const activities = Array.isArray(activitiesData) ? activitiesData : [];
  
  console.log('ANALYTICS DASHBOARD DEBUG:', {
    documentsLength: documents.length,
    shopDrawingsLength: shopDrawings.length,
    documentsStatuses: Array.from(new Set(documents.map((d: any) => d.currentStatus))),
    shopDrawingsStatuses: Array.from(new Set(shopDrawings.map((sd: any) => sd.currentStatus))),
    shopDrawingsUrCount: shopDrawings.filter((sd: any) => sd.currentStatus === 'UR (ATJV)' || sd.currentStatus === 'UR (DAR)').length
  });

  // Combined analytics data with correct status logic
  const totalItems = documents.length + shopDrawings.length;
  
  // Status counts based on the converted status codes from Excel service (includes both documents and shop drawings)
  const code1Count = documents.filter((d: any) => d.currentStatus === 'CODE1').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'CODE1').length;
  const code2Count = documents.filter((d: any) => d.currentStatus === 'CODE2').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'CODE2').length;
  const code3Count = documents.filter((d: any) => d.currentStatus === 'CODE3').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'CODE3').length;
  const urAtjvCount = documents.filter((d: any) => d.currentStatus === 'UR (ATJV)').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'UR (ATJV)').length;
  const arAtjvCount = documents.filter((d: any) => d.currentStatus === 'AR (ATJV)').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'AR (ATJV)').length;
  const urDarCount = documents.filter((d: any) => d.currentStatus === 'UR (DAR)').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'UR (DAR)').length;
  const rtnAtlsCount = documents.filter((d: any) => d.currentStatus === 'RTN (ATLS)').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'RTN (ATLS)').length;
  const rtnAsCount = documents.filter((d: any) => d.currentStatus === 'RTN (AS)').length + shopDrawings.filter((sd: any) => sd.currentStatus === 'RTN (AS)').length;
  const pendingCount = documents.filter((d: any) => d.currentStatus === 'Pending').length;
  
  // Shop drawings status counts (using same logic as documents)
  const submittedShopDrawings = shopDrawings.filter((sd: any) => {
    const status = sd.currentStatus;
    return status === 'CODE1' || status === 'CODE2' || status === 'CODE3' || 
           status === 'UR (ATJV)' || status === 'AR (ATJV)' || status === 'UR (DAR)' || status === 'RTN (ATLS)' || status === 'RTN (AS)';
  }).length;
  
  const pendingShopDrawings = shopDrawings.filter((sd: any) => sd.currentStatus === 'Pending').length;
  
  // Calculate totals - all status codes except Pending are submitted (counts already include both documents and shop drawings)
  const totalSubmitted = code1Count + code2Count + code3Count + urAtjvCount + arAtjvCount + urDarCount + rtnAtlsCount + rtnAsCount;
  const totalPending = pendingCount + pendingShopDrawings;
  
  // Under Review counts (specifically UR statuses) - FIXED LOGIC
  const underReviewDocuments = documents.filter((d: any) => {
    const status = d.currentStatus;
    return status === 'UR (ATJV)' || status === 'UR (DAR)';
  }).length;
  const underReviewShopDrawings = shopDrawings.filter((sd: any) => {
    const status = sd.currentStatus;
    return status === 'UR (ATJV)' || status === 'UR (DAR)';
  }).length;
  const totalUnderReview = underReviewDocuments + underReviewShopDrawings;
  
  console.log('UNDER REVIEW ANALYTICS DEBUG:', {
    underReviewDocuments,
    underReviewShopDrawings,
    totalUnderReview,
    documentUrItems: documents.filter((d: any) => d.currentStatus === 'UR (ATJV)' || d.currentStatus === 'UR (DAR)').map(d => ({id: d.id, status: d.currentStatus})),
    shopDrawingUrItems: shopDrawings.filter((sd: any) => sd.currentStatus === 'UR (ATJV)' || sd.currentStatus === 'UR (DAR)').map(sd => ({id: sd.id, status: sd.currentStatus}))
  });

  // Performance metrics (approved documents)
  const documentSuccess = documents.length > 0 ? 
    (documents.filter((d: any) => d.currentStatus === "CODE1" || d.currentStatus === "CODE2").length / documents.length) * 100 : 0;
  const shopDrawingSuccess = shopDrawings.length > 0 ? 
    (shopDrawings.filter((sd: any) => sd.currentStatus === "CODE1" || sd.currentStatus === "CODE2").length / shopDrawings.length) * 100 : 0;

  // Status distribution data - showing all document status codes cleanly
  const statusDistributionData = [
    {
      name: 'CODE1',
      fullName: 'CODE1 - Approved',
      count: code1Count,
      color: '#10b981', // green
      percentage: totalItems > 0 ? Math.round((code1Count / totalItems) * 100) : 0
    },
    {
      name: 'CODE2', 
      fullName: 'CODE2 - Approved with Comments',
      count: code2Count,
      color: '#3b82f6', // blue
      percentage: totalItems > 0 ? Math.round((code2Count / totalItems) * 100) : 0
    },
    {
      name: 'CODE3',
      fullName: 'CODE3 - Revise and Resubmit', 
      count: code3Count,
      color: '#f59e0b', // amber
      percentage: totalItems > 0 ? Math.round((code3Count / totalItems) * 100) : 0
    },
    {
      name: 'UR (ATJV)',
      fullName: 'UR (ATJV) - Under Review by ATJV',
      count: urAtjvCount,
      color: '#8b5cf6', // purple
      percentage: totalItems > 0 ? Math.round((urAtjvCount / totalItems) * 100) : 0
    },
    {
      name: 'AR (ATJV)',
      fullName: 'AR (ATJV) - Approved Review by ATJV',
      count: arAtjvCount,
      color: '#06b6d4', // cyan
      percentage: totalItems > 0 ? Math.round((arAtjvCount / totalItems) * 100) : 0
    },
    {
      name: 'UR (DAR)',
      fullName: 'UR (DAR) - Under Review by DAR',
      count: urDarCount,
      color: '#ec4899', // pink
      percentage: totalItems > 0 ? Math.round((urDarCount / totalItems) * 100) : 0
    },
    {
      name: 'RTN(ATLS)',
      fullName: 'RTN(ATLS) - Return to ATLS',
      count: rtnAtlsCount,
      color: '#f97316', // orange
      percentage: totalItems > 0 ? Math.round((rtnAtlsCount / totalItems) * 100) : 0
    },
    {
      name: 'RTN(AS)',
      fullName: 'RTN(AS) - Return to AS',
      count: rtnAsCount,
      color: '#84cc16', // lime
      percentage: totalItems > 0 ? Math.round((rtnAsCount / totalItems) * 100) : 0
    },
    {
      name: 'Pending',
      fullName: 'Pending - Not Yet Submitted',
      count: totalPending,
      color: '#6b7280', // gray
      percentage: totalItems > 0 ? Math.round((totalPending / totalItems) * 100) : 0
    }
  ].filter(item => item.count > 0); // Only show statuses that have documents

  // Real submission trends - calculated from actual Excel submission dates
  // Shows submission patterns from real Excel data:
  // - Document Submittal: ATLAS_LATEST_SUB_DATE column 
  // - Shop Drawing: SUBMISSION DTAE column
  
  // Find the actual date range from Excel data
  const allDates = [
    ...documents.map((d: any) => d.submittedDate).filter(Boolean),
    ...shopDrawings.map((sd: any) => sd.submittedDate).filter(Boolean)
  ].map(date => new Date(date)).filter(date => !isNaN(date.getTime()));
  
  // Group submissions by date from real Excel data
  const submissionsByDate: Record<string, { documents: number; shopDrawings: number }> = {};
  [...documents, ...shopDrawings].forEach((item: any) => {
    if (item.submittedDate) {
      try {
        const dateStr = new Date(item.submittedDate).toISOString().split('T')[0];
        if (!submissionsByDate[dateStr]) {
          submissionsByDate[dateStr] = { documents: 0, shopDrawings: 0 };
        }
        if (item.documentId) {
          submissionsByDate[dateStr].documents++;
        } else {
          submissionsByDate[dateStr].shopDrawings++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  });
  
  // Show the most recent 7 dates with submissions (real data)
  const weeklyData = Object.entries(submissionsByDate)
    .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
    .slice(0, 7) // Take the 7 most recent dates
    .reverse() // Show oldest to newest
    .map(([dateStr, counts]: [string, any]) => {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        documents: counts.documents,
        shopDrawings: counts.shopDrawings,
        total: counts.documents + counts.shopDrawings
      };
    });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {documents.length} documents, {shopDrawings.length} shop drawings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalSubmitted}</div>
            <p className="text-xs text-muted-foreground">
              Documents in review process
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalPending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting submission
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totalUnderReview}</div>
            <p className="text-xs text-muted-foreground">
              {underReviewDocuments} documents, {underReviewShopDrawings} shop drawings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>
              Current status breakdown for all documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="45%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    label={false}
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold">{data.fullName}</p>
                            <p className="text-purple-600">Count: {data.count}</p>
                            <p className="text-gray-600">{data.percentage}% of total</p>
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
              {statusDistributionData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {entry.name} {entry.count} ({entry.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document vs Shop Drawing Status Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Document Types Overview</CardTitle>
            <CardDescription>
              Distribution of documents vs shop drawings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[
                    { type: 'Documents', count: documents.length, color: '#8b5cf6' },
                    { type: 'Shop Drawings', count: shopDrawings.length, color: '#06b6d4' }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold">{data.type}</p>
                            <p className="text-purple-600">Count: {data.count}</p>
                            <p className="text-gray-600">{Math.round((data.count / totalItems) * 100)}% of total</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count">
                    {[
                      { type: 'Documents', count: documents.length, color: '#8b5cf6' },
                      { type: 'Shop Drawings', count: shopDrawings.length, color: '#06b6d4' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{documents.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Documents</div>
              </div>
              <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{shopDrawings.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Shop Drawings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Submission Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Submission Trends (Last 7 Days)</CardTitle>
          <CardDescription>
            Real document submissions extracted from Excel files by date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip 
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold">{label}</p>
                          <p className="text-purple-600">Documents: {payload[0]?.value || 0}</p>
                          <p className="text-cyan-600">Shop Drawings: {payload[1]?.value || 0}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="documents" 
                  stackId="1" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6}
                  name="Documents Submitted"
                />
                <Area 
                  type="monotone" 
                  dataKey="shopDrawings" 
                  stackId="1" 
                  stroke="#06b6d4" 
                  fill="#06b6d4" 
                  fillOpacity={0.6}
                  name="Shop Drawings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>




    </div>
  );
}