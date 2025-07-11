import { z } from 'zod';

export const productInputSchema = z.object({
  // Basic Information
  productOverview: z.string().min(50, 'Please provide at least 50 characters describing your product'),
  stage: z.enum(['pre-launch', 'early-stage', 'growth', 'mature']),
  businessModel: z.enum(['subscription', 'usage-based', 'one-time', 'freemium', 'other']),
  businessModelOther: z.string().optional(),
  priceRangeMin: z.number().min(0, 'Price must be positive'),
  priceRangeMax: z.number().min(0, 'Price must be positive'),
  revenueGoal: z.number().min(0, 'Revenue goal must be positive'),
  
  // Problems & Vision
  customerProblems: z.array(z.string().min(10, 'Each problem should be at least 10 characters')).min(3, 'Please list at least 3 customer problems'),
  vision: z.string().min(20, 'Please provide at least 20 characters for your vision'),
  
  // GTM Approach
  gtmApproach: z.enum(['self-service', 'sales-team', 'partners', 'mix']),
  hasFreeTrial: z.boolean(),
  freeTrialDays: z.number().min(1).max(365).optional(),
  
  // Business Type Specific
  businessType: z.enum(['b2b', 'b2c']),
  
  // B2B Specific
  companySizeMin: z.number().min(1).optional(),
  companySizeMax: z.number().min(1).optional(),
  industryFocus: z.string().optional(),
  jobTitles: z.string().optional(),
  budgetRangeMin: z.number().min(0).optional(),
  budgetRangeMax: z.number().min(0).optional(),
  
  // B2C Specific
  ageRangeMin: z.number().min(1).max(100).optional(),
  ageRangeMax: z.number().min(1).max(100).optional(),
  incomeLevel: z.string().optional(),
  interests: z.string().optional(),
  onlinePresence: z.string().optional(),
  
  // Optional Fields
  productRoadmap: z.string().optional(),
  competitors: z.string().optional(),
  existingCustomers: z.string().optional(),
}).refine((data) => data.priceRangeMax >= data.priceRangeMin, {
  message: "Maximum price must be greater than or equal to minimum price",
  path: ["priceRangeMax"],
}).refine((data) => {
  if (data.businessType === 'b2b') {
    return data.companySizeMin && data.companySizeMax && data.industryFocus && data.jobTitles;
  }
  return true;
}, {
  message: "Please fill in all B2B specific fields",
  path: ["companySizeMin"],
}).refine((data) => {
  if (data.businessType === 'b2c') {
    return data.ageRangeMin && data.ageRangeMax && data.incomeLevel && data.interests;
  }
  return true;
}, {
  message: "Please fill in all B2C specific fields",
  path: ["ageRangeMin"],
});

export type ProductInputData = z.infer<typeof productInputSchema>;