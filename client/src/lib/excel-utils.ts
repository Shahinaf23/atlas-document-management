import * as XLSX from 'xlsx';
import type { InsertDocument, InsertShopDrawing } from '@shared/schema';

export interface ExcelParseResult<T> {
  data: T[];
  errors: string[];
  warnings: string[];
}

export interface DocumentExcelRow {
  'Document ID'?: string;
  'DOCUMENT ID'?: string;
  'Title'?: string;
  'TITLE'?: string;
  'Vendor'?: string;
  'VENDOR'?: string;
  'Document Type'?: string;
  'TYPE'?: string;
  'Current Status'?: string;
  'CURRENT STATUS'?: string;
  'LATEST STATUS'?: string;
  'Submitted Date'?: string;
  'SUBMITTED DATE'?: string;
  'Priority'?: string;
  'PRIORITY'?: string;
}

export interface ShopDrawingExcelRow {
  'Drawing ID'?: string;
  'DRAWING ID'?: string;
  'Title'?: string;
  'TITLE'?: string;
  'Drawing Type'?: string;
  'TYPE'?: string;
  'Revision'?: string;
  'REV'?: string;
  'Current Status'?: string;
  'CURRENT STATUS'?: string;
  'LATEST STATUS'?: string;
  'Submitted Date'?: string;
  'SUBMITTED DATE'?: string;
  'Priority'?: string;
  'PRIORITY'?: string;
}

/**
 * Parse Excel file buffer and extract document data
 */
export function parseDocumentsFromExcel(buffer: ArrayBuffer): ExcelParseResult<InsertDocument> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const documents: InsertDocument[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    if (workbook.SheetNames.length === 0) {
      errors.push('No sheets found in the Excel file');
      return { data: [], errors, warnings };
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: DocumentExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      warnings.push('No data rows found in the Excel sheet');
      return { data: [], errors, warnings };
    }

    rawData.forEach((row, index) => {
      const rowNumber = index + 2; // Excel rows start at 1, plus header row
      
      try {
        // Extract document ID with fallbacks
        const documentId = row['Document ID'] || 
                          row['DOCUMENT ID'] || 
                          `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Extract title with fallbacks
        const title = row['Title'] || row['TITLE'] || 'Untitled Document';
        
        // Extract vendor with fallbacks
        const vendor = row['Vendor'] || row['VENDOR'] || 'Unknown Vendor';
        
        // Extract document type with fallbacks
        const documentType = row['Document Type'] || row['TYPE'] || 'General';
        
        // Extract status with fallbacks
        const currentStatus = row['Current Status'] || 
                             row['CURRENT STATUS'] || 
                             row['LATEST STATUS'] || 
                             '---';
        
        // Extract submitted date with fallbacks
        const submittedDateStr = row['Submitted Date'] || row['SUBMITTED DATE'];
        let submittedDate: Date;
        
        if (submittedDateStr) {
          const parsed = new Date(submittedDateStr);
          if (isNaN(parsed.getTime())) {
            warnings.push(`Row ${rowNumber}: Invalid date format "${submittedDateStr}", using current date`);
            submittedDate = new Date();
          } else {
            submittedDate = parsed;
          }
        } else {
          warnings.push(`Row ${rowNumber}: No submitted date found, using current date`);
          submittedDate = new Date();
        }
        
        // Extract priority with fallbacks
        const priority = row['Priority'] || row['PRIORITY'] || 'medium';
        
        // Validate required fields
        if (!title.trim()) {
          warnings.push(`Row ${rowNumber}: Empty title, using "Untitled Document"`);
        }
        
        if (!vendor.trim()) {
          warnings.push(`Row ${rowNumber}: Empty vendor, using "Unknown Vendor"`);
        }
        
        // Validate status codes
        const validStatusCodes = ['CODE1', 'CODE2', 'CODE3', 'UR(ATJV)', 'AR(ATJV)', 'UR(DAR)', 'RTN(ATLS)', '---'];
        if (!validStatusCodes.includes(currentStatus)) {
          warnings.push(`Row ${rowNumber}: Unknown status code "${currentStatus}", document may not display correctly`);
        }
        
        // Validate priority
        const validPriorities = ['high', 'medium', 'low'];
        const normalizedPriority = priority.toLowerCase();
        if (!validPriorities.includes(normalizedPriority)) {
          warnings.push(`Row ${rowNumber}: Invalid priority "${priority}", using "medium"`);
        }

        const document: InsertDocument = {
          documentId: documentId.trim(),
          title: title.trim(),
          vendor: vendor.trim(),
          documentType: documentType.trim(),
          currentStatus: currentStatus.trim(),
          submittedDate,
          priority: validPriorities.includes(normalizedPriority) ? normalizedPriority : 'medium'
        };

        documents.push(document);
        
      } catch (rowError) {
        errors.push(`Row ${rowNumber}: Failed to parse - ${rowError.message}`);
      }
    });

    // Check for duplicate document IDs
    const documentIds = new Set();
    documents.forEach((doc, index) => {
      if (documentIds.has(doc.documentId)) {
        warnings.push(`Duplicate document ID found: ${doc.documentId}`);
      }
      documentIds.add(doc.documentId);
    });

  } catch (error) {
    errors.push(`Failed to parse Excel file: ${error.message}`);
  }

  return { data: documents, errors, warnings };
}

/**
 * Parse Excel file buffer and extract shop drawing data
 */
export function parseShopDrawingsFromExcel(buffer: ArrayBuffer): ExcelParseResult<InsertShopDrawing> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const shopDrawings: InsertShopDrawing[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    if (workbook.SheetNames.length === 0) {
      errors.push('No sheets found in the Excel file');
      return { data: [], errors, warnings };
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: ShopDrawingExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      warnings.push('No data rows found in the Excel sheet');
      return { data: [], errors, warnings };
    }

    rawData.forEach((row, index) => {
      const rowNumber = index + 2; // Excel rows start at 1, plus header row
      
      try {
        // Extract drawing ID with fallbacks
        const drawingId = row['Drawing ID'] || 
                         row['DRAWING ID'] || 
                         `SD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Extract title with fallbacks
        const title = row['Title'] || row['TITLE'] || 'Untitled Drawing';
        
        // Extract drawing type with fallbacks
        const drawingType = row['Drawing Type'] || row['TYPE'] || 'General';
        
        // Extract revision with fallbacks
        const revision = row['Revision'] || row['REV'] || 'Rev 0';
        
        // Extract status with fallbacks
        const currentStatus = row['Current Status'] || 
                             row['CURRENT STATUS'] || 
                             row['LATEST STATUS'] || 
                             '---';
        
        // Extract submitted date with fallbacks
        const submittedDateStr = row['Submitted Date'] || row['SUBMITTED DATE'];
        let submittedDate: Date;
        
        if (submittedDateStr) {
          const parsed = new Date(submittedDateStr);
          if (isNaN(parsed.getTime())) {
            warnings.push(`Row ${rowNumber}: Invalid date format "${submittedDateStr}", using current date`);
            submittedDate = new Date();
          } else {
            submittedDate = parsed;
          }
        } else {
          warnings.push(`Row ${rowNumber}: No submitted date found, using current date`);
          submittedDate = new Date();
        }
        
        // Extract priority with fallbacks
        const priority = row['Priority'] || row['PRIORITY'] || 'medium';
        
        // Validate required fields
        if (!title.trim()) {
          warnings.push(`Row ${rowNumber}: Empty title, using "Untitled Drawing"`);
        }
        
        // Validate status codes
        const validStatusCodes = ['CODE1', 'CODE2', 'CODE3', 'UR(ATJV)', 'AR(ATJV)', 'UR(DAR)', 'RTN(ATLS)', '---'];
        if (!validStatusCodes.includes(currentStatus)) {
          warnings.push(`Row ${rowNumber}: Unknown status code "${currentStatus}", drawing may not display correctly`);
        }
        
        // Validate priority
        const validPriorities = ['high', 'medium', 'low'];
        const normalizedPriority = priority.toLowerCase();
        if (!validPriorities.includes(normalizedPriority)) {
          warnings.push(`Row ${rowNumber}: Invalid priority "${priority}", using "medium"`);
        }

        const shopDrawing: InsertShopDrawing = {
          drawingId: drawingId.trim(),
          title: title.trim(),
          drawingType: drawingType.trim(),
          revision: revision.trim(),
          currentStatus: currentStatus.trim(),
          submittedDate,
          priority: validPriorities.includes(normalizedPriority) ? normalizedPriority : 'medium'
        };

        shopDrawings.push(shopDrawing);
        
      } catch (rowError) {
        errors.push(`Row ${rowNumber}: Failed to parse - ${rowError.message}`);
      }
    });

    // Check for duplicate drawing IDs
    const drawingIds = new Set();
    shopDrawings.forEach((drawing, index) => {
      if (drawingIds.has(drawing.drawingId)) {
        warnings.push(`Duplicate drawing ID found: ${drawing.drawingId}`);
      }
      drawingIds.add(drawing.drawingId);
    });

  } catch (error) {
    errors.push(`Failed to parse Excel file: ${error.message}`);
  }

  return { data: shopDrawings, errors, warnings };
}

/**
 * Export documents to Excel buffer
 */
export function exportDocumentsToExcel(documents: any[]): ArrayBuffer {
  const exportData = documents.map(doc => ({
    'Document ID': doc.documentId,
    'Title': doc.title,
    'Vendor': doc.vendor,
    'Document Type': doc.documentType,
    'Current Status': doc.currentStatus,
    'Submitted Date': new Date(doc.submittedDate).toISOString().split('T')[0],
    'Last Updated': new Date(doc.lastUpdated).toISOString().split('T')[0],
    'Priority': doc.priority,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

/**
 * Export shop drawings to Excel buffer
 */
export function exportShopDrawingsToExcel(shopDrawings: any[]): ArrayBuffer {
  const exportData = shopDrawings.map(drawing => ({
    'Drawing ID': drawing.drawingId,
    'Title': drawing.title,
    'Drawing Type': drawing.drawingType,
    'Revision': drawing.revision,
    'Current Status': drawing.currentStatus,
    'Submitted Date': new Date(drawing.submittedDate).toISOString().split('T')[0],
    'Last Updated': new Date(drawing.lastUpdated).toISOString().split('T')[0],
    'Priority': drawing.priority,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Shop Drawings");

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

/**
 * Validate Excel file format and structure
 */
export function validateExcelFile(file: File): Promise<{ isValid: boolean; errors: string[] }> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    
    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
      errors.push('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size too large. Maximum allowed size is 10MB');
    }
    
    if (errors.length > 0) {
      resolve({ isValid: false, errors });
      return;
    }
    
    // Try to read the file to validate structure
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        if (workbook.SheetNames.length === 0) {
          errors.push('No sheets found in the Excel file');
        }
        
        resolve({ isValid: errors.length === 0, errors });
      } catch (error) {
        errors.push(`Failed to read Excel file: ${error.message}`);
        resolve({ isValid: false, errors });
      }
    };
    
    reader.onerror = () => {
      errors.push('Failed to read the selected file');
      resolve({ isValid: false, errors });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate status code statistics from documents
 */
export function generateStatusStats(data: Array<{ currentStatus: string }>) {
  const stats = data.reduce((acc, item) => {
    const status = item.currentStatus;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = data.length;
  const submitted = data.filter(item => item.currentStatus !== '---').length;
  const pending = data.filter(item => item.currentStatus === '---').length;

  return {
    stats,
    total,
    submitted,
    pending,
    submittedPercentage: total > 0 ? Math.round((submitted / total) * 100) : 0,
    pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Check if status code represents a submitted document
 */
export function isSubmittedStatus(status: string): boolean {
  return status !== '---' && status.trim() !== '';
}

/**
 * Check if status code represents a pending document
 */
export function isPendingStatus(status: string): boolean {
  return status === '---' || status.trim() === '';
}

/**
 * Get human-readable status display name
 */
export function getStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    'CODE1': 'Approved',
    'CODE2': 'Approved with Comments',
    'CODE3': 'Revise and Resubmit',
    'UR(ATJV)': 'Under Review (ATJV)',
    'AR(ATJV)': 'Advance Review (ATJV)',
    'UR(DAR)': 'Under Review (DAR)',
    'RTN(ATLS)': 'Return to Atlas',
    '---': 'Pending'
  };
  
  return statusMap[status] || status;
}
