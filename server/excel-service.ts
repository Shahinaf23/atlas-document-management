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

  async forceRefresh(): Promise<void> {
    console.log('🔄 Force refreshing Excel data...');
    try {
      await this.loadDocumentSubmittals();
      await this.loadShopDrawings();
      this.lastRefresh = new Date();
      console.log('✅ Excel data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing Excel data:', error);
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
}

export const excelService = new ExcelService();