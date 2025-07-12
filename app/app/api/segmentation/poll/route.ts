import { NextRequest, NextResponse } from 'next/server';
import { activeJobs } from '@/lib/status-store';
import { costTracker } from '@/services/cost-tracker.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }
  
  const job = activeJobs.get(jobId);
  
  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }
  
  // Clean up old jobs (older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, jobData] of activeJobs.entries()) {
    if (jobData.startedAt < oneHourAgo) {
      activeJobs.delete(id);
    }
  }
  
  // Get current costs
  const costs = costTracker.getSummary();
  
  return NextResponse.json({
    status: job.status,
    result: job.result,
    error: job.error,
    costs,
  });
}