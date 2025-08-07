/**
 * CSV Service for Atlas Document Management System
 * 
 * This service loads preprocessed CSV data and provides it to the dashboard.
 * It works alongside the Python preprocessor to handle Excel data efficiently.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DocumentRecord {
  id: number;
  documentId: string;
  title: string;
  documentType: string;
  vendor: string;
  category: string;
  discipline: string;
  currentStatus: string;
  isSubmitted: boolean;
  submittedDate: string;
  priority: string;
  lastUpdated: string;
}

interface ShopDrawingRecord {
  id: number;
  drawingId: string;
  drawingNumber: string;
  title: string;
  system: string;
  subSystem: string;
  projectNumber: string;
  building: string;
  floor: string;
  currentStatus: string;
  isSubmitted: boolean;
  submittedDate: string;
  priority: string;
  lastUpdated: string;
}

class CSVService {
  private documentsCache: DocumentRecord[] = [];
  private shopDrawingsCache: ShopDrawingRecord[] = [];
  private lastUpdateTime: number = 0;
  private readonly csvDir = join(process.cwd(), 'processed_data');
  private readonly pythonScript = join(process.cwd(), 'scripts', 'excel_preprocessor.py');

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Run initial preprocessing
      await this.runPreprocessor();
      
      // Load initial data
      await this.loadCSVData();
      
      // Set up automatic refresh every 30 seconds
      setInterval(async () => {
        try {
          await this.refreshData();
        } catch (error) {
          console.error('❌ Error during automatic refresh:', error);
        }
      }, 30000);
      
    } catch (error) {
      console.error('❌ Error initializing CSV service:', error);
    }
  }

  private async runPreprocessor(force: boolean = false): Promise<void> {
    try {
      console.log('🐍 Running Python preprocessor...');
      
      const command = force 
        ? `python3 "${this.pythonScript.replace('excel_preprocessor.py', 'excel_preprocessor_fixed.py')}" --force`
        : `python3 "${this.pythonScript.replace('excel_preprocessor.py', 'excel_preprocessor_fixed.py')}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stdout) {
        console.log('📊 Preprocessor output:', stdout);
      }
      
      if (stderr) {
        console.warn('⚠️ Preprocessor warnings:', stderr);
      }
      
    } catch (error) {
      console.error('❌ Error running preprocessor:', error);
      throw error;
    }
  }

  private async loadCSVData(): Promise<void> {
    try {
      await Promise.all([
        this.loadDocuments(),
        this.loadShopDrawings()
      ]);
      
      this.lastUpdateTime = Date.now();
      console.log(`✅ CSV data loaded: ${this.documentsCache.length} documents, ${this.shopDrawingsCache.length} shop drawings`);
      
    } catch (error) {
      console.error('❌ Error loading CSV data:', error);
      throw error;
    }
  }

  private async loadDocuments(): Promise<void> {
    try {
      const csvPath = join(this.csvDir, 'documents.csv');
      const csvContent = await readFile(csvPath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        cast: (value, context) => {
          // Cast appropriate fields to correct types
          if (context.column === 'id') return parseInt(value);
          if (context.column === 'isSubmitted') return value === 'true' || value === 'True';
          return value;
        }
      });
      
      this.documentsCache = records.map((record: any) => ({
        ...record,
        submittedDate: record.submittedDate ? new Date(record.submittedDate) : new Date(),
        lastUpdated: record.lastUpdated ? new Date(record.lastUpdated) : new Date()
      }));
      
    } catch (error) {
      console.error('❌ Error loading documents CSV:', error);
      this.documentsCache = [];
    }
  }

  private async loadShopDrawings(): Promise<void> {
    try {
      const csvPath = join(this.csvDir, 'shop_drawings.csv');
      const csvContent = await readFile(csvPath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        cast: (value, context) => {
          // Cast appropriate fields to correct types
          if (context.column === 'id') return parseInt(value);
          if (context.column === 'isSubmitted') return value === 'true' || value === 'True';
          return value;
        }
      });
      
      this.shopDrawingsCache = records.map((record: any) => ({
        ...record,
        submittedDate: record.submittedDate ? new Date(record.submittedDate) : new Date(),
        lastUpdated: record.lastUpdated ? new Date(record.lastUpdated) : new Date()
      }));
      
    } catch (error) {
      console.error('❌ Error loading shop drawings CSV:', error);
      this.shopDrawingsCache = [];
    }
  }

  public async refreshData(): Promise<void> {
    try {
      // Run preprocessor to check for changes
      await this.runPreprocessor();
      
      // Reload CSV data
      await this.loadCSVData();
      
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    }
  }

  public async forceRefresh(): Promise<void> {
    try {
      console.log('🔄 Force refreshing CSV data...');
      
      // Run preprocessor with force flag
      await this.runPreprocessor(true);
      
      // Reload CSV data
      await this.loadCSVData();
      
    } catch (error) {
      console.error('❌ Error force refreshing data:', error);
    }
  }

  public getDocuments(): DocumentRecord[] {
    return this.documentsCache;
  }

  public getShopDrawings(): ShopDrawingRecord[] {
    return this.shopDrawingsCache;
  }

  public getDocumentById(id: number): DocumentRecord | undefined {
    return this.documentsCache.find(doc => doc.id === id);
  }

  public getShopDrawingById(id: number): ShopDrawingRecord | undefined {
    return this.shopDrawingsCache.find(drawing => drawing.id === id);
  }

  public getDocumentsByVendor(vendor: string): DocumentRecord[] {
    return this.documentsCache.filter(doc => 
      doc.vendor.toLowerCase().includes(vendor.toLowerCase())
    );
  }

  public getShopDrawingsBySystem(system: string): ShopDrawingRecord[] {
    return this.shopDrawingsCache.filter(drawing => 
      drawing.system.toLowerCase().includes(system.toLowerCase())
    );
  }

  public getShopDrawingsBySubSystem(subSystem: string): ShopDrawingRecord[] {
    return this.shopDrawingsCache.filter(drawing => 
      drawing.subSystem.toLowerCase().includes(subSystem.toLowerCase())
    );
  }

  public getSubmittedDocuments(): DocumentRecord[] {
    return this.documentsCache.filter(doc => doc.isSubmitted);
  }

  public getPendingDocuments(): DocumentRecord[] {
    return this.documentsCache.filter(doc => !doc.isSubmitted);
  }

  public getSubmittedShopDrawings(): ShopDrawingRecord[] {
    return this.shopDrawingsCache.filter(drawing => drawing.isSubmitted);
  }

  public getPendingShopDrawings(): ShopDrawingRecord[] {
    return this.shopDrawingsCache.filter(drawing => !drawing.isSubmitted);
  }

  public getStats() {
    const totalDocuments = this.documentsCache.length;
    const submittedDocuments = this.getSubmittedDocuments().length;
    const pendingDocuments = this.getPendingDocuments().length;
    
    const totalShopDrawings = this.shopDrawingsCache.length;
    const submittedShopDrawings = this.getSubmittedShopDrawings().length;
    const pendingShopDrawings = this.getPendingShopDrawings().length;
    
    return {
      documents: {
        total: totalDocuments,
        submitted: submittedDocuments,
        pending: pendingDocuments
      },
      shopDrawings: {
        total: totalShopDrawings,
        submitted: submittedShopDrawings,
        pending: pendingShopDrawings
      },
      lastUpdate: this.lastUpdateTime
    };
  }
}

export const csvService = new CSVService();
export type { DocumentRecord, ShopDrawingRecord };