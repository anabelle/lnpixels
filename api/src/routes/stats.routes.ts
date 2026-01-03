import { Router } from 'express';
import { getDatabase, PixelDatabase } from '../database.js';

const router = Router();

export function setupStatsRoutes(db?: PixelDatabase) {
  const database = db || getDatabase();

  router.get('/stats', (req, res) => {
    try {
      const pixelCount = database.getPixelCount();
      const recentActivity = database.getRecentActivity(10);

      const allPixels = database.getAllPixels();
      const totalSats = allPixels.reduce((sum, pixel) => sum + pixel.sats, 0);

      const recentSats = recentActivity.reduce((sum, activity) => sum + activity.sats, 0);

      const uniqueBuyers = new Set(recentActivity.map(a => a.payment_hash)).size;

      res.json({
        totalPixels: pixelCount,
        totalSats: totalSats,
        recentActivityCount: recentActivity.length,
        recentSats: recentSats,
        uniqueBuyers: uniqueBuyers,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  return router;
}

export const statsRouter = setupStatsRoutes();
