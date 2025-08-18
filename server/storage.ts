import {
  users,
  documents,
  shopDrawings,
  activities,
  checkpoints,
  excelFiles,
  type User,
  type InsertUser,
  type UpsertUser,
  type Document,
  type InsertDocument,
  type ShopDrawing,
  type InsertShopDrawing,
  type Activity,
  type InsertActivity,
  type Checkpoint,
  type InsertCheckpoint,
  type ExcelFile,
  type InsertExcelFile,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, count, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Excel file operations for admin uploads
  getExcelFiles(): Promise<ExcelFile[]>;
  createExcelFile(file: InsertExcelFile): Promise<ExcelFile>;
  getActiveExcelFile(fileType: string): Promise<ExcelFile | undefined>;
  deactivateExcelFiles(fileType: string): Promise<void>;

  // Document operations
  getAllDocuments(): Promise<Document[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  getDocumentByDocumentId(documentId: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  getDocumentsByFilter(filters: any): Promise<Document[]>;

  // Shop drawing operations
  getAllShopDrawings(): Promise<ShopDrawing[]>;
  getShopDrawingById(id: number): Promise<ShopDrawing | undefined>;
  getShopDrawingByDrawingId(drawingId: string): Promise<ShopDrawing | undefined>;
  createShopDrawing(shopDrawing: InsertShopDrawing): Promise<ShopDrawing>;
  updateShopDrawing(id: number, updates: Partial<ShopDrawing>): Promise<ShopDrawing | undefined>;
  deleteShopDrawing(id: number): Promise<boolean>;
  getShopDrawingsByFilter(filters: any): Promise<ShopDrawing[]>;

  // Activity operations
  getAllActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(limit: number): Promise<Activity[]>;

  // Analytics operations
  getDocumentStatusCounts(): Promise<Record<string, number>>;
  getShopDrawingStatusCounts(): Promise<Record<string, number>>;
  getVendorDistribution(): Promise<Record<string, number>>;
  getActiveUserCount(): Promise<number>;

  // Bulk operations for Excel import
  bulkCreateDocuments(documents: InsertDocument[]): Promise<Document[]>;
  bulkCreateShopDrawings(shopDrawings: InsertShopDrawing[]): Promise<ShopDrawing[]>;
  bulkCreateActivities(activities: InsertActivity[]): Promise<Activity[]>;

  // Clear operations for checkpoint restore
  clearAllDocuments(): Promise<void>;
  clearAllShopDrawings(): Promise<void>;
  clearAllActivities(): Promise<void>;

  // Checkpoint operations
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  getCheckpoint(id: string): Promise<Checkpoint | undefined>;
  getCheckpointsByUser(userId: string): Promise<Checkpoint[]>;
  getAllCheckpoints(): Promise<Checkpoint[]>;
  deleteCheckpoint(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private documents: Map<number, Document>;
  private shopDrawings: Map<number, ShopDrawing>;
  private activities: Map<number, Activity>;
  private checkpoints: Map<string, Checkpoint>;
  private excelFiles: Map<number, ExcelFile>;
  private currentUserId: number;
  private currentDocumentId: number;
  private currentShopDrawingId: number;
  private currentActivityId: number;
  private currentExcelFileId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.shopDrawings = new Map();
    this.activities = new Map();
    this.checkpoints = new Map();
    this.excelFiles = new Map();
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentShopDrawingId = 1;
    this.currentActivityId = 1;
    this.currentExcelFileId = 1;

    // Initialize with some demo users
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo users
    const demoUsers = [
      { username: "john.doe", role: "engineer" },
      { username: "sarah.johnson", role: "manager" },
      { username: "mike.davis", role: "admin" },
      { username: "admin", role: "admin" },
    ];

    demoUsers.forEach(userData => {
      const id = `user_${this.currentUserId++}`;
      const user: User = {
        id,
        ...userData,
        email: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, user);
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = `user_${this.currentUserId++}`;
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || 'viewer',
      email: insertUser.email || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    if (user.id && this.users.has(user.id)) {
      const existingUser = this.users.get(user.id)!;
      const updatedUser: User = {
        ...existingUser,
        ...user,
        updatedAt: new Date(),
      };
      this.users.set(user.id, updatedUser);
      return updatedUser;
    } else {
      return this.createUser(user as InsertUser);
    }
  }

  // Excel file operations - not implemented in memory storage
  async getExcelFiles(): Promise<ExcelFile[]> {
    return [];
  }

  async createExcelFile(file: InsertExcelFile): Promise<ExcelFile> {
    throw new Error("Excel file operations not supported in memory storage");
  }

  async getActiveExcelFile(fileType: string): Promise<ExcelFile | undefined> {
    return undefined;
  }

  // Document operations
  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort(
      (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
    );
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentByDocumentId(documentId: string): Promise<Document | undefined> {
    return Array.from(this.documents.values()).find(
      (doc) => doc.documentId === documentId,
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = {
      ...insertDocument,
      id,
      category: insertDocument.category || 'General',
      currentStatus: insertDocument.currentStatus || '---',
      submittedDate: insertDocument.submittedDate || new Date(),
      priority: insertDocument.priority || 'Medium',
      lastUpdated: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    const updatedDocument: Document = {
      ...document,
      ...updates,
      lastUpdated: new Date(),
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  async getDocumentsByFilter(filters: any): Promise<Document[]> {
    let documents = Array.from(this.documents.values());

    if (filters.status) {
      documents = documents.filter(doc => doc.currentStatus === filters.status);
    }
    if (filters.vendor) {
      documents = documents.filter(doc => doc.vendor === filters.vendor);
    }
    if (filters.documentType) {
      documents = documents.filter(doc => doc.documentType === filters.documentType);
    }

    return documents.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  // Shop drawing operations
  async getAllShopDrawings(): Promise<ShopDrawing[]> {
    return Array.from(this.shopDrawings.values()).sort(
      (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
    );
  }

  async getShopDrawingById(id: number): Promise<ShopDrawing | undefined> {
    return this.shopDrawings.get(id);
  }

  async getShopDrawingByDrawingId(drawingId: string): Promise<ShopDrawing | undefined> {
    return Array.from(this.shopDrawings.values()).find(
      (drawing) => drawing.drawingId === drawingId,
    );
  }

  async createShopDrawing(insertShopDrawing: InsertShopDrawing): Promise<ShopDrawing> {
    const id = this.currentShopDrawingId++;
    const shopDrawing: ShopDrawing = {
      ...insertShopDrawing,
      id,
      currentStatus: insertShopDrawing.currentStatus || '---',
      submittedDate: insertShopDrawing.submittedDate || new Date(),
      priority: insertShopDrawing.priority || 'Medium',
      lastUpdated: new Date(),
    };
    this.shopDrawings.set(id, shopDrawing);
    return shopDrawing;
  }

  async updateShopDrawing(id: number, updates: Partial<ShopDrawing>): Promise<ShopDrawing | undefined> {
    const shopDrawing = this.shopDrawings.get(id);
    if (!shopDrawing) return undefined;

    const updatedShopDrawing: ShopDrawing = {
      ...shopDrawing,
      ...updates,
      lastUpdated: new Date(),
    };
    this.shopDrawings.set(id, updatedShopDrawing);
    return updatedShopDrawing;
  }

  async deleteShopDrawing(id: number): Promise<boolean> {
    return this.shopDrawings.delete(id);
  }

  async getShopDrawingsByFilter(filters: any): Promise<ShopDrawing[]> {
    let shopDrawings = Array.from(this.shopDrawings.values());

    if (filters.status) {
      shopDrawings = shopDrawings.filter(drawing => drawing.currentStatus === filters.status);
    }
    if (filters.drawingType) {
      shopDrawings = shopDrawings.filter(drawing => drawing.drawingType === filters.drawingType);
    }
    // Note: revision filter removed as revision property doesn't exist in current schema
    if (filters.priority) {
      shopDrawings = shopDrawings.filter(drawing => drawing.priority === filters.priority);
    }

    return shopDrawings.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  // Activity operations
  async getAllActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const activity: Activity = {
      ...insertActivity,
      id,
      timestamp: new Date(),
    };
    this.activities.set(id, activity);
    return activity;
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    const activities = await this.getAllActivities();
    return activities.slice(0, limit);
  }

  // Analytics operations
  async getDocumentStatusCounts(): Promise<Record<string, number>> {
    const documents = Array.from(this.documents.values());
    const counts: Record<string, number> = {};

    documents.forEach(doc => {
      const status = doc.currentStatus || '---';
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }

  async getShopDrawingStatusCounts(): Promise<Record<string, number>> {
    const shopDrawings = Array.from(this.shopDrawings.values());
    const counts: Record<string, number> = {};

    shopDrawings.forEach(drawing => {
      const status = drawing.currentStatus || '---';
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }

  async getVendorDistribution(): Promise<Record<string, number>> {
    const documents = Array.from(this.documents.values());
    const counts: Record<string, number> = {};

    documents.forEach(doc => {
      counts[doc.vendor] = (counts[doc.vendor] || 0) + 1;
    });

    return counts;
  }

  async getActiveUserCount(): Promise<number> {
    return this.users.size;
  }

  // Bulk operations
  async bulkCreateDocuments(documents: InsertDocument[]): Promise<Document[]> {
    const createdDocuments: Document[] = [];

    for (const docData of documents) {
      const document = await this.createDocument(docData);
      createdDocuments.push(document);
    }

    return createdDocuments;
  }

  async bulkCreateShopDrawings(shopDrawings: InsertShopDrawing[]): Promise<ShopDrawing[]> {
    const createdShopDrawings: ShopDrawing[] = [];

    for (const drawingData of shopDrawings) {
      const shopDrawing = await this.createShopDrawing(drawingData);
      createdShopDrawings.push(shopDrawing);
    }

    return createdShopDrawings;
  }

  async bulkCreateActivities(activities: InsertActivity[]): Promise<Activity[]> {
    const createdActivities: Activity[] = [];
    for (const activityData of activities) {
      const activity = await this.createActivity(activityData);
      createdActivities.push(activity);
    }
    return createdActivities;
  }

  // Clear operations
  async clearAllDocuments(): Promise<void> {
    this.documents.clear();
  }

  async clearAllShopDrawings(): Promise<void> {
    this.shopDrawings.clear();
  }

  async clearAllActivities(): Promise<void> {
    this.activities.clear();
  }

  // Checkpoint operations - simplified for memory storage
  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const newCheckpoint: Checkpoint = {
      ...checkpoint,
      description: checkpoint.description || null,
      documentCount: checkpoint.documentCount || null,
      shopDrawingCount: checkpoint.shopDrawingCount || null,
      isAutoSave: checkpoint.isAutoSave || null,
      createdAt: new Date(),
    };
    this.checkpoints.set(checkpoint.id, newCheckpoint);
    return newCheckpoint;
  }

  async getCheckpoint(id: string): Promise<Checkpoint | undefined> {
    return this.checkpoints.get(id);
  }

  async getCheckpointsByUser(userId: string): Promise<Checkpoint[]> {
    return Array.from(this.checkpoints.values()).filter(cp => cp.createdBy === userId);
  }

  async getAllCheckpoints(): Promise<Checkpoint[]> {
    return Array.from(this.checkpoints.values());
  }

  async deleteCheckpoint(id: string): Promise<void> {
    this.checkpoints.delete(id);
  }

  // Excel file operations (Memory storage - fallback for development)
  async getExcelFiles(): Promise<ExcelFile[]> {
    return Array.from(this.excelFiles.values()).sort((a, b) => 
      (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0)
    );
  }

  async createExcelFile(file: InsertExcelFile): Promise<ExcelFile> {
    // Deactivate previous files of same type
    await this.deactivateExcelFiles(file.fileType);
    
    const newFile: ExcelFile = {
      id: this.currentExcelFileId++,
      fileName: file.fileName,
      fileType: file.fileType,
      fileContent: file.fileContent,
      uploadedBy: file.uploadedBy,
      uploadedAt: new Date(),
      recordCount: file.recordCount || 0,
      isActive: true,
    };
    this.excelFiles.set(newFile.id, newFile);
    return newFile;
  }

  async getActiveExcelFile(fileType: string): Promise<ExcelFile | undefined> {
    const files = Array.from(this.excelFiles.values());
    for (const file of files) {
      if (file.fileType === fileType && file.isActive) {
        return file;
      }
    }
    return undefined;
  }

  async deactivateExcelFiles(fileType: string): Promise<void> {
    const files = Array.from(this.excelFiles.values());
    for (const file of files) {
      if (file.fileType === fileType) {
        file.isActive = false;
      }
    }
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    if (user.id) {
      const [updatedUser] = await db
        .insert(users)
        .values(user as InsertUser)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            updatedAt: new Date(),
          },
        })
        .returning();
      return updatedUser;
    } else {
      return this.createUser(user as InsertUser);
    }
  }

  // Excel file operations
  async getExcelFiles(): Promise<ExcelFile[]> {
    return await db.select().from(excelFiles).orderBy(desc(excelFiles.uploadedAt));
  }

  async createExcelFile(file: InsertExcelFile): Promise<ExcelFile> {
    const [newFile] = await db
      .insert(excelFiles)
      .values(file)
      .returning();
    return newFile;
  }

  async getActiveExcelFile(fileType: string): Promise<ExcelFile | undefined> {
    const [file] = await db
      .select()
      .from(excelFiles)
      .where(and(eq(excelFiles.fileType, fileType), eq(excelFiles.isActive, true)))
      .orderBy(desc(excelFiles.uploadedAt))
      .limit(1);
    return file || undefined;
  }

  // Document operations
  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.submittedDate));
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocumentByDocumentId(documentId: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.documentId, documentId));
    return document || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getDocumentsByFilter(filters: any): Promise<Document[]> {
    let query = db.select().from(documents);
    // Add filtering logic here based on filters object
    return await query.orderBy(desc(documents.submittedDate));
  }

  // Shop drawing operations
  async getAllShopDrawings(): Promise<ShopDrawing[]> {
    return await db.select().from(shopDrawings).orderBy(desc(shopDrawings.submittedDate));
  }

  async getShopDrawingById(id: number): Promise<ShopDrawing | undefined> {
    const [shopDrawing] = await db.select().from(shopDrawings).where(eq(shopDrawings.id, id));
    return shopDrawing || undefined;
  }

  async getShopDrawingByDrawingId(drawingId: string): Promise<ShopDrawing | undefined> {
    const [shopDrawing] = await db.select().from(shopDrawings).where(eq(shopDrawings.drawingId, drawingId));
    return shopDrawing || undefined;
  }

  async createShopDrawing(shopDrawing: InsertShopDrawing): Promise<ShopDrawing> {
    const [newShopDrawing] = await db
      .insert(shopDrawings)
      .values(shopDrawing)
      .returning();
    return newShopDrawing;
  }

  async updateShopDrawing(id: number, updates: Partial<ShopDrawing>): Promise<ShopDrawing | undefined> {
    const [updatedShopDrawing] = await db
      .update(shopDrawings)
      .set(updates)
      .where(eq(shopDrawings.id, id))
      .returning();
    return updatedShopDrawing || undefined;
  }

  async deleteShopDrawing(id: number): Promise<boolean> {
    const result = await db.delete(shopDrawings).where(eq(shopDrawings.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getShopDrawingsByFilter(filters: any): Promise<ShopDrawing[]> {
    let query = db.select().from(shopDrawings);
    // Add filtering logic here based on filters object
    return await query.orderBy(desc(shopDrawings.submittedDate));
  }

  // Activity operations
  async getAllActivities(): Promise<Activity[]> {
    return await db.select().from(activities).orderBy(desc(activities.timestamp)).limit(100);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return await db.select().from(activities).orderBy(desc(activities.timestamp)).limit(limit);
  }

  // Analytics operations
  async getDocumentStatusCounts(): Promise<Record<string, number>> {
    const result = await db
      .select({
        status: documents.currentStatus,
        count: count()
      })
      .from(documents)
      .groupBy(documents.currentStatus);
    
    const statusCounts: Record<string, number> = {};
    result.forEach(row => {
      if (row.status) {
        statusCounts[row.status] = Number(row.count);
      }
    });
    return statusCounts;
  }

  async getShopDrawingStatusCounts(): Promise<Record<string, number>> {
    const result = await db
      .select({
        status: shopDrawings.currentStatus,
        count: count()
      })
      .from(shopDrawings)
      .groupBy(shopDrawings.currentStatus);
    
    const statusCounts: Record<string, number> = {};
    result.forEach(row => {
      if (row.status) {
        statusCounts[row.status] = Number(row.count);
      }
    });
    return statusCounts;
  }

  async getVendorDistribution(): Promise<Record<string, number>> {
    const docResult = await db
      .select({
        vendor: documents.vendor,
        count: count()
      })
      .from(documents)
      .groupBy(documents.vendor);
    
    const vendorCounts: Record<string, number> = {};
    
    docResult.forEach(row => {
      if (row.vendor) {
        vendorCounts[row.vendor] = (vendorCounts[row.vendor] || 0) + Number(row.count);
      }
    });
    
    return vendorCounts;
  }

  async getActiveUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return Number(result[0]?.count || 0);
  }

  // Bulk operations for Excel import
  async bulkCreateDocuments(documentsData: InsertDocument[]): Promise<Document[]> {
    if (documentsData.length === 0) return [];
    return await db.insert(documents).values(documentsData).returning();
  }

  async bulkCreateShopDrawings(shopDrawingsData: InsertShopDrawing[]): Promise<ShopDrawing[]> {
    if (shopDrawingsData.length === 0) return [];
    return await db.insert(shopDrawings).values(shopDrawingsData).returning();
  }

  async bulkCreateActivities(activitiesData: InsertActivity[]): Promise<Activity[]> {
    if (activitiesData.length === 0) return [];
    return await db.insert(activities).values(activitiesData).returning();
  }

  // Clear operations for checkpoint restore
  async clearAllDocuments(): Promise<void> {
    await db.delete(documents);
  }

  async clearAllShopDrawings(): Promise<void> {
    await db.delete(shopDrawings);
  }

  async clearAllActivities(): Promise<void> {
    await db.delete(activities);
  }

  // Checkpoint operations
  async createCheckpoint(checkpointData: InsertCheckpoint): Promise<Checkpoint> {
    const [checkpoint] = await db.insert(checkpoints).values(checkpointData).returning();
    return checkpoint;
  }

  async getCheckpoint(id: string): Promise<Checkpoint | undefined> {
    const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, id));
    return checkpoint;
  }

  async getCheckpointsByUser(userId: string): Promise<Checkpoint[]> {
    return await db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.createdBy, userId))
      .orderBy(desc(checkpoints.createdAt));
  }

  async getAllCheckpoints(): Promise<Checkpoint[]> {
    return await db
      .select()
      .from(checkpoints)
      .orderBy(desc(checkpoints.createdAt));
  }

  async deleteCheckpoint(id: string): Promise<void> {
    await db.delete(checkpoints).where(eq(checkpoints.id, id));
  }

  // Excel file operations implementation
  async getExcelFiles(): Promise<ExcelFile[]> {
    return await db.select().from(excelFiles).orderBy(desc(excelFiles.uploadedAt));
  }

  async createExcelFile(file: InsertExcelFile): Promise<ExcelFile> {
    // Deactivate previous files of same type
    await this.deactivateExcelFiles(file.fileType);
    
    const [newFile] = await db
      .insert(excelFiles)
      .values({
        ...file,
        isActive: true,
      })
      .returning();
    return newFile;
  }

  async getActiveExcelFile(fileType: string): Promise<ExcelFile | undefined> {
    const [activeFile] = await db
      .select()
      .from(excelFiles)
      .where(and(eq(excelFiles.fileType, fileType), eq(excelFiles.isActive, true)))
      .orderBy(desc(excelFiles.uploadedAt))
      .limit(1);
    return activeFile || undefined;
  }

  async deactivateExcelFiles(fileType: string): Promise<void> {
    await db
      .update(excelFiles)
      .set({ isActive: false })
      .where(eq(excelFiles.fileType, fileType));
  }
}

// Always use MemStorage for development to avoid database dependency issues
export const storage = new MemStorage();
