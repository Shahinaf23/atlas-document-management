import { sql } from 'drizzle-orm';
import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with admin capabilities
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Excel file tracking for admin uploads
export const excelFiles = pgTable("excel_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // 'document_submittal' or 'shop_drawing'
  filePath: text("file_path").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  recordCount: integer("record_count").default(0),
  isActive: boolean("is_active").default(true),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull().unique(),
  title: text("title").notNull(),
  vendor: text("vendor").notNull(),
  documentType: text("document_type").notNull(),
  category: text("category").default("General").notNull(),
  currentStatus: text("current_status").default("---"),
  submittedDate: timestamp("submitted_date").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  priority: text("priority").default("Medium").notNull(),
});

export const shopDrawings = pgTable("shop_drawings", {
  id: serial("id").primaryKey(),
  drawingId: text("drawing_id").notNull().unique(),
  drawingNumber: text("drawing_number").notNull(),
  system: text("system").notNull(),
  subSystem: text("sub_system").notNull(),
  drawingType: text("drawing_type").notNull(),
  currentStatus: text("current_status").default("---"),
  submittedDate: timestamp("submitted_date").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  priority: text("priority").default("Medium").notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'document' or 'shop_drawing'
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertExcelFileSchema = createInsertSchema(excelFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  lastUpdated: true,
});

export const insertShopDrawingSchema = createInsertSchema(shopDrawings).omit({
  id: true,
  lastUpdated: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  role: z.enum(["engineer", "manager", "project manager", "admin", "viewer"]),
  remember: z.boolean().optional(),
});

// Checkpoint system for data state management
export const checkpoints = pgTable("checkpoints", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  dataSnapshot: jsonb("data_snapshot").notNull(), // Stores the complete data state
  documentCount: integer("document_count").default(0),
  shopDrawingCount: integer("shop_drawing_count").default(0),
  isAutoSave: boolean("is_auto_save").default(false),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  createdAt: true,
});

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = typeof checkpoints.$inferInsert;

// Filter schemas
export const documentFilterSchema = z.object({
  status: z.string().optional(),
  dateRange: z.string().optional(),
  vendor: z.string().optional(),
  documentType: z.string().optional(),
});

export const shopDrawingFilterSchema = z.object({
  status: z.string().optional(),
  drawingType: z.string().optional(),
  revision: z.string().optional(),
  priority: z.string().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertExcelFile = z.infer<typeof insertExcelFileSchema>;
export type ExcelFile = typeof excelFiles.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertShopDrawing = z.infer<typeof insertShopDrawingSchema>;
export type ShopDrawing = typeof shopDrawings.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type LoginRequest = z.infer<typeof loginSchema>;
export type DocumentFilter = z.infer<typeof documentFilterSchema>;
export type ShopDrawingFilter = z.infer<typeof shopDrawingFilterSchema>;

// Status codes enum
export const StatusCodes = {
  CODE1: "CODE1", // Approved
  CODE2: "CODE2", // Approved with comments
  CODE3: "CODE3", // Revise and resubmit
  "UR(ATJV)": "UR(ATJV)", // Under review with ATJV
  "AR(ATJV)": "AR(ATJV)", // Advance review with ATJV
  "UR(DAR)": "UR(DAR)", // Under review with DAR
  "RTN(ATLS)": "RTN(ATLS)", // Return to Atlas
  "---": "---", // Pending
} as const;

export type StatusCode = keyof typeof StatusCodes;

// Helper functions for status checking
export const isSubmittedStatusCode = (status: string): boolean => {
  return status !== "---" && Object.values(StatusCodes).includes(status as StatusCode);
};

export const isPendingStatus = (status: string): boolean => {
  return status === "---";
};
