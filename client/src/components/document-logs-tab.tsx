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
import type { Document } from "@shared/schema";

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
      return 'Under Review by ATJV';
    case 'AR(ATJV)':
    case 'AR (ATJV)':
      return 'Advanced Review by ATJV';
    case 'UR(DAR)':
    case 'UR (DAR)':
      return 'Under Review by DAR';
    case 'RTN(ATLS)':
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

export default function DocumentLogsTab() {
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    vendor: '',
    documentType: '',
    search: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const { data: documents, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/documents', filters],
    queryFn: async () => {
      console.log('FETCHING DOCUMENTS - API CALL STARTED', { filters });
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'search') {
          params.append(key, value);
        }
      });
      
      const finalUrl = `/api/documents?${params}`;
      console.log('FETCHING FROM URL:', finalUrl);
      const response = await fetch(finalUrl);
      if (!response.ok) {
        console.log('FETCH FAILED:', response.status, response.statusText);
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      console.log('DOCUMENTS API RESPONSE:', { 
        isArray: Array.isArray(data), 
        length: data?.length || 0,
        firstItem: data?.[0],
        urItems: data?.filter((d: any) => d.currentStatus === 'UR (ATJV)' || d.currentStatus === 'UR (DAR)')?.length || 0
      });
      return data;
    }
  });

  // Debug logging when documents data changes
  useEffect(() => {
    console.log('DOCUMENT LOGS useEffect TRIGGERED:', {
      documentsExists: !!documents,
      documentsType: typeof documents,
      documentsLength: documents?.length || 0,
      isLoading,
      error: error?.message || 'none'
    });
    if (error) {
      console.error('DOCUMENT QUERY ERROR:', error);
    }
    if (documents) {
      const urCount = documents.filter((d: Document) => {
        const status = d.currentStatus;
        // Only include actual "Under Review" statuses, NOT "Advanced Review" (AR)
        return status === 'UR (ATJV)' || status === 'UR(ATJV)' || 
               status === 'UR (DAR)' || status === 'UR(DAR)';
      }).length;
      console.log('DOCUMENT LOGS DEBUG:', {
        documentsReceived: documents.length,
        urDocsCount: urCount,
        urDocuments: documents.filter((d: Document) => {
          const status = d.currentStatus;
          // Only include actual "Under Review" statuses, NOT "Advanced Review" (AR)
          return status === 'UR (ATJV)' || status === 'UR(ATJV)' || 
                 status === 'UR (DAR)' || status === 'UR(DAR)';
        }),
        allStatuses: Array.from(new Set(documents.map((d: Document) => d.currentStatus))),
        firstFewDocuments: documents.slice(0, 3).map((d: Document) => ({ id: d.id, status: d.currentStatus }))
      });
    } else {
      console.log('DOCUMENTS IS NULL/UNDEFINED in useEffect');
    }
  }, [documents, isLoading, error]);

  const filteredDocuments = documents?.filter((doc: Document) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      doc.documentId.toLowerCase().includes(searchLower) ||
      doc.title.toLowerCase().includes(searchLower) ||
      doc.vendor.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateRange: '',
      vendor: '',
      documentType: '',
      search: '',
    });
  };

  const handleExport = () => {
    window.open('/api/export/documents', '_blank');
    toast({
      title: "Export Started",
      description: "Your document export will download shortly.",
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
        const response = await fetch('/api/import/documents', {
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

  const uniqueVendors = Array.from(new Set(documents?.map((doc: Document) => doc.vendor).filter(Boolean) || [])) as string[];
  const uniqueTypes = Array.from(new Set(documents?.map((doc: Document) => doc.documentType).filter(Boolean) || [])) as string[];

  // Calculate status counts for overview cards - use all documents, not filtered
  const allDocuments = documents || [];
  const totalDocuments = allDocuments.length;
  const submittedDocuments = allDocuments.filter((doc: Document) => 
    doc.currentStatus && doc.currentStatus !== '---' && doc.currentStatus !== 'Pending'
  ).length;
  const pendingDocuments = allDocuments.filter((doc: Document) => 
    doc.currentStatus === '---' || doc.currentStatus === 'Pending'
  ).length;
  const underReviewDocuments = allDocuments.filter((doc: Document) => 
    doc.currentStatus && (doc.currentStatus === 'UR (ATJV)' || doc.currentStatus === 'UR (DAR)')
  ).length;

  // Removed debug logging for performance

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Document submissions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{submittedDocuments}</div>
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
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{pendingDocuments}</div>
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
                console.log('DOCUMENT CARD RENDER - IIFE CALLED:', { isLoading, documentsExists: !!documents });
                if (isLoading) {
                  console.log('RETURNING Loading...');
                  return 'Loading...';
                }
                if (!documents) {
                  console.log('RETURNING 0 - documents is null/undefined');
                  return '0';
                }
                console.log('PROCESSING DOCUMENTS:', { documentsLength: documents.length });
                const urDocs = documents.filter((d: Document) => d.currentStatus === 'UR (ATJV)' || d.currentStatus === 'UR (DAR)');
                console.log('DOCUMENT UR CARD RENDER:', { 
                  documentsLength: documents.length, 
                  urDocsLength: urDocs.length,
                  urDocs: urDocs.map((d: Document) => ({ id: d.id, status: d.currentStatus }))
                });
                console.log('RETURNING:', urDocs.length);
                return urDocs.length;
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
                  placeholder="Search documents..."
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
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="CODE1">CODE1 - Approved</SelectItem>
                      <SelectItem value="CODE2">CODE2 - Approved with Comments</SelectItem>
                      <SelectItem value="CODE3">CODE3 - Revise and Resubmit</SelectItem>
                      <SelectItem value="UR (ATJV)">UR (ATJV) - Under Review with ATJV</SelectItem>
                      <SelectItem value="AR (ATJV)">AR (ATJV) - Advance Review with ATJV</SelectItem>
                      <SelectItem value="UR (DAR)">UR (DAR) - Under Review with DAR</SelectItem>
                      <SelectItem value="RTN(ATLS)">RTN(ATLS) - Return to Atlas</SelectItem>
                      <SelectItem value="RTN (AS)">RTN (AS) - Return to AS</SelectItem>
                      <SelectItem value="---">--- - Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Vendor</Label>
                  <Select value={filters.vendor} onValueChange={(value) => handleFilterChange('vendor', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Vendors</SelectItem>
                      {uniqueVendors.map((vendor: string) => (
                        <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Document Type</Label>
                  <Select value={filters.documentType} onValueChange={(value) => handleFilterChange('documentType', value)}>
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
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Date Range</Label>
                  <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
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

      {/* Document Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Document Logs</span>
            <span className="text-sm font-normal text-gray-600">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="loading-spinner" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No documents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submission Timeline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document: Document) => (
                    <TableRow key={document.id} className="table-row">
                      <TableCell className="font-medium">{document.documentId}</TableCell>
                      <TableCell className="max-w-xs break-words whitespace-normal">
                        <div className="break-words hyphens-auto" title={document.title}>
                          {document.title}
                        </div>
                      </TableCell>
                      <TableCell>{document.vendor}</TableCell>
                      <TableCell>{document.documentType}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(document.currentStatus || '---')}>
                          {getStatusDisplay(document.currentStatus || '---')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {document.submittedDate ? 
                              new Date(document.submittedDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 
                              'Not submitted'
                            }
                          </span>
                          <span className="text-xs text-gray-500">
                            {document.submittedDate ? 
                              `${Math.floor((new Date().getTime() - new Date(document.submittedDate).getTime()) / (1000 * 60 * 60 * 24))} days ago` :
                              'Pending submission'
                            }
                          </span>
                        </div>
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
