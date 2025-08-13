import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { excelService } from "./excel-service-new";
import { emctExcelService } from "./excel-service-emct";
import { loginSchema, documentFilterSchema, shopDrawingFilterSchema, insertDocumentSchema, insertShopDrawingSchema } from "@shared/schema";
import adminRoutes from "./routes/admin";
import csvRoutes from "./routes/csv";
import * as XLSX from "xlsx";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Separate upload handler for EMCT with any field name support
const emctUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint for Render (moved to /health)
  app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Atlas Document Management System is running" });
  });
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      // Define authorized users with specific roles
      const authorizedUsers: Record<string, string> = {
        "khizer.rehman@atlassecurity.ae": "project manager",
        "deanna.g@atlassecurity.ae": "admin", 
        "shahinaf93@gmail.com": "admin"
      };
      
      // Check if user is in authorized list
      const authorizedRole = authorizedUsers[loginData.username.toLowerCase()];
      
      if (!authorizedRole) {
        // User not in authorized list - only allow viewer access
        const viewerUser = {
          id: String(Date.now()),
          username: loginData.username,
          role: "viewer",
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Create login activity for viewer
        await storage.createActivity({
          type: "system",
          entityId: String(viewerUser.id),
          action: "login",
          description: `Viewer ${viewerUser.username} logged in`,
          userId: String(viewerUser.id),
        });

        return res.json({ user: viewerUser });
      }
      
      // Verify the role matches what user submitted (must match exactly)
      if (loginData.role.toLowerCase() !== authorizedRole.toLowerCase()) {
        return res.status(401).json({ 
          message: `Access denied. User ${loginData.username} is authorized as ${authorizedRole}, not ${loginData.role}` 
        });
      }
      
      // Check if user exists in database
      let user = await storage.getUserByUsername(loginData.username);
      
      // Create or update user with authorized role
      if (!user) {
        user = await storage.createUser({
          username: loginData.username,
          role: authorizedRole,
        });
      } else {
        // Update role to match authorization (in case it changed)
        user.role = authorizedRole;
      }

      // Create login activity
      await storage.createActivity({
        type: "system",
        entityId: String(user.id),
        action: "login",
        description: `User ${user.username} logged in as ${user.role}`,
        userId: user.id,
      });

      res.json({ user });
    } catch (error) {
      res.status(400).json({ message: "Invalid login data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Document routes - Real-time Excel data
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await excelService.getDocuments();
      const filters = documentFilterSchema.parse(req.query);
      
      // Apply filters to real-time Excel data
      let filteredDocuments = documents;
      
      if (filters.status) {
        filteredDocuments = filteredDocuments.filter(doc => doc.currentStatus === filters.status);
      }
      if (filters.vendor) {
        filteredDocuments = filteredDocuments.filter(doc => doc.vendor === filters.vendor);
      }
      if (filters.documentType) {
        filteredDocuments = filteredDocuments.filter(doc => doc.documentType === filters.documentType);
      }
      
      res.json(filteredDocuments);
    } catch (error) {
      res.status(400).json({ message: "Invalid filter parameters", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    const document = await storage.getDocumentById(parseInt(req.params.id));
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(documentData);
      
      // Create activity
      await storage.createActivity({
        type: "document",
        entityId: document.documentId,
        action: "created",
        description: `Document ${document.documentId} created`,
        userId: "system", // TODO: Get from authenticated user
      });

      res.json(document);
    } catch (error) {
      res.status(400).json({ message: "Invalid document data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const updates = req.body;
      const document = await storage.updateDocument(parseInt(req.params.id), updates);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Create activity
      await storage.createActivity({
        type: "document",
        entityId: document.documentId,
        action: "updated",
        description: `Document ${document.documentId} updated`,
        userId: "system", // TODO: Get from authenticated user
      });

      res.json(document);
    } catch (error) {
      res.status(400).json({ message: "Error updating document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Shop drawing routes
  app.get("/api/shop-drawings", async (req, res) => {
    try {
      const shopDrawings = await excelService.getShopDrawings();
      const filters = shopDrawingFilterSchema.parse(req.query);
      
      // Apply filters to real-time Excel data
      let filteredShopDrawings = shopDrawings;
      
      if (filters.status) {
        filteredShopDrawings = filteredShopDrawings.filter(sd => sd.currentStatus === filters.status);
      }
      if (filters.drawingType) {
        filteredShopDrawings = filteredShopDrawings.filter(sd => sd.drawingType === filters.drawingType);
      }
      
      res.json(filteredShopDrawings);
    } catch (error) {
      res.status(400).json({ message: "Invalid filter parameters", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/shop-drawings", async (req, res) => {
    try {
      const shopDrawingData = insertShopDrawingSchema.parse(req.body);
      const shopDrawing = await storage.createShopDrawing(shopDrawingData);
      
      // Create activity
      await storage.createActivity({
        type: "shop_drawing",
        entityId: shopDrawing.drawingId,
        action: "created",
        description: `Shop drawing ${shopDrawing.drawingId} created`,
        userId: "system", // TODO: Get from authenticated user
      });

      res.json(shopDrawing);
    } catch (error) {
      res.status(400).json({ message: "Invalid shop drawing data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // EMCT Project Routes - Real-time Excel data
  app.get("/api/emct/documents", async (req, res) => {
    try {
      const documents = await emctExcelService.getDocuments();
      const filters = documentFilterSchema.parse(req.query);
      
      // Apply filters to real-time Excel data
      let filteredDocuments = documents;
      
      if (filters.status) {
        filteredDocuments = filteredDocuments.filter(doc => doc.status === filters.status);
      }
      if (filters.vendor) {
        filteredDocuments = filteredDocuments.filter(doc => doc.vendor === filters.vendor);
      }
      if (filters.documentType) {
        filteredDocuments = filteredDocuments.filter(doc => doc.category === filters.documentType);
      }
      
      res.json(filteredDocuments);
    } catch (error) {
      res.status(400).json({ message: "Invalid filter parameters", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/emct/shop-drawings", async (req, res) => {
    try {
      const shopDrawings = await emctExcelService.getShopDrawings();
      const filters = shopDrawingFilterSchema.parse(req.query);
      
      // Apply filters to real-time Excel data
      let filteredShopDrawings = shopDrawings;
      
      if (filters.status) {
        filteredShopDrawings = filteredShopDrawings.filter(sd => sd.status === filters.status);
      }
      if (filters.drawingType) {
        filteredShopDrawings = filteredShopDrawings.filter(sd => sd.system === filters.drawingType);
      }
      
      res.json(filteredShopDrawings);
    } catch (error) {
      res.status(400).json({ message: "Invalid filter parameters", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // EMCT Admin upload endpoints
  app.post("/api/emct/admin/upload", upload.fields([
    { name: 'documents', maxCount: 1 },
    { name: 'shopDrawings', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let uploadResults: any = {};

      if (files.documents && files.documents[0]) {
        // Save document file
        const docFile = files.documents[0];
        const docPath = `attached_assets/Document Submittal Log-RAQ_${Date.now()}.xlsx`;
        await require('fs/promises').writeFile(docPath, docFile.buffer);
        uploadResults.documents = { filename: docFile.originalname, path: docPath };
      }

      if (files.shopDrawings && files.shopDrawings[0]) {
        // Save shop drawing file
        const sdFile = files.shopDrawings[0];
        const sdPath = `attached_assets/Shop Drawing Log - RAQ (Updated)_${Date.now()}.xlsx`;
        await require('fs/promises').writeFile(sdPath, sdFile.buffer);
        uploadResults.shopDrawings = { filename: sdFile.originalname, path: sdPath };
      }

      // Force refresh EMCT Excel data
      const stats = await emctExcelService.refreshAfterUpload();

      res.json({
        message: "EMCT files uploaded successfully",
        uploadResults,
        stats
      });
    } catch (error) {
      console.error('EMCT Upload error:', error);
      res.status(500).json({ 
        message: "Upload failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // EMCT data refresh endpoint
  app.post("/api/emct/refresh", async (req, res) => {
    try {
      await emctExcelService.forceRefresh();
      const documents = await emctExcelService.getDocuments();
      const shopDrawings = await emctExcelService.getShopDrawings();
      
      res.json({
        message: "EMCT data refreshed successfully",
        stats: {
          documents: documents.length,
          shopDrawings: shopDrawings.length
        }
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Refresh failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Analytics routes - Real-time Excel data
  app.get("/api/analytics/overview", async (req, res) => {
    try {
      // Get real-time data from Excel files
      const documents = await excelService.getDocuments();
      const shopDrawings = await excelService.getShopDrawings();
      const activeUserCount = await storage.getActiveUserCount() || 0;

      // Calculate real-time status counts from Excel data
      const documentStatusCounts: Record<string, number> = {};
      documents.forEach(doc => {
        const status = doc.currentStatus || '---';
        documentStatusCounts[status] = (documentStatusCounts[status] || 0) + 1;
      });

      const shopDrawingStatusCounts: Record<string, number> = {};
      shopDrawings.forEach(sd => {
        const status = sd.currentStatus || '---';
        shopDrawingStatusCounts[status] = (shopDrawingStatusCounts[status] || 0) + 1;
      });

      // Calculate vendor distribution from real-time data
      const vendorDistribution: Record<string, number> = {};
      [...documents, ...shopDrawings].forEach(item => {
        const vendor = item.vendor || 'Unknown';
        vendorDistribution[vendor] = (vendorDistribution[vendor] || 0) + 1;
      });

      // Calculate metrics with real-time data
      const totalDocuments = documents.length;
      const pendingDocuments = documentStatusCounts["Pending"] || documentStatusCounts["---"] || 0;
      const submittedDocuments = Math.max(0, totalDocuments - pendingDocuments);
      const underReviewDocuments = (documentStatusCounts["UR(ATJV)"] || 0) + (documentStatusCounts["UR(DAR)"] || 0);

      const metrics = {
        activeDocuments: submittedDocuments,
        pendingDocuments,
        underReview: underReviewDocuments,
        activeUsers: activeUserCount,
        totalDocuments,
        documentStatusCounts,
        shopDrawingStatusCounts,
        vendorDistribution,
      };

      res.json(metrics);
    } catch (error) {
      console.error("Analytics error:", error);
      // Return safe defaults if there's an error
      res.json({
        activeDocuments: 0,
        pendingDocuments: 0,
        underReview: 0,
        activeUsers: 0,
        totalDocuments: 0,
        documentStatusCounts: {},
        shopDrawingStatusCounts: {},
        vendorDistribution: {},
      });
    }
  });

  app.get("/api/analytics/status-distribution", async (req, res) => {
    try {
      const documents = await excelService.getDocuments();
      const shopDrawings = await excelService.getShopDrawings();
      
      const statusCounts: Record<string, number> = {};
      [...documents, ...shopDrawings].forEach(item => {
        const status = item.currentStatus || '---';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      res.json(statusCounts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching status distribution", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/analytics/vendor-performance", async (req, res) => {
    try {
      const documents = await excelService.getDocuments();
      const shopDrawings = await excelService.getShopDrawings();
      
      const vendorDistribution: Record<string, number> = {};
      [...documents, ...shopDrawings].forEach(item => {
        const vendor = item.vendor || 'Unknown';
        vendorDistribution[vendor] = (vendorDistribution[vendor] || 0) + 1;
      });
      
      res.json(vendorDistribution);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vendor performance", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // EMCT Analytics routes - Real-time Excel data
  app.get("/api/emct/analytics/overview", async (req, res) => {
    try {
      // Get real-time data from EMCT Excel files
      const documents = await emctExcelService.getDocuments();
      const shopDrawings = await emctExcelService.getShopDrawings();
      const activeUserCount = await storage.getActiveUserCount() || 0;

      // Calculate real-time status counts from Excel data
      const documentStatusCounts: Record<string, number> = {};
      documents.forEach(doc => {
        const status = doc.status || 'PENDING';
        documentStatusCounts[status] = (documentStatusCounts[status] || 0) + 1;
      });

      const shopDrawingStatusCounts: Record<string, number> = {};
      shopDrawings.forEach(sd => {
        const status = sd.status || 'PENDING';
        shopDrawingStatusCounts[status] = (shopDrawingStatusCounts[status] || 0) + 1;
      });

      // Calculate vendor distribution from real-time data
      const vendorDistribution: Record<string, number> = {};
      [...documents, ...shopDrawings].forEach(item => {
        const vendor = item.vendor || 'Unknown';
        vendorDistribution[vendor] = (vendorDistribution[vendor] || 0) + 1;
      });

      // Calculate metrics with real-time data
      const totalDocuments = documents.length;
      const pendingDocuments = documentStatusCounts["PENDING"] || 0;
      const submittedDocuments = Math.max(0, totalDocuments - pendingDocuments);
      const underReviewDocuments = (documentStatusCounts["UR"] || 0) + (documentStatusCounts["UNDER REVIEW"] || 0);

      const metrics = {
        activeDocuments: submittedDocuments,
        pendingDocuments,
        underReview: underReviewDocuments,
        activeUsers: activeUserCount,
        totalDocuments,
        documentStatusCounts,
        shopDrawingStatusCounts,
        vendorDistribution,
      };

      res.json(metrics);
    } catch (error) {
      console.error("EMCT Analytics error:", error);
      // Return safe defaults if there's an error
      res.json({
        activeDocuments: 0,
        pendingDocuments: 0,
        underReview: 0,
        activeUsers: 0,
        totalDocuments: 0,
        documentStatusCounts: {},
        shopDrawingStatusCounts: {},
        vendorDistribution: {},
      });
    }
  });

  app.get("/api/emct/analytics/status-distribution", async (req, res) => {
    try {
      const documents = await emctExcelService.getDocuments();
      const shopDrawings = await emctExcelService.getShopDrawings();
      
      const statusCounts: Record<string, number> = {};
      [...documents, ...shopDrawings].forEach(item => {
        const status = item.status || 'PENDING';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      res.json(statusCounts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching EMCT status distribution", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/emct/analytics/vendor-performance", async (req, res) => {
    try {
      const documents = await emctExcelService.getDocuments();
      const shopDrawings = await emctExcelService.getShopDrawings();
      
      const vendorDistribution: Record<string, number> = {};
      [...documents, ...shopDrawings].forEach(item => {
        const vendor = item.vendor || 'Unknown';
        vendorDistribution[vendor] = (vendorDistribution[vendor] || 0) + 1;
      });
      
      res.json(vendorDistribution);
    } catch (error) {
      res.status(500).json({ message: "Error fetching EMCT vendor performance", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activities", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Real-time Excel data refresh endpoint
  app.post("/api/refresh-excel", async (req, res) => {
    try {
      await excelService.forceRefresh();
      res.json({ 
        message: "Excel data refreshed successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to refresh Excel data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Excel import routes
  app.post("/api/import/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Store the Excel file in database (replaces previous upload)
      const excelFile = await storage.createExcelFile({
        fileName: req.file.originalname,
        fileType: 'documents',
        fileContent: req.file.buffer.toString('base64'),
        uploadedBy: 'admin', // TODO: Get from authenticated user
        recordCount: 0,
      });

      // Force refresh Excel service to load new file
      await excelService.forceRefresh();
      const refreshedData = await excelService.refreshAfterUpload();

      // Create upload activity
      await storage.createActivity({
        type: "document",
        entityId: "excel_upload",
        action: "uploaded",
        description: `Uploaded new document Excel file: ${req.file.originalname}`,
        userId: "admin", // TODO: Get from authenticated user
      });

      res.json({ 
        message: `Successfully uploaded ${req.file.originalname} - ${refreshedData.documents} documents now active`,
        fileId: excelFile.id,
        documentCount: refreshedData.documents
      });
    } catch (error) {
      res.status(500).json({ message: "Error uploading document file", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/import/shop-drawings", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Store the Excel file in database (replaces previous upload)
      const excelFile = await storage.createExcelFile({
        fileName: req.file.originalname,
        fileType: 'shop-drawings',
        fileContent: req.file.buffer.toString('base64'),
        uploadedBy: 'admin', // TODO: Get from authenticated user
        recordCount: 0,
      });

      // Force refresh Excel service to load new file
      await excelService.forceRefresh();
      const refreshedData = await excelService.refreshAfterUpload();

      // Create upload activity
      await storage.createActivity({
        type: "shop_drawing",
        entityId: "excel_upload",
        action: "uploaded",
        description: `Uploaded new shop drawing Excel file: ${req.file.originalname}`,
        userId: "admin", // TODO: Get from authenticated user
      });

      res.json({ 
        message: `Successfully uploaded ${req.file.originalname} - ${refreshedData.shopDrawings} shop drawings now active`,
        fileId: excelFile.id,
        shopDrawingCount: refreshedData.shopDrawings
      });
    } catch (error) {
      res.status(500).json({ message: "Error uploading shop drawing file", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Export routes
  app.get("/api/export/documents", async (req, res) => {
    try {
      const documents = await excelService.getDocuments();
      
      const exportData = documents.map(doc => ({
        'Document ID': doc.documentId,
        'Title': doc.title,
        'Vendor': doc.vendor,
        'Document Type': doc.documentType,
        'Current Status': doc.currentStatus,
        'Submitted Date': doc.submittedDate.toISOString().split('T')[0],
        'Last Updated': doc.lastUpdated.toISOString().split('T')[0],
        'Priority': doc.priority,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=documents_export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "Error exporting documents", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/export/shop-drawings", async (req, res) => {
    try {
      const shopDrawings = await excelService.getShopDrawings();
      
      const exportData = shopDrawings.map(drawing => ({
        'Drawing ID': drawing.drawingId,
        'Title': drawing.title,
        'Drawing Type': drawing.drawingType,
        'Revision': drawing.revision,
        'Current Status': drawing.currentStatus,
        'Submitted Date': drawing.submittedDate.toISOString().split('T')[0],
        'Last Updated': drawing.lastUpdated.toISOString().split('T')[0],
        'Priority': drawing.priority,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Shop Drawings");

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=shop_drawings_export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "Error exporting shop drawings", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // EMCT Upload route - simplified with manual file parsing
  app.post("/api/emct/upload-file", async (req, res) => {
    try {
      let body: Buffer[] = [];
      let fileName = '';
      let fileBuffer: Buffer | null = null;

      req.on('data', (chunk: Buffer) => {
        body.push(chunk);
      });

      req.on('end', async () => {
        const fullBody = Buffer.concat(body);
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
          return res.status(400).json({ message: "Invalid content type" });
        }

        // Simple multipart parsing to extract file
        const bodyStr = fullBody.toString();
        const fileMatch = bodyStr.match(/filename="([^"]+)"/);
        if (fileMatch) {
          fileName = fileMatch[1];
        }

        // Find the file data after the headers
        const boundary = contentType.split('boundary=')[1];
        if (boundary && fileName) {
          const parts = fullBody.toString('binary').split('--' + boundary);
          for (const part of parts) {
            if (part.includes('filename=')) {
              const headerEnd = part.indexOf('\r\n\r\n');
              if (headerEnd > -1) {
                const fileData = part.substring(headerEnd + 4);
                // Remove trailing boundary
                const cleanData = fileData.replace(/\r\n--.*$/, '');
                fileBuffer = Buffer.from(cleanData, 'binary');
                break;
              }
            }
          }
        }

        if (!fileBuffer || !fileName) {
          return res.status(400).json({ message: "No file uploaded or file parsing failed" });
        }

        // Validate file type
        if (!fileName.toLowerCase().endsWith('.xlsx') && 
            !fileName.toLowerCase().endsWith('.xls')) {
          return res.status(400).json({ 
            message: "Please check your file format and try again. Only Excel files (.xlsx, .xls) are supported." 
          });
        }

        console.log(`📤 EMCT Admin upload: ${fileName} (Size: ${fileBuffer.length})`);
        
        // Save file to attached_assets
        const fs = await import('fs');
        const path = await import('path');
        const targetPath = path.join(process.cwd(), 'attached_assets', fileName);
        
        fs.writeFileSync(targetPath, fileBuffer);
        console.log(`💾 Saved EMCT file to: ${targetPath}`);
        
        // Force refresh EMCT Excel service
        const refreshedData = await emctExcelService.refreshAfterUpload();

        // Log activity
        await storage.createActivity({
          type: "document",
          entityId: "emct_excel_upload",
          action: "uploaded",
          description: `Uploaded new EMCT Excel file: ${fileName}`,
          userId: "admin",
        });

        res.json({ 
          message: `Successfully uploaded ${fileName}`,
          recordCount: refreshedData.documents + refreshedData.shopDrawings,
          validation: { errors: 0 },
          stats: refreshedData
        });
      });
      
    } catch (error) {
      console.error('❌ EMCT upload error:', error);
      res.status(500).json({ 
        message: "Error uploading EMCT file", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Admin routes
  app.use('/api/admin', adminRoutes);
  
  // CSV routes
  app.use('/api', csvRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
