import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

const COLORS = {
  // Status colors
  'CODE1': '#10b981', 'Approved': '#10b981',
  'CODE2': '#f59e0b', 'Pending': '#f59e0b',
  'CODE3': '#ef4444', 'Reject with comments': '#ef4444',
  'CODE4': '#dc2626', 'Rejected': '#dc2626',
  'Under review': '#8b5cf6', 'UR': '#8b5cf6',
  'UR (ATJV)': '#8b5cf6', 'UR(ATJV)': '#8b5cf6',
  'UR (DAR)': '#8b5cf6', 'UR(DAR)': '#8b5cf6',
  'AR (ATJV)': '#10b981', 'AR(ATJV)': '#10b981',
  'RTN (ATLS)': '#f59e0b', 'RTN(ATLS)': '#f59e0b',
  'RTN (AS)': '#f59e0b', 'RTN(AS)': '#f59e0b',
  'General': '#6b7280',
  
  // Document Type colors (vibrant colors for South Terminal charts)
  'PQ': '#ef4444', // Red
  'MTS': '#d97706', // Orange/Gold  
  'MST': '#22c55e', // Green
  'ITP': '#8b5cf6', // Purple
  'TCD': '#8b5cf6', // Purple
  'Warranty': '#d97706', // Orange
  'BL': '#22c55e', // Green
  'SDD': '#06b6d4', // Cyan
  'OMM': '#ec4899', // Pink
  'OTM': '#ef4444', // Red
  'ICD': '#3b82f6', // Blue
  
  // System colors for shop drawings
  'CNE': '#ef4444', // Red
  'SCN': '#22c55e', // Green
  'BCE': '#3b82f6', // Blue
  'IDS': '#8b5cf6', // Purple
  'BRS': '#06b6d4', // Cyan
  'FIDS': '#ec4899', // Pink
  'CCTV': '#d97706', // Orange
  'PA': '#10b981', // Emerald
  'WIFI': '#f59e0b', // Amber
  
  'default': '#6b7280'
};

// Color palette for charts that need distinct colors - matching the reference image
const CHART_COLORS = [
  '#ef4444', // Red for PQ
  '#d97706', // Gold/Orange for MTS
  '#22c55e', // Green for MST 
  '#8b5cf6', // Purple for ITP
  '#06b6d4', // Cyan for SDD
  '#ec4899', // Pink for OMM
  '#3b82f6', // Blue for ICD
  '#10b981', // Emerald for BL
  '#f59e0b', // Amber for Warranty
  '#84cc16', // Lime for TCD
  '#ef4444', // Red for OTM
  '#22c55e'  // Green (duplicate for additional types)
];

interface AnalyticsChartsProps {
  data: any[];
  documents: any[];
  shopDrawings: any[];
  type: "documents" | "shop-drawings";
  project?: string;
}

export function AnalyticsCharts({ data, documents, shopDrawings, type, project = "jeddah" }: AnalyticsChartsProps) {
  const isEMCTDocs = project === 'emct' && type === "documents";
  
  // First chart data - For EMCT: Discipline types, For others: Status distribution
  const firstChartCounts = data.reduce((acc: any, item: any) => {
    let key;
    if (isEMCTDocs) {
      // For EMCT, use discipline for the first chart
      key = item.discipline || 'General';
      // Filter out CODE4 as requested
      if (key === 'CODE4') key = 'General';
    } else {
      key = item.currentStatus || '---';
    }
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(firstChartCounts).map(([key, count]) => ({
    name: key,
    value: Number(count) || 0,
    color: COLORS[key as keyof typeof COLORS] || COLORS.default
  }));

  // Document Type distribution data (for EMCT second chart) or vendor data (for others)
  const docTypeCounts = data.reduce((acc: any, item: any) => {
    if (type === "documents") {
      if (project === 'emct') {
        // For EMCT, use documentType (PQ, HSE PLAN, BASELINE, etc.)
        const docType = item.documentType || 'Unknown';
        acc[docType] = (acc[docType] || 0) + 1;
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

  const vendorData = Object.entries(docTypeCounts)
    .slice(0, 10) // Top 10 document types/vendors/sub-systems
    .map(([name, count]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      value: Number(count) || 0,
      fullName: name
    }));

  // Status distribution for third EMCT chart with EMCT-specific labeling
  const statusCounts = data.reduce((acc: any, item: any) => {
    let status = item.currentStatus || 'Pending';
    
    // For EMCT, map status codes to descriptive labels
    if (project === 'emct' && type === "documents") {
      switch(status) {
        case 'CODE2':
          status = 'Approved';
          break;
        case 'CODE3':
          status = 'Reject with comments';
          break;
        case 'CODE4':
          status = 'Rejected';
          break;
        case 'UR DAR':
        case 'UR(DAR)':
        case 'UR (DAR)':
          status = 'Under review';
          break;
        default:
          // Keep original status for other values
          break;
      }
    }
    
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusDistributionData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: Number(count) || 0,
    color: COLORS[status as keyof typeof COLORS] || COLORS.default
  }));

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

  // Document type/systems distribution (third chart for non-EMCT)
  const typeDistributionCounts = data.reduce((acc: any, item: any) => {
    let itemType;
    if (type === "documents") {
      // For documents, use documentType
      itemType = item.documentType || 'General';
    } else {
      // For shop drawings, use system
      itemType = item.system || 'General';
    }
    acc[itemType] = (acc[itemType] || 0) + 1;
    return acc;
  }, {});

  const typeDistributionData = Object.entries(typeDistributionCounts).map(([itemType, count], index) => {
    const color = COLORS[itemType as keyof typeof COLORS] || CHART_COLORS[index % CHART_COLORS.length];
    return {
      name: itemType,
      value: Number(count) || 0,
      color: color
    };
  });

  return (
    <div className={`grid gap-6 ${project === 'emct' && type === "documents" ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
      {/* First Chart - For EMCT: Discipline Types (Bar), For Others: Status Distribution (Pie) */}
      <Card>
        <CardHeader>
          <CardTitle>
            {project === 'emct' && type === "documents" ? "Discipline Types" : "Status Distribution"}
          </CardTitle>
          <CardDescription>
            {project === 'emct' && type === "documents" 
              ? "Distribution by discipline type"
              : `Current status breakdown for all ${type === "documents" ? "documents" : "shop drawings"}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {project === 'emct' && type === "documents" ? (
                <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                            <p className="font-semibold">{data.name}</p>
                            <p style={{ color: '#9333ea' }}>Count: {data.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              ) : (
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
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Second Chart - For EMCT: Document Types (Bar), For Others: Top Vendors/Sub-Systems (Bar) */}
      <Card>
        <CardHeader>
          <CardTitle>
            {project === 'emct' && type === "documents" ? "Document Types" : (type === "documents" ? "Top Vendors" : "Top Sub-Systems")}
          </CardTitle>
          <CardDescription>
            {project === 'emct' && type === "documents" 
              ? "Distribution by document type (PQ, HSE PLAN, BASELINE, etc.)"
              : `Distribution by ${type === "documents" ? "vendor" : "sub-system"} (top 10)`
            }
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

      {/* Third Chart - For EMCT: Status Code Distribution, For Others: Document Types/Systems Distribution */}
      {project === 'emct' && type === "documents" ? (
        <Card>
          <CardHeader>
            <CardTitle>Status Code Distribution</CardTitle>
            <CardDescription>
              Current status breakdown for all documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={CustomTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {type === "documents" ? "Document Types" : "Systems Distribution"}
            </CardTitle>
            <CardDescription>
              Distribution by {type === "documents" ? "document type" : "system"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {typeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={CustomTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fourth Chart - Submission Timeline (For both South Terminal and EMCT) */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submission Timeline</CardTitle>
            <CardDescription>
              Cumulative submissions over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}