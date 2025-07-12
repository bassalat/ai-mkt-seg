import axios from 'axios';
import { ProductInput } from '@/types';
import { claudeService } from './claude.service';
import { costTracker } from './cost-tracker.service';
import { QUICK_MODE_CONFIG, isQuickModeEnabled, getQuickModeMessage } from './serper.service.quickmode';
import { rateLimiter } from './rate-limiter.service';

interface SearchProgress {
  phase: string;
  completed: number;
  total: number;
  currentPlatform?: string;
  estimatedTimeRemaining?: number;
}

export class SerperService {
  private apiKey: string;
  private baseURL = 'https://google.serper.dev';
  
  // Platform-specific rate limiting
  private platformLimits = {
    'reddit.com': { batchSize: 5, delay: 3000, priority: 1 },
    'linkedin.com': { batchSize: 3, delay: 2500, priority: 2 },
    'github.com': { batchSize: 8, delay: 1500, priority: 3 },
    'stackoverflow.com': { batchSize: 6, delay: 2000, priority: 3 },
    'quora.com': { batchSize: 5, delay: 2000, priority: 2 },
    'medium.com': { batchSize: 6, delay: 1500, priority: 2 },
    'news.ycombinator.com': { batchSize: 5, delay: 2000, priority: 2 },
    'producthunt.com': { batchSize: 4, delay: 2000, priority: 3 },
    'trustradius.com': { batchSize: 4, delay: 2500, priority: 2 },
    'g2.com': { batchSize: 4, delay: 2500, priority: 2 },
    'capterra.com': { batchSize: 4, delay: 2500, priority: 2 },
    'twitter.com': { batchSize: 6, delay: 2000, priority: 2 },
    'youtube.com': { batchSize: 5, delay: 1500, priority: 3 },
    'generic': { batchSize: 6, delay: 2000, priority: 1 }
  };
  
  private maxRetries = 3;
  private retryDelay = 2000;
  private progressCallback?: (progress: SearchProgress) => void;

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY!;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getPlatformFromQuery(query: string): string {
    const siteMatch = query.match(/site:([^\s]+)/);
    if (siteMatch) {
      const domain = siteMatch[1];
      for (const platform of Object.keys(this.platformLimits)) {
        if (domain.includes(platform)) {
          return platform;
        }
      }
    }
    return 'generic';
  }

  private async searchWithRetry(query: string, num: number = 30, retryCount = 0): Promise<any> {
    const resultsPerQuery = isQuickModeEnabled() ? QUICK_MODE_CONFIG.resultsPerQuery : num;
    
    return rateLimiter.executeWithRateLimit('serper', async () => {
      try {
        console.log(`[Serper] Searching: "${query}" (${num} results requested)`);
        
        const response = await axios.post(
        `${this.baseURL}/search`,
        {
          q: query,
          gl: 'us',
          hl: 'en',
          num: resultsPerQuery,
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000, // 15 second timeout for deeper searches
        }
      );

      if (!response.data || !response.data.organic) {
        throw new Error('Invalid response structure from Serper API');
      }

      const resultCount = response.data.organic?.length || 0;
      console.log(`[Serper] ✓ Found ${resultCount} results for: "${query}"`);
      
      // Track the cost of this search
      costTracker.addSerperCost(`Search: ${query.slice(0, 50)}...`, 1);
      
      return {
        query,
        platform: this.getPlatformFromQuery(query),
        results: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`[Serper] ✗ Error searching "${query}":`, error.message);
      
      if (retryCount < this.maxRetries) {
        console.log(`[Serper] Retrying in ${this.retryDelay}ms... (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.searchWithRetry(query, num, retryCount + 1);
      }
      
      console.error(`[Serper] Failed after ${this.maxRetries} retries for: "${query}"`);
        return { 
          query, 
          platform: this.getPlatformFromQuery(query),
          results: { organic: [], error: error.message },
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  async conductAdaptiveMarketResearch(productInput: ProductInput, onProgress?: (progress: SearchProgress) => void) {
    this.progressCallback = onProgress;
    const startTime = Date.now();
    
    console.log('[Serper] Starting adaptive market research...');
    
    // Check if we're in quick mode
    if (isQuickModeEnabled()) {
      console.log('[Serper] Running in QUICK MODE due to platform limitations');
      console.log(getQuickModeMessage());
    }
    
    let platformStrategy: any;
    let queries: string[];
    
    try {
      // Phase 1: Get platform strategy from Claude
      this.updateProgress({
        phase: 'platform-analysis',
        completed: 0,
        total: 1,
        currentPlatform: 'Analyzing best platforms for your market...'
      });
      
      console.log('[Serper] Calling Claude for platform suggestions...');
      platformStrategy = await claudeService.suggestSearchPlatforms({
        industry: productInput.industryFocus || productInput.interests || 'general',
        productType: productInput.productOverview,
        businessType: productInput.businessType,
        targetAudience: productInput.jobTitles || 'general audience'
      });
      
      console.log('[Serper] Platform strategy:', platformStrategy);
    } catch (error) {
      console.error('[Serper] Error in platform analysis:', error);
      // If platform analysis fails, we can still continue with default platforms
      console.log('[Serper] Continuing with default platform strategy');
      platformStrategy = {
        platforms: [
          { name: 'reddit', weight: 30 },
          { name: 'linkedin', weight: 25 },
          { name: 'github', weight: 20 },
          { name: 'stackoverflow', weight: 15 },
          { name: 'medium', weight: 10 }
        ],
        queryVolume: 250
      };
    }
    
    // Phase 2: Generate search queries with Claude
    try {
      this.updateProgress({
        phase: 'query-generation',
        completed: 0,
        total: 1,
        currentPlatform: 'Generating intelligent search queries...'
      });
      
      console.log('[Serper] Calling Claude for query generation...');
      // Limit queries to a reasonable number to avoid token limits
      const requestedQueries = platformStrategy.queryVolume || 250;
      const maxQueries = 150; // Limit to prevent token overflow
      const targetQueries = isQuickModeEnabled() 
        ? QUICK_MODE_CONFIG.searchLimit 
        : Math.min(requestedQueries, maxQueries);
      
      if (requestedQueries > maxQueries) {
        console.log(`[Serper] Limiting queries from ${requestedQueries} to ${maxQueries} to prevent token overflow`);
      }
      
      queries = await claudeService.generateSearchQueries({
        userInput: productInput,
        platformStrategy,
        targetQueries
      });
      
      console.log(`[Serper] Generated ${queries.length} search queries`);
    } catch (error) {
      console.error('[Serper] Error in query generation:', error);
      throw new Error(`Query generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Phase 3: Organize queries by platform for smart batching
    const queriesByPlatform = this.organizeQueriesByPlatform(queries);
    
    // Phase 4: Execute searches with platform-aware batching
    const allResults: any[] = [];
    let totalCompleted = 0;
    const totalQueries = queries.length;
    
    for (const [platform, platformQueries] of Object.entries(queriesByPlatform)) {
      const defaultLimits = this.platformLimits[platform as keyof typeof this.platformLimits] || this.platformLimits.generic;
      const limits = isQuickModeEnabled() 
        ? { batchSize: QUICK_MODE_CONFIG.batchSize, delay: 500 }
        : defaultLimits;
      const batches = this.createBatches(platformQueries, limits.batchSize);
      
      console.log(`[Serper] Processing ${platformQueries.length} queries for ${platform} in ${batches.length} batches`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        this.updateProgress({
          phase: 'searching',
          completed: totalCompleted,
          total: totalQueries,
          currentPlatform: platform,
          estimatedTimeRemaining: this.estimateTimeRemaining(totalCompleted, totalQueries, startTime)
        });
        
        const batchResults = await Promise.all(
          batch.map(query => this.searchWithRetry(query, 30))
        );
        
        allResults.push(...batchResults);
        totalCompleted += batch.length;
        
        // Delay between batches (except last)
        if (i < batches.length - 1) {
          await this.sleep(limits.delay);
        }
      }
      
      // Extra delay between platforms
      if (platform !== Object.keys(queriesByPlatform).pop()) {
        await this.sleep(1000);
      }
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000 / 60; // minutes
    
    // Statistics
    const successfulSearches = allResults.filter(r => !r.results.error).length;
    const totalResultsFound = allResults.reduce((sum, r) => sum + (r.results.organic?.length || 0), 0);
    
    console.log(`[Serper] ✅ Adaptive research completed in ${totalTime.toFixed(1)} minutes`);
    console.log(`[Serper] 📊 Statistics:`);
    console.log(`[Serper]   - Total queries: ${queries.length}`);
    console.log(`[Serper]   - Successful: ${successfulSearches}`);
    console.log(`[Serper]   - Total results: ${totalResultsFound}`);
    console.log(`[Serper]   - Platforms covered: ${Object.keys(queriesByPlatform).length}`);
    
    // Phase 5: Let Claude analyze the raw data
    this.updateProgress({
      phase: 'analysis',
      completed: 0,
      total: 1,
      currentPlatform: 'Analyzing market intelligence with AI...'
    });
    
    let marketIntelligence;
    try {
      console.log(`[Serper] Sending ${allResults.length} search results to Claude for analysis`);
      marketIntelligence = await claudeService.analyzeRawSearchData(allResults, productInput);
      console.log('[Serper] Claude analysis completed successfully');
    } catch (error) {
      console.error('[Serper] Error analyzing search data with Claude:', error);
      
      // If the error is due to token limits, try with fewer results
      if (error instanceof Error && error.message.includes('Invalid request')) {
        console.log('[Serper] Retrying with reduced data set due to token limits');
        try {
          const reducedResults = allResults.slice(0, 50);
          marketIntelligence = await claudeService.analyzeRawSearchData(reducedResults, productInput);
          console.log('[Serper] Reduced analysis completed successfully');
        } catch (retryError) {
          console.error('[Serper] Retry failed:', retryError);
          throw new Error(`Failed to analyze search data even with reduced set: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      } else {
        throw new Error(`Failed to analyze search data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Add metadata
    return {
      ...marketIntelligence,
      searchMetadata: {
        totalQueries: queries.length,
        successfulSearches,
        totalResultsFound,
        searchDuration: totalTime,
        platformsCovered: Object.keys(queriesByPlatform),
        timestamp: new Date().toISOString()
      }
    };
  }

  private organizeQueriesByPlatform(queries: string[]): Record<string, string[]> {
    const organized: Record<string, string[]> = {
      generic: []
    };
    
    queries.forEach(query => {
      const platform = this.getPlatformFromQuery(query);
      if (!organized[platform]) {
        organized[platform] = [];
      }
      organized[platform].push(query);
    });
    
    // Sort platforms by priority
    const sortedPlatforms = Object.entries(organized)
      .sort(([a], [b]) => {
        const priorityA = this.platformLimits[a as keyof typeof this.platformLimits]?.priority || 999;
        const priorityB = this.platformLimits[b as keyof typeof this.platformLimits]?.priority || 999;
        return priorityA - priorityB;
      });
    
    return Object.fromEntries(sortedPlatforms);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private estimateTimeRemaining(completed: number, total: number, startTime: number): number {
    if (completed === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const rate = completed / elapsed;
    const remaining = total - completed;
    
    return Math.round((remaining / rate) / 1000 / 60); // minutes
  }

  private updateProgress(progress: SearchProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
    
    // Log progress
    const phaseEmoji = {
      'platform-analysis': '🎯',
      'query-generation': '🧠',
      'searching': '🔍',
      'analysis': '📊'
    }[progress.phase] || '⚡';
    
    if (progress.phase === 'searching') {
      console.log(`[Serper] ${phaseEmoji} Progress: ${progress.completed}/${progress.total} queries (${Math.round(progress.completed / progress.total * 100)}%) - Current: ${progress.currentPlatform}`);
    } else {
      console.log(`[Serper] ${phaseEmoji} ${progress.phase}: ${progress.currentPlatform}`);
    }
  }

  // Simplified market research for testing
  async conductMarketResearchSimple(productInput: ProductInput) {
    const industry = productInput.businessType === 'b2b' 
      ? productInput.industryFocus || 'technology'
      : productInput.interests || 'consumer products';

    const productType = productInput.productOverview.slice(0, 50);

    // Just 5 simple queries for testing
    const queries = [
      `${industry} market size 2025`,
      `${industry} competitors`,
      `${industry} customer pain points`,
      `${industry} trends 2025`,
      `${productType} alternatives`
    ];

    console.log('[Serper] Running simple search with 5 queries for testing...');
    
    const searchResults = await Promise.all(
      queries.map(query => this.searchWithRetry(query, 10))
    );

    return {
      marketSize: { snippets: [], estimatedValue: '$1B' },
      competitors: { companies: ['Company A', 'Company B'] },
      painPoints: ['Pain 1', 'Pain 2'],
      trends: ['Trend 1', 'Trend 2'],
      sources: ['source1.com', 'source2.com'],
      searchMetadata: {
        totalQueries: 5,
        successfulSearches: 5,
        totalResultsFound: 50,
        searchDuration: 0.5,
        platformsCovered: ['generic'],
        timestamp: new Date().toISOString()
      }
    };
  }

  // Fallback method for backward compatibility
  async conductMarketResearch(productInput: ProductInput) {
    console.log('[Serper] Using adaptive market research...');
    return this.conductAdaptiveMarketResearch(productInput);
  }
}

export const serperService = new SerperService();