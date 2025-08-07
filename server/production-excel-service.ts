import { readFile } from 'fs/promises';
import { join } from 'path';
import * as xlsx from 'xlsx';

export interface ExcelColumnMapping {
  [key: string]: string[];
}

export interface DataExtractionResult {
  success: boolean;
  data: any[];
  totalRows: number;
  processedRows: number;
  headerRow: number;
  columns: any[];
  errors: string[];
}

export class ProductionExcelService {
  private documentsCache: any[] = [];
  private shopDrawingsCache: any[] = [];
  private lastRefresh: Date = new Date(0);
  private readonly refreshInterval = 30000; // 30 seconds

  // Intelligent column mapping - detects any column structure
  private static readonly SMART_DOCUMENT_PATTERNS = {
    serialNumber: /^(sn|s\.n|serial|no|number|id|index|\d+)$/i,
    documentType: /^(document\s*type|doc\s*type|doctype|type|category)$/i,
    documentName: /^(document\s*name|doc_name|name|title|description|document)$/i,
    vendor: /^(vendor|vendor_name|vendor\s*name|supplier|company|contractor)$/i,
    system: /^(system|sys|package)$/i,
    discipline: /^(discipline|disc|department|field|area)$/i,
    category: /^(category|categories|cat|class|group)$/i,
    currentStatus: /^(current_status|current\s*status|status|document\s*recod|docr|state|condition)$/i,
    submissionDate: /^(sub\s*date|atlas_latest_sub_date|submission\s*date|sub_date|date|submitted|created)$/i
  };

  private static readonly SMART_SHOP_DRAWING_PATTERNS = {
    serialNumber: /^(sn|s\.n|serial|no|number|id|index|\d+)$/i,
    system: /^(system|sys|package|main\s*system)$/i,
    subSystem: /^(sub[-_\s]*system|subsystem|sub\s*system|sub[-_]sys)$/i,
    projectNumber: /^(project\s*number|project_number|project\s*no|project|job\s*no)$/i,
    building: /^(building|buildning|building\s*name|structure|facility)$/i,
    floor: /^(floor|floor\s*level|level|story)$/i,
    drawingNumber: /^(drawing\s*number|drawing_number|dwg\s*no|dwg_no|drawing|dwg)$/i,
    drawingType: /^(drawing\s*type|type|dwg\s*type|kind|classification)$/i,
    currentStatus: /^(latest\s*status|current\s*status|status|state|condition)$/i,
    submissionDate: /^(sub\s*date|atlas_latest_sub_date|submission\s*date|sub_date|date|submitted|created)$/i
  };

  async getDocuments(): Promise<any[]> {
    await this.maybeRefresh();
    return this.documentsCache;
  }

  async getShopDrawings(): Promise<any[]> {
    await this.maybeRefresh();
    return this.shopDrawingsCache;
  }

  async forceRefresh(): Promise<void> {
    console.log('🔄 [PRODUCTION] Force refreshing Excel data...');
    try {
      await this.loadDocumentSubmittals();
      await this.loadShopDrawings();
      this.lastRefresh = new Date();
      console.log('✅ [PRODUCTION] Excel data refreshed successfully');
    } catch (error) {
      console.error('❌ [PRODUCTION] Error refreshing Excel data:', error);
    }
  }

  async refreshAfterUpload(): Promise<{ documents: number; shopDrawings: number }> {
    await this.forceRefresh();
    return {
      documents: this.documentsCache.length,
      shopDrawings: this.shopDrawingsCache.length,
    };
  }

  async validateAndExtractExcel(filePath: string, fileType: 'document' | 'shop_drawing'): Promise<DataExtractionResult> {
    try {
      const buffer = await readFile(filePath);
      const workbook = xlsx.read(buffer, { type: 'buffer', cellFormula: false, cellHTML: false });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];

      console.log(`🔍 [PRODUCTION] Analyzing ${fileType} file structure...`);
      console.log(`📊 Total rows: ${rawData.length}`);

      const patterns = fileType === 'document' 
        ? ProductionExcelService.SMART_DOCUMENT_PATTERNS 
        : ProductionExcelService.SMART_SHOP_DRAWING_PATTERNS;

      // Intelligent header detection
      const headerResult = this.smartDetectHeaderRow(rawData, patterns);
      if (!headerResult.success) {
        return {
          success: false,
          data: [],
          totalRows: rawData.length,
          processedRows: 0,
          headerRow: -1,
          columns: [],
          errors: [`Failed to detect header row: ${headerResult.error}`]
        };
      }

      console.log(`🗂️ [PRODUCTION] Column mapping for ${fileType}:`, headerResult.columnMap);

      // Extract data using dynamic column mapping
      const extractionResult = this.extractDataFromRows(
        rawData, 
        headerResult.headerRowIndex, 
        headerResult.columnMap, 
        fileType
      );

      return {
        success: true,
        data: extractionResult.data,
        totalRows: rawData.length,
        processedRows: extractionResult.processedRows,
        headerRow: headerResult.headerRowIndex,
        columns: headerResult.headers,
        errors: extractionResult.errors
      };

    } catch (error) {
      return {
        success: false,
        data: [],
        totalRows: 0,
        processedRows: 0,
        headerRow: -1,
        columns: [],
        errors: [`Excel processing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private smartDetectHeaderRow(rawData: any[][], patterns: { [key: string]: RegExp }): {
    success: boolean;
    headerRowIndex: number;
    headers: any[];
    columnMap: { [key: string]: number };
    error?: string;
  } {
    // Look for header row in first 25 rows
    for (let i = 0; i < Math.min(rawData.length, 25); i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      // Check if this row contains intelligent patterns
      const columnMap = this.buildSmartColumnMap(row, patterns);
      
      if (Object.keys(columnMap).length >= 2) { // At least 2 columns mapped intelligently
        console.log(`📋 [PRODUCTION] Smart header detected at row ${i}:`, row.slice(0, 10));
        console.log(`🗂️ [PRODUCTION] Smart column mapping:`, columnMap);
        
        return {
          success: true,
          headerRowIndex: i,
          headers: row,
          columnMap,
        };
      }
    }

    return {
      success: false,
      headerRowIndex: -1,
      headers: [],
      columnMap: {},
      error: 'No valid header row found with intelligent pattern matching'
    };
  }

  private buildSmartColumnMap(headerRow: any[], patterns: { [key: string]: RegExp }): { [key: string]: number } {
    const columnMap: { [key: string]: number } = {};

    for (const [fieldName, pattern] of Object.entries(patterns)) {
      for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
        const headerValue = String(headerRow[colIndex] || '').trim();
        
        if (pattern.test(headerValue)) {
          columnMap[fieldName] = colIndex;
          break;
        }
      }
    }

    return columnMap;
  }

  private detectHeaderRow(rawData: any[][], columnMappings: ExcelColumnMapping): {
    success: boolean;
    headerRowIndex: number;
    headers: any[];
    columnMap: { [key: string]: number };
    error?: string;
  } {
    // Look for header row in first 20 rows
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const rowStr = row.join('|').toUpperCase();
      
      // Check if this row contains key header indicators
      const hasRequiredHeaders = this.checkRequiredHeaders(rowStr, columnMappings);
      
      if (hasRequiredHeaders.isValid) {
        const columnMap = this.buildColumnMap(row, columnMappings);
        
        if (Object.keys(columnMap).length >= 3) { // At least 3 columns mapped
          console.log(`📋 [PRODUCTION] Header detected at row ${i}:`, row.slice(0, 15));
          console.log(`🗂️ [PRODUCTION] Full header (first 20 cols):`, row.slice(0, 20));
          console.log(`🗂️ [PRODUCTION] Column mapping:`, columnMap);
          
          return {
            success: true,
            headerRowIndex: i,
            headers: row,
            columnMap,
          };
        }
      }
    }

    return {
      success: false,
      headerRowIndex: -1,
      headers: [],
      columnMap: {},
      error: 'No valid header row found with required columns'
    };
  }

  private checkRequiredHeaders(rowStr: string, columnMappings: ExcelColumnMapping): { isValid: boolean; score: number } {
    let score = 0;
    const requiredFields = ['serialNumber', 'currentStatus'];
    
    for (const field of requiredFields) {
      const alternatives = columnMappings[field] || [];
      const found = alternatives.some(alt => rowStr.includes(alt.toUpperCase()));
      if (found) score++;
    }

    // Also check for other important fields
    const otherFields = Object.keys(columnMappings).filter(f => !requiredFields.includes(f));
    for (const field of otherFields) {
      const alternatives = columnMappings[field] || [];
      const found = alternatives.some(alt => rowStr.includes(alt.toUpperCase()));
      if (found) score += 0.5;
    }

    return { isValid: score >= 1.5, score };
  }

  private buildColumnMap(headerRow: any[], columnMappings: ExcelColumnMapping): { [key: string]: number } {
    const columnMap: { [key: string]: number } = {};

    for (const [fieldName, alternatives] of Object.entries(columnMappings)) {
      for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
        const headerValue = String(headerRow[colIndex] || '').toUpperCase().trim();
        
        const matchFound = alternatives.some(alt => {
          const altUpper = alt.toUpperCase();
          return headerValue === altUpper || headerValue.includes(altUpper) || altUpper.includes(headerValue);
        });

        if (matchFound) {
          columnMap[fieldName] = colIndex;
          break;
        }
      }
    }

    return columnMap;
  }

  private extractDataFromRows(
    rawData: any[][], 
    headerRowIndex: number, 
    columnMap: { [key: string]: number },
    fileType: 'document' | 'shop_drawing'
  ): { data: any[]; processedRows: number; errors: string[] } {
    const data: any[] = [];
    const errors: string[] = [];
    let processedRows = 0;

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      // Check if row has meaningful data
      const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      if (!hasData) continue;

      // Skip header repetitions
      const snValue = row[columnMap.serialNumber || 0];
      if (!snValue || String(snValue).toUpperCase().includes('SN')) continue;

      try {
        const record = this.buildRecordFromRow(row, columnMap, fileType, data.length + 1);
        if (record) {
          data.push(record);
          processedRows++;
        }
      } catch (error) {
        errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Processing error'}`);
      }
    }

    return { data, processedRows, errors };
  }

  private buildRecordFromRow(
    row: any[], 
    columnMap: { [key: string]: number }, 
    fileType: 'document' | 'shop_drawing',
    sequentialId: number
  ): any | null {
    if (fileType === 'document') {
      return {
        id: sequentialId,
        documentId: `DOC-${Date.now()}-${sequentialId}`,
        title: this.getCellValue(row, columnMap.documentName) || `Document ${sequentialId}`,
        vendor: this.getCellValue(row, columnMap.vendor) || 'Unknown',
        documentType: this.getCellValue(row, columnMap.documentType) || 'Unknown',
        category: this.getCellValue(row, columnMap.category) || 'General',
        discipline: this.getCellValue(row, columnMap.discipline) || 'General',
        system: this.getCellValue(row, columnMap.system) || 'Unknown',
        currentStatus: this.normalizeStatus(this.getCellValue(row, columnMap.currentStatus)),
        priority: 'Medium',
        submittedAt: this.parseDate(this.getCellValue(row, columnMap.submissionDate)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      return {
        id: sequentialId,
        drawingId: `SD-${Date.now()}-${sequentialId}`,
        drawingNumber: this.getCellValue(row, columnMap.drawingNumber) || `SD-${sequentialId}`,
        system: this.getCellValue(row, columnMap.system) || 'ICT',
        subSystem: this.getCellValue(row, columnMap.subSystem) || 'N/A',
        drawingType: this.getCellValue(row, columnMap.drawingType) || 'Technical',
        projectNumber: this.getCellValue(row, columnMap.projectNumber) || 'N/A',
        building: this.getCellValue(row, columnMap.building) || 'N/A',
        floor: this.getCellValue(row, columnMap.floor) || 'N/A',
        currentStatus: this.normalizeStatus(this.getCellValue(row, columnMap.currentStatus)),
        priority: 'Medium',
        submittedAt: this.parseDate(this.getCellValue(row, columnMap.submissionDate)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  private getCellValue(row: any[], columnIndex: number | undefined): string {
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return '';
    }
    const value = row[columnIndex];
    return value !== null && value !== undefined ? String(value).trim() : '';
  }

  private normalizeStatus(status: string): string {
    if (!status || status === '---') return 'Pending';
    
    const statusUpper = status.toUpperCase().trim();
    
    // Normalize common status variations
    const statusMappings: { [key: string]: string } = {
      'CODE 1': 'CODE1',
      'CODE 2': 'CODE2',
      'CODE 3': 'CODE3',
      'AR (ATJV)': 'AR (ATJV)',
      'UR (ATJV)': 'UR (ATJV)',
      'UR (DAR)': 'UR (DAR)',
      'RTN (AS)': 'RTN (AS)',
      'RTN (ATLS)': 'RTN (ATLS)',
    };

    for (const [pattern, normalized] of Object.entries(statusMappings)) {
      if (statusUpper.includes(pattern.toUpperCase())) {
        return normalized;
      }
    }

    return status;
  }

  private parseDate(dateValue: any): string {
    if (!dateValue) return new Date().toISOString();
    
    // Handle date strings (from Excel with calculated formulas)
    if (typeof dateValue === 'string') {
      // Try to parse ISO date strings or formatted dates
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    
    // Handle Excel serial dates
    if (typeof dateValue === 'number' && dateValue > 25569) {
      const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
      return excelDate.toISOString();
    }
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    
    return new Date().toISOString();
  }

  private async maybeRefresh(): Promise<void> {
    const now = new Date();
    const timeSinceRefresh = now.getTime() - this.lastRefresh.getTime();

    if (timeSinceRefresh > this.refreshInterval) {
      await this.forceRefresh();
    }
  }

  private async loadDocumentSubmittals(): Promise<void> {
    try {
      const filePath = join(process.cwd(), 'attached_assets', 'Document Submittal Log.xlsx');
      const result = await this.validateAndExtractExcel(filePath, 'document');
      
      if (result.success) {
        this.documentsCache = result.data;
        console.log(`✅ [PRODUCTION] Loaded ${result.data.length} documents (${result.processedRows} processed, ${result.errors.length} errors)`);
        if (result.errors.length > 0) {
          console.warn('⚠️ [PRODUCTION] Document extraction warnings:', result.errors.slice(0, 5));
        }
      } else {
        console.error('❌ [PRODUCTION] Failed to load documents:', result.errors);
        this.documentsCache = [];
      }
    } catch (error) {
      console.error('❌ [PRODUCTION] Error loading document submittals:', error);
      this.documentsCache = [];
    }
  }

  private async loadShopDrawings(): Promise<void> {
    try {
      const filePath = join(process.cwd(), 'attached_assets', 'Shop Drawing Log.xlsx');
      const result = await this.validateAndExtractExcel(filePath, 'shop_drawing');
      
      if (result.success) {
        this.shopDrawingsCache = result.data;
        console.log(`✅ [PRODUCTION] Loaded ${result.data.length} shop drawings (${result.processedRows} processed, ${result.errors.length} errors)`);
        if (result.errors.length > 0) {
          console.warn('⚠️ [PRODUCTION] Shop drawing extraction warnings:', result.errors.slice(0, 5));
        }
      } else {
        console.error('❌ [PRODUCTION] Failed to load shop drawings:', result.errors);
        this.shopDrawingsCache = [];
      }
    } catch (error) {
      console.error('❌ [PRODUCTION] Error loading shop drawings:', error);
      this.shopDrawingsCache = [];
    }
  }
}

// Export singleton instance
export const productionExcelService = new ProductionExcelService();