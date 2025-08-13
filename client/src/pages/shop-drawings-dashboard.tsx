import { useQuery } from "@tanstack/react-query";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { DataTable } from "@/components/dashboard/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, TrendingUp, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopDrawingsDashboardProps {
  project?: string;
}

export default function ShopDrawingsDashboard({ project = "jeddah" }: ShopDrawingsDashboardProps) {
  const shopDrawingsEndpoint = project === 'emct' ? '/api/emct/shop-drawings' : '/api/shop-drawings';
  
  const { data: shopDrawings = [], isLoading, error, refetch } = useQuery({
    queryKey: [shopDrawingsEndpoint],
    enabled: true,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: activitiesData = [] } = useQuery({
    queryKey: ['/api/activities'],
    refetchInterval: 600000, // 10 minutes for activities
    staleTime: 300000, // Consider data fresh for 5 minutes
    gcTime: 1200000, // Keep in cache for 20 minutes
    refetchOnMount: false, // Don't refetch activities on mount - use cache for faster load
  });

  const handleRefresh = async () => {
    try {
      // Refresh Excel data on the server based on project
      const refreshEndpoint = project === 'emct' ? '/api/emct/refresh' : '/api/refresh-excel';
      const response = await fetch(refreshEndpoint, { method: 'POST' });
      if (response.ok) {
        // Then refetch the frontend data
        refetch();
        console.log('✅ Excel data refreshed successfully for', project);
      } else {
        console.error('❌ Failed to refresh Excel data for', project);
      }
    } catch (error) {
      console.error('❌ Error refreshing Excel data:', error);
    }
  };

  const activities = Array.isArray(activitiesData) ? activitiesData : [];
  const recentActivities = activities
    .filter((activity: any) => activity.type === 'shop_drawing')
    .slice(0, 5);

  // Skeleton components for loading states
  const SkeletonOverview = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const SkeletonChart = () => (
    <Card>
      <CardHeader>
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse">
          <div className="bg-gray-200 rounded h-[280px]"></div>
        </div>
      </CardContent>
    </Card>
  );

  const SkeletonTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>Shop Drawings Submissions Log</CardTitle>
        <CardDescription>
          Real-time shop drawing tracking from Excel files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-y-auto border rounded-lg">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    console.error('Shop drawings dashboard error:', error);
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <PenTool className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Failed to Load Shop Drawings
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">

      {/* Overview Cards */}
      {isLoading ? (
        <SkeletonOverview />
      ) : (
        <OverviewCards 
          documents={[]} 
          shopDrawings={Array.isArray(shopDrawings) ? shopDrawings : []} 
          type="shop-drawings" 
        />
      )}

      {/* Analytics Charts */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Analytics & Insights
          </h2>
        </div>
        {isLoading ? (
          <SkeletonChart />
        ) : (
          <AnalyticsCharts 
            data={Array.isArray(shopDrawings) ? shopDrawings : []}
            documents={[]} 
            shopDrawings={Array.isArray(shopDrawings) ? shopDrawings : []} 
            type="shop-drawings" 
          />
        )}
      </div>

      {/* Shop Drawings Submissions Log - Scrollable */}
      {isLoading ? (
        <SkeletonTable />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Shop Drawings Submissions Log</CardTitle>
            <CardDescription>
              Real-time shop drawing tracking from Excel files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto border rounded-lg">
              <DataTable 
                data={Array.isArray(shopDrawings) ? shopDrawings : []} 
                type="shop-drawings" 
                title="" 
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}