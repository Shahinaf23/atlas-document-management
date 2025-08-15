import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { isSubmittedStatusCode, isPendingStatus } from "@shared/schema";

interface OverviewCardsProps {
  documents: any[];
  shopDrawings: any[];
  type: "documents" | "shop-drawings";
  project?: string;
}

export function OverviewCards({ documents, shopDrawings, type, project = "jeddah" }: OverviewCardsProps) {
  const data = type === "documents" ? documents : shopDrawings;
  
  // FORCE CONSOLE LOG TO APPEAR EVERY TIME
  console.warn(`🚨 OVERVIEW CARDS RENDERING - ${type.toUpperCase()}:`, {
    dataLength: data.length,
    documentsLength: documents.length,
    shopDrawingsLength: shopDrawings.length,
    firstFewItems: data.slice(0, 3).map(item => ({ id: item.id, status: item.currentStatus })),
    allStatuses: Array.from(new Set(data.map(item => item.currentStatus))),
    timestamp: new Date().toISOString(),
    componentType: type
  });
  
  const total = data.length;
  const submitted = data.filter(item => {
    const status = item.currentStatus;
    return status === 'CODE1' || status === 'CODE2' || status === 'CODE3' || status === 'CODE4' ||
           status === 'Approved' || status === 'Reject with comments' || status === 'Rejected' ||
           status === 'UR (ATJV)' || status === 'UR(ATJV)' || status === 'AR (ATJV)' || status === 'AR(ATJV)' || 
           status === 'UR (DAR)' || status === 'UR(DAR)' || status === 'RTN (ATLS)' || status === 'RTN(ATLS)' || 
           status === 'RTN (AS)' || status === 'RTN(AS)' || status === 'Under review';
  }).length;
  const pending = data.filter(item => item.currentStatus === '---' || item.currentStatus === 'Pending').length;
  const code1 = data.filter(item => item.currentStatus === "CODE1").length;
  const code2 = data.filter(item => item.currentStatus === "CODE2" || item.currentStatus === "Approved").length;
  const code3 = data.filter(item => item.currentStatus === "CODE3" || item.currentStatus === "Reject with comments").length;
  const code4 = data.filter(item => item.currentStatus === "CODE4" || item.currentStatus === "Rejected").length;
  const underReviewFiltered = data.filter(item => {
    const status = item.currentStatus;
    // Include both legacy and new status formats
    const isUnderReview = status === 'UR (ATJV)' || status === 'UR(ATJV)' || 
                         status === 'UR (DAR)' || status === 'UR(DAR)' ||
                         status === 'Under review' || status === 'UR';
    return isUnderReview;
  });
  const underReview = underReviewFiltered.length;
  
  // FORCE DEBUG LOG TO ALWAYS SHOW
  if (underReview !== (type === "documents" ? 8 : 6)) {
    console.error(`❌ WRONG UNDER REVIEW COUNT - ${type.toUpperCase()}:`, {
      expected: type === "documents" ? 8 : 6,
      actual: underReview,
      sampleItems: underReviewFiltered.slice(0, 5).map(item => ({ id: item.id, status: item.currentStatus })),
      allUrStatuses: data.filter(item => item.currentStatus && item.currentStatus.includes('UR')).map(item => ({ id: item.id, status: item.currentStatus }))
    });
  }
  
  console.log(`🔍 UNDER REVIEW CARD RENDERING - ${type.toUpperCase()}:`, {
    underReviewCount: underReview,
    dataLength: data.length,
    underReviewFiltered: underReviewFiltered.map(item => ({ id: item.id, status: item.currentStatus })),
    allStatusCounts: data.reduce((acc: any, item: any) => {
      acc[item.currentStatus] = (acc[item.currentStatus] || 0) + 1;
      return acc;
    }, {}),
    componentType: type,
    timestamp: new Date().toISOString()
  });

  const title = type === "documents" ? "Documents" : "Shop Drawings";
  
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium truncate">Total {title}</CardTitle>
          <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">{total}</div>
          <p className="text-xs text-muted-foreground truncate">
            {submitted} submitted, {pending} pending
          </p>
        </CardContent>
      </Card>

      {project === 'emct' ? (
        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">CODE4</CardTitle>
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300">{code4}</div>
            <p className="text-xs text-muted-foreground truncate">
              {total > 0 ? Math.round((code4 / total) * 100) : 0}% rejected
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">CODE1</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">{code1}</div>
            <p className="text-xs text-muted-foreground truncate">
              {total > 0 ? Math.round((code1 / total) * 100) : 0}% approved
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium truncate">CODE2</CardTitle>
          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-300">{code2}</div>
          <p className="text-xs text-muted-foreground truncate">
            {total > 0 ? Math.round((code2 / total) * 100) : 0}% comments
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium truncate">CODE3</CardTitle>
          <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300">{code3}</div>
          <p className="text-xs text-muted-foreground truncate">
            {total > 0 ? Math.round((code3 / total) * 100) : 0}% {project === 'emct' && type === "documents" ? 'reject with comments' : 'revise'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium truncate">Under Review</CardTitle>
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="under-review-count">{underReview}</div>
          <p className="text-xs text-muted-foreground truncate">
            {total > 0 ? Math.round((underReview / total) * 100) : 0}% review - Data: {data.length} items
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium truncate">Pending</CardTitle>
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300">{pending}</div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? Math.round((pending / total) * 100) : 0}% of total
          </p>
        </CardContent>
      </Card>


    </div>
  );
}