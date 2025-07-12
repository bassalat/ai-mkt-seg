import { Anthropic } from '@anthropic-ai/sdk';
import { MarketAnalysis, Segment, Persona, ProductInput } from '@/types';
import { costTracker } from './cost-tracker.service';
import { rateLimiter } from './rate-limiter.service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export class ClaudeService {
  async checkAvailability(): Promise<boolean> {
    try {
      console.log('[Claude] Checking API availability...');
      const response = await this.generateCompletion('Return the word "OK"', 10, 'Availability Check');
      return response.includes('OK');
    } catch (error) {
      console.error('[Claude] Availability check failed:', error);
      return false;
    }
  }
  private async generateCompletion(prompt: string, maxTokens: number = 4000, operation: string = 'Unknown', retryCount: number = 0): Promise<string> {
    return rateLimiter.executeWithRateLimit('claude', async () => {
      try {
        console.log('[Claude] Making API request with model: claude-sonnet-4-20250514');
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          temperature: 0.7,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        // Track API costs
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        costTracker.addClaudeCost(operation, inputTokens, outputTokens);

        const content = response.content[0];
        if (content.type === 'text') {
          return content.text;
        }
        throw new Error('Unexpected response type from Claude');
      } catch (error: any) {
        console.error('[Claude] API error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          error: error
        });
        
        if (error.status === 401) {
          throw new Error('Invalid ANTHROPIC_API_KEY - please check your API key');
        } else if (error.status === 429) {
          throw new Error('Claude API rate limit exceeded - please try again later');
        } else if (error.status === 400) {
          throw new Error('Invalid request to Claude API - check model name or parameters');
        } else if (error.status === 529 || (error.error && error.error.type === 'overloaded_error')) {
          // Handle overloaded error with exponential backoff
          if (retryCount < 3) {
            const waitTime = Math.min(30000, 5000 * Math.pow(2, retryCount)); // 5s, 10s, 20s, max 30s
            console.log(`[Claude] Server overloaded (529), retrying in ${waitTime/1000}s... (attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.generateCompletion(prompt, maxTokens, operation, retryCount + 1);
          }
          throw new Error('Claude servers are currently overloaded. Please try again in a few minutes.');
        }
        
        throw new Error(`Claude API error: ${error.message || 'Unknown error'}`);
      }
    });
  }

  async suggestSearchPlatforms(input: {
    industry: string;
    productType: string;
    businessType: 'b2b' | 'b2c';
    targetAudience: string;
  }): Promise<{
    platforms: Array<{
      name: string;
      sections?: string[];
      subreddits?: string[];
      focus?: string[];
      weight: number;
    }>;
    reasoning: string;
    queryVolume: number;
  }> {
    console.log('[Claude] suggestSearchPlatforms called with:', input);
    const prompt = `You are an expert market researcher. Based on the following business context, suggest the most relevant online platforms and communities where we can find authentic discussions, pain points, and insights about this market.

Business Context:
- Industry: ${input.industry}
- Product Type: ${input.productType}
- Business Model: ${input.businessType}
- Target Audience: ${input.targetAudience}

Suggest 10-15 platforms with:
1. Platform name (e.g., reddit, linkedin, github, stackoverflow, quora, medium, etc.)
2. Specific sections/subreddits/areas to focus on
3. Weight (1-100) indicating importance for this specific market
4. Brief reasoning for why this platform matters

Also recommend the total number of search queries (200-400) based on market complexity.

Return a simple JSON object:
{
  "platforms": [
    {"name": "reddit", "weight": 30},
    {"name": "linkedin", "weight": 25},
    {"name": "github", "weight": 20},
    {"name": "stackoverflow", "weight": 15},
    {"name": "quora", "weight": 10}
  ],
  "queryVolume": 150
}

CRITICAL RULES:
1. Return ONLY valid JSON - no explanations
2. Start with { and end with }
3. Use simple structure without nested arrays
4. No special characters in strings
5. Maximum 15 platforms`;

    const response = await this.generateCompletion(prompt, 4000, 'Platform Strategy Selection');
    
    try {
      return this.extractAndParseJSON(response);
    } catch (error) {
      console.error('[Claude] Failed to parse platform strategy response:', error);
      console.error('[Claude] Response preview:', response.substring(0, 500));
      console.error('[Claude] Full response:', response);
      
      // Fallback to default platforms if parsing fails
      console.log('[Claude] Using fallback platform strategy');
      return {
        platforms: [
          { name: 'reddit', weight: 30 },
          { name: 'linkedin', weight: 25 },
          { name: 'github', weight: 20 },
          { name: 'stackoverflow', weight: 15 },
          { name: 'medium', weight: 10 },
          { name: 'quora', weight: 10 },
          { name: 'twitter', weight: 10 },
          { name: 'producthunt', weight: 5 }
        ],
        reasoning: 'Using default platform strategy due to parsing error',
        queryVolume: 250
      };
    }
  }

  async generateSearchQueries(input: {
    userInput: ProductInput;
    platformStrategy: any;
    targetQueries: number;
  }): Promise<string[]> {
    const prompt = `You are an expert market researcher. Generate ${input.targetQueries} search queries for comprehensive market research.

Business Context:
- Industry: ${input.userInput.industryFocus || input.userInput.interests}
- Product: ${input.userInput.productOverview}
- Target Audience: ${input.userInput.jobTitles || 'consumers'}
- Business Type: ${input.userInput.businessType}

Platform Strategy:
${JSON.stringify(input.platformStrategy, null, 2)}

Generate a mix of:
1. Generic market understanding queries (no site: prefix)
2. Platform-specific queries using site: prefix
3. Pain point discovery queries
4. Competitor intelligence queries
5. Trend and future-looking queries
6. Technical/implementation queries (if B2B)
7. User sentiment queries

Make queries:
- Natural and conversational
- Mix specific and broad searches
- Include emotional keywords (frustrated, love, hate, switched from)
- Target different user segments
- Cover different stages of buyer journey

IMPORTANT: Return ONLY a valid JSON array of query strings with no additional text or explanation.
The response must start with [ and end with ]
Each query should be a string in double quotes.

Example format:
[
  "project management software market",
  "site:reddit.com project management frustrations",
  "why teams switch from Asana"
]

Generate exactly ${input.targetQueries} queries.`;

    const response = await this.generateCompletion(prompt, 8000, 'Query Generation');
    
    console.log('[Claude] Query generation response preview:', response.substring(0, 200));
    
    // Special handling for array responses
    const trimmedResponse = response.trim();
    if (trimmedResponse.startsWith('[') && trimmedResponse.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmedResponse);
        console.log(`[Claude] Successfully parsed ${parsed.length} queries`);
        return parsed;
      } catch (e) {
        console.error('[Claude] Direct array parsing failed:', e);
      }
    }
    
    try {
      const result = this.extractAndParseJSON(response);
      console.log(`[Claude] Extracted ${Array.isArray(result) ? result.length : 'unknown'} queries`);
      return result;
    } catch (error) {
      console.error('[Claude] Failed to extract queries from response');
      console.error('[Claude] Full response:', response);
      throw error;
    }
  }

  async analyzeRawSearchData(searchResults: any[], productInput: ProductInput): Promise<any> {
    // Pre-process search results to reduce token count
    const processedResults = searchResults.slice(0, 100).map(result => {
      const organic = result.results?.organic || [];
      return {
        query: result.query,
        platform: result.platform,
        topResults: organic.slice(0, 3).map((item: any) => ({
          title: item.title?.substring(0, 100),
          snippet: item.snippet?.substring(0, 200),
          link: item.link
        }))
      };
    });

    const prompt = `You are an expert market analyst. Analyze these search results to extract market intelligence.

Business Context:
- Product: ${productInput.productOverview.substring(0, 200)}
- Industry: ${productInput.industryFocus || productInput.interests}
- Business Type: ${productInput.businessType}

Search Summary: Analyzed ${searchResults.length} searches across multiple platforms.

Key Results (showing top findings):
${JSON.stringify(processedResults, null, 2)}

Extract and synthesize:
1. Market Size & Growth
   - Current TAM (with year)
   - Projected TAM (with target year)
   - CAGR percentage
   - Growth drivers

2. Competitive Landscape
   - 20-30 competitors organized by tier
   - Funding amounts, valuations
   - Market positioning
   - Key differentiators

3. Customer Intelligence
   - Top 10-15 pain points with severity
   - Buying criteria ranked by importance
   - Common objections
   - Success metrics they care about

4. Market Dynamics
   - Pricing models and ranges
   - Adoption barriers
   - Regulatory factors
   - Technology trends

5. Opportunities
   - Underserved segments
   - Emerging use cases
   - Geographic expansion potential
   - Product gaps

Pay special attention to:
- Reddit/forum posts for authentic pain points
- LinkedIn for executive perspectives
- GitHub/StackOverflow for technical challenges
- Review sites for competitor weaknesses

Return a focused JSON analysis with key findings. Keep responses concise. All monetary values in USD.`;

    // Use smaller token limit for this large analysis
    const response = await this.generateCompletion(prompt, 4000, 'Raw Search Data Analysis');
    return this.extractAndParseJSON(response);
  }

  private extractAndParseJSON(response: string): any {
    let jsonStr = response.trim();
    
    // Remove any markdown formatting
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // First try to find JSON between triple backticks
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      // Check if it's an array response
      const trimmed = response.trim();
      if (trimmed.startsWith('[')) {
        // Find the matching closing bracket
        let depth = 0;
        let inString = false;
        let escape = false;
        
        for (let i = 0; i < trimmed.length; i++) {
          const char = trimmed[i];
          
          if (!escape) {
            if (char === '"' && !inString) {
              inString = true;
            } else if (char === '"' && inString) {
              inString = false;
            } else if (!inString) {
              if (char === '[') depth++;
              else if (char === ']') {
                depth--;
                if (depth === 0) {
                  jsonStr = trimmed.substring(0, i + 1);
                  break;
                }
              }
            }
            
            if (char === '\\') escape = true;
            else escape = false;
          } else {
            escape = false;
          }
        }
      } else {
        // Try to find the first complete JSON object, starting from the first {
        const firstBrace = response.indexOf('{');
        if (firstBrace === -1) {
          // Last resort: check if the entire response might be valid JSON
          try {
            JSON.parse(response.trim());
            jsonStr = response.trim();
          } catch {
            throw new Error('No JSON found in response');
          }
        } else {
          // Extract from first { and try to find matching }
          let depth = 0;
          let inString = false;
          let escape = false;
          let lastCloseBrace = -1;
          
          for (let i = firstBrace; i < response.length; i++) {
            const char = response[i];
            
            if (!escape) {
              if (char === '"' && !inString) {
                inString = true;
              } else if (char === '"' && inString) {
                inString = false;
              } else if (!inString) {
                if (char === '{') depth++;
                else if (char === '}') {
                  depth--;
                  if (depth === 0) {
                    lastCloseBrace = i;
                    break;
                  }
                }
              }
              
              if (char === '\\') escape = true;
              else escape = false;
            } else {
              escape = false;
            }
          }
          
          if (lastCloseBrace === -1) {
            throw new Error('Invalid JSON: no matching closing brace');
          }
          
          jsonStr = response.substring(firstBrace, lastCloseBrace + 1);
        }
      }
    }
    
    // Clean up common JSON issues
    jsonStr = jsonStr
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      .replace(/\/\/.*/g, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/[\r\n]+/g, ' '); // Replace newlines with spaces to handle multi-line strings
    
    try {
      return JSON.parse(jsonStr);
    } catch (error: any) {
      console.error('[Claude] JSON parsing error:', error.message);
      console.error('[Claude] Attempted to parse:', jsonStr.substring(0, 200) + '...');
      
      // If parsing fails, try to extract just the segments array if present
      const segmentsMatch = jsonStr.match(/"segments"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
      if (segmentsMatch) {
        try {
          const segments = JSON.parse(segmentsMatch[1]);
          return { segments };
        } catch (e) {
          console.error('[Claude] Failed to parse segments array:', e);
        }
      }
      
      // Throw a more descriptive error
      throw new Error(`Failed to parse JSON response: ${error.message}. Response preview: ${jsonStr.substring(0, 100)}...`);
    }
  }

  async analyzeMarket(productInput: ProductInput, marketResearch: any): Promise<MarketAnalysis> {
    // Check if this is the new format (from adaptive search) or old format
    const isNewFormat = marketResearch.searchMetadata !== undefined;
    const researchSummary = isNewFormat 
      ? `Adaptive market research with ${marketResearch.searchMetadata.totalResultsFound} data points from ${marketResearch.searchMetadata.totalQueries} queries across ${marketResearch.searchMetadata.platformsCovered.length} platforms`
      : 'Market research data from multiple searches';
    
    // Split into two parts to avoid token limits
    // Part 1: Core market analysis
    const corePrompt = `You are an expert market analyst. Based on the following product and research data, provide market analysis.

Product: ${productInput.productOverview.substring(0, 200)}
Industry: ${productInput.industryFocus || productInput.interests}
Business Type: ${productInput.businessType}

Market Research Summary: ${researchSummary}

Provide analysis in this EXACT JSON format (no extra text):
{
  "tam": {
    "currentValue": number,
    "projectedValue": number,
    "projectionYear": 2029,
    "currency": "USD",
    "geographicBreakdown": {
      "northAmerica": "45%",
      "europe": "28%",
      "asiaPacific": "22%",
      "otherRegions": "5%"
    },
    "segmentBreakdown": [
      {"segment": "Enterprise", "value": "40%"},
      {"segment": "Mid-market", "value": "35%"},
      {"segment": "SMB", "value": "25%"}
    ]
  },
  "cagr": 15.5,
  "growthFactors": {
    "technological": ["AI integration", "Cloud adoption"],
    "economic": ["Digital transformation", "Remote work"],
    "regulatory": ["Data privacy laws", "Compliance requirements"],
    "behavioral": ["Productivity focus", "Automation demand"]
  },
  "commercialUrgencies": ["First-mover advantage", "Market consolidation"],
  "marketMaturity": {
    "stage": "growth",
    "consolidationTrends": "Increasing M&A activity",
    "innovationRate": "high",
    "competitiveDynamics": "highly competitive"
  },
  "opportunities": ["AI-powered features", "Vertical solutions"],
  "barriers": {
    "regulatory": ["Privacy compliance"],
    "technical": ["Integration complexity"],
    "market": ["Established competitors"],
    "financial": ["High CAC"]
  }
}`;

    let coreAnalysis;
    try {
      const coreResponse = await this.generateCompletion(corePrompt, 2000, 'Market Analysis - Core');
      coreAnalysis = this.extractAndParseJSON(coreResponse);
    } catch (error) {
      console.error('Failed to parse core analysis:', error);
      // Fallback to default values
      coreAnalysis = {
        tam: {
          currentValue: 5000000000,
          projectedValue: 12000000000,
          projectionYear: 2029,
          currency: "USD",
          geographicBreakdown: {
            northAmerica: "45%",
            europe: "28%",
            asiaPacific: "22%",
            otherRegions: "5%"
          },
          segmentBreakdown: [
            {segment: "Enterprise", value: "40%"},
            {segment: "Mid-market", value: "35%"},
            {segment: "SMB", value: "25%"}
          ]
        },
        cagr: 19.1,
        growthFactors: {
          technological: ["AI and ML integration", "Cloud-native architectures"],
          economic: ["Digital transformation acceleration", "Remote work normalization"],
          regulatory: ["Data privacy regulations", "Security compliance"],
          behavioral: ["Demand for productivity tools", "Collaboration preferences"]
        },
        commercialUrgencies: ["First-mover advantage in AI", "Market consolidation window"],
        marketMaturity: {
          stage: "growth",
          consolidationTrends: "Increasing M&A activity among mid-tier players",
          innovationRate: "high",
          competitiveDynamics: "highly competitive"
        },
        opportunities: ["AI-powered automation", "Vertical-specific solutions", "Integration platforms"],
        barriers: {
          regulatory: ["Privacy compliance costs"],
          technical: ["Legacy system integration"],
          market: ["Established competitor moats"],
          financial: ["High customer acquisition costs"]
        }
      };
    }

    // Part 2: Competitor analysis (simplified)
    const competitorPrompt = `Based on market research for ${productInput.productOverview.substring(0, 100)}, list the top 10-15 competitors.

Return ONLY a JSON array of competitors (no extra text):
[
  {
    "tier": 1,
    "name": "Company Name",
    "fundingTotal": "$100M",
    "specialty": "Brief description",
    "targetMarket": "Enterprise"
  }
]

Keep descriptions brief. Include tier 1 (direct), tier 2 (adjacent), and tier 3 (emerging) competitors.`;

    let competitors = [];
    try {
      const competitorResponse = await this.generateCompletion(competitorPrompt, 2000, 'Market Analysis - Competitors');
      competitors = this.extractAndParseJSON(competitorResponse);
      if (!Array.isArray(competitors)) {
        competitors = [];
      }
    } catch (error) {
      console.error('Failed to parse competitors:', error);
      // Fallback competitors
      competitors = [
        {
          tier: 1,
          name: "Asana",
          fundingTotal: "$453M",
          specialty: "Work management platform for teams",
          targetMarket: "Enterprise and mid-market"
        },
        {
          tier: 1,
          name: "Monday.com",
          fundingTotal: "$574M",
          specialty: "Visual project management and collaboration",
          targetMarket: "All business sizes"
        },
        {
          tier: 1,
          name: "ClickUp",
          fundingTotal: "$537M",
          specialty: "All-in-one productivity platform",
          targetMarket: "SMB to enterprise"
        },
        {
          tier: 2,
          name: "Notion",
          fundingTotal: "$343M",
          specialty: "Workspace for notes and project management",
          targetMarket: "Teams and individuals"
        },
        {
          tier: 2,
          name: "Airtable",
          fundingTotal: "$1.36B",
          specialty: "Low-code database and project management",
          targetMarket: "Business teams"
        }
      ];
    }

    // Combine results
    return {
      ...coreAnalysis,
      competitors
    };
  }

  async identifySegments(productInput: ProductInput, marketAnalysis: MarketAnalysis, retryCount: number = 0): Promise<Segment[]> {
    // Simplified prompt to avoid token limits
    const prompt = `You are a market segmentation expert. Create 6-8 customer segments for:

Product: ${productInput.productOverview.substring(0, 200)}
Business Type: ${productInput.businessType}
Target: ${productInput.businessType === 'b2b' ? productInput.jobTitles : productInput.interests}

Market Info:
- TAM: $${(marketAnalysis.tam.currentValue / 1000000000).toFixed(1)}B
- Growth: ${marketAnalysis.cagr}% CAGR
- Competition: ${marketAnalysis.competitors?.length || 10}+ competitors
- Stage: ${marketAnalysis.marketMaturity?.stage || 'growth'}

Return ONLY a JSON array of 6-8 segments with this EXACT structure:
[
  {
    "id": "SEG_001",
    "name": "Creative Segment Name",
    "size": {
      "percentage": 25,
      "value": 1250000000,
      "count": 5000,
      "growthRate": "15%"
    },
    "characteristics": {
      "firmographics": {
        "companySizes": ["500+ employees"],
        "industries": ["Tech", "Finance"],
        "budgetRange": "$50K-$500K"
      },
      "behavioral": {
        "buyingProcess": "Committee-based",
        "innovationAdoption": "early"
      }
    },
    "painPoints": [
      {
        "pain": "Specific pain point",
        "severity": "high",
        "currentSolution": "Current workaround"
      }
    ],
    "priorityScore": {
      "marketAttractiveness": 85,
      "accessibility": 70
    }
  }
]

Keep it simple - focus on key attributes only.`;

    const response = await this.generateCompletion(prompt, 3000, 'Segment Identification');
    
    try {
      const parsed = this.extractAndParseJSON(response);
      
      // Log market complexity information
      if (parsed.marketComplexity) {
        console.log('Market Complexity:', parsed.marketComplexity);
        console.log(`Generating ${parsed.marketComplexity.recommendedSegments} segments based on complexity score of ${parsed.marketComplexity.score}`);
      }
      
      // Ensure we have segments array
      if (!parsed.segments || !Array.isArray(parsed.segments)) {
        throw new Error('Invalid response: missing segments array');
      }
      
      // If we got the full response with metadata, extract segments
      if (parsed.segments && Array.isArray(parsed.segments)) {
        return parsed.segments;
      }
      // If we got just the array directly
      if (Array.isArray(parsed)) {
        return parsed;
      }
      throw new Error('Invalid segments format');
    } catch (error) {
      console.error('Failed to parse segments:', error);
      console.error('Response snippet:', response.substring(0, 500));
      
      // Retry logic before falling back
      if (retryCount < 3) {
        console.log(`[Claude] Retrying segment identification (attempt ${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1))); // 3s, 6s, 9s delays
        return this.identifySegments(productInput, marketAnalysis, retryCount + 1);
      }
      
      // Only use fallback in extreme cases after all retries
      console.error('[Claude] All segment identification attempts failed. Using emergency fallback.');
      const fallbackSegments = this.generateFallbackSegments(productInput, marketAnalysis);
      
      // Mark segments as fallback so UI can inform user
      fallbackSegments.forEach(seg => {
        (seg as any).isFallback = true;
      });
      
      return fallbackSegments;
    }
  }

  private generateFallbackSegments(productInput: ProductInput, marketAnalysis: MarketAnalysis): Segment[] {
    const baseSegments: Segment[] = productInput.businessType === 'b2b' ? [
      {
        id: "SEG_001",
        name: "Enterprise Innovators",
        size: {
          percentage: 25,
          value: marketAnalysis.tam.currentValue * 0.25,
          count: 5000,
          growthRate: "15%"
        },
        characteristics: {
          firmographics: {
            companySizes: ["1000+ employees"],
            industries: ["Technology", "Finance", "Healthcare"],
            budgetRange: "$100K-$1M+"
          },
          behavioral: {
            buyingProcess: "Committee-based with POC",
            innovationAdoption: "early"
          }
        },
        painPoints: [
          {
            pain: "Scaling productivity across large teams",
            severity: "high",
            currentSolution: "Mix of legacy tools",
            costOfProblem: "$100K-$500K annually"
          }
        ],
        roleSpecificPainPoints: {},
        useCases: [
          {
            scenario: "Enterprise-wide deployment",
            workflow: "Phased rollout across departments",
            valueDelivered: "Unified productivity platform",
            implementationTime: "3-6 months"
          }
        ],
        buyingTriggers: {
          external: ["Digital transformation mandates"],
          internal: ["M&A integration needs"],
          urgencyLevel: "3-6months"
        },
        messagingHooks: {
          primary: "Scale your productivity enterprise-wide",
          supporting: ["Reduce tool sprawl", "Increase collaboration"]
        },
        channelPreferences: {
          discovery: ["analyst reports", "conferences"],
          research: ["vendor websites", "peer reviews"],
          engagement: ["direct sales", "webinars"],
          purchase: ["direct sales", "partner channels"]
        },
        priorityScore: {
          marketAttractiveness: 85,
          accessibility: 65
        }
      },
      {
        id: "SEG_002",
        name: "Growth Champions",
        size: {
          percentage: 30,
          value: marketAnalysis.tam.currentValue * 0.30,
          count: 15000,
          growthRate: "20%"
        },
        characteristics: {
          firmographics: {
            companySizes: ["100-999 employees"],
            industries: ["SaaS", "E-commerce", "Professional Services"],
            budgetRange: "$20K-$100K"
          },
          behavioral: {
            buyingProcess: "Fast evaluation cycles",
            innovationAdoption: "mainstream"
          }
        },
        painPoints: [
          {
            pain: "Rapid team growth causing process chaos",
            severity: "critical",
            currentSolution: "Spreadsheets and basic tools",
            costOfProblem: "$50K-$200K annually"
          }
        ],
        roleSpecificPainPoints: {},
        useCases: [
          {
            scenario: "Team collaboration at scale",
            workflow: "Quick setup and onboarding",
            valueDelivered: "Streamlined workflows",
            implementationTime: "1-2 weeks"
          }
        ],
        buyingTriggers: {
          external: ["Competitive pressure"],
          internal: ["Hiring spree", "Process breakdowns"],
          urgencyLevel: "immediate"
        },
        messagingHooks: {
          primary: "Built for fast-growing teams",
          supporting: ["Quick implementation", "Scales with you"]
        },
        channelPreferences: {
          discovery: ["search", "content marketing"],
          research: ["peer reviews", "comparison sites"],
          engagement: ["free trial", "demos"],
          purchase: ["self-service", "inside sales"]
        },
        priorityScore: {
          marketAttractiveness: 90,
          accessibility: 80
        }
      }
    ] : [
      {
        id: "SEG_001",
        name: "Digital Natives",
        size: {
          percentage: 35,
          value: marketAnalysis.tam.currentValue * 0.35,
          count: 2000000,
          growthRate: "25%"
        },
        characteristics: {
          demographics: {
            ageRange: "25-40",
            income: "$50K-$120K",
            lifestyle: "Tech-savvy professionals"
          },
          behavioral: {
            buyingProcess: "Quick online research",
            innovationAdoption: "early"
          }
        },
        painPoints: [
          {
            pain: "Too many tools, not enough integration",
            severity: "high",
            currentSolution: "Multiple subscriptions",
            costOfProblem: "$2K-$10K annually"
          }
        ],
        roleSpecificPainPoints: {},
        useCases: [
          {
            scenario: "Personal productivity management",
            workflow: "Self-service setup",
            valueDelivered: "Simplified digital life",
            implementationTime: "Same day"
          }
        ],
        buyingTriggers: {
          external: ["New job", "Life changes"],
          internal: ["Overwhelm", "Tool fatigue"],
          urgencyLevel: "3-6months"
        },
        messagingHooks: {
          primary: "One tool to rule them all",
          supporting: ["Save money", "Save time", "Reduce complexity"]
        },
        channelPreferences: {
          discovery: ["social media", "influencer reviews"],
          research: ["app stores", "review sites"],
          engagement: ["free trial", "freemium"],
          purchase: ["app stores", "website"]
        },
        priorityScore: {
          marketAttractiveness: 85,
          accessibility: 90
        }
      }
    ];

    // Add more segments to reach 6-8 total
    const additionalSegmentNames = productInput.businessType === 'b2b' ? [
      "Small Business Adopters",
      "Cost-Conscious Buyers", 
      "Regional Players",
      "Niche Specialists",
      "Late Majority",
      "Budget Optimizers"
    ] : [
      "Price-Sensitive Shoppers",
      "Mainstream Adopters",
      "Value Seekers",
      "Casual Users",
      "Budget Conscious",
      "Late Adopters"
    ];
    
    const additionalSegmentCount = 6 - baseSegments.length;
    for (let i = 0; i < additionalSegmentCount; i++) {
      const segNum = baseSegments.length + i + 1;
      const remainingPercentage = 100 - baseSegments.reduce((sum, seg) => sum + seg.size.percentage, 0);
      const segPercentage = Math.floor(remainingPercentage / (additionalSegmentCount - i));
      
      const segment: Segment = {
        id: `SEG_${String(segNum).padStart(3, '0')}`,
        name: additionalSegmentNames[i] || `Market Segment ${segNum}`,
        size: {
          percentage: segPercentage,
          value: marketAnalysis.tam.currentValue * (segPercentage / 100),
          count: 10000 * segNum,
          growthRate: "10%"
        },
        characteristics: {
          ...(productInput.businessType === 'b2b' ? {
            firmographics: {
              companySizes: ["50-500 employees"],
              industries: ["Various"],
              budgetRange: "$10K-$50K"
            }
          } : {
            demographics: {
              ageRange: "25-55",
              income: "$40K-$80K",
              lifestyle: "Varied"
            }
          }),
          behavioral: {
            buyingProcess: productInput.businessType === 'b2b' ? "Standard evaluation" : "Price comparison",
            innovationAdoption: "mainstream"
          }
        },
        painPoints: [
          {
            pain: "Generic productivity challenges",
            severity: "medium",
            currentSolution: "Basic tools",
            costOfProblem: "$5K-$20K annually"
          }
        ],
        roleSpecificPainPoints: {},
        useCases: [
          {
            scenario: "Daily workflow management",
            workflow: "Standard implementation",
            valueDelivered: "Improved efficiency",
            implementationTime: "1 week"
          }
        ],
        buyingTriggers: {
          external: ["Market pressure"],
          internal: ["Team growth"],
          urgencyLevel: "6-12months"
        },
        messagingHooks: {
          primary: "Simplify your workflow",
          supporting: ["Save time", "Increase productivity"]
        },
        channelPreferences: {
          discovery: ["search", "email marketing"],
          research: ["vendor websites", "case studies"],
          engagement: ["email", "webinars"],
          purchase: ["online", "phone sales"]
        },
        priorityScore: {
          marketAttractiveness: 70 - (i * 5),
          accessibility: 75 - (i * 5)
        }
      };
      
      baseSegments.push(segment);
    }

    return baseSegments;
  }

  async developPersonas(segments: Segment[], productInput: ProductInput): Promise<Persona[]> {
    // Process segments in batches to avoid token limits
    const batchSize = 3;
    const allPersonas: Persona[] = [];
    let retryCount = 0;
    const maxRetries = 3;
    
    for (let i = 0; i < segments.length; i += batchSize) {
      const segmentBatch = segments.slice(i, i + batchSize);
      const segmentIds = segmentBatch.map(s => s.id).join(', ');
      retryCount = 0; // Reset retry count for each batch
      
      const prompt = `Create 2-3 buyer personas for these ${segmentBatch.length} segments:

${segmentBatch.map(s => `- ${s.name} (${s.id}): ${s.size.percentage}% of market`).join('\n')}

Product: ${productInput.productOverview.substring(0, 150)}
Type: ${productInput.businessType}

Return ONLY a JSON array with this structure:
[
  {
    "segmentId": "SEG_XXX",
    "personaType": "Economic Buyer",
    "name": "Sarah",
    "role": "VP of Operations",
    "demographics": {
      "yearsInRole": "3-5",
      "age": "35-45"
    },
    "psychographics": {
      "values": ["efficiency", "innovation"],
      "decisionStyle": "data-driven"
    },
    "jobsToBeDone": {
      "functional": ["Reduce operational costs by 20%"],
      "emotional": ["Feel confident in vendor choices"]
    },
    "buyingBehavior": {
      "role": "Decision Maker",
      "influence": "High",
      "concerns": ["ROI", "Implementation time"]
    }
  }
]`;

      // Retry logic for each batch
      let batchSuccess = false;
      while (!batchSuccess && retryCount < maxRetries) {
        try {
          const response = await this.generateCompletion(prompt, 2000, `Personas for segments ${segmentIds}`);
          const batchPersonas = this.extractAndParseJSON(response);
          
          if (Array.isArray(batchPersonas)) {
            allPersonas.push(...batchPersonas);
          } else if (batchPersonas.personas && Array.isArray(batchPersonas.personas)) {
            allPersonas.push(...batchPersonas.personas);
          }
          batchSuccess = true;
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`[Claude] Retrying persona generation for batch ${i} (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 3000 * retryCount)); // 3s, 6s, 9s delays
          } else {
            console.error(`[Claude] All persona generation attempts failed for batch ${i}. Using emergency fallback.`);
            // Only use fallback after all retries exhausted
            for (const segment of segmentBatch) {
              const fallbackPersona = {
                segmentId: segment.id,
                personaType: "Economic Buyer",
                name: "Alex",
                role: productInput.businessType === 'b2b' ? "Director" : "Professional",
                demographics: {
                  yearsInRole: "2-5",
                  age: "30-45"
                },
                psychographics: {
                  values: ["efficiency", "quality"],
                  decisionStyle: "analytical"
                },
                jobsToBeDone: {
                  functional: ["Improve productivity"],
                  emotional: ["Reduce stress"]
                },
                buyingBehavior: {
                  role: "Evaluator",
                  influence: "Medium",
                  concerns: ["Cost", "Ease of use"]
                },
                isFallback: true
              };
              allPersonas.push(fallbackPersona as any);
            }
          }
        }
      }
      
      // Add delay between batches to avoid rate limits
      if (i + batchSize < segments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return allPersonas;
  }

  async generateImplementationRoadmap(segments: Segment[], personas: Persona[]): Promise<any> {
    // Simplified prompt to avoid token limits
    const segmentSummary = segments.slice(0, 3).map(s => `${s.name}: ${s.size.percentage}%`).join(', ');
    const personaCount = personas.length;
    
    const prompt = `Create a GTM implementation roadmap for:
- ${segments.length} customer segments (top 3: ${segmentSummary})
- ${personaCount} buyer personas identified

Return ONLY valid JSON:
{
  "quickWins": [
    "Specific action items for first 30 days"
  ],
  "phased": {
    "phase1": ["0-3 months: Foundation activities"],
    "phase2": ["3-6 months: Scaling activities"],
    "phase3": ["6-12 months: Optimization activities"]
  }
}`;

    const response = await this.generateCompletion(prompt, 2000, 'Implementation Roadmap');
    
    try {
      return this.extractAndParseJSON(response);
    } catch (error) {
      console.error('Failed to parse roadmap:', error);
      console.error('Response snippet:', response.substring(0, 500));
      throw new Error('Failed to parse roadmap response');
    }
  }
}

export const claudeService = new ClaudeService();