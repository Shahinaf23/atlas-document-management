import { storage } from "../storage";
import type { InsertCheckpoint, Checkpoint } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

export class CheckpointService {
  private static instance: CheckpointService;

  public static getInstance(): CheckpointService {
    if (!CheckpointService.instance) {
      CheckpointService.instance = new CheckpointService();
    }
    return CheckpointService.instance;
  }

  /**
   * Create a new checkpoint with current data state
   */
  async createCheckpoint(
    name: string, 
    description: string | undefined, 
    userId: string,
    isAutoSave: boolean = false
  ): Promise<Checkpoint> {
    try {
      // Get current data snapshot
      const [documents, shopDrawings, activities] = await Promise.all([
        storage.getAllDocuments(),
        storage.getAllShopDrawings(),
        storage.getAllActivities()
      ]);

      const dataSnapshot = {
        documents,
        shopDrawings,
        activities,
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      };

      const checkpointData: InsertCheckpoint = {
        id: uuidv4(),
        name,
        description,
        createdBy: userId,
        dataSnapshot,
        documentCount: documents.length,
        shopDrawingCount: shopDrawings.length,
        isAutoSave
      };

      return await storage.createCheckpoint(checkpointData);
    } catch (error) {
      console.error('Error creating checkpoint:', error);
      throw new Error('Failed to create checkpoint');
    }
  }

  /**
   * Restore data from a checkpoint
   */
  async restoreFromCheckpoint(checkpointId: string, userId: string): Promise<void> {
    try {
      const checkpoint = await storage.getCheckpoint(checkpointId);
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      const { dataSnapshot } = checkpoint;
      
      // Clear current data
      await Promise.all([
        storage.clearAllDocuments(),
        storage.clearAllShopDrawings(),
        storage.clearAllActivities()
      ]);

      // Restore data from snapshot
      if (dataSnapshot.documents?.length > 0) {
        await storage.bulkCreateDocuments(dataSnapshot.documents);
      }

      if (dataSnapshot.shopDrawings?.length > 0) {
        await storage.bulkCreateShopDrawings(dataSnapshot.shopDrawings);
      }

      if (dataSnapshot.activities?.length > 0) {
        await storage.bulkCreateActivities(dataSnapshot.activities);
      }

      // Log the restore activity
      await storage.createActivity({
        type: 'system',
        entityId: checkpointId,
        action: 'restore',
        description: `Data restored from checkpoint: ${checkpoint.name}`,
        userId: parseInt(userId)
      });

      console.log(`✅ Data restored from checkpoint: ${checkpoint.name}`);
    } catch (error) {
      console.error('Error restoring checkpoint:', error);
      throw new Error('Failed to restore from checkpoint');
    }
  }

  /**
   * Get all checkpoints for a user
   */
  async getUserCheckpoints(userId: string): Promise<Checkpoint[]> {
    try {
      return await storage.getCheckpointsByUser(userId);
    } catch (error) {
      console.error('Error fetching user checkpoints:', error);
      throw new Error('Failed to fetch checkpoints');
    }
  }

  /**
   * Get all checkpoints (admin only)
   */
  async getAllCheckpoints(): Promise<Checkpoint[]> {
    try {
      return await storage.getAllCheckpoints();
    } catch (error) {
      console.error('Error fetching all checkpoints:', error);
      throw new Error('Failed to fetch checkpoints');
    }
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string, userId: string): Promise<void> {
    try {
      const checkpoint = await storage.getCheckpoint(checkpointId);
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      // Only allow deletion by creator or admin
      if (checkpoint.createdBy !== userId) {
        const user = await storage.getUserById(parseInt(userId));
        if (user?.role !== 'admin') {
          throw new Error('Insufficient permissions to delete checkpoint');
        }
      }

      await storage.deleteCheckpoint(checkpointId);
      console.log(`🗑️ Checkpoint deleted: ${checkpoint.name}`);
    } catch (error) {
      console.error('Error deleting checkpoint:', error);
      throw new Error('Failed to delete checkpoint');
    }
  }

  /**
   * Auto-save checkpoint (daily backup)
   */
  async createAutoCheckpoint(userId: string): Promise<Checkpoint | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const autoCheckpointName = `Auto Backup - ${today}`;
      
      // Check if auto-checkpoint already exists for today
      const existingCheckpoints = await this.getUserCheckpoints(userId);
      const todayAutoCheckpoint = existingCheckpoints.find(
        cp => cp.name === autoCheckpointName && cp.isAutoSave
      );

      if (todayAutoCheckpoint) {
        console.log('Auto-checkpoint for today already exists');
        return null;
      }

      return await this.createCheckpoint(
        autoCheckpointName,
        'Automatic daily backup of all document and shop drawing data',
        userId,
        true
      );
    } catch (error) {
      console.error('Error creating auto-checkpoint:', error);
      return null;
    }
  }

  /**
   * Clean up old auto-save checkpoints (keep last 7 days)
   */
  async cleanupOldAutoCheckpoints(): Promise<void> {
    try {
      const allCheckpoints = await this.getAllCheckpoints();
      const autoCheckpoints = allCheckpoints.filter(cp => cp.isAutoSave);
      
      // Sort by creation date, newest first
      autoCheckpoints.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );

      // Keep only the latest 7 auto-checkpoints
      const checkpointsToDelete = autoCheckpoints.slice(7);
      
      for (const checkpoint of checkpointsToDelete) {
        await storage.deleteCheckpoint(checkpoint.id);
        console.log(`🧹 Cleaned up old auto-checkpoint: ${checkpoint.name}`);
      }

      if (checkpointsToDelete.length > 0) {
        console.log(`✅ Cleaned up ${checkpointsToDelete.length} old auto-checkpoints`);
      }
    } catch (error) {
      console.error('Error cleaning up old checkpoints:', error);
    }
  }
}

export const checkpointService = CheckpointService.getInstance();