/**
 * API Cost Tracking Service
 * Monitors and calculates costs for Claude and Serper API usage
 */

export interface ApiCost {
  provider: 'claude' | 'serper';
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  searchCount?: number;
  cost: number;
  timestamp: Date;
}

export interface CostSummary {
  claude: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    operations: number;
  };
  serper: {
    totalCost: number;
    searchCount: number;
    operations: number;
  };
  totalCost: number;
}

class CostTrackerService {
  private costs: ApiCost[] = [];
  private listeners: ((summary: CostSummary) => void)[] = [];

  // Pricing as of December 2024
  private readonly CLAUDE_PRICING = {
    // Claude Sonnet 4 pricing per 1M tokens
    inputTokensPer1M: 3.00,  // $3 per 1M input tokens
    outputTokensPer1M: 15.00, // $15 per 1M output tokens
  };

  private readonly SERPER_PRICING = {
    perSearch: 0.01, // $0.01 per search
  };

  addClaudeCost(operation: string, inputTokens: number, outputTokens: number) {
    const inputCost = (inputTokens / 1_000_000) * this.CLAUDE_PRICING.inputTokensPer1M;
    const outputCost = (outputTokens / 1_000_000) * this.CLAUDE_PRICING.outputTokensPer1M;
    const totalCost = inputCost + outputCost;

    const cost: ApiCost = {
      provider: 'claude',
      operation,
      inputTokens,
      outputTokens,
      cost: totalCost,
      timestamp: new Date(),
    };

    this.costs.push(cost);
    this.notifyListeners();

    console.log(`[Cost Tracker] Claude - ${operation}: $${totalCost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`);
    
    return cost;
  }

  addSerperCost(operation: string, searchCount: number) {
    const totalCost = searchCount * this.SERPER_PRICING.perSearch;

    const cost: ApiCost = {
      provider: 'serper',
      operation,
      searchCount,
      cost: totalCost,
      timestamp: new Date(),
    };

    this.costs.push(cost);
    this.notifyListeners();

    console.log(`[Cost Tracker] Serper - ${operation}: $${totalCost.toFixed(4)} (${searchCount} searches)`);
    
    return cost;
  }

  getSummary(): CostSummary {
    const summary: CostSummary = {
      claude: {
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        operations: 0,
      },
      serper: {
        totalCost: 0,
        searchCount: 0,
        operations: 0,
      },
      totalCost: 0,
    };

    for (const cost of this.costs) {
      if (cost.provider === 'claude') {
        summary.claude.totalCost += cost.cost;
        summary.claude.inputTokens += cost.inputTokens || 0;
        summary.claude.outputTokens += cost.outputTokens || 0;
        summary.claude.operations++;
      } else {
        summary.serper.totalCost += cost.cost;
        summary.serper.searchCount += cost.searchCount || 0;
        summary.serper.operations++;
      }
    }

    summary.totalCost = summary.claude.totalCost + summary.serper.totalCost;
    
    return summary;
  }

  getDetailedCosts(): ApiCost[] {
    return [...this.costs];
  }

  reset() {
    this.costs = [];
    this.notifyListeners();
  }

  // Subscribe to cost updates
  subscribe(listener: (summary: CostSummary) => void) {
    this.listeners.push(listener);
    // Immediately send current state
    listener(this.getSummary());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const summary = this.getSummary();
    this.listeners.forEach(listener => listener(summary));
  }

  // Estimate total cost for a full analysis
  estimateAnalysisCost(searchQueries: number): number {
    // Estimates based on typical usage
    const estimatedClaudeOperations = 6; // Platform selection, query gen, analysis, segments, personas, roadmap
    const estimatedInputTokensPerOp = 2000;
    const estimatedOutputTokensPerOp = 1500;
    
    const claudeCost = estimatedClaudeOperations * (
      (estimatedInputTokensPerOp / 1_000_000) * this.CLAUDE_PRICING.inputTokensPer1M +
      (estimatedOutputTokensPerOp / 1_000_000) * this.CLAUDE_PRICING.outputTokensPer1M
    );
    
    const serperCost = searchQueries * this.SERPER_PRICING.perSearch;
    
    return claudeCost + serperCost;
  }
}

// Export singleton instance
export const costTracker = new CostTrackerService();