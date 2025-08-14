import { readFile } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

export class ExcelService {
  private documentsCache: any[] = [];
  private shopDrawingsCache: any[] = [];
  private raqDocumentsCache: any[] = [];
  private raqShopDrawingsCache: any[] = [];
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
    // Combine original documents with RAQ documents
    return [...this.documentsCache, ...this.raqDocumentsCache];
  }

  async getShopDrawings(): Promise<any[]> {
    if (!this.isInitialized) {
      await this.forceRefresh();
      this.isInitialized = true;
    } else {
      await this.maybeRefresh();
    }
    // Combine original shop drawings with RAQ shop drawings
    return [...this.shopDrawingsCache, ...this.raqShopDrawingsCache];
  }

  async forceRefresh(): Promise<void> {
    console.log('🔄 Force refreshing Excel data...');
    try {
      await this.loadDocumentSubmittals();
      console.log('✅ Document submittals loaded');
      await this.loadShopDrawings();
      console.log('✅ Shop drawings loaded');
      console.log('🔄 About to load RAQ data...');
      await this.loadRAQData();
      console.log('✅ RAQ data loaded');
      this.lastRefresh = new Date();
      console.log('✅ Excel data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing Excel data:', error);
      console.error('❌ Stack trace:', error.stack);
      // Don't crash the application, just log the error
    }
  }

  // Admin upload helper - force refresh after file upload
  async refreshAfterUpload(): Promise<{ documents: number; shopDrawings: number }> {
    await this.forceRefresh();
    return {
      documents: this.documentsCache.length + this.raqDocumentsCache.length,
      shopDrawings: this.shopDrawingsCache.length + this.raqShopDrawingsCache.length,
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
      console.log('📄 Loading document submittals from Excel...');
      const filePath = join(process.cwd(), 'attached_assets', 'Document Submittal Log.xlsx');
      const buffer = await readFile(filePath);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Based on actual file structure, header row is at index 8 (row 9)
      const headerRowIndex = 8;
      const headers = rawData[headerRowIndex];
      
      console.log('📋 Document Submittal Log headers found:', headers.slice(0, 15));
      
      if (!headers || headers.length === 0) {
        console.warn('⚠️ Could not find headers in document submittal log');
        return;
      }
      
      console.log('📋 Document Submittal Log headers:', headers);
      const records = rawData.slice(headerRowIndex + 1);
      
      this.documentsCache = records.map((row: any, index: number) => {
        const record: any = {};
        headers.forEach((header, i) => {
          record[header] = row[i];
        });
        
        // Extract document title directly from DOC_NAME column
        const title = String(record['DOC_NAME'] || `Document ${index + 1}`);
        
        // Additional logging to see what columns we actually have for the first few documents
        if (index < 3) {
          console.log(`   Document ${index + 1} available columns:`, Object.keys(record));
          console.log(`   Raw column values:`, Object.entries(record).slice(0, 8).map(([k, v]) => `${k}: "${v}"`));
        }
        
        // Extract document type and category information
        const docType = String(record['DOCTYPE'] || record['DocType'] || record['Document Type'] || record['Type'] || 'General');
        const category = String(record['CATEGORY'] || record['Category'] || record['category'] || 
                               record['DOCUMENT_CATEGORY'] || record['Document Category'] || 'General');
        const vendor = String(record['VENDOR_NAME'] || record['Vendor'] || record['vendor'] || 'Unknown');
        const rawStatus = String(record['CURRENT_STATUS'] || record['current_status'] || record['Current Status'] || record['Status'] || '---');
        
        // Extract real submission date from Excel
        const rawSubmissionDate = record['ATLAS_LATEST_SUB_DATE'] || record['ATLAS_LASTEST_SUB_DATE'] || record['ATLAS LATEST SUB DATE'] || 
                                 record['SUBMISSION_DATE'] || record['Submission Date'] || record['submission_date'];
        
        // Parse Excel date - handle various date formats
        let submissionDate = new Date();
        if (rawSubmissionDate && rawSubmissionDate !== '---' && rawSubmissionDate !== '') {
          try {
            // Handle Excel serial date numbers
            if (typeof rawSubmissionDate === 'number' && rawSubmissionDate > 40000) {
              // Excel date serial number (days since 1900-01-01)
              submissionDate = new Date((rawSubmissionDate - 25569) * 86400 * 1000);
            } else if (typeof rawSubmissionDate === 'string') {
              submissionDate = new Date(rawSubmissionDate);
            }
            // Validate the date
            if (isNaN(submissionDate.getTime())) {
              submissionDate = new Date(); // fallback to current date
            }
          } catch (e) {
            submissionDate = new Date(); // fallback to current date
          }
        }
        
        // Log document info including title and category for debugging
        if (index < 5) {
          console.log(`📊 Document ${index + 1}:`);
          console.log(`   DOC_NAME raw value: "${record['DOC_NAME']}"`);
          console.log(`   Title extracted: "${title}"`);
          console.log(`   Category: "${category}"`);
          console.log(`   Status: "${rawStatus}"`);
          console.log(`   Submission date: "${rawSubmissionDate}" -> ${submissionDate.toISOString().split('T')[0]}`);
        }
        
        // Normalize status codes to proper format
        let displayStatus = rawStatus;
        
        // Handle common status variations - map Excel values to display format
        if (rawStatus === '---' || rawStatus === '' || rawStatus === 'undefined' || rawStatus === 'null') {
          displayStatus = 'Pending';
        } else if (rawStatus === 'Code 1') {
          displayStatus = 'CODE1';
        } else if (rawStatus === 'Code 2') {
          displayStatus = 'CODE2';
        } else if (rawStatus === 'Code 3') {
          displayStatus = 'CODE3';
        } else if (rawStatus === 'UR (ATJV)') {
          displayStatus = 'UR(ATJV)';
        } else if (rawStatus === 'AR (ATJV)') {
          displayStatus = 'AR(ATJV)';
        } else if (rawStatus === 'UR (DAR)') {
          displayStatus = 'UR(DAR)';
        } else if (rawStatus === 'RTN (ATLS)') {
          displayStatus = 'RTN(ATLS)';
        } else {
          // Keep original if no mapping found
          displayStatus = rawStatus;
        }
        
        return {
          id: index + 1,
          documentId: `DOC-${Date.now()}-${index}`,
          title: title,
          documentType: docType,
          category: category,
          vendor: vendor,
          currentStatus: displayStatus,
          submittedDate: submissionDate,
          lastUpdated: new Date(),
          priority: 'Medium'
        };
      }).filter(Boolean);
      
      // Log status summary
      const statusCounts = this.documentsCache.reduce((acc: any, doc) => {
        acc[doc.currentStatus] = (acc[doc.currentStatus] || 0) + 1;
        return acc;
      }, {});
      console.log('Document status distribution:', statusCounts);
      
    } catch (error) {
      console.error('❌ Failed to load document submittals:', error);
      this.documentsCache = [];
    }
  }

  private async loadShopDrawings(): Promise<void> {
    try {
      console.log('🏗️ Loading shop drawings from Excel...');
      const filePath = join(process.cwd(), 'attached_assets', 'Shop Drawing Log.xlsx');
      const buffer = await readFile(filePath);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Filter out header rows and empty rows
      const dataRows = rawData.filter((row, index) => {
        if (!row || row.length === 0) return false;
        
        const headerTerms = ['Project Name:', 'Contract No:', 'Client :', 'Consultant:', 'Sub Contractor:', 'System Package:', 'discipline:', 'DISC:', 'DISCIPLINE'];
        const rowString = row.join(' ').toLowerCase();
        
        return !headerTerms.some(term => rowString.includes(term.toLowerCase()));
      });
      
      // Show first few rows to understand structure
      console.log('Shop Drawing Log - first 3 rows:');
      for (let i = 0; i < Math.min(dataRows.length, 3); i++) {
        const row = dataRows[i];
        console.log(`Row ${i}:`, row.slice(0, 5).join(' | '));
      }
      
      // Find the actual header row - try multiple patterns
      let headerRowIndex = -1;
      let headers: any[] = [];
      
      for (let i = 0; i < Math.min(dataRows.length, 15); i++) {
        const row = dataRows[i];
        const rowStr = row.join('|').toUpperCase();
        
        // Try different header patterns for shop drawings
        if ((rowStr.includes('SN') || rowStr.includes('S/N')) && 
            (rowStr.includes('STATUS') || rowStr.includes('TITLE') || rowStr.includes('DRAWING'))) {
          headerRowIndex = i;
          headers = row.map((h: any) => String(h || '').trim());
          console.log('Found shop drawing header row at index', i, 'with', headers.length, 'columns');
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        console.warn('⚠️ Could not find header row in shop drawing log');
        return;
      }
      
      const records = dataRows.slice(headerRowIndex + 1);
      
      this.shopDrawingsCache = records.map((row, index) => {
        const record: any = {};
        headers.forEach((header, i) => {
          record[header] = row[i];
        });
        
        // Extract drawing number and system instead of title and vendor
        const drawingNumber = String(record['Drawing Number'] || record['DRAWING_NUMBER'] || record['drawing_number'] || 
                                   record['Drawing No'] || record['DRAWING_NO'] || `SD-${index + 1}`);
        const system = String(record['System'] || record['SYSTEM'] || record['system'] || 
                             record['SYSTEM PACKAGE'] || record['System Package'] || 'General');
        const type = String(record['TYPE'] || record['Type'] || record['Drawing Type'] || record['DOCTYPE'] || 'General');
        
        // Skip header rows that contain column names as data
        if (system === 'SYSTEM' || system === 'System' || drawingNumber === 'DRAWING_NUMBER' || 
            drawingNumber === 'Drawing Number' || system.toLowerCase().includes('header') ||
            drawingNumber === 'DRAWING NUMBER') {
          return null;
        }
        
        // Extract real submission date from Shop Drawing Excel
        const rawSubmissionDate = record['SUBMISSION DTAE'] || record['SUBMISSION_DTAE'] || record['SUBMISSION DATE'] || 
                                 record['SUBMISSION_DATE'] || record['Submission Date'] || record['submission_date'];
        
        // Parse Excel date - handle various date formats
        let submissionDate = new Date();
        if (rawSubmissionDate && rawSubmissionDate !== '---' && rawSubmissionDate !== '') {
          try {
            // Handle Excel serial date numbers
            if (typeof rawSubmissionDate === 'number' && rawSubmissionDate > 40000) {
              // Excel date serial number (days since 1900-01-01)
              submissionDate = new Date((rawSubmissionDate - 25569) * 86400 * 1000);
            } else if (typeof rawSubmissionDate === 'string') {
              submissionDate = new Date(rawSubmissionDate);
            }
            // Validate the date
            if (isNaN(submissionDate.getTime())) {
              submissionDate = new Date(); // fallback to current date
            }
          } catch (e) {
            submissionDate = new Date(); // fallback to current date
          }
        }
        
        // Extract status from shop drawings - avoid header contamination
        let rawStatus = String(record['LATEST STATUS'] || record['latest_status'] || record['Latest Status'] || 
                              record['CURRENT_STATUS'] || record['current_status'] || record['Current Status'] || 
                              record['STATUS'] || record['Status'] || '---');
        
        // Clean header contamination - if it contains column header names, treat as pending
        if (rawStatus.includes('LATEST_STATUS') || rawStatus.includes('LATEST STATUS') || 
            rawStatus.includes('ALTAS_LATEST_SUB_DATE') || rawStatus.toLowerCase().includes('header')) {
          rawStatus = '---';
        }
        
        // Extract sub-system for additional data
        const subSystem = String(record['Sub-System'] || record['SUB_SYSTEM'] || record['sub_system'] || 
                                record['Sub System'] || record['SUB-SYSTEM'] || 'General');

        // Log info for first few shop drawings
        if (index < 3) {
          console.log(`Shop Drawing ${index + 1}: System="${system}", Status="${rawStatus}", SubSystem="${subSystem}"`);
        }
        
        // Normalize status codes to proper format (same logic as documents)
        let displayStatus = rawStatus;
        
        if (rawStatus === '---' || rawStatus === '' || rawStatus === 'undefined' || rawStatus === 'null') {
          displayStatus = 'Pending';
        } else if (rawStatus === 'Code 1') {
          displayStatus = 'CODE1';
        } else if (rawStatus === 'Code 2') {
          displayStatus = 'CODE2';
        } else if (rawStatus === 'Code 3') {
          displayStatus = 'CODE3';
        } else if (rawStatus === 'UR (ATJV)') {
          displayStatus = 'UR(ATJV)';
        } else if (rawStatus === 'AR (ATJV)') {
          displayStatus = 'AR(ATJV)';
        } else if (rawStatus === 'UR (DAR)') {
          displayStatus = 'UR(DAR)';
        } else if (rawStatus === 'RTN (ATLS)') {
          displayStatus = 'RTN(ATLS)';
        } else if (rawStatus === 'RTN (AS)') {
          displayStatus = 'RTN(AS)';
        } else {
          // Keep original if no mapping found
          displayStatus = rawStatus;
        }
        
        // Determine system type based on ICT, GSM-DAS, and TETRA
        let systemType = 'General';
        const systemPatterns = {
          'ICT': 'ICT',
          'GSM-DAS': 'GSM-DAS',
          'TETRA': 'TETRA'
        };
        
        for (const [code, name] of Object.entries(systemPatterns)) {
          if (system.toUpperCase().includes(code) || type.toUpperCase().includes(code) || 
              drawingNumber.toUpperCase().includes(code)) {
            systemType = name;
            break;
          }
        }
        
        return {
          id: index + 1,
          drawingId: `SD-${Date.now()}-${index}`,
          drawingNumber: drawingNumber,
          system: system,
          subSystem: subSystem,
          drawingType: systemType,
          currentStatus: displayStatus,
          submittedDate: submissionDate,
          lastUpdated: new Date(),
          priority: 'Medium'
        };
      }).filter(Boolean);
      
      // Additional filter to remove any remaining header contamination
      this.shopDrawingsCache = this.shopDrawingsCache.filter(drawing => 
        drawing.system !== 'SYSTEM' && drawing.system !== 'System' && 
        drawing.drawingNumber !== 'DRAWING_NUMBER' && drawing.drawingNumber !== 'Drawing Number'
      );
      
      // Log shop drawing status summary
      const shopStatusCounts = this.shopDrawingsCache.reduce((acc: any, sd) => {
        acc[sd.currentStatus] = (acc[sd.currentStatus] || 0) + 1;
        return acc;
      }, {});
      console.log('Shop Drawing status distribution:', shopStatusCounts);
      
    } catch (error) {
      console.error('❌ Failed to load shop drawings:', error);
      this.shopDrawingsCache = [];
    }
  }

  private async loadRAQData(): Promise<void> {
    console.log('🔄 Loading RAQ data...');
    try {
      console.log('📄 Starting RAQ documents processing...');
      this.raqDocumentsCache = await processRAQDocuments();
      console.log('🏗️ Starting RAQ shop drawings processing...');
      this.raqShopDrawingsCache = await processRAQShopDrawings();
      console.log(`✅ Loaded ${this.raqDocumentsCache.length} RAQ documents and ${this.raqShopDrawingsCache.length} RAQ shop drawings`);
    } catch (error) {
      console.error('❌ Error loading RAQ data:', error);
      console.error('❌ RAQ Error details:', error.message);
      this.raqDocumentsCache = [];
      this.raqShopDrawingsCache = [];
    }
  }
}

// RAQ Document Processing
async function processRAQDocuments(): Promise<any[]> {
  try {
    console.log('📄 Loading RAQ document submittals from Excel...');
    const filePath = join(process.cwd(), 'attached_assets', 'Document Submittal Log-RAQ_1755061638473.xlsx');
    
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.error('❌ RAQ document file not found:', filePath);
      return [];
    }
    
    console.log('✅ RAQ document file found, reading...');
    const buffer = await readFile(filePath);
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    console.log('🔍 RAQ document file structure - first 12 rows:');
    for (let i = 0; i < Math.min(12, rawData.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(rawData[i]));
    }
    
    // Header row is at index 7, data starts from row 9 (index 8)
    const headerRow = rawData[7];
    const dataStartRow = 8;
    
    console.log('📋 Found RAQ document header at row 7:', headerRow);
    
    const documents: any[] = [];
    let processedCount = 0;
    
    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      // Skip empty rows or rows that don't have basic data
      const documentType = row[3]; // DOCTYPE column
      const documentName = row[6]; // DNAME column
      
      if (!documentType && !documentName) continue;
      
      try {
        const document = {
          id: processedCount + 1,
          documentId: `RAQ-DOC-${processedCount + 1}`,
          title: documentName || 'Untitled Document',
          vendor: 'N/A', // RAQ files have no vendors as mentioned
          documentType: documentType || 'Unknown',
          category: row[4] || 'Project Submittal', // CATEGORIES column
          discipline: row[2] || 'General', // DISCIPLINE column
          system: 'N/A',
          currentStatus: row[12] || 'UR', // STATUS0 column
          submittedAt: row[9] ? new Date(row[9]) : null, // STD0 column
          submittedDate: row[9] ? new Date(row[9]) : null,
          lastUpdated: new Date(),
          priority: 'Medium'
        };
        
        documents.push(document);
        processedCount++;
      } catch (error) {
        console.warn(`⚠️ Error processing RAQ document row ${i}:`, error);
      }
    }
    
    console.log(`✅ Loaded ${documents.length} RAQ document submittals`);
    return documents;
  } catch (error) {
    console.error('❌ Error loading RAQ documents:', error);
    return [];
  }
}

// RAQ Shop Drawing Processing
async function processRAQShopDrawings(): Promise<any[]> {
  try {
    console.log('🏗️ Loading RAQ shop drawings from Excel...');
    const filePath = join(process.cwd(), 'attached_assets', 'Shop Drawing Log - RAQ (Updated)_1755061644271.xlsx');
    
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.error('❌ RAQ shop drawing file not found:', filePath);
      return [];
    }
    
    console.log('✅ RAQ shop drawing file found, reading...');
    const buffer = await readFile(filePath);
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    console.log('🔍 RAQ shop drawing file structure - first 10 rows:');
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(rawData[i]));
    }
    
    // Header row is at index 7, data starts from row 9 (index 8)
    const headerRow = rawData[7];
    const dataStartRow = 8;
    
    console.log('📋 Found RAQ shop drawing header at row 7:', headerRow);
    
    const shopDrawings: any[] = [];
    let processedCount = 0;
    
    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      // Skip empty rows or rows that don't have basic data
      const buildingName = row[1]; // BUILDINGS NAME column
      const description = row[15]; // DESCRIPTION column
      const system = row[11]; // SYSTEM column
      
      if (!buildingName && !description) continue;
      
      try {
        const shopDrawing = {
          id: processedCount + 1,
          drawingId: `RAQ-SD-${processedCount + 1}`,
          title: description || 'Untitled Drawing',
          drawingNumber: row[14] || `RAQ-${processedCount + 1}`, // ATLAS DRAWING NUMBER
          buildingName: buildingName || 'Unknown Building',
          system: system || 'Unknown System',
          subSystem: row[12] || 'General', // SUB SYSTEM column
          discipline: row[4] || 'General', // DISCIPLINE CODE column
          currentStatus: row[23] || 'UR', // LATEST STATUS column
          submittedAt: row[21] ? new Date(row[21]) : null, // SUBMISSION DTAE column
          submittedDate: row[21] ? new Date(row[21]) : null,
          lastUpdated: new Date(),
          priority: 'Medium'
        };
        
        shopDrawings.push(shopDrawing);
        processedCount++;
      } catch (error) {
        console.warn(`⚠️ Error processing RAQ shop drawing row ${i}:`, error);
      }
    }
    
    console.log(`✅ Loaded ${shopDrawings.length} RAQ shop drawings`);
    return shopDrawings;
  } catch (error) {
    console.error('❌ Error loading RAQ shop drawings:', error);
    return [];
  }
}

export const excelService = new ExcelService();