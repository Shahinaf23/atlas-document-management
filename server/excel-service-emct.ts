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
      console.log(`🔍 EMCT Document file has ${rawData.length} total rows`);
      
      const processedDocuments: any[] = [];
      let processedCount = 0;
      
      // Based on analysis: Data starts at row 9, structure is:
      // Row analysis shows: Col 2: Type, Col 4: Discipline, Col 8: Document Name, Col 10: Reference, etc.
      for (let i = 9; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;
        
        console.log(`🔍 Processing EMCT doc row ${i}:`, row.slice(0, 12).map((cell, idx) => `${idx}:${cell}`));
        
        const docType = String(row[2] || '').trim();
        const discipline = String(row[4] || '').trim();
        const docName = String(row[8] || '').trim();
        const reference = String(row[10] || '').trim();
        const category = String(row[6] || 'Project Submittal').trim();
        
        // Skip if no meaningful data
        if (!docName || docName.length < 5) continue;
        if (docType.toLowerCase().includes('document') || docName.toLowerCase().includes('revision')) continue;
        
        // Determine status - look for status indicators in later columns
        let status = 'PENDING';
        for (let col = 12; col < Math.min(row.length, 25); col++) {
          const cellValue = String(row[col] || '').trim().toLowerCase();
          if (cellValue.includes('approved') || cellValue.includes('code1')) {
            status = 'CODE1';
            break;
          } else if (cellValue.includes('under review') || cellValue.includes('ur')) {
            status = 'UR';
            break;
          } else if (cellValue.includes('returned') || cellValue.includes('rtn')) {
            status = 'RTN';
            break;
          }
        }
        
        processedDocuments.push({
          id: processedCount + 1,
          documentId: `EMCT-DOC-${processedCount + 1}`,
          serialNumber: processedCount + 1,
          documentName: docName,
          status: status,
          category: category,
          discipline: discipline,
          documentType: docType,
          reference: reference,
          project: 'EMCT Cargo-ZIA',
          submissionDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
        });
        
        processedCount++;
        
        // Debug: Log first few processed items
        if (processedCount <= 3) {
          console.log(`📝 Sample EMCT document ${processedCount}:`, {
            type: docType,
            discipline: discipline,
            name: docName.substring(0, 50),
            status: status
          });
        }
      }
      
      console.log(`✅ Loaded ${processedDocuments.length} EMCT document submittals`);
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
      console.log(`🔍 EMCT Shop drawing file has ${rawData.length} total rows`);
      
      const processedShopDrawings: any[] = [];
      let processedCount = 0;
      
      // Based on analysis: Data starts at row 9, exact structure:
      // Col 2: Building, Col 12: System, Col 16: Drawing Description, etc.
      for (let i = 9; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;
        
        const building = String(row[2] || '').trim();
        const program = String(row[3] || '').trim();
        const contract = String(row[4] || '').trim();
        const discipline = String(row[5] || '').trim();
        const system = String(row[12] || '').trim();
        const subSystem = String(row[13] || '').trim();
        let drawingName = String(row[16] || '').trim();
        
        console.log(`🔍 Processing EMCT shop row ${i}: building="${building}", system="${system}", drawing="${drawingName.substring(0, 30)}"`);
        
        // Skip if no meaningful data
        if (!building || building.length < 3) {
          console.log(`⏭️ Skipping row ${i}: building too short: "${building}"`);
          continue;
        }
        if (building.toLowerCase().includes('building') && building.length < 10) {
          console.log(`⏭️ Skipping row ${i}: generic building name: "${building}"`);
          continue;
        }
        if (!drawingName || drawingName.length < 5) {
          console.log(`⏭️ Skipping row ${i}: drawing name too short: "${drawingName}"`);
          continue;
        }
        
        // Look for status in column 26 based on logs analysis
        let drawingStatus = 'UR'; // Default to UR as seen in logs
        const statusCell = String(row[26] || '').trim().toLowerCase();
        if (statusCell.includes('approved') || statusCell.includes('code1')) {
          drawingStatus = 'CODE1';
        } else if (statusCell.includes('returned') || statusCell.includes('rtn')) {
          drawingStatus = 'RTN';
        } else if (statusCell.includes('pending')) {
          drawingStatus = 'PENDING';
        }
        
        // Ensure we have a valid drawing name
        if (!drawingName || drawingName.length < 5) {
          drawingName = `${building} - ${system || discipline} Drawing`;
        }
        
        processedShopDrawings.push({
          id: processedCount + 1,
          drawingId: `EMCT-SD-${processedCount + 1}`,
          serialNumber: processedCount + 1,
          drawingName: drawingName,
          status: drawingStatus,
          system: system || discipline || 'General',
          building: building,
          program: program,
          contract: contract,
          discipline: discipline,
          project: 'EMCT Cargo-ZIA',
          submissionDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
        });
        
        processedCount++;
        
        // Debug: Log first few processed items
        if (processedCount <= 3) {
          console.log(`🏗️ Sample EMCT shop drawing ${processedCount}:`, {
            building: building,
            system: system || discipline,
            name: drawingName.substring(0, 50),
            status: drawingStatus
          });
        }
      }
      
      console.log(`✅ Loaded ${processedShopDrawings.length} EMCT shop drawings`);
      this.shopDrawingsCache = processedShopDrawings;
      
    } catch (error) {
      console.error('❌ Error loading EMCT shop drawings:', error);
      this.shopDrawingsCache = [];
    }
  }
}

// Export singleton instance
export const emctExcelService = new EmctExcelService();