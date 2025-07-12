import { ProcessingStatus } from '@/types';

// Store status updates in memory (in production, use Redis or similar)
export const statusUpdates = new Map<string, ProcessingStatus>();
export const costUpdates = new Map<string, { claude: number; serper: number; total: number }>();

// Store active jobs in memory (in production, use Redis or a database)
export const activeJobs = new Map<string, {
  status: 'processing' | 'completed' | 'error';
  result?: unknown;
  error?: string;
  startedAt: Date;
}>();