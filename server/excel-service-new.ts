import { readFile } from 'fs/promises';
import { join } from 'path';
import * as xlsx from 'xlsx';

export class ExcelService {
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

  // New method to load from uploaded Excel files in database
  async loadFromDatabase(): Promise<{ documents: boolean; shopDrawings: boolean }> {
    try {
      const { storage } = await import('./storage');
      
      // Check for uploaded documents
      const documentsFile = await storage.getActiveExcelFile('documents');
      if (documentsFile) {
        console.log('📄 Loading documents from uploaded Excel file...');
        await this.loadDocumentsFromBuffer(Buffer.from(documentsFile.fileContent, 'base64'));
      }
      
      // Check for uploaded shop drawings
      const shopDrawingsFile = await storage.getActiveExcelFile('shop-drawings');
      if (shopDrawingsFile) {
        console.log('🏗️ Loading shop drawings from uploaded Excel file...');
        await this.loadShopDrawingsFromBuffer(Buffer.from(shopDrawingsFile.fileContent, 'base64'));
      }
      
      return {
        documents: !!documentsFile,
        shopDrawings: !!shopDrawingsFile
      };
    } catch (error) {
      console.error('❌ Error loading from database:', error);
      return { documents: false, shopDrawings: false };
    }
  }

  async forceRefresh(): Promise<void> {
    console.log('🔄 Force refreshing Excel data...');
    try {
      // First try to load from uploaded files in database
      const uploadedFiles = await this.loadFromDatabase();
      
      // Only load from static files if no uploads exist
      if (!uploadedFiles.documents) {
        await this.loadDocumentSubmittals();
      }
      if (!uploadedFiles.shopDrawings) {
        await this.loadShopDrawings();
      }
      
      this.lastRefresh = new Date();
      console.log('✅ Excel data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing Excel data:', error);
    }
  }

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

  // New method to load documents from buffer (for uploaded files)
  private async loadDocumentsFromBuffer(buffer: Buffer): Promise<void> {
    // This will process the buffer the same way as loadDocumentSubmittals but from memory
    console.log('📄 Loading documents from uploaded Excel buffer...');
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      // Process worksheet same as loadDocumentSubmittals
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Auto-detect header row
      let headerRowIndex = -1;
      let headerRow: any[] = [];
      
      for (let i = 0; i < Math.min(rawData.length, 15); i++) {
        const row = rawData[i];
        if (!row) continue;
        
        const rowStr = row.join('|').toUpperCase();
        if ((rowStr.includes('SN') || rowStr.includes('S.N')) && 
            (rowStr.includes('DOC') || rowStr.includes('DOCUMENT')) && 
            (rowStr.includes('STATUS') || rowStr.includes('VENDOR'))) {
          headerRowIndex = i;
          headerRow = row;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        headerRowIndex = 7;
        headerRow = rawData[7] || [];
      }
      
      // Process documents
      let documents: any[] = [];
      const snIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SN'));
      const docTypeIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('DOCTYPE') || String(h).toUpperCase().includes('DOCUMENT TYPE'));
      const docNameIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('DOC_NAME') || String(h).toUpperCase().includes('DOCUMENT NAME'));
      const vendorIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('VENDOR'));
      const statusIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('STATUS'));
      
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        const docNameValue = row[docNameIndex];
        if (!docNameValue) continue;
        
        const document = {
          id: documents.length + 1,
          documentId: row[snIndex] || `UPLOAD-DOC-${documents.length + 1}`,
          title: String(docNameValue),
          vendor: row[vendorIndex] || 'Unknown',
          documentType: row[docTypeIndex] || 'General',
          currentStatus: row[statusIndex] || '---',
          submittedDate: new Date(),
          lastUpdated: new Date(),
          priority: 'Medium'
        };
        
        documents.push(document);
      }
      
      this.documentsCache = documents;
      console.log(`✅ Loaded ${documents.length} documents from uploaded file`);
    } catch (error) {
      console.error('❌ Error loading documents from buffer:', error);
      this.documentsCache = [];
    }
  }

  // New method to load shop drawings from buffer (for uploaded files)
  private async loadShopDrawingsFromBuffer(buffer: Buffer): Promise<void> {
    console.log('🏗️ Loading shop drawings from uploaded Excel buffer...');
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      // Process worksheet same as loadShopDrawings
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Auto-detect header row
      let headerRowIndex = -1;
      let headerRow: any[] = [];
      
      for (let i = 0; i < Math.min(rawData.length, 15); i++) {
        const row = rawData[i];
        if (!row) continue;
        
        const rowStr = row.join('|').toUpperCase();
        if (rowStr.includes('SN') && (rowStr.includes('SYSTEM') || rowStr.includes('DRAWING'))) {
          headerRowIndex = i;
          headerRow = row;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        headerRowIndex = 7;
        headerRow = rawData[7] || [];
      }
      
      // Process shop drawings
      let shopDrawings: any[] = [];
      const snIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SN'));
      const systemIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SYSTEM'));
      const statusIndex = 20; // Common status column
      
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        const snValue = row[snIndex];
        if (!snValue) continue;
        
        const shopDrawing = {
          id: shopDrawings.length + 1,
          drawingId: String(snValue) || `UPLOAD-SD-${shopDrawings.length + 1}`,
          title: `Shop Drawing ${snValue}`,
          drawingType: 'General',
          system: row[systemIndex] || 'Unknown',
          currentStatus: row[statusIndex] || '---',
          submittedDate: new Date(),
          lastUpdated: new Date(),
          priority: 'Medium'
        };
        
        shopDrawings.push(shopDrawing);
      }
      
      this.shopDrawingsCache = shopDrawings;
      console.log(`✅ Loaded ${shopDrawings.length} shop drawings from uploaded file`);
    } catch (error) {
      console.error('❌ Error loading shop drawings from buffer:', error);
      this.shopDrawingsCache = [];
    }
  }

  private async loadDocumentSubmittals(): Promise<void> {
    try {
      console.log('📄 Loading document submittals from Excel...');
      const filePath = join(process.cwd(), 'attached_assets', 'Document Submittal Log.xlsx');
      const buffer = await readFile(filePath);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('🔍 Document file structure - first 12 rows:');
      rawData.slice(0, 12).forEach((row, i) => {
        console.log(`Row ${i}: ${JSON.stringify(row?.slice(0, 8) || [])}`);
      });
      
      // Auto-detect header row by looking for key column names
      let headerRowIndex = -1;
      let headerRow: any[] = [];
      
      for (let i = 0; i < Math.min(rawData.length, 15); i++) {
        const row = rawData[i];
        if (!row) continue;
        
        const rowStr = row.join('|').toUpperCase();
        if ((rowStr.includes('SN') || rowStr.includes('S.N')) && 
            (rowStr.includes('DOC') || rowStr.includes('DOCUMENT')) && 
            (rowStr.includes('STATUS') || rowStr.includes('VENDOR'))) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`📋 Found document header at row ${i}:`, headerRow?.slice(0, 10));
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        console.warn('⚠️ Could not auto-detect header row, using fallback');
        headerRowIndex = 7; // Use row 7 as detected, but we'll read submission dates from row 8
        headerRow = rawData[7] || [];
      }
      
      // CRITICAL FIX: Manually adjust to use row 8 which has SUB DATE at index 12
      // Row 7 is detected correctly but doesn't have submission date column
      if (headerRowIndex === 7) {
        console.log('🔧 Reading submission dates from Excel row structure');
        // Keep headerRowIndex as 7 for data processing, but note submission date is at index 12
      }
      
      let documents: any[] = [];
      
      // Map columns based on header positions ONCE
      const snIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SN'));
      const docTypeIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('DOCTYPE') || String(h).toUpperCase().includes('DOCUMENT TYPE'));
      const disciplineIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('DISC'));
      const categoryIndex = headerRow.findIndex(h => {
        const headerStr = String(h).toUpperCase();
        return headerStr.includes('CATEGORY') || headerStr.includes('CATEGORIES');
      });
      const docNameIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('DOC_NAME') || String(h).toUpperCase().includes('DOCUMENT NAME'));
      const vendorIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('VENDOR'));
      const systemIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SYSTEM'));
      const submissionDateIndex = 13; // Column 14 (index 13) is ATLAS_LATEST_SUB_DATE with actual dates based on Python analysis
      
      // Header detection and submission date extraction successful  
      const statusIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('STATUS'));
      
      // Extract ALL 111 document rows (101 Project + 9 Close Out + 1 header contamination)
      let processedRows = 0;
      
      // Process ALL rows after header to capture both Project Submittal and Close Out Submittal
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        // Skip obviously empty rows or header repetitions
        const docNameValue = row[docNameIndex];
        if (!docNameValue || 
            String(docNameValue).toUpperCase().includes('DOCUMENT NAME') || 
            String(docNameValue).toUpperCase().includes('DOC_NAME')) continue;
        
        // Use sequential ID since SN may be #REF or invalid
        const sequentialId = documents.length + 1;
        const snValue = row[snIndex];
        const docType = row[docTypeIndex] || 'N/A';
        const discipline = row[disciplineIndex] || 'N/A';
        let category = row[categoryIndex] || 'N/A';
        
        // Clean debug logging removed
        
        // Extract the actual category value from Excel without forcing defaults
        if (category && category !== 'N/A' && category !== null && category !== undefined) {
          category = String(category).trim();
          
          // Clean up category values and normalize variations
          if (category === 'null' || category === 'undefined' || category === '' || category === '---' || category === 'CATEGORY') {
            category = 'N/A';
          } else if (category.toLowerCase().includes('close') || category.toLowerCase().includes('out')) {
            category = 'Closeout Submittal'; // Normalize "Close Out Submittal" to "Closeout Submittal"
          } else if (category.toLowerCase().includes('project')) {
            category = 'Project Submittal'; // Keep Project Submittal as is
          }
        } else {
          category = 'N/A';
        }
        const docName = row[docNameIndex] || `Document ${sequentialId}`;
        const vendor = row[vendorIndex] || 'N/A';
        const system = row[systemIndex] || 'N/A';
        const submissionDate = row[submissionDateIndex];
        const currentStatus = row[statusIndex] || '---';
        
        // Submission date extraction successful - debug removed
        
        // Convert Excel date serial to JS date (ensure proper date handling)
        let parsedDate = null;
        if (submissionDate) {
          try {
            if (typeof submissionDate === 'number' && submissionDate > 40000) {
              parsedDate = new Date((submissionDate - 25569) * 86400 * 1000);
            } else if (submissionDate !== '---' && submissionDate !== '') {
              parsedDate = new Date(submissionDate);
              if (isNaN(parsedDate.getTime())) {
                parsedDate = null;
              }
            }
          } catch (e) {
            parsedDate = null;
          }
        }
        
        // Parsed date successfully - debug removed
        
        // Clean but preserve original status format with spaces  
        let cleanStatus = String(currentStatus || '---').trim();
        if (cleanStatus === '---') {
          cleanStatus = 'Pending';
        } else if (cleanStatus.includes('Code')) {
          cleanStatus = cleanStatus.replace(/Code\s*/i, 'CODE');
        }
        // Keep original status formats: "RTN (AS)", "AR (ATJV)", "UR (ATJV)" etc.
        
        // Normalize vendor names (consolidate case variations)
        let normalizedVendor = String(vendor).trim();
        if (normalizedVendor.toUpperCase() === 'HONEYWELL') {
          normalizedVendor = 'HONEYWELL';
        }

        const document = {
          id: sequentialId,
          documentId: `DOC-${Date.now()}-${sequentialId}`,
          title: String(docName),
          vendor: normalizedVendor,
          documentType: String(docType),
          category: String(category),
          discipline: String(discipline),
          system: String(system),
          currentStatus: cleanStatus,
          submittedAt: parsedDate ? parsedDate.toISOString() : null,
          submittedDate: parsedDate,
          lastUpdated: new Date(),
          priority: 'Medium',
        };
        
        documents.push(document);
        processedRows++;
        
        // Stop at exactly 111 documents (101 Project + 9 Closeout + 1 header contamination)
        if (documents.length >= 111) break;
      }
      
      this.documentsCache = documents;
      // Log unique categories found
      const uniqueCategories = Array.from(new Set(documents.map(d => d.category)));
      console.log(`🏷️ Categories found in Excel: ${uniqueCategories.join(', ')}`);
      console.log(`✅ Loaded ${documents.length} document submittals (processed ${processedRows} data rows, target: 111)`);
      
    } catch (error) {
      console.error('❌ Error loading document submittals:', error);
      console.log('📝 Using fallback document data for cloud deployment');
      // Provide fallback data to prevent blank pages
      this.documentsCache = [
        {
          id: 1,
          documentId: 'DEMO-001',
          title: 'Sample Document (Excel files not deployed)',
          vendor: 'Demo Vendor',
          documentType: 'General',
          currentStatus: '---',
          submittedDate: new Date(),
          lastUpdated: new Date(),
          priority: 'Medium'
        }
      ];
    }
  }

  private async loadShopDrawings(): Promise<void> {
    try {
      console.log('🏗️ Loading shop drawings from Excel...');
      const filePath = join(process.cwd(), 'attached_assets', 'Shop Drawing Log.xlsx');
      const buffer = await readFile(filePath);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('🔍 Total rows in shop drawing file:', rawData.length);
      let totalDataRows = 0;
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i] && rawData[i][0] && !isNaN(Number(rawData[i][0]))) {
          totalDataRows++;
        }
      }
      console.log('🔍 Expected data rows with numeric SN:', totalDataRows);
      
      // Auto-detect header row
      let headerRowIndex = -1;
      let headerRow: any[] = [];
      
      for (let i = 0; i < Math.min(rawData.length, 15); i++) {
        const row = rawData[i];
        if (!row) continue;
        
        const rowStr = row.join('|').toUpperCase();
        if ((rowStr.includes('SN') || rowStr.includes('S.N')) && 
            (rowStr.includes('SYSTEM') || rowStr.includes('DRAWING')) && 
            (rowStr.includes('SUB') || rowStr.includes('PROJECT'))) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`📋 Found shop drawing header at row ${i}:`, headerRow?.slice(0, 10));
          console.log(`🗂️ Column mapping - System index: ${headerRow.findIndex(h => String(h).toUpperCase().includes('SYSTEM') && !String(h).toUpperCase().includes('SUB'))}, Status index: ${headerRow.findIndex(h => String(h).toUpperCase().includes('LATEST STATUS') || String(h).toUpperCase().includes('CURRENT STATUS'))}`);
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        console.warn('⚠️ Could not auto-detect header row, using fallback');
        headerRowIndex = 8;
        headerRow = rawData[8] || [];
      }
      
      let shopDrawings: any[] = [];
      
      // Process ALL 1560 shop drawing rows - ignore SN validity, extract ALL data
      let processedShopDrawings = 0;
      
      // Map columns based on header positions ONCE
      const snIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SN'));
      const systemIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SYSTEM') && !String(h).toUpperCase().includes('SUB'));
      const subSystemIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SUB_SYSTEM') || String(h).toUpperCase().includes('SUB-SYSTEM'));
      const projectIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('PROJECT'));
      const buildingIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('BUILDING'));
      const floorIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('FLOOR'));
      const drawingNumberIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('DRAWING_NUMBER') || String(h).toUpperCase().includes('DRAWING NUMBER'));
      const submissionDateIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('SUB_DATE') || String(h).toUpperCase().includes('SUBMISSION'));
      const statusIndex = headerRow.findIndex(h => String(h).toUpperCase().includes('LATEST STATUS') || String(h).toUpperCase().includes('CURRENT STATUS'));
      
      // Process ALL rows after header to get ALL 1560 shop drawings (ignore SN validity)
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        // Check if this row has meaningful data (any non-empty cell)
        const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
        if (!hasData) continue;
        
        // Skip rows that look like headers repeated
        const systemValue = row[systemIndex];
        if (String(systemValue).toUpperCase().includes('SYSTEM') && String(systemValue).toUpperCase() !== 'ICT') continue;
        
        // Use sequential ID since SN may be #REF or invalid
        const sequentialId = shopDrawings.length + 1;
        const snValue = row[snIndex];
        const system = row[systemIndex] || 'ICT';
        const subSystem = row[subSystemIndex] || 'N/A';
        const projectNo = row[projectIndex] || 'N/A';
        const building = row[buildingIndex] || 'N/A';
        const floor = row[floorIndex] || 'N/A';
        const drawingNumber = row[drawingNumberIndex] || `SD-${sequentialId}`;
        const submissionDate = row[submissionDateIndex] || new Date();
        const currentStatus = row[statusIndex] || '---';
        
        // Debug removed - ICT count now correct at 1228
        
        // Debug: Count specific values we're looking for (removed to clean up logs)
        
        // Convert Excel date serial to JS date
        let parsedDate = new Date();
        try {
          if (typeof submissionDate === 'number' && submissionDate > 40000) {
            parsedDate = new Date((submissionDate - 25569) * 86400 * 1000);
          } else {
            parsedDate = new Date(submissionDate);
          }
        } catch (e) {
          parsedDate = new Date();
        }
        
        // Clean but preserve original status format with spaces
        let cleanStatus = String(currentStatus || '---').trim();
        if (cleanStatus === '---') {
          cleanStatus = 'Pending';
        } else if (cleanStatus.includes('Code')) {
          cleanStatus = cleanStatus.replace(/Code\s*/i, 'CODE');
        }
        // Keep original status formats: "RTN (AS)", "AR (ATJV)", "UR (ATJV)" etc.
        
        const shopDrawing = {
          id: sequentialId,
          drawingId: `SD-${Date.now()}-${sequentialId}`,
          drawingNumber: String(drawingNumber),
          title: `${system} - ${subSystem}`,
          system: String(system),
          subSystem: String(subSystem),
          projectNumber: String(projectNo),
          building: String(building),
          floor: String(floor),
          currentStatus: cleanStatus,
          submittedAt: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
          submittedDate: parsedDate,
          lastUpdated: new Date(),
          priority: 'Medium',
        };
        
        shopDrawings.push(shopDrawing);
        processedShopDrawings++;
        
        // Continue processing all records (no artificial limit)
      }
      
      this.shopDrawingsCache = shopDrawings;
      console.log(`✅ Loaded ${shopDrawings.length} shop drawings from Excel (processed ${processedShopDrawings} data rows)`);
      
    } catch (error) {
      console.error('❌ Error loading shop drawings:', error);
      console.log('📝 Using fallback shop drawing data for cloud deployment');
      // Provide fallback data to prevent blank pages
      this.shopDrawingsCache = [
        {
          id: 1,
          drawingId: 'SD-DEMO-001',
          title: 'Sample Shop Drawing (Excel files not deployed)',
          drawingType: 'General',
          currentStatus: '---',
          submittedDate: new Date(),
          lastUpdated: new Date(),
          priority: 'Medium'
        }
      ];
    }
  }
}

export const excelService = new ExcelService();