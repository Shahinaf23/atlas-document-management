import { useState, useMemo, useCallback, useTransition, useDeferredValue } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronUp, ChevronDown, Eye, Edit2, Trash2, Calendar, Clock } from "lucide-react";
import { isSubmittedStatusCode, isPendingStatus } from "@shared/schema";

interface DataTableProps {
  data: any[];
  type: "documents" | "shop-drawings";
  title: string;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable({ data, type, title }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [systemFilter, setSystemFilter] = useState("all");
  const [subSystemFilter, setSubSystemFilter] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [isPending, startTransition] = useTransition();
  
  // Use deferred values for expensive operations
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const deferredVendorFilter = useDeferredValue(vendorFilter);
  const deferredSystemFilter = useDeferredValue(systemFilter);
  const deferredSubSystemFilter = useDeferredValue(subSystemFilter);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = Array.from(new Set(data.map(item => item.currentStatus).filter(Boolean)));
    return statuses.sort();
  }, [data]);

  const uniqueVendors = useMemo(() => {
    if (type === "documents") {
      const vendors = Array.from(new Set(data.map(item => item.vendor).filter(Boolean)));
      return vendors.sort();
    } else {
      const systems = Array.from(new Set(data.map(item => item.system).filter(Boolean)));
      return systems.sort();
    }
  }, [data, type]);
  
  const uniqueSystems = useMemo(() => {
    if (type === "shop-drawings") {
      const systems = Array.from(new Set(data.map(item => item.system).filter(Boolean)));
      return systems.sort();
    }
    return [];
  }, [data, type]);
  
  const uniqueSubSystems = useMemo(() => {
    if (type === "shop-drawings") {
      const subSystems = Array.from(new Set(data.map(item => item.subSystem).filter(Boolean)));
      return subSystems.sort();
    }
    return [];
  }, [data, type]);

  // Optimized filter function with early returns
  const filterData = useCallback((items: any[], search: string, status: string, vendor: string, system: string, subSystem: string) => {
    if (!items?.length) return [];
    
    const searchLower = search.toLowerCase();
    
    return items.filter(item => {
      // Early return for search
      if (search && search !== "") {
        const searchMatch = type === "documents" ? (
          item.title?.toLowerCase().includes(searchLower) ||
          item.vendor?.toLowerCase().includes(searchLower) ||
          item.documentId?.toLowerCase().includes(searchLower)
        ) : (
          item.drawingNumber?.toLowerCase().includes(searchLower) ||
          item.system?.toLowerCase().includes(searchLower) ||
          item.drawingId?.toLowerCase().includes(searchLower)
        );
        if (!searchMatch) return false;
      }
      
      // Status filter
      if (status !== "all" && item.currentStatus !== status) return false;
      
      // Vendor filter (documents only)
      if (type === "documents" && vendor !== "all" && item.vendor !== vendor) return false;
      
      // System filter (shop drawings only)
      if (type === "shop-drawings" && system !== "all" && item.system !== system) return false;
      
      // Sub-system filter (shop drawings only)  
      if (type === "shop-drawings" && subSystem !== "all" && item.subSystem !== subSystem) return false;
      
      return true;
    });
  }, [type]);

  // Filter and sort data with deferred values
  const filteredAndSortedData = useMemo(() => {
    const filtered = filterData(data, deferredSearchTerm, deferredStatusFilter, deferredVendorFilter, deferredSystemFilter, deferredSubSystemFilter);

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // Handle dates
        if (sortField === "submittedDate" || sortField === "lastUpdated") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        // Handle strings
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [filterData, data, deferredSearchTerm, deferredStatusFilter, deferredVendorFilter, deferredSystemFilter, deferredSubSystemFilter, sortField, sortDirection]);

  const handleSort = (field: string) => {
    startTransition(() => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc");
        if (sortDirection === "desc") {
          setSortField(null);
        }
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    });
  };
  
  // Optimized filter handlers with transitions
  const handleStatusFilterChange = useCallback((value: string) => {
    startTransition(() => {
      setStatusFilter(value);
    });
  }, []);
  
  const handleVendorFilterChange = useCallback((value: string) => {
    startTransition(() => {
      setVendorFilter(value);
    });
  }, []);
  
  const handleSystemFilterChange = useCallback((value: string) => {
    startTransition(() => {
      setSystemFilter(value);
    });
  }, []);
  
  const handleSubSystemFilterChange = useCallback((value: string) => {
    startTransition(() => {
      setSubSystemFilter(value);
    });
  }, []);

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortDirection === "asc") return <ChevronUp className="h-4 w-4" />;
    if (sortDirection === "desc") return <ChevronDown className="h-4 w-4" />;
    return null;
  };

  const getStatusBadge = (status: string) => {
    if (isPendingStatus(status) || status === "---") {
      return (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 transition-colors font-medium px-3 py-1">
          Pending
        </Badge>
      );
    }
    
    switch (status) {
      case "CODE1":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors font-medium px-3 py-1">
            ✓ Approved
          </Badge>
        );
      case "CODE2":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors font-medium px-3 py-1">
            ⚠ Approved w/ Comments
          </Badge>
        );
      case "CODE3":
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 transition-colors font-medium px-3 py-1">
            ↻ Revise & Resubmit
          </Badge>
        );
      case "UR(ATJV)":
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 transition-colors font-medium px-3 py-1">
            🔍 Under Review (ATJV)
          </Badge>
        );
      case "AR(ATJV)":
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors font-medium px-3 py-1">
            📋 Advance Review (ATJV)
          </Badge>
        );
      case "UR(DAR)":
        return (
          <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 transition-colors font-medium px-3 py-1">
            🔍 Under Review (DAR)
          </Badge>
        );
      case "RTN(ATLS)":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors font-medium px-3 py-1">
            ⬅ Return to Atlas
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors font-medium px-3 py-1">
            {status}
          </Badge>
        );
    }
  };

  const handleExport = () => {
    const csv = [
      // Headers
      type === "documents" 
        ? ["Document ID", "Title", "Vendor", "Category", "Type", "Status", "Priority", "Submitted Date"]
        : ["Drawing ID", "Drawing Number", "System", "Type", "Status", "Priority", "Submitted Date"],
      // Data rows
      ...filteredAndSortedData.map(item => 
        type === "documents"
          ? [item.documentId, item.title, item.vendor, item.category, item.documentType, item.currentStatus, item.priority, new Date(item.submittedDate).toLocaleDateString()]
          : [item.drawingId, item.drawingNumber, item.system, item.drawingType, item.currentStatus, item.priority, new Date(item.submittedDate).toLocaleDateString()]
      )
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {filteredAndSortedData.length} of {data.length} items
            </CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={type === "documents" ? "Search by title, vendor, or ID..." : "Search by drawing number, system, or ID..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {type === "documents" && (
            <Select value={vendorFilter} onValueChange={handleVendorFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {uniqueVendors.map(vendor => (
                  <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {type === "shop-drawings" && (
            <>
              <Select value={systemFilter} onValueChange={handleSystemFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {uniqueSystems.map(system => (
                    <SelectItem key={system} value={system}>{system}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={subSystemFilter} onValueChange={handleSubSystemFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by sub-system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Systems</SelectItem>
                  {uniqueSubSystems.map(subSystem => (
                    <SelectItem key={subSystem} value={subSystem}>{subSystem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {isPending && (
          <div className="flex items-center justify-center py-4 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white mr-2"></div>
            Filtering data...
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800">
          <table className="w-full" style={{ opacity: isPending ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent hover:text-blue-600 transition-colors"
                    onClick={() => handleSort(type === "documents" ? "documentId" : "drawingId")}
                  >
                    {type === "documents" ? "Document ID" : "Drawing ID"}
                    {getSortIcon(type === "documents" ? "documentId" : "drawingId")}
                  </Button>
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent hover:text-blue-600 transition-colors"
                    onClick={() => handleSort(type === "documents" ? "title" : "drawingNumber")}
                  >
                    Title
                    {getSortIcon(type === "documents" ? "title" : "drawingNumber")}
                  </Button>
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent hover:text-blue-600 transition-colors"
                    onClick={() => handleSort(type === "documents" ? "vendor" : "system")}
                  >
                    {type === "documents" ? "Vendor" : "System"}
                    {getSortIcon(type === "documents" ? "vendor" : "system")}
                  </Button>
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent hover:text-blue-600 transition-colors"
                    onClick={() => handleSort(type === "documents" ? "documentType" : "drawingType")}
                  >
                    Type
                    {getSortIcon(type === "documents" ? "documentType" : "drawingType")}
                  </Button>
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent hover:text-blue-600 transition-colors"
                    onClick={() => handleSort("currentStatus")}
                  >
                    Status
                    {getSortIcon("currentStatus")}
                  </Button>
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent hover:text-blue-600 transition-colors"
                      onClick={() => handleSort("submittedDate")}
                    >
                      Submission Timeline
                      {getSortIcon("submittedDate")}
                    </Button>
                  </div>
                </th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredAndSortedData.map((item, index) => (
                <tr 
                  key={`${type}-${index}-${type === "documents" ? item.documentId : item.drawingId}`} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  data-testid={`row-${type}-${type === "documents" ? item.documentId : item.drawingId}`}
                >
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                      {type === "documents" ? item.documentId : item.drawingId}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100 break-words leading-5">
                        {type === "documents" ? item.title : item.drawingNumber}
                      </div>
                      {type === "documents" && item.category && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {item.category}
                        </div>
                      )}
                      {type === "shop-drawings" && item.subSystem && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {item.subSystem}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {type === "documents" ? item.vendor : item.system}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {type === "documents" ? item.documentType : item.drawingType}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(item.currentStatus)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.submittedDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>Updated {new Date(item.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`w-fit text-xs ${
                          item.priority === "High" ? "border-red-200 text-red-700 bg-red-50" :
                          item.priority === "Medium" ? "border-yellow-200 text-yellow-700 bg-yellow-50" :
                          "border-green-200 text-green-700 bg-green-50"
                        }`}
                      >
                        {item.priority} Priority
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        data-testid={`button-view-${type === "documents" ? item.documentId : item.drawingId}`}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        data-testid={`button-edit-${type === "documents" ? item.documentId : item.drawingId}`}
                        title="Edit item"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                        data-testid={`button-delete-${type === "documents" ? item.documentId : item.drawingId}`}
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No {type === "documents" ? "documents" : "shop drawings"} found matching your filters.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}