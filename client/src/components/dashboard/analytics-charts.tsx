import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Color mapping for different statuses and categories
const COLORS = {
  'Approved': '#10b981',
  'CODE2': '#10b981', // EMCT specific
  'CODE3': '#f97316', // EMCT specific  
  'CODE4': '#3b82f6', // EMCT specific
  'Under review': '#f59e0b', // EMCT specific
  'Under Review': '#f59e0b',
  'Pending': '#ef4444',
  'PENDING': '#ef4444', // EMCT specific
  'Reject with comments': '#f97316', // EMCT specific
  'Rejected': '#dc2626', // EMCT specific
  'Submitted': '#3b82f6',
  '---': '#6b7280',
  'default': '#8b5cf6'
};

interface AnalyticsChartsProps {
  data: any[];
  documents: any[];
  shopDrawings: any[];
  type: "documents" | "shop-drawings";
  project?: string;
}

export function AnalyticsCharts({ data, documents, shopDrawings, type, project = "jeddah" }: AnalyticsChartsProps) {
  // For EMCT documents, we swap the data - first chart shows disciplines, second shows status
  const isEMCTDocs = project === 'emct' && type === "documents";
  
  // Status distribution data (or discipline data for EMCT first chart)
  const firstChartCounts = data.reduce((acc: any, item: any) => {
    const key = isEMCTDocs ? (item.discipline || 'CODE4') : (item.currentStatus || '---');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(firstChartCounts).map(([key, count]) => ({
    name: key,
    value: Number(count) || 0,
    color: COLORS[key as keyof typeof COLORS] || COLORS.default
  }));

  // Discipline distribution data (replacing vendor for EMCT documents)
  const disciplineCounts = data.reduce((acc: any, item: any) => {
    if (type === "documents") {
      if (project === 'emct') {
        // For EMCT, use discipline instead of vendor
        const discipline = item.discipline || 'General';
        acc[discipline] = (acc[discipline] || 0) + 1;
      } else {
        // For Jeddah, keep vendor logic
        const vendor = item.vendor || 'Unknown';
        acc[vendor] = (acc[vendor] || 0) + 1;
      }
    } else {
      // For shop drawings, use sub-systems
      const subSystem = item.subSystem || 'General';
      acc[subSystem] = (acc[subSystem] || 0) + 1;
    }
    return acc;
  }, {});

  const vendorData = Object.entries(disciplineCounts)
    .slice(0, 10) // Top 10 disciplines/vendors/sub-systems
    .map(([name, count]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      value: Number(count) || 0,
      fullName: name
    }));

  // Document type distribution (for documents) or Systems distribution (for shop drawings)
  // For EMCT documents, second chart shows status codes instead of disciplines
  const secondChartCounts = data.reduce((acc: any, item: any) => {
    let itemType;
    if (type === "documents") {
      if (project === 'emct') {
        // For EMCT second chart, use status codes
        itemType = item.currentStatus || 'PENDING';
      } else {
        // For Jeddah, use documentType
        itemType = item.documentType || 'General';
      }
    } else {
      // For shop drawings, use system instead of drawing type
      itemType = item.system || 'General';
    }
    acc[itemType] = (acc[itemType] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(secondChartCounts).map(([itemType, count]) => ({
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
          <CardTitle>
            {project === 'emct' && type === "documents" ? "Status Code Distribution" : "Status Distribution"}
          </CardTitle>
          <CardDescription>
            {project === 'emct' && type === "documents" 
              ? "Status code breakdown for all documents"
              : `Current status breakdown for all ${type === "documents" ? "documents" : "shop drawings"}`
            }
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

      {/* Vendor/Sub-System Distribution Bar Chart - Hidden for EMCT documents */}
      {!(project === 'emct' && type === "documents") && (
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
      )}

      {/* Type/Systems Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>
            {type === "documents" 
              ? (project === 'emct' ? "Discipline Types" : "Document Types")
              : "Systems Distribution"
            }
          </CardTitle>
          <CardDescription>
            Distribution by {type === "documents" 
              ? (project === 'emct' ? "discipline" : "document type")
              : "system"
            }
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