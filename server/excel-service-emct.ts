import { readFile } from 'fs/promises';
import { join } from 'path';
import * as xlsx from 'xlsx';

export class EmctExcelService {
  private documentsCache: any[] = [];
  private shopDrawingsCache: any[] = [];
  private lastRefresh: Date = new Date(0);
  private readonly refreshInterval = 30000; // 30 seconds
  private isInitialized = false;

  async getDocuments(): Promise<any[]> {
    if (!this.isInitialized) {
      await this.forceRefresh();
      this.isInitialized = true;
    } else {
      await this.maybeRefresh();
    }
    return this.documentsCache;
  }

  async getShopDrawings(): Promise<any[]> {
    if (!this.isInitialized) {
      await this.forceRefresh();
      this.isInitialized = true;
    } else {
      await this.maybeRefresh();
    }
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
      console.log('📄 Loading EMCT document submittals from CURRENT STATUS worksheet...');
      const filePath = join(process.cwd(), 'attached_assets', 'Document Submittal Log-RAQ_1755061638473.xlsx');
      const buffer = await readFile(filePath);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      
      console.log('📋 Available worksheets:', workbook.SheetNames);
      
      // Find the CURRENT STATUS worksheet
      let currentStatusSheet = null;
      let sheetName = '';
      
      for (const name of workbook.SheetNames) {
        console.log(`🔍 Checking worksheet: "${name}"`);
        if (name.toLowerCase().includes('current') && name.toLowerCase().includes('status')) {
          currentStatusSheet = workbook.Sheets[name];
          sheetName = name;
          break;
        }
      }
      
      // Fallback to first sheet if CURRENT STATUS not found
      if (!currentStatusSheet) {
        sheetName = workbook.SheetNames[0];
        currentStatusSheet = workbook.Sheets[sheetName];
        console.log('⚠️ CURRENT STATUS worksheet not found, using first sheet:', sheetName);
      } else {
        console.log('✅ Found CURRENT STATUS worksheet:', sheetName);
      }
      
      const rawData = xlsx.utils.sheet_to_json(currentStatusSheet, { header: 1 }) as any[][];
      console.log(`🔍 EMCT Document file has ${rawData.length} total rows`);
      
      // Debug: Show first 15 rows to understand structure
      console.log('🔍 First 15 rows of CURRENT STATUS worksheet:');
      for (let i = 0; i < Math.min(rawData.length, 15); i++) {
        const row = rawData[i];
        if (row && Array.isArray(row)) {
          console.log(`Row ${i}:`, row.slice(0, 15).map((cell, idx) => `${idx}:${cell}`));
        }
      }
      
      // Find header row by looking for key columns
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawData.length, 15); i++) {
        const row = rawData[i];
        if (row && Array.isArray(row)) {
          const rowStr = row.join('|').toLowerCase();
          if (rowStr.includes('status_approval') || rowStr.includes('sub_date') || 
              (rowStr.includes('status') && rowStr.includes('document'))) {
            headerRowIndex = i;
            console.log('📋 Found header row at index:', i, row);
            break;
          }
        }
      }
      
      if (headerRowIndex === -1) {
        console.log('⚠️ Header row not found, using row 0 as fallback');
        headerRowIndex = 0;
      }
      
      const headers = rawData[headerRowIndex] || [];
      const processedDocuments: any[] = [];
      let processedCount = 0;
      
      // Map status codes according to user requirements
      const mapStatus = (rawStatus: string): string => {
        const status = String(rawStatus || '').trim();
        
        // User-defined status mapping
        if (status === '2') return 'Approved';
        if (status === '3') return 'Reject with comments';
        if (status === '4') return 'Rejected';
        if (status.toLowerCase() === 'ur dar' || status.toLowerCase() === 'ur_dar') return 'Under review';
        if (status === '---' || status === '' || status === 'undefined') return 'Pending';
        
        return status; // Keep original if no mapping found
      };
      
      // Process data rows starting after header
      console.log(`🔍 Processing ${rawData.length - headerRowIndex - 1} data rows starting from row ${headerRowIndex + 1}`);
      
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row) || row.length === 0) {
          console.log(`⏭️ Skipping empty row ${i}`);
          continue;
        }
        
        // Show details for first few rows
        if (processedCount < 5) {
          console.log(`🔍 Processing row ${i}:`, row.slice(0, 10).map((cell, idx) => `${idx}:${cell}`));
        }
        
        // Extract data based on expected column structure
        const documentName = String(row[headers.findIndex((h: any) => 
          String(h || '').toLowerCase().includes('document') || 
          String(h || '').toLowerCase().includes('name') || 
          String(h || '').toLowerCase().includes('title')
        )] || row[1] || '').trim();
        
        const discipline = String(row[headers.findIndex((h: any) => 
          String(h || '').toLowerCase().includes('discipline')
        )] || row[2] || '').trim();
        
        const rawStatus = String(row[headers.findIndex((h: any) => 
          String(h || '').toLowerCase().includes('status_approval')
        )] || row[3] || '').trim();
        
        const subDate = row[headers.findIndex((h: any) => 
          String(h || '').toLowerCase().includes('sub_date')
        )] || row[4] || null;
        
        // Show more lenient processing - log what we're skipping
        if (!documentName || documentName.length < 3) {
          if (processedCount < 10) {
            console.log(`⏭️ Skipping row ${i}: no document name or too short: "${documentName}"`);
          }
          continue;
        }
        
        // Filter out header/metadata rows based on common patterns
        const docNameLower = documentName.toLowerCase().trim();
        if (docNameLower === 'contractor reference' || 
            docNameLower === 'latest submission' || 
            docNameLower === 'sd_c' ||
            docNameLower === 'project submittal' ||
            docNameLower.includes('reference') && documentName.length < 30 ||
            docNameLower.includes('submission') && documentName.length < 30) {
          console.log(`🚫 Filtering out header/metadata row ${i}: "${documentName}"`);
          continue;
        }
        
        // Parse submission date
        let submissionDate = new Date();
        if (subDate && subDate !== '---' && subDate !== '') {
          try {
            if (typeof subDate === 'number' && subDate > 40000) {
              // Excel date serial number
              submissionDate = new Date((subDate - 25569) * 86400 * 1000);
            } else if (typeof subDate === 'string') {
              submissionDate = new Date(subDate);
            }
            if (isNaN(submissionDate.getTime())) {
              submissionDate = new Date();
            }
          } catch (e) {
            submissionDate = new Date();
          }
        }
        
        processedDocuments.push({
          id: processedCount + 1,
          documentId: `EMCT-DOC-${processedCount + 1}`,
          serialNumber: processedCount + 1,
          title: documentName,
          discipline: discipline || 'General',
          currentStatus: mapStatus(rawStatus),
          category: 'Project Submittal',
          documentType: discipline || 'General',
          project: 'EMCT Cargo-ZIA',
          submittedDate: submissionDate,
          submittedAt: submissionDate,
          lastUpdated: new Date(),
        });
        
        processedCount++;
        
        // Debug: Log first few processed items
        if (processedCount <= 3) {
          console.log(`📝 Sample EMCT document ${processedCount}:`, {
            name: documentName.substring(0, 50),
            discipline: discipline,
            status: mapStatus(rawStatus)
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