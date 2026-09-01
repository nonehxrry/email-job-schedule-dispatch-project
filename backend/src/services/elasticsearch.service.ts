import { esClient, ES_INDEX_EMAILS, isESAvailable } from '../config/elasticsearch.config';
import { prisma } from '../prisma/client';

export class ElasticsearchService {
  /**
   * Index or update an email job in Elasticsearch
   */
  public async indexEmail(emailJob: {
    id: string;
    campaignId?: string | null;
    userId: string;
    senderEmail: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    body: string;
    status: string;
    scheduledAt: Date;
    sentAt?: Date | null;
    createdAt: Date;
  }): Promise<void> {
    if (!isESAvailable()) return;

    try {
      await esClient.index({
        index: ES_INDEX_EMAILS,
        id: emailJob.id,
        document: {
          id: emailJob.id,
          campaignId: emailJob.campaignId || null,
          userId: emailJob.userId,
          senderEmail: emailJob.senderEmail,
          recipientEmail: emailJob.recipientEmail,
          recipientName: emailJob.recipientName || '',
          subject: emailJob.subject,
          body: emailJob.body,
          status: emailJob.status,
          scheduledAt: emailJob.scheduledAt.toISOString(),
          sentAt: emailJob.sentAt ? emailJob.sentAt.toISOString() : null,
          createdAt: emailJob.createdAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.warn(`[Elasticsearch] Index error for job ${emailJob.id}: ${error.message}`);
    }
  }

  /**
   * Search emails using Elasticsearch with fallback to Postgres
   */
  public async searchEmails(params: {
    query?: string;
    userId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const from = (page - 1) * limit;

    if (isESAvailable() && params.query && params.query.trim().length > 0) {
      try {
        const mustClauses: any[] = [{ term: { userId: params.userId } }];

        if (params.status && params.status !== 'ALL') {
          mustClauses.push({ term: { status: params.status } });
        }

        const shouldClauses: any[] = [
          { match_phrase_prefix: { subject: { query: params.query, boost: 3 } } },
          { match_phrase_prefix: { recipientEmail: { query: params.query, boost: 3 } } },
          { match_phrase_prefix: { recipientName: { query: params.query, boost: 2 } } },
          { match: { body: { query: params.query, fuzziness: 'AUTO' } } },
        ];

        const response = await esClient.search({
          index: ES_INDEX_EMAILS,
          from,
          size: limit,
          query: {
            bool: {
              must: mustClauses,
              should: shouldClauses,
              minimum_should_match: 1,
            },
          },
          sort: [{ scheduledAt: { order: 'desc' } }],
        });

        const totalHits = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
        const ids = response.hits.hits.map((hit: any) => hit._source.id);

        if (ids.length === 0) {
          return { emails: [], total: 0, page, totalPages: 0, source: 'elasticsearch' };
        }

        // Hydrate from DB for full data (e.g. preview URL)
        const emails = await prisma.emailJob.findMany({
          where: { id: { in: ids } },
          orderBy: { scheduledAt: 'desc' },
        });

        return {
          emails,
          total: totalHits,
          page,
          totalPages: Math.ceil(totalHits / limit),
          source: 'elasticsearch',
        };
      } catch (error: any) {
        console.warn(`[Elasticsearch] Search query failed (${error.message}). Falling back to PostgreSQL search.`);
      }
    }

    // Fallback: Query directly from PostgreSQL
    const where: any = { userId: params.userId };

    if (params.status && params.status !== 'ALL') {
      if (params.status === 'SCHEDULED') {
        where.status = { in: ['SCHEDULED', 'RESCHEDULED', 'SENDING'] };
      } else {
        where.status = params.status;
      }
    }

    if (params.query && params.query.trim().length > 0) {
      const q = params.query.trim();
      where.OR = [
        { recipientEmail: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        skip: from,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
      }),
    ]);

    return {
      emails,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      source: 'database',
    };
  }
}

export const elasticsearchService = new ElasticsearchService();
