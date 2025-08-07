import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DisciplineChartProps {
  documents: any[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function DisciplineChart({ documents }: DisciplineChartProps) {
  // Create status distribution based on actual document statuses
  const statusDistribution = documents.reduce((acc: Record<string, number>, doc: any) => {
    let status = doc.currentStatus || '---';
    
    // Map status codes to simple names
    const statusMapping: Record<string, string> = {
      'Code 1': 'CODE1',
      'Code 2': 'CODE2', 
      'Code 3': 'CODE3',
      'UR (ATJV)': 'UR(ATJV)',
      'AR (ATJV)': 'AR(ATJV)',
      'UR (DAR)': 'UR(DAR)',
      'RTN (ATLS)': 'RTN(ATLS)',
      '---': 'Pending',
      'Pending': 'Pending'
    };
    
    // Use mapped status name or original if no mapping found
    const statusName = statusMapping[status] || status;
    
    // Only count valid statuses
    if (statusName && statusName.length > 1) {
      acc[statusName] = (acc[statusName] || 0) + 1;
    }
    
    return acc;
  }, {});

  const disciplineData = Object.entries(statusDistribution)
    .map(([status, count]) => ({
      name: status.replace(' - ', '\n'),
      fullName: status,
      value: count
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.payload.fullName}</p>
          <p className="text-purple-600">{data.value} documents</p>
          <p className="text-gray-600 text-sm">
            {((data.value / documents.length) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${name}`}
      </text>
    );
  };

  return (
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
                data={disciplineData}
                cx="50%"
                cy="45%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={false}
              >
                {disciplineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={CustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend at bottom */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {disciplineData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {entry.fullName} {entry.value} ({Math.round((entry.value / documents.length) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}