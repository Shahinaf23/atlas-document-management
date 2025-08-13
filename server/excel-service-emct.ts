import { readFile } from 'fs/promises';
import { join } from 'path';
import * as xlsx from 'xlsx';

export class EmctExcelService {
  private documentsCache: any[] = [];
  private shopDrawingsCache: any[] = [];
  private lastRefresh: Date = new Date(0);
  private readonly refreshInterval = 30000; // 30 seconds

  async getDocuments(): Promise<any[]> {
    await this.maybeRefresh();
    return this.documentsCache;
  }

  async getShopDrawings(): Promise<any[]> {
    await this.maybeRefresh();
    return this.shopDrawingsCache;
  }

  async forceRefresh(): Promise<void> {
    console.log('🔄 Force refreshing EMCT Excel data...');
    try {
      await this.loadDocumentSubmittals();
      await this.loadShopDrawings();
      this.lastRefresh = new Date();
      console.log('✅ EMCT Excel data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing EMCT Excel data:', error);
      // Don't crash the application, just log the error
    }
  }

  // Admin upload helper - force refresh after file upload
  async refreshAfterUpload(): Promise<{ documents: number; shopDrawings: number }> {
    await this.forceRefresh();
    return {
      documents: this.documentsCache.length,
      shopDrawings: this.shopDrawingsCache.length,
    };
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
      console.log('📄 Loading EMCT document submittals from Excel...');
      const filePath = join(process.cwd(), 'attached_assets', 'Document Submittal Log-RAQ_1755061638473.xlsx');
      const buffer = await readFile(filePath);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Debug: Show first few rows to understand structure
      console.log('🔍 EMCT Document file structure - first 15 rows:');
      rawData.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
      });
      
      // Find header row dynamically
      let headerRowIndex = -1;
      let headers: any[] = [];
      
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (row && Array.isArray(row) && row.length > 5) {
          const firstCell = String(row[0] || '').toLowerCase().trim();
          if (firstCell === 'sn' || firstCell === 'no.' || firstCell === 'no' || 
              firstCell === 'serial' || firstCell === 'item' || 
              (firstCell.includes('sn') && firstCell.length < 10)) {
            headerRowIndex = i;
            headers = row;
            break;
          }
        }
      }
      
      if (headerRowIndex === -1 || !headers || headers.length === 0) {
        console.warn('⚠️ Could not find headers in EMCT document submittal log');
        this.documentsCache = [];
        return;
      }
      
      console.log(`📋 Found EMCT document header at row ${headerRowIndex}:`, headers.slice(0, 10));
      
      // Find key column indices
      const snIndex = 0; // Usually first column
      let documentNameIndex = -1;
      let statusIndex = -1;
      let categoryIndex = -1;
      let systemIndex = -1;
      let vendorIndex = -1;
      
      headers.forEach((header, index) => {
        const h = String(header || '').toLowerCase().trim();
        if (h.includes('document') && h.includes('name')) {
          documentNameIndex = index;
        } else if (h.includes('status') || h.includes('approval') || h.includes('code')) {
          statusIndex = index;
        } else if (h.includes('category') || h.includes('type')) {
          categoryIndex = index;
        } else if (h.includes('system')) {
          systemIndex = index;
        } else if (h.includes('vendor') || h.includes('supplier')) {
          vendorIndex = index;
        }
      });
      
      console.log('🗂️ EMCT Column mapping - Document Name:', documentNameIndex, 'Status:', statusIndex, 'Category:', categoryIndex);
      
      // Process data rows
      const dataRows = rawData.slice(headerRowIndex + 1);
      const processedDocuments: any[] = [];
      let processedCount = 0;
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;
        
        const sn = row[snIndex];
        if (!sn || (typeof sn !== 'number' && isNaN(Number(sn)))) continue;
        
        const documentName = documentNameIndex >= 0 ? String(row[documentNameIndex] || '').trim() : '';
        if (!documentName) continue;
        
        const status = statusIndex >= 0 ? String(row[statusIndex] || '').trim() : '';
        const category = categoryIndex >= 0 ? String(row[categoryIndex] || '').trim() : '';
        const system = systemIndex >= 0 ? String(row[systemIndex] || '').trim() : '';
        const vendor = vendorIndex >= 0 ? String(row[vendorIndex] || '').trim() : '';
        
        processedDocuments.push({
          id: processedCount + 1,
          documentId: `EMCT-DOC-${Date.now()}-${processedCount + 1}`,
          serialNumber: Number(sn),
          documentName,
          status: status || 'PENDING',
          category: category || 'General',
          system: system || 'N/A',
          vendor: vendor || 'N/A',
          project: 'EMCT Cargo-ZIA',
          submissionDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
        });
        
        processedCount++;
      }
      
      console.log(`✅ Loaded ${processedDocuments.length} EMCT document submittals (processed ${processedCount} data rows)`);
      this.documentsCache = processedDocuments;
      
    } catch (error) {
      console.error('❌ Error loading EMCT document submittals:', error);
      this.documentsCache = [];
    }
  }

  private async loadShopDrawings(): Promise<void> {
    try {
      console.log('🏗️ Loading EMCT shop drawings from Excel...');
      const filePath = join(process.cwd(), 'attached_assets', 'Shop Drawing Log - RAQ (Updated)_1755061644271.xlsx');
      const buffer = await readFile(filePath);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log(`🔍 Total rows in EMCT shop drawing file: ${rawData.length}`);
      
      // Debug: Show first few rows
      console.log('🔍 EMCT Shop drawing file structure - first 15 rows:');
      rawData.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
      });
      
      // Find header row dynamically
      let headerRowIndex = -1;
      let headers: any[] = [];
      
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (row && Array.isArray(row) && row.length > 3) {
          const firstCell = String(row[0] || '').toLowerCase().trim();
          if (firstCell === 'sn' || firstCell === 'no.' || firstCell === 'no' || 
              firstCell === 'serial' || firstCell === 'item' ||
              (firstCell.includes('sn') && firstCell.length < 10)) {
            headerRowIndex = i;
            headers = row;
            break;
          }
        }
      }
      
      if (headerRowIndex === -1) {
        console.warn('⚠️ Could not find headers in EMCT shop drawing log');
        this.shopDrawingsCache = [];
        return;
      }
      
      console.log(`📋 Found EMCT shop drawing header at row ${headerRowIndex}:`, headers.slice(0, 10));
      
      // Find key column indices
      const snIndex = 0;
      let systemIndex = -1;
      let statusIndex = -1;
      let drawingNameIndex = -1;
      let disciplineIndex = -1;
      
      headers.forEach((header, index) => {
        const h = String(header || '').toLowerCase().trim();
        if (h.includes('system') && !h.includes('sub')) {
          systemIndex = index;
        } else if (h.includes('status') || h.includes('approval') || h.includes('code')) {
          statusIndex = index;
        } else if (h.includes('drawing') && h.includes('name')) {
          drawingNameIndex = index;
        } else if (h.includes('discipline') || h.includes('disc')) {
          disciplineIndex = index;
        }
      });
      
      // If we couldn't find status column, scan all columns for status-like data
      if (statusIndex === -1) {
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const sampleData = rawData.slice(headerRowIndex + 1, headerRowIndex + 20)
            .map(row => String(row[colIndex] || '').trim())
            .filter(val => val.length > 0);
          
          const hasStatusValues = sampleData.some(val => 
            /^(CODE|UR|AR|RTN|APPROVED|PENDING|SUBMITTED)/i.test(val)
          );
          
          if (hasStatusValues) {
            statusIndex = colIndex;
            console.log(`🔍 Found EMCT status column at index ${colIndex} based on data pattern`);
            break;
          }
        }
      }
      
      console.log('🗂️ EMCT Column mapping - System index:', systemIndex, 'Status index:', statusIndex);
      
      // Process data rows
      const dataRows = rawData.slice(headerRowIndex + 1);
      const processedDrawings: any[] = [];
      let expectedDataRows = 0;
      let processedCount = 0;
      
      // Count expected rows with numeric SN
      for (const row of dataRows) {
        if (row && Array.isArray(row) && row.length > 0) {
          const sn = row[snIndex];
          if (sn && (typeof sn === 'number' || !isNaN(Number(sn)))) {
            expectedDataRows++;
          }
        }
      }
      
      console.log(`🔍 Expected EMCT data rows with numeric SN: ${expectedDataRows}`);
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;
        
        const sn = row[snIndex];
        if (!sn || (typeof sn !== 'number' && isNaN(Number(sn)))) continue;
        
        const system = systemIndex >= 0 ? String(row[systemIndex] || '').trim() : '';
        const status = statusIndex >= 0 ? String(row[statusIndex] || '').trim() : '';
        const drawingName = drawingNameIndex >= 0 ? String(row[drawingNameIndex] || '').trim() : '';
        const discipline = disciplineIndex >= 0 ? String(row[disciplineIndex] || '').trim() : '';
        
        processedDrawings.push({
          id: processedCount + 1,
          drawingId: `EMCT-SD-${Date.now()}-${processedCount + 1}`,
          serialNumber: Number(sn),
          system: system || 'N/A',
          status: status || 'PENDING',
          drawingName: drawingName || `Drawing ${sn}`,
          discipline: discipline || 'General',
          project: 'EMCT Cargo-ZIA',
          submissionDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
        });
        
        processedCount++;
      }
      
      console.log(`✅ Loaded ${processedDrawings.length} EMCT shop drawings from Excel (processed ${processedCount} data rows)`);
      this.shopDrawingsCache = processedDrawings;
      
    } catch (error) {
      console.error('❌ Error loading EMCT shop drawings:', error);
      this.shopDrawingsCache = [];
    }
  }
}

// Export singleton instance
export const emctExcelService = new EmctExcelService();