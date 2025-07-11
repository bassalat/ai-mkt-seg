// Business Types
export type BusinessType = 'b2b' | 'b2c';

export interface ProductInput {
  // Basic Information
  productOverview: string;
  stage: 'pre-launch' | 'early-stage' | 'growth' | 'mature';
  businessModel: 'subscription' | 'usage-based' | 'one-time' | 'freemium' | 'other';
  businessModelOther?: string;
  priceRangeMin: number;
  priceRangeMax: number;
  revenueGoal: number;
  
  // Problems & Vision
  customerProblems: string[];
  vision: string;
  
  // GTM Approach
  gtmApproach: 'self-service' | 'sales-team' | 'partners' | 'mix';
  hasFreeTrial: boolean;
  freeTrialDays?: number;
  
  // Business Type Specific
  businessType: BusinessType;
  
  // B2B Specific
  companySizeMin?: number;
  companySizeMax?: number;
  industryFocus?: string;
  jobTitles?: string;
  budgetRangeMin?: number;
  budgetRangeMax?: number;
  
  // B2C Specific
  ageRangeMin?: number;
  ageRangeMax?: number;
  incomeLevel?: string;
  interests?: string;
  onlinePresence?: string;
  
  // Optional Fields
  productRoadmap?: string;
  competitors?: string;
  existingCustomers?: string;
}

// Market Analysis Types
export interface MarketAnalysis {
  tam: {
    currentValue: number;
    projectedValue: number;
    projectionYear: number;
    currency: string;
    geographicBreakdown?: {
      northAmerica: string;
      europe: string;
      asiaPacific: string;
      otherRegions: string;
    };
    segmentBreakdown?: Array<{
      segment: string;
      value: string;
    }>;
  };
  cagr: number;
  growthFactors: {
    technological: string[];
    economic: string[];
    regulatory: string[];
    behavioral: string[];
  };
  commercialUrgencies: string[];
  marketMaturity?: {
    stage: 'nascent' | 'emerging' | 'growth' | 'mature' | 'declining';
    consolidationTrends: string;
    innovationRate: 'high' | 'medium' | 'low';
    competitiveDynamics: string;
  };
  opportunities?: string[];
  barriers?: {
    regulatory: string[];
    technical: string[];
    market: string[];
    financial: string[];
  };
  competitors: Competitor[];
}

export interface Competitor {
  tier?: 1 | 2 | 3;
  name: string;
  headquarters: string;
  fundingTotal: string;
  lastFunding: string;
  valuation?: string;
  specialty: string;
  targetMarket: string;
  employeeCount: string;
  revenue?: string;
  foundedYear?: number;
  keyProducts?: string[];
  gtmMotion?: 'PLG' | 'Sales-led' | 'Hybrid';
  notableCustomers?: string[];
  competitiveStrength?: string;
  competitiveWeakness?: string;
}

// Segmentation Types
export interface MarketComplexity {
  score: number;
  factors: {
    competitorCount: number;
    marketMaturity: 'nascent' | 'emerging' | 'growth' | 'mature';
    buyerDiversity: 'low' | 'medium' | 'high';
    useCaseVariety: number;
    geographicScope: 'local' | 'regional' | 'national' | 'global';
  };
  recommendedSegments: number;
  rationale: string;
}

export interface Segment {
  id: string;
  name: string;
  size: {
    percentage: number;
    value: number;
    count: number;
    growthRate?: string;
  };
  characteristics: {
    firmographics?: Record<string, any>;
    demographics?: Record<string, any>;
    behavioral: Record<string, any>;
  };
  painPoints: PainPoint[];
  roleSpecificPainPoints: Record<string, string[]>;
  useCases: UseCase[];
  buyingTriggers: {
    external: string[];
    internal: string[];
    seasonal?: string[];
    urgencyLevel: 'immediate' | '3-6months' | '6-12months' | '12+months';
    urgencyDrivers?: string[];
  };
  motivations?: {
    functional: string[];
    emotional: string[];
    social: string[];
  };
  objections?: string[];
  competitiveLandscape?: {
    currentSolutions: string[];
    switchingBarriers: string[];
    decisionCriteria: {
      mustHaves: string[];
      niceToHaves: string[];
      dealBreakers: string[];
    };
  };
  messagingHooks: {
    primary: string;
    supporting: string[];
    proofPoints?: string[];
    differentiators?: string[];
  };
  channelPreferences?: {
    discovery: string[];
    research: string[];
    engagement: string[];
    purchase: string[];
  };
  priorityScore: {
    marketAttractiveness: number;
    attractivenessFactors?: Record<string, number>;
    accessibility: number;
    accessibilityFactors?: Record<string, number>;
  };
}

export interface PainPoint {
  pain: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency?: 'daily' | 'weekly' | 'monthly';
  currentSolution: string;
  costOfProblem: string;
  impactAreas?: string[];
}

export interface UseCase {
  scenario: string;
  workflow: string;
  valueDelivered: string;
  implementationTime: string;
  roi?: string;
  successMetrics?: string[];
}

// Persona Types
export interface Persona {
  segmentId: string;
  personaType: 'Economic Buyer' | 'Technical Buyer' | 'User Champion' | 'Executive Sponsor' | 'Influencer';
  name: string;
  role: string;
  seniorityLevel?: string;
  reportsTo?: string;
  teamSize?: string;
  demographics: Record<string, any>;
  psychographics: {
    values: string[];
    personalityTraits?: string[];
    motivators: {
      professional: string[];
      personal: string[];
    } | string[]; // Support both old and new format
    fears?: string[];
    decisionStyle: string;
    trustAnchors: string[];
    communicationStyle?: string;
  };
  jobsToBeDone: {
    functional: string[];
    emotional: string[];
    social: string[];
    financial?: string[];
  };
  dayInLife?: {
    painfulMoments: string[];
    timeWasters: string[];
    priorities: string[];
    tools: string[];
    meetings: string[];
  };
  buyingBehavior?: {
    role: string;
    influence: 'High' | 'Medium' | 'Low';
    concerns: string[];
    successCriteria: string[];
    dealBreakers: string[];
    timeline: string;
  };
  journey: {
    awareness: any; // Can be string[] or detailed object
    consideration: any;
    decision: any;
    retention?: any;
    success?: any;
  };
  objectionHandling?: {
    commonObjections: string[];
    underlyingFears: string[];
    responseStrategies: string[];
  };
  messagingGuidance?: {
    resonate: string[];
    avoid: string[];
    proof: string[];
    tone: string;
  };
  preferredChannels: any; // Can be string[] or detailed object
  contentPreferences: any; // Can be string[] or detailed object
}

// Processing Status
export type ProcessingPhase = 
  | 'collecting-input'
  | 'market-research'
  | 'market-analysis'
  | 'segment-identification'
  | 'persona-development'
  | 'strategy-development'
  | 'generating-report'
  | 'complete';

export interface ProcessingStatus {
  phase: ProcessingPhase;
  message: string;
  progress: number;
}

// API Response Types
export interface SegmentationResult {
  marketAnalysis: MarketAnalysis;
  segments: Segment[];
  personas: Persona[];
  implementationRoadmap: {
    quickWins: string[];
    phased: {
      phase1: string[];
      phase2: string[];
      phase3: string[];
    };
  };
  createdAt: string;
}