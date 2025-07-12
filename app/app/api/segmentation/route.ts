import { NextRequest, NextResponse } from 'next/server';
import { claudeService } from '@/services/claude.service';
import { serperService } from '@/services/serper.service';
import { ProductInput, ProcessingStatus, SegmentationResult } from '@/types';
import { statusUpdates } from '@/lib/status-store';
import { costTracker } from '@/services/cost-tracker.service';
import { isQuickModeEnabled, getQuickModeMessage } from '@/services/serper.service.quickmode';

export const runtime = 'nodejs';
export const maxDuration = 900; // 15 minutes to accommodate deep search

export async function POST(request: NextRequest) {
  try {
    const productInput: ProductInput = await request.json();
    const sessionId = request.headers.get('x-session-id') || 'default';
    
    // Reset cost tracker for new analysis
    costTracker.reset();
    
    // Check Claude availability first
    console.log('[API] Checking Claude API availability...');
    const isAvailable = await claudeService.checkAvailability();
    if (!isAvailable) {
      throw new Error('Claude API is currently unavailable or overloaded. Please try again in a few minutes.');
    }
    
    // Phase 1: Market Research
    const updateStatus = (status: ProcessingStatus) => {
      statusUpdates.set(sessionId, status);
      console.log(`[API] Status update for session ${sessionId}:`, status);
    };

    const researchMessage = isQuickModeEnabled() 
      ? 'Conducting market research in quick mode (2-3 minutes)...'
      : 'Conducting deep market research (10-15 minutes)...';
    
    updateStatus({
      phase: 'market-research',
      message: researchMessage,
      progress: 10,
    });
    
    if (isQuickModeEnabled()) {
      console.log('[API] Quick mode enabled:', getQuickModeMessage());
    }

    console.log('[API] Starting adaptive market research for:', productInput.productOverview.slice(0, 50));
    const researchStartTime = Date.now();
    
    // Use adaptive research with progress tracking
    const marketResearch = await serperService.conductAdaptiveMarketResearch(productInput, (searchProgress) => {
      // Convert search progress to user-facing status
      let message = 'Conducting deep market research...';
      let progress = 10;
      
      switch (searchProgress.phase) {
        case 'platform-analysis':
          message = 'Analyzing best platforms for your market...';
          progress = 15;
          break;
        case 'query-generation':
          message = 'Generating intelligent search queries...';
          progress = 20;
          break;
        case 'searching':
          const percentage = Math.round((searchProgress.completed / searchProgress.total) * 100);
          message = `Searching ${searchProgress.currentPlatform || 'web'} (${percentage}% complete)...`;
          progress = 20 + Math.round((searchProgress.completed / searchProgress.total) * 35); // 20-55
          if (searchProgress.estimatedTimeRemaining) {
            message += ` ~${searchProgress.estimatedTimeRemaining} min remaining`;
          }
          break;
        case 'analysis':
          message = 'Analyzing market intelligence with AI...';
          progress = 60;
          break;
      }
      
      updateStatus({
        phase: 'market-research',
        message,
        progress,
      });
    });
    
    const researchEndTime = Date.now();
    const researchMinutes = ((researchEndTime - researchStartTime) / 1000 / 60).toFixed(1);
    console.log(`[API] Adaptive market research completed in ${researchMinutes} minutes`);

    // Phase 2: Market Analysis
    updateStatus({
      phase: 'market-analysis',
      message: 'Analyzing market data with AI...',
      progress: 65,
    });

    console.log('[API] Starting market analysis...');
    let marketAnalysis;
    try {
      marketAnalysis = await claudeService.analyzeMarket(productInput, marketResearch);
      console.log('[API] Market analysis completed successfully');
    } catch (error) {
      console.error('[API] Market analysis failed:', error);
      throw error;
    }

    // Phase 3: Segment Identification
    updateStatus({
      phase: 'segment-identification',
      message: 'Identifying customer segments...',
      progress: 75,
    });

    console.log('[API] Starting segment identification...');
    let segments;
    let usingFallback = false;
    try {
      segments = await claudeService.identifySegments(productInput, marketAnalysis);
      console.log('[API] Segment identification completed successfully, found', segments?.length, 'segments');
      
      // Check if any segments are marked as fallback
      if (segments && segments.some((seg) => 'isFallback' in seg && seg.isFallback)) {
        usingFallback = true;
        console.warn('[API] Using fallback segments due to API issues');
      }
    } catch (error) {
      console.error('[API] Segment identification failed:', error);
      throw error;
    }

    // Validate segments before proceeding
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      throw new Error('Failed to generate valid segments');
    }

    // Phase 4: Persona Development
    updateStatus({
      phase: 'persona-development',
      message: 'Developing detailed personas...',
      progress: 85,
    });

    console.log('[API] Starting persona development...');
    let personas;
    try {
      personas = await claudeService.developPersonas(segments, productInput);
      console.log('[API] Persona development completed successfully, created', personas?.length, 'personas');
    } catch (error) {
      console.error('[API] Persona development failed:', error);
      throw error;
    }

    // Phase 5: Strategy Development
    updateStatus({
      phase: 'strategy-development',
      message: 'Creating implementation roadmap...',
      progress: 92,
    });

    console.log('[API] Starting implementation roadmap generation...');
    let implementationRoadmap;
    try {
      implementationRoadmap = await claudeService.generateImplementationRoadmap(segments, personas);
      console.log('[API] Implementation roadmap completed successfully');
    } catch (error) {
      console.error('[API] Implementation roadmap generation failed:', error);
      throw error;
    }

    // Phase 6: Generate Report
    updateStatus({
      phase: 'generating-report',
      message: 'Preparing your results...',
      progress: 98,
    });

    const result: SegmentationResult = {
      marketAnalysis,
      segments,
      personas,
      implementationRoadmap,
      createdAt: new Date().toISOString(),
      ...(usingFallback && { 
        warnings: ['Some data was generated using fallback values due to API limitations. Results may be less accurate than normal.'] 
      })
    };

    updateStatus({
      phase: 'complete',
      message: 'Analysis complete!',
      progress: 100,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('=== SEGMENTATION ERROR ===');
    console.error('Error object:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error && typeof error === 'object' && 'constructor' in error ? error.constructor.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Stringified error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('=========================');
    
    // Provide more specific error messages
    let errorMessage = 'Failed to complete segmentation analysis';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        errorMessage = 'Claude API key not configured. Please check environment variables.';
      } else if (error.message.includes('SERPER_API_KEY')) {
        errorMessage = 'Serper API key not configured. Please check environment variables.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'API rate limit reached. Please wait a moment and try again.';
      } else if (error.message.includes('overloaded') || error.message.includes('529')) {
        errorMessage = 'Claude servers are currently overloaded. Please try again in a few minutes.';
      } else if (error.message.includes('platform')) {
        errorMessage = 'Failed to analyze platforms. Please try again.';
      } else if (error.message.includes('market analysis')) {
        errorMessage = 'Failed to analyze market data. Please try again.';
      } else if (error.message.includes('segments')) {
        errorMessage = 'Failed to identify market segments. Please try again.';
      } else if (error.message.includes('personas')) {
        errorMessage = 'Failed to develop buyer personas. Please try again.';
      } else if (error.message.includes('roadmap')) {
        errorMessage = 'Failed to generate implementation roadmap. Please try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The analysis is taking longer than expected.';
      } else {
        // Include more context for generic errors
        errorMessage = `Analysis failed: ${error.message.slice(0, 100)}`;
      }
    }
    
    // Log final cost summary before error
    const finalCosts = costTracker.getSummary();
    console.error('Final costs before error:', finalCosts);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        costs: finalCosts
      },
      { status: 500 }
    );
  }
}