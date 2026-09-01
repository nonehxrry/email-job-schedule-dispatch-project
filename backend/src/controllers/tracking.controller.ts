import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

// 1x1 Transparent GIF pixel buffer
const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export class TrackingController {
  /**
   * Tracks email open via 1x1 transparent tracking pixel
   */
  public async trackOpen(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (jobId) {
        await prisma.emailJob.updateMany({
          where: { id: jobId },
          data: {
            openedAt: new Date(),
            openCount: { increment: 1 },
          },
        });
      }
    } catch (e: any) {
      console.warn(`[Tracking] Error recording email open for ${req.params.jobId}:`, e.message);
    } finally {
      // Always return 1x1 transparent image with no-cache headers
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.send(TRANSPARENT_PIXEL);
    }
  }

  /**
   * Tracks link clicks and redirects user to target destination
   */
  public async trackClick(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    const targetUrl = (req.query.url as string) || 'https://reachinbox.ai';

    try {
      if (jobId) {
        await prisma.emailJob.updateMany({
          where: { id: jobId },
          data: {
            clickedAt: new Date(),
            clickCount: { increment: 1 },
          },
        });
      }
    } catch (e: any) {
      console.warn(`[Tracking] Error recording link click for ${jobId}:`, e.message);
    } finally {
      res.redirect(targetUrl);
    }
  }

  /**
   * Unsubscribe / Opt-Out landing page & suppression list
   */
  public async trackUnsubscribe(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    try {
      const job = await prisma.emailJob.findUnique({
        where: { id: jobId },
      });

      if (job) {
        // 1. Mark job unsubscribed
        await prisma.emailJob.update({
          where: { id: jobId },
          data: { unsubscribedAt: new Date() },
        });

        // 2. Add to UnsubscribedContact suppression list for user
        await prisma.unsubscribedContact.upsert({
          where: {
            userId_email: {
              userId: job.userId,
              email: job.recipientEmail.toLowerCase().trim(),
            },
          },
          update: { unsubscribedAt: new Date() },
          create: {
            userId: job.userId,
            email: job.recipientEmail.toLowerCase().trim(),
          },
        });
      }

      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed Successfully</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            h2 { color: #f8fafc; margin-top: 0; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.6; }
            .badge { display: inline-block; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Preferences Updated</span>
            <h2>You have been unsubscribed</h2>
            <p>Your email address <strong>${job?.recipientEmail || 'address'}</strong> has been added to our suppression list. You will not receive further outreach communications from this sender.</p>
          </div>
        </body>
        </html>
      `);
    } catch (e: any) {
      res.status(500).send('An error occurred updating your unsubscribe preferences.');
    }
  }
}

export const trackingController = new TrackingController();
