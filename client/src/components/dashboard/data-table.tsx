import { useState, useMemo, useCallback, useTransition, useDeferredValue } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronUp, ChevronDown } from "lucide-react";
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
    if (isPendingStatus(status)) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
    
    switch (status) {
      case "CODE1":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">CODE1</Badge>;
      case "CODE2":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">CODE2</Badge>;
      case "CODE3":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">CODE3</Badge>;
      default:
        if (status?.includes("UR") || status?.includes("AR")) {
          return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ opacity: isPending ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort(type === "documents" ? "documentId" : "drawingId")}
                  >
                    {type === "documents" ? "Document ID" : "Drawing ID"}
                    {getSortIcon(type === "documents" ? "documentId" : "drawingId")}
                  </Button>
                </th>
                <th className="text-left p-3 font-medium">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort(type === "documents" ? "title" : "drawingNumber")}
                  >
                    {type === "documents" ? "Title" : "Drawing Number"}
                    {getSortIcon(type === "documents" ? "title" : "drawingNumber")}
                  </Button>
                </th>
                {type === "documents" && (
                  <th className="text-left p-3 font-medium">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort("vendor")}
                    >
                      Vendor
                      {getSortIcon("vendor")}
                    </Button>
                  </th>
                )}
                {type === "shop-drawings" && (
                  <th className="text-left p-3 font-medium">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort("system")}
                    >
                      System
                      {getSortIcon("system")}
                    </Button>
                  </th>
                )}
                {type === "shop-drawings" && (
                  <th className="text-left p-3 font-medium">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort("subSystem")}
                    >
                      Sub-System
                      {getSortIcon("subSystem")}
                    </Button>
                  </th>
                )}
                {type === "documents" && (
                  <th className="text-left p-3 font-medium">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort("category")}
                    >
                      Category
                      {getSortIcon("category")}
                    </Button>
                  </th>
                )}
                {type === "documents" && (
                  <th className="text-left p-3 font-medium">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort("documentType")}
                    >
                      Type
                      {getSortIcon("documentType")}
                    </Button>
                  </th>
                )}

                <th className="text-left p-3 font-medium">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("currentStatus")}
                  >
                    Status
                    {getSortIcon("currentStatus")}
                  </Button>
                </th>
                <th className="text-left p-3 font-medium">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("priority")}
                  >
                    Priority
                    {getSortIcon("priority")}
                  </Button>
                </th>
                <th className="text-left p-3 font-medium">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("submittedDate")}
                  >
                    Submitted
                    {getSortIcon("submittedDate")}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((item, index) => (
                <tr 
                  key={`${type}-${index}-${type === "documents" ? item.documentId : item.drawingId}`} 
                  className={`border-b hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}`}
                >
                  <td className="p-3 font-mono text-sm">
                    {type === "documents" ? item.documentId : item.drawingId}
                  </td>
                  <td className="p-3 max-w-xs break-words whitespace-normal">
                    <div className="break-words hyphens-auto">
                      {type === "documents" ? item.title : item.drawingNumber}
                    </div>
                  </td>
                  {type === "documents" && (
                    <td className="p-3">{item.vendor}</td>
                  )}
                  {type === "shop-drawings" && (
                    <td className="p-3">{item.system}</td>
                  )}
                  {type === "shop-drawings" && (
                    <td className="p-3">{item.subSystem}</td>
                  )}
                  {type === "documents" && (
                    <td className="p-3">{item.category}</td>
                  )}
                  {type === "documents" && (
                    <td className="p-3">{item.documentType}</td>
                  )}
                  <td className="p-3">
                    {getStatusBadge(item.currentStatus)}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={
                      item.priority === "High" ? "border-red-300 text-red-800" :
                      item.priority === "Medium" ? "border-yellow-300 text-yellow-800" :
                      "border-green-300 text-green-800"
                    }>
                      {item.priority}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(item.submittedDate).toLocaleDateString()}
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