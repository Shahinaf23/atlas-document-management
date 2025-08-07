import { readFile } from 'fs/promises';
import { join } from 'path';
import { storage } from './storage';
import * as xlsx from 'xlsx';

export async function initializeDataFromExcel() {
  console.log('🚀 Initializing data from Excel files...');
  
  try {
    // Check if data already exists
    const existingDocs = await storage.getAllDocuments();
    const existingDrawings = await storage.getAllShopDrawings();
    
    if (existingDocs.length === 0) {
      console.log('📄 Loading Document Submittal Log...');
      await loadDocumentSubmittals();
    } else {
      console.log('📄 Documents already loaded, skipping...');
    }
    
    if (existingDrawings.length === 0) {
      console.log('🏗️ Loading Shop Drawing Log...');
      await loadShopDrawings();
    } else {
      console.log('🏗️ Shop drawings already loaded, skipping...');
    }
    
    console.log('✅ Data initialization complete');
  } catch (error) {
    console.error('❌ Failed to initialize data from Excel files:', error);
  }
}

async function loadDocumentSubmittals() {
  try {
    const filePath = join(process.cwd(), 'attached_assets', 'Document Submittal Log_1753075831260.xlsx');
    const buffer = await readFile(filePath);
    
    // Parse Excel file using xlsx with proper header handling
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Advanced Excel parsing to extract actual discipline data
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    console.log('📊 Raw sheet rows:', rawData.length);
    
    // Filter out header rows and empty rows
    const dataRows = rawData.filter((row, index) => {
      if (!row || row.length === 0) return false;
      
      // Skip header rows containing these terms
      const headerTerms = ['Project Name:', 'Contract No:', 'Client :', 'Consultant:', 'Sub Contractor:', 'System Package:', 'discipline:', 'DISC:', 'DISCIPLINE'];
      const rowString = row.join(' ').toLowerCase();
      
      return !headerTerms.some(term => rowString.includes(term.toLowerCase()));
    });
    
    console.log('📊 Data rows after filtering headers:', dataRows.length);
    
    if (dataRows.length > 0) {
      console.log('📋 Sample filtered rows:', dataRows.slice(0, 5));
    }
    
    // Find the actual header row by looking for the correct column names
    let headerRowIndex = -1;
    let headers: any[] = [];
    
    for (let i = 0; i < Math.min(dataRows.length, 10); i++) {
      const row = dataRows[i];
      const rowStr = row.join('|').toUpperCase();
      if (rowStr.includes('DOCTYPE') || rowStr.includes('CURRENT_STATUS') || rowStr.includes('VENDOR_NAME')) {
        headerRowIndex = i;
        headers = row.map((h: any) => String(h || '').trim());
        console.log('📋 Found header row at index:', i);
        console.log('📋 Headers:', headers);
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.log('❌ Could not find header row, using fallback mapping');
      return;
    }
    
    // Extract actual data starting after headers
    const actualDataRows = dataRows.slice(headerRowIndex + 1);
    
    // Find column indices for the fields we need
    const getColumnIndex = (patterns: string[]) => {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toUpperCase();
        if (patterns.some(pattern => header.includes(pattern.toUpperCase()))) {
          return i;
        }
      }
      return -1;
    };
    
    const docTypeIndex = getColumnIndex(['DOCTYPE', 'DOC_TYPE', 'DOCUMENT_TYPE']);
    const vendorIndex = getColumnIndex(['VENDOR_NAME', 'VENDOR']);
    const docNameIndex = getColumnIndex(['DOC_NAME', 'DOCUMENT_NAME', 'NAME']);
    const disciplineIndex = getColumnIndex(['DISC', 'DISCIPLINE']);
    const statusIndex = getColumnIndex(['CURRENT_STATUS', 'STATUS']);
    
    console.log('📋 Column mapping:');
    console.log('  - Document Type:', docTypeIndex, headers[docTypeIndex]);
    console.log('  - Vendor:', vendorIndex, headers[vendorIndex]);
    console.log('  - Document Name:', docNameIndex, headers[docNameIndex]);
    console.log('  - Discipline:', disciplineIndex, headers[disciplineIndex]);
    console.log('  - Current Status:', statusIndex, headers[statusIndex]);
    
    const data = actualDataRows.map((row, index) => {
      // Extract actual data using column indices
      const documentType = docTypeIndex >= 0 ? String(row[docTypeIndex] || 'General').trim() : 'General';
      const vendor = vendorIndex >= 0 ? String(row[vendorIndex] || 'Unknown').trim() : 'Unknown';
      const title = docNameIndex >= 0 ? String(row[docNameIndex] || 'Document').trim() : 'Document';
      const discipline = disciplineIndex >= 0 ? String(row[disciplineIndex] || 'General').trim() : 'General';
      let currentStatus = statusIndex >= 0 ? String(row[statusIndex] || '---').trim() : '---';
      // Replace --- with Pending
      if (currentStatus === '---') {
        currentStatus = 'Pending';
      }
      
      // Clean up the discipline field - remove any contamination
      let cleanDiscipline = discipline;
      if (discipline.toLowerCase().includes('disc') || discipline === '1' || discipline === '') {
        cleanDiscipline = 'General';
      }
      
      return {
        documentId: `DOC-${Date.now()}-${index}`,
        title: title || 'Document',
        vendor: vendor || 'Unknown',
        documentType: documentType || 'General', // Use actual document type from Excel
        currentStatus: currentStatus || 'Pending', // Use actual status from Excel (--- replaced with Pending)
        submittedDate: new Date(),
        priority: 'Medium',
        discipline: cleanDiscipline // Keep discipline as separate field
      };
    }).filter(doc => 
      doc.title && 
      doc.title !== 'Document' && 
      doc.title.length > 1 &&
      !doc.title.toLowerCase().includes('disc')
    );
    
    console.log(`📊 Converted ${data.length} document records`);
    
    // Debug: Log some sample records to understand the status values
    if (data.length > 0) {
      console.log('📋 Sample document records:');
      data.slice(0, 5).forEach((doc, i) => {
        console.log(`  ${i+1}. Status: "${doc.currentStatus}" | Title: "${doc.title}" | Type: "${doc.documentType}"`);
      });
      
      // Count status distribution
      const statusCounts = data.reduce((acc: Record<string, number>, doc) => {
        acc[doc.currentStatus] = (acc[doc.currentStatus] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Status distribution in Excel data:', statusCounts);
    }
    
    let importCount = 0;
    for (const record of data) {
      try {
        await storage.createDocument(record);
        importCount++;
      } catch (err) {
        console.warn('⚠️ Failed to import document row:', err);
      }
    }
    
    console.log(`✅ Imported ${importCount} documents`);
  } catch (error) {
    console.error('❌ Failed to load document submittals:', error);
  }
}

async function loadShopDrawings() {
  try {
    const filePath = join(process.cwd(), 'attached_assets', 'Shop Drawing Log_1753075837202.xlsx');
    const buffer = await readFile(filePath);
    
    // Parse Excel file using xlsx
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Advanced Excel parsing for shop drawings  
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    console.log('📊 Raw sheet rows:', rawData.length);
    
    // Filter out header rows and empty rows for shop drawings
    const dataRows = rawData.filter((row, index) => {
      if (!row || row.length === 0) return false;
      
      // Skip header rows containing these terms
      const headerTerms = ['Project Name:', 'Contract No:', 'Client :', 'Consultant:', 'Sub Contractor:', 'System Package:', 'discipline:', 'DISC:', 'DISCIPLINE', 'project name', 'contract no'];
      const rowString = row.join(' ').toLowerCase();
      
      return !headerTerms.some(term => rowString.includes(term.toLowerCase()));
    });
    
    console.log('📊 Data rows after filtering headers:', dataRows.length);
    
    if (dataRows.length > 0) {
      console.log('📋 Sample filtered rows:', dataRows.slice(0, 5));
    }
    
    // Extract shop drawing data with proper discipline mapping
    const data = dataRows.map((row, index) => {
      if (!row || row.length < 4) return null;
      
      const title = String(row[0] || '').trim();
      const type = String(row[1] || '').trim();
      const revision = String(row[2] || '').trim();
      const status = String(row[3] || '').trim();
      
      // Skip invalid rows
      if (!title || title === 'SN' || title === 'Unknown Drawing') return null;
      
      // Extract discipline from title or type
      let discipline = 'General';
      const disciplinePatterns = {
        'ICT': 'Information & Communication Technology',
        'MEP': 'Mechanical, Electrical & Plumbing', 
        'HVAC': 'Heating, Ventilation & Air Conditioning',
        'STRUCT': 'Structural',
        'ARCH': 'Architectural',
        'FIRE': 'Fire Protection',
        'SEC': 'Security Systems',
        'ELEC': 'Electrical',
        'MECH': 'Mechanical',
        'PLUMB': 'Plumbing'
      };
      
      for (const [code, name] of Object.entries(disciplinePatterns)) {
        if (title.toUpperCase().includes(code) || type.toUpperCase().includes(code)) {
          discipline = name;
          break;
        }
      }
      
      return {
        drawingId: `SD-${Date.now()}-${index}`,
        title: title,
        drawingType: discipline,
        revision: revision || 'A',
        currentStatus: status || '---',
        submittedDate: new Date(),
        priority: 'Medium'
      };
    }).filter(Boolean); // Remove null entries
    
    console.log(`📊 Converted ${data.length} shop drawing records`);
    
    let importCount = 0;
    for (const record of data) {
      try {
        await storage.createShopDrawing(record);
        importCount++;
      } catch (err) {
        console.warn('⚠️ Failed to import shop drawing row:', err);
      }
    }
    
    console.log(`✅ Imported ${importCount} shop drawings`);
  } catch (error) {
    console.error('❌ Failed to load shop drawings:', error);
  }
}

function formatDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  try {
    if (typeof dateValue === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    } else if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    } else if (dateValue instanceof Date) {
      return dateValue;
    }
  } catch (error) {
    console.warn('Failed to parse date:', dateValue);
  }
  
  return null;
}