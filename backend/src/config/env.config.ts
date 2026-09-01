import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/reachinbox_db?schema=public',

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',

  JWT_SECRET: process.env.JWT_SECRET || 'reachinbox_super_secret_jwt_key_2026',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',

  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/oauth_callback',
  SLACK_DEFAULT_WEBHOOK_URL: process.env.SLACK_DEFAULT_WEBHOOK_URL || '',

  DEFAULT_SENDER_EMAIL: process.env.DEFAULT_SENDER_EMAIL || 'outreach@reachinbox.ai',
  DEFAULT_SENDER_NAME: process.env.DEFAULT_SENDER_NAME || 'ReachInbox Outreach',

  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  EMAIL_SEND_DELAY_MS: parseInt(process.env.EMAIL_SEND_DELAY_MS || '2000', 10),
  MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50', 10),
};
