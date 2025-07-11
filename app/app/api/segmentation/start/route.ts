import { NextRequest, NextResponse } from 'next/server';
import { ProductInput } from '@/types';
import { costTracker } from '@/services/cost-tracker.service';

// Store active jobs in memory (in production, use Redis or a database)
export const activeJobs = new Map<string, {
  status: 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  startedAt: Date;
}>();

export async function POST(request: NextRequest) {
  try {
    const productInput: ProductInput = await request.json();
    const jobId = Math.random().toString(36).substring(7);
    
    // Reset cost tracker for new analysis
    costTracker.reset();
    
    // Store job status
    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date(),
    });
    
    // Start the analysis in the background
    startAnalysisInBackground(jobId, productInput);
    
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Error starting segmentation:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}

// This function runs asynchronously in the background
async function startAnalysisInBackground(jobId: string, productInput: ProductInput) {
  try {
    // Import services dynamically to avoid issues
    const { claudeService } = await import('@/services/claude.service');
    const { serperService } = await import('@/services/serper.service');
    
    // Perform the full analysis
    console.log(`[Job ${jobId}] Starting analysis for:`, productInput.productOverview.slice(0, 50));
    
    // ... rest of the segmentation logic from the original route ...
    // This will run independently and update the job status when complete
    
    const marketResearch = await serperService.conductAdaptiveMarketResearch(productInput, () => {});
    const marketAnalysis = await claudeService.analyzeMarket(productInput, marketResearch);
    const segments = await claudeService.identifySegments(productInput, marketAnalysis);
    const personas = await claudeService.developPersonas(segments, productInput);
    const implementationRoadmap = await claudeService.generateImplementationRoadmap(segments, personas);
    
    const result = {
      marketAnalysis,
      segments,
      personas,
      implementationRoadmap,
      createdAt: new Date().toISOString(),
    };
    
    // Update job status
    const job = activeJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = result;
    }
    
    console.log(`[Job ${jobId}] Analysis completed successfully`);
  } catch (error) {
    console.error(`[Job ${jobId}] Analysis failed:`, error);
    
    const job = activeJobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
}