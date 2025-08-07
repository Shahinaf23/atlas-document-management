import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Filter, Download, Upload, Eye, Edit, FileDown, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ShopDrawing } from "@shared/schema";

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'CODE1':
      return 'default'; // green
    case 'CODE2':
      return 'secondary'; // blue
    case 'CODE3':
      return 'destructive'; // yellow/orange
    case 'UR(ATJV)':
    case 'UR (ATJV)':
    case 'AR(ATJV)':
    case 'AR (ATJV)':
    case 'UR(DAR)':
    case 'UR (DAR)':
      return 'outline'; // purple/blue
    case 'RTN(ATLS)':
    case 'RTN (ATLS)':
    case 'RTN(AS)':
    case 'RTN (AS)':
      return 'destructive'; // red
    case '---':
      return 'secondary'; // gray
    default:
      return 'secondary';
  }
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'CODE1':
      return 'Approved';
    case 'CODE2':
      return 'Approved with Comments';
    case 'CODE3':
      return 'Revise and Resubmit';
    case 'UR(ATJV)':
    case 'UR (ATJV)':
      return 'Under Review (ATJV)';
    case 'AR(ATJV)':
    case 'AR (ATJV)':
      return 'Advance Review (ATJV)';
    case 'UR(DAR)':
    case 'UR (DAR)':
      return 'Under Review (DAR)';
    case 'RTN(ATLS)':
    case 'RTN (ATLS)':
      return 'Return to Atlas';
    case 'RTN(AS)':
    case 'RTN (AS)':
      return 'Return to AS';
    case '---':
      return 'Pending';
    default:
      return status;
  }
};

export default function ShopDrawingsTab() {
  const [filters, setFilters] = useState({
    status: '',
    drawingType: '',
    revision: '',
    priority: '',
    search: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const { data: shopDrawings, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/shop-drawings', filters],
    queryFn: async () => {
      console.log('FETCHING SHOP DRAWINGS - API CALL STARTED', { filters });
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'search') {
          params.append(key, value);
        }
      });
      
      const finalUrl = `/api/shop-drawings?${params}`;
      console.log('FETCHING FROM URL:', finalUrl);
      const response = await fetch(finalUrl);
      if (!response.ok) {
        console.log('FETCH FAILED:', response.status, response.statusText);
        throw new Error('Failed to fetch shop drawings');
      }
      const data = await response.json();
      console.log('SHOP DRAWINGS API RESPONSE:', { 
        isArray: Array.isArray(data), 
        length: data?.length || 0,
        firstItem: data?.[0],
        urItems: data?.filter((d: any) => d.currentStatus === 'UR (ATJV)' || d.currentStatus === 'UR (DAR)')?.length || 0
      });
      return data;
    }
  });

  // Debug logging when shop drawings data changes
  useEffect(() => {
    console.log('SHOP DRAWINGS useEffect TRIGGERED:', {
      shopDrawingsExists: !!shopDrawings,
      shopDrawingsType: typeof shopDrawings,
      shopDrawingsLength: shopDrawings?.length || 0,
      isLoading,
      error: error?.message || 'none'
    });
    if (error) {
      console.error('SHOP DRAWINGS QUERY ERROR:', error);
    }
    if (shopDrawings) {
      const urCount = shopDrawings.filter((d: ShopDrawing) => {
        const status = d.currentStatus;
        // Only include actual "Under Review" statuses, NOT "Advanced Review" (AR)
        return status === 'UR (ATJV)' || status === 'UR(ATJV)' || 
               status === 'UR (DAR)' || status === 'UR(DAR)';
      }).length;
      console.log('SHOP DRAWINGS DEBUG:', {
        shopDrawingsReceived: shopDrawings.length,
        urDrawingsCount: urCount,
        urDrawings: shopDrawings.filter((d: ShopDrawing) => {
          const status = d.currentStatus;
          // Only include actual "Under Review" statuses, NOT "Advanced Review" (AR)
          return status === 'UR (ATJV)' || status === 'UR(ATJV)' || 
                 status === 'UR (DAR)' || status === 'UR(DAR)';
        }),
        allStatuses: Array.from(new Set(shopDrawings.map((d: ShopDrawing) => d.currentStatus))),
        firstFewDrawings: shopDrawings.slice(0, 3).map((d: ShopDrawing) => ({ id: d.id, status: d.currentStatus }))
      });
    } else {
      console.log('SHOP DRAWINGS IS NULL/UNDEFINED in useEffect');
    }
  }, [shopDrawings, isLoading, error]);

  const filteredDrawings = shopDrawings?.filter((drawing: any) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      drawing.drawingId?.toLowerCase().includes(searchLower) ||
      drawing.drawingNumber?.toLowerCase().includes(searchLower) ||
      drawing.drawingType?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      drawingType: '',
      revision: '',
      priority: '',
      search: '',
    });
  };

  const handleExport = () => {
    window.open('/api/export/shop-drawings', '_blank');
    toast({
      title: "Export Started",
      description: "Your shop drawings export will download shortly.",
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/import/shop-drawings', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Import failed');
        
        const result = await response.json();
        toast({
          title: "Import Successful",
          description: result.message,
        });
        
        refetch();
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Please check your file format and try again.",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const uniqueTypes = Array.from(new Set(shopDrawings?.map((drawing: ShopDrawing) => drawing.drawingType).filter(Boolean) || [])) as string[];
  const uniqueRevisions = Array.from(new Set(shopDrawings?.map((drawing: any) => drawing.revision || '0').filter(Boolean) || [])) as string[];

  // Calculate status counts for overview cards - use all shop drawings, not filtered
  const allDrawings = shopDrawings || [];
  const totalDrawings = allDrawings.length;
  const submittedDrawings = allDrawings.filter((drawing: ShopDrawing) => 
    drawing.currentStatus && drawing.currentStatus !== '---' && drawing.currentStatus !== 'Pending'
  ).length;
  const pendingDrawings = allDrawings.filter((drawing: ShopDrawing) => 
    drawing.currentStatus === '---' || drawing.currentStatus === 'Pending'
  ).length;
  const underReviewDrawings = allDrawings.filter((drawing: ShopDrawing) => 
    drawing.currentStatus && (drawing.currentStatus === 'UR (ATJV)' || drawing.currentStatus === 'UR (DAR)')
  ).length;

  // Removed debug logging for performance

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drawings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalDrawings}</div>
            <p className="text-xs text-muted-foreground">
              Shop drawings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{submittedDrawings}</div>
            <p className="text-xs text-muted-foreground">
              In review process
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{pendingDrawings}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting submission
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {(() => {
                if (isLoading) return 'Loading...';
                if (!shopDrawings) return '0';
                const urDrawings = shopDrawings.filter((d: ShopDrawing) => d.currentStatus === 'UR (ATJV)' || d.currentStatus === 'UR (DAR)');
                console.log('SHOP DRAWING UR CARD RENDER:', { 
                  shopDrawingsLength: shopDrawings.length, 
                  urDrawingsLength: urDrawings.length,
                  urDrawings: urDrawings.map((d: ShopDrawing) => ({ id: d.id, status: d.currentStatus }))
                });
                return urDrawings.length;
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Being reviewed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search shop drawings..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {Object.values(filters).some(v => v) && (
                  <Badge variant="secondary" className="ml-1">
                    {Object.values(filters).filter(v => v).length}
                  </Badge>
                )}
              </Button>
              
              <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              
              <Button onClick={handleImport} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Excel
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Drawing Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="CODE1">CODE1 - Approved</SelectItem>
                      <SelectItem value="CODE2">CODE2 - Approved with Comments</SelectItem>
                      <SelectItem value="CODE3">CODE3 - Revise and Resubmit</SelectItem>
                      <SelectItem value="UR(ATJV)">UR(ATJV) - Under Review with ATJV</SelectItem>
                      <SelectItem value="---">--- - Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Drawing Type</Label>
                  <Select value={filters.drawingType} onValueChange={(value) => handleFilterChange('drawingType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      {uniqueTypes.map((type: string) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Revision</Label>
                  <Select value={filters.revision} onValueChange={(value) => handleFilterChange('revision', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Revisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Revisions</SelectItem>
                      {uniqueRevisions.map((revision: string) => (
                        <SelectItem key={revision} value={revision}>{revision}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Priority</Label>
                  <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-3">
                <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shop Drawing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Shop Drawing Logs</span>
            <span className="text-sm font-normal text-gray-600">
              {filteredDrawings.length} drawing{filteredDrawings.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="loading-spinner" />
            </div>
          ) : filteredDrawings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No shop drawings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drawing ID</TableHead>
                    <TableHead>Drawing Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrawings.map((drawing: ShopDrawing) => (
                    <TableRow key={drawing.id} className="table-row">
                      <TableCell className="font-medium">{drawing.drawingId}</TableCell>
                      <TableCell className="max-w-xs break-words whitespace-normal">
                        <div className="break-words hyphens-auto" title={(drawing as any).drawingNumber || 'N/A'}>
                          {(drawing as any).drawingNumber || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{drawing.drawingType}</TableCell>
                      <TableCell>{(drawing as any).revision || '0'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(drawing.currentStatus || '---')}>
                          {getStatusDisplay(drawing.currentStatus || '---')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          drawing.priority === 'high' ? 'destructive' :
                          drawing.priority === 'medium' ? 'secondary' : 'outline'
                        }>
                          {drawing.priority?.charAt(0).toUpperCase() + drawing.priority?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {drawing.submittedDate ? new Date(drawing.submittedDate).toLocaleDateString() : 'Not submitted'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4 text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <FileDown className="w-4 h-4 text-green-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
