import { Client } from '@elastic/elasticsearch';
import { env } from './env.config';

export const ES_INDEX_EMAILS = 'reachinbox_emails';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  maxRetries: 3,
  requestTimeout: 5000,
});

let isElasticsearchConnected = false;

export async function initElasticsearch(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health({});
    console.log(`[Elasticsearch] Connected! Cluster status: ${health.status}`);
    isElasticsearchConnected = true;

    // Check if index exists, if not create it with mappings
    const indexExists = await esClient.indices.exists({ index: ES_INDEX_EMAILS });
    if (!indexExists) {
      await esClient.indices.create({
        index: ES_INDEX_EMAILS,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            recipientName: { type: 'text' },
            subject: { type: 'text', analyzer: 'standard' },
            body: { type: 'text', analyzer: 'standard' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`[Elasticsearch] Created index: ${ES_INDEX_EMAILS}`);
    }

    return true;
  } catch (error: any) {
    console.warn(`[Elasticsearch] Warning: Elasticsearch not available at ${env.ELASTICSEARCH_NODE} (${error.message}). Full-text search fallback enabled.`);
    isElasticsearchConnected = false;
    return false;
  }
}

export function isESAvailable(): boolean {
  return isElasticsearchConnected;
}
