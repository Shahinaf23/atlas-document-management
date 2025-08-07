import express from "express";
import multer from "multer";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { excelService } from "../excel-service-new";
import { productionExcelService } from "../production-excel-service";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log('🔍 [MULTER] File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname?.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      console.error('❌ [MULTER] Invalid file type:', file.mimetype);
      cb(new Error('Only Excel files (.xlsx) are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Admin upload endpoint - Production Ready
router.post('/upload-excel', upload.single('file'), async (req, res) => {
  try {
    console.log('📁 [ADMIN] Upload request received');
    console.log('📋 Request body:', req.body);
    console.log('📄 File info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ 
        error: 'No file uploaded',
        debug: {
          hasFile: !!req.file,
          bodyKeys: Object.keys(req.body),
          contentType: req.headers['content-type']
        }
      });
    }

    const { fileType } = req.body;
    console.log('🏷️ File type:', fileType);
    
    if (!fileType || (fileType !== 'document_submittal' && fileType !== 'shop_drawing')) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        received: fileType,
        expected: ['document_submittal', 'shop_drawing']
      });
    }

    // Determine file name based on type
    const fileName = fileType === 'document_submittal' 
      ? 'Document Submittal Log.xlsx'
      : 'Shop Drawing Log.xlsx';

    // Ensure attached_assets directory exists
    const attachedAssetsDir = join(process.cwd(), 'attached_assets');
    if (!existsSync(attachedAssetsDir)) {
      await mkdir(attachedAssetsDir, { recursive: true });
    }

    // Write the uploaded file
    const filePath = join(attachedAssetsDir, fileName);
    await writeFile(filePath, req.file.buffer);

    console.log(`📁 [ADMIN] Uploaded new ${fileType} file: ${fileName} (${req.file.size} bytes)`);

    // Validate the uploaded file using production service
    const validationType = fileType === 'document_submittal' ? 'document' : 'shop_drawing';
    const validationResult = await productionExcelService.validateAndExtractExcel(filePath, validationType);

    if (!validationResult.success) {
      console.error('❌ [ADMIN] File validation failed:', validationResult.errors);
      return res.status(400).json({
        error: 'File validation failed',
        details: validationResult.errors,
        totalRows: validationResult.totalRows,
        headerRow: validationResult.headerRow,
      });
    }

    console.log(`✅ [ADMIN] File validated successfully: ${validationResult.data.length} records`);

    // Force refresh Excel data to load the new file
    const { documents: docCount, shopDrawings: sdCount } = await excelService.refreshAfterUpload();
    
    const recordCount = fileType === 'document_submittal' ? docCount : sdCount;

    res.json({
      success: true,
      message: `${fileName} uploaded and processed successfully`,
      fileName,
      recordCount,
      totalDocuments: docCount,
      totalShopDrawings: sdCount,
      validation: {
        headerDetected: validationResult.headerRow,
        totalRows: validationResult.totalRows,
        processedRows: validationResult.processedRows,
        errors: validationResult.errors.length,
        columns: validationResult.columns.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

// Get upload history endpoint
router.get('/upload-history', async (req, res) => {
  try {
    // This would typically fetch from database
    // For now, return basic info about current files
    const documents = await excelService.getDocuments();
    const shopDrawings = await excelService.getShopDrawings();
    
    res.json({
      uploads: [
        {
          id: 1,
          fileName: 'Document Submittal Log.xlsx',
          fileType: 'document_submittal',
          recordCount: documents.length,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin',
        },
        {
          id: 2,
          fileName: 'Shop Drawing Log.xlsx',
          fileType: 'shop_drawing',
          recordCount: shopDrawings.length,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin',
        },
      ],
    });
  } catch (error) {
    console.error('❌ Error fetching upload history:', error);
    res.status(500).json({ error: 'Failed to fetch upload history' });
  }
});

export default router;