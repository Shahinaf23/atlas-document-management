import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Color mapping for different statuses and categories
const COLORS = {
  'Approved': '#10b981',
  'Under Review': '#f59e0b',
  'Pending': '#ef4444',
  'Submitted': '#3b82f6',
  '---': '#6b7280',
  'default': '#8b5cf6'
};

interface AnalyticsChartsProps {
  data: any[];
  documents: any[];
  shopDrawings: any[];
  type: "documents" | "shop-drawings";
}

export function AnalyticsCharts({ data, documents, shopDrawings, type }: AnalyticsChartsProps) {
  // Status distribution data
  const statusCounts = data.reduce((acc: any, item: any) => {
    const status = item.currentStatus || '---';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: Number(count) || 0,
    color: COLORS[status as keyof typeof COLORS] || COLORS.default
  }));

  // Vendor/Sub-system distribution data
  const vendorCounts = data.reduce((acc: any, item: any) => {
    if (type === "documents") {
      const vendor = item.vendor || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + 1;
    } else {
      // For shop drawings, use sub-systems
      const subSystem = item.subSystem || 'General';
      acc[subSystem] = (acc[subSystem] || 0) + 1;
    }
    return acc;
  }, {});

  const vendorData = Object.entries(vendorCounts)
    .slice(0, 10) // Top 10 vendors/sub-systems
    .map(([vendor, count]) => ({
      name: vendor.length > 15 ? vendor.substring(0, 15) + '...' : vendor,
      value: Number(count) || 0,
      fullName: vendor
    }));

  // Document type distribution (for documents) or Systems distribution (for shop drawings)
  const typeCounts = data.reduce((acc: any, item: any) => {
    let itemType;
    if (type === "documents") {
      itemType = item.documentType || 'General';
    } else {
      // For shop drawings, use system instead of drawing type
      itemType = item.system || 'General';
    }
    acc[itemType] = (acc[itemType] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(typeCounts).map(([itemType, count]) => ({
    name: itemType,
    value: Number(count) || 0,
    color: COLORS[itemType as keyof typeof COLORS] || COLORS.default
  }));

  // Timeline data (submission over time)
  const timelineData = data
    .filter(item => item.submittedDate)
    .sort((a, b) => new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime())
    .reduce((acc: any[], item: any, index: number) => {
      const date = new Date(item.submittedDate).toISOString().split('T')[0];
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.cumulative = index + 1;
        existing.daily += 1;
      } else {
        acc.push({
          date,
          cumulative: index + 1,
          daily: 1
        });
      }
      return acc;
    }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-purple-600">Count: {data.value}</p>
          <p className="text-gray-600">{Math.round((data.value / (documents.length + shopDrawings.length)) * 100)}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Status Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>
            Current status breakdown for all {type === "documents" ? "documents" : "shop drawings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={CustomTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Vendor/Sub-System Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{type === "documents" ? "Top Vendors" : "Top Sub-Systems"}</CardTitle>
          <CardDescription>
            Distribution by {type === "documents" ? "vendor" : "sub-system"} (top 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold">{data.fullName}</p>
                          <p style={{ color: '#9333ea' }}>Count: {data.value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill={type === "shop-drawings" ? "#06b6d4" : "#9333ea"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Type/Systems Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{type === "documents" ? "Document Types" : "Systems Distribution"}</CardTitle>
          <CardDescription>
            Distribution by {type === "documents" ? "document type" : "system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={5}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${(index * 45) % 360}, 70%, 55%)`} />
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
                          <p className="text-gray-600">{Math.round((data.value / typeData.reduce((acc, item) => acc + item.value, 0)) * 100)}% of total</p>
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
            {typeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: `hsl(${(index * 45) % 360}, 70%, 55%)` }}
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {entry.name} {entry.value} ({Math.round((entry.value / typeData.reduce((acc, item) => acc + item.value, 0)) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Timeline</CardTitle>
          <CardDescription>
            Cumulative and daily submissions over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stackId="1"
                  stroke="#9333ea"
                  fill="#9333ea"
                  fillOpacity={0.6}
                  name="Cumulative"
                />
                <Area
                  type="monotone"
                  dataKey="daily"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                  name="Daily"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}