import { Router } from 'express';
import { csvService } from '../csv-service';

const router = Router();

// CSV-based document endpoints
router.get('/csv/documents', async (req, res) => {
  try {
    const documents = csvService.getDocuments();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching CSV documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.get('/csv/shop-drawings', async (req, res) => {
  try {
    const shopDrawings = csvService.getShopDrawings();
    res.json(shopDrawings);
  } catch (error) {
    console.error('Error fetching CSV shop drawings:', error);
    res.status(500).json({ error: 'Failed to fetch shop drawings' });
  }
});

router.get('/csv/stats', async (req, res) => {
  try {
    const stats = csvService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching CSV stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.post('/csv/refresh', async (req, res) => {
  try {
    await csvService.refreshData();
    res.json({ message: 'CSV data refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing CSV data:', error);
    res.status(500).json({ error: 'Failed to refresh CSV data' });
  }
});

router.post('/csv/force-refresh', async (req, res) => {
  try {
    await csvService.forceRefresh();
    res.json({ message: 'CSV data force refreshed successfully' });
  } catch (error) {
    console.error('Error force refreshing CSV data:', error);
    res.status(500).json({ error: 'Failed to force refresh CSV data' });
  }
});

export default router;