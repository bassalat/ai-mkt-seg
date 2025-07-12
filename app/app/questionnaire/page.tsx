'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productInputSchema, type ProductInputData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';

type FormStep = 'business-type' | 'basic-info' | 'problems-vision' | 'gtm-approach' | 'target-customer' | 'optional-info';

const FORM_STEPS: FormStep[] = ['business-type', 'basic-info', 'problems-vision', 'gtm-approach', 'target-customer', 'optional-info'];

export default function QuestionnairePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FormStep>('business-type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<ProductInputData>({
    resolver: zodResolver(productInputSchema),
    defaultValues: {
      customerProblems: ['', '', ''],
      hasFreeTrial: false,
      businessType: 'b2b',
    },
  });

  const businessType = watch('businessType');
  const hasFreeTrial = watch('hasFreeTrial');
  const businessModel = watch('businessModel');
  const customerProblems = watch('customerProblems');

  const currentStepIndex = FORM_STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / FORM_STEPS.length) * 100;

  const handleNext = async () => {
    let fieldsToValidate: (keyof ProductInputData)[] = [];
    
    switch (currentStep) {
      case 'business-type':
        fieldsToValidate = ['businessType'];
        break;
      case 'basic-info':
        fieldsToValidate = ['productOverview', 'stage', 'businessModel', 'priceRangeMin', 'priceRangeMax', 'revenueGoal'];
        if (businessModel === 'other') fieldsToValidate.push('businessModelOther');
        break;
      case 'problems-vision':
        fieldsToValidate = ['customerProblems', 'vision'];
        break;
      case 'gtm-approach':
        fieldsToValidate = ['gtmApproach', 'hasFreeTrial'];
        if (hasFreeTrial) fieldsToValidate.push('freeTrialDays');
        break;
      case 'target-customer':
        if (businessType === 'b2b') {
          fieldsToValidate = ['companySizeMin', 'companySizeMax', 'industryFocus', 'jobTitles'];
        } else {
          fieldsToValidate = ['ageRangeMin', 'ageRangeMax', 'incomeLevel', 'interests', 'onlinePresence'];
        }
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid && currentStepIndex < FORM_STEPS.length - 1) {
      setCurrentStep(FORM_STEPS[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(FORM_STEPS[currentStepIndex - 1]);
    }
  };

  const onSubmit = async (data: ProductInputData) => {
    setIsSubmitting(true);
    try {
      // Store data in session storage for now
      sessionStorage.setItem('productInput', JSON.stringify(data));
      router.push('/processing');
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  const addProblem = () => {
    const current = customerProblems || [];
    setValue('customerProblems', [...current, '']);
  };

  const removeProblem = (index: number) => {
    const current = customerProblems || [];
    setValue('customerProblems', current.filter((_, i) => i !== index));
  };

  // Generate example data based on business type
  const fillExampleData = () => {
    if (businessType === 'b2b') {
      // B2B Example: AI-powered project management tool
      setValue('productOverview', 'An AI-powered project management platform that automatically creates tasks from meeting recordings, predicts project delays, and suggests resource allocation optimizations. Unlike traditional PM tools, we use machine learning to analyze team communication patterns and workload to prevent burnout and improve delivery times.');
      setValue('stage', 'early-stage');
      setValue('businessModel', 'subscription');
      setValue('priceRangeMin', 29);
      setValue('priceRangeMax', 299);
      setValue('revenueGoal', 2000000);
      setValue('customerProblems', [
        'Teams waste 30% of their time in status meetings and project updates',
        'Project managers struggle to predict delays before they happen',
        'Resource allocation is done manually leading to team burnout',
        'Cross-functional teams lack visibility into each other\'s workloads'
      ]);
      setValue('vision', 'To create a world where project management is proactive, not reactive. We believe AI can eliminate 80% of manual project tracking work, letting teams focus on delivering value instead of updating spreadsheets.');
      setValue('gtmApproach', 'self-service');
      setValue('hasFreeTrial', true);
      setValue('freeTrialDays', 14);
      setValue('companySizeMin', 20);
      setValue('companySizeMax', 500);
      setValue('industryFocus', 'SaaS, Technology, Digital Agencies, Software Development');
      setValue('jobTitles', 'VP Engineering, Head of Product, CTO, Director of PMO, Engineering Manager');
      setValue('budgetRangeMin', 5000);
      setValue('budgetRangeMax', 50000);
      setValue('productRoadmap', 'Q1: AI meeting transcription and task extraction. Q2: Predictive analytics dashboard. Q3: Slack/Teams deep integration. Q4: Mobile app with voice commands.');
      setValue('competitors', 'Asana, Monday.com, Jira, ClickUp, Linear');
      setValue('existingCustomers', 'Currently have 15 customers, mostly Series A-B startups in SaaS. Best customers are fast-growing engineering teams of 50-200 people who value automation and data-driven decisions.');
    } else {
      // B2C Example: Personal finance app
      setValue('productOverview', 'A gamified personal finance app that helps millennials save money through automated micro-investing and social challenges. Users can join savings challenges with friends, earn rewards for hitting financial goals, and get AI-powered spending insights. We make saving money as addictive as social media.');
      setValue('stage', 'growth');
      setValue('businessModel', 'freemium');
      setValue('priceRangeMin', 0);
      setValue('priceRangeMax', 15);
      setValue('revenueGoal', 5000000);
      setValue('customerProblems', [
        'Young adults find traditional finance apps boring and hard to stick with',
        'Lack of accountability when trying to save money',
        'No clear understanding of where their money goes each month',
        'Investment seems complicated and requires too much money to start'
      ]);
      setValue('vision', 'To make financial wellness as engaging as gaming and as social as Instagram. We envision a world where every young adult has the tools and motivation to build wealth, one micro-investment at a time.');
      setValue('gtmApproach', 'self-service');
      setValue('hasFreeTrial', false);
      setValue('ageRangeMin', 22);
      setValue('ageRangeMax', 35);
      setValue('incomeLevel', '$30k-$80k, Entry to mid-level professionals');
      setValue('interests', 'Technology, Gaming, Social Media, Personal Development, Travel');
      setValue('onlinePresence', 'Instagram, TikTok, Twitter, Reddit (r/personalfinance), YouTube');
      setValue('productRoadmap', 'Q1: Crypto investment features. Q2: Bill negotiation AI. Q3: Group savings pools. Q4: Financial education content hub.');
      setValue('competitors', 'Mint, Robinhood, Acorns, YNAB, Truebill');
      setValue('existingCustomers', '5,000 active users, mostly urban millennials working in tech, marketing, or creative fields. Best users engage daily and participate in 3+ savings challenges per month.');
    }
  };

  // Handle document upload and extraction
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract information');
      }

      const { extractedData } = data;

      // Fill in the extracted data
      Object.entries(extractedData).forEach(([key, value]) => {
        setValue(key as keyof ProductInputData, value as Parameters<typeof setValue>[1]);
      });

      // Navigate to appropriate step based on extracted data
      if (extractedData.businessType) {
        setCurrentStep('basic-info');
      }
      
      alert('Document processed successfully! Please review the extracted information.');
    } catch (error) {
      console.error('Error extracting document:', error);
      alert(error instanceof Error ? error.message : 'Failed to extract information from document. Please upload a .txt file.');
    } finally {
      setIsExtracting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <h1 className="text-2xl font-bold gradient-text">AI Market Segmentation</h1>
            </Link>
            {currentStepIndex > 0 && (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                  className="flex items-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillExampleData}
                  disabled={isExtracting}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Fill Example Data
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full gradient-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Step {currentStepIndex + 1} of {FORM_STEPS.length}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Business Type Selection */}
            {currentStep === 'business-type' && (
              <Card>
                <CardHeader>
                  <CardTitle>Let&apos;s start with your business type</CardTitle>
                  <CardDescription>
                    This helps us tailor the segmentation to your specific market
                  </CardDescription>
                  {/* Help text about document upload */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> After selecting your business type, you can upload a document (.txt or .pdf) containing your business plan or product information to automatically fill the questionnaire.
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <label 
                      className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        businessType === 'b2b' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('businessType')}
                        value="b2b"
                        className="sr-only"
                      />
                      <h3 className="font-semibold text-lg mb-2">B2B Business</h3>
                      <p className="text-gray-600">
                        I sell to other businesses, organizations, or teams
                      </p>
                    </label>
                    
                    <label 
                      className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        businessType === 'b2c' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('businessType')}
                        value="b2c"
                        className="sr-only"
                      />
                      <h3 className="font-semibold text-lg mb-2">B2C Business</h3>
                      <p className="text-gray-600">
                        I sell directly to individual consumers
                      </p>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Basic Information */}
            {currentStep === 'basic-info' && (
              <Card>
                <CardHeader>
                  <CardTitle>Tell us about your product</CardTitle>
                  <CardDescription>
                    Help us understand what you&apos;re building
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Product Overview <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('productOverview')}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="What does your product do? What problem does it solve? What makes you different?"
                    />
                    {errors.productOverview && (
                      <p className="text-red-500 text-sm mt-1">{errors.productOverview.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      What stage are you at? <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('stage')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select stage...</option>
                      <option value="pre-launch">Pre-launch</option>
                      <option value="early-stage">Early stage (0-50 customers)</option>
                      <option value="growth">Growth (50-500 customers)</option>
                      <option value="mature">Mature (500+ customers)</option>
                    </select>
                    {errors.stage && (
                      <p className="text-red-500 text-sm mt-1">{errors.stage.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Business Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('businessModel')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select model...</option>
                      <option value="subscription">Subscription (monthly/annual)</option>
                      <option value="usage-based">Usage-based pricing</option>
                      <option value="one-time">One-time purchase</option>
                      <option value="freemium">Freemium</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.businessModel && (
                      <p className="text-red-500 text-sm mt-1">{errors.businessModel.message}</p>
                    )}
                  </div>

                  {businessModel === 'other' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Please specify <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('businessModelOther')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Price Range Min ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('priceRangeMin', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {errors.priceRangeMin && (
                        <p className="text-red-500 text-sm mt-1">{errors.priceRangeMin.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Price Range Max ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('priceRangeMax', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {errors.priceRangeMax && (
                        <p className="text-red-500 text-sm mt-1">{errors.priceRangeMax.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Revenue Goal (next 12 months, $) <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('revenueGoal', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.revenueGoal && (
                      <p className="text-red-500 text-sm mt-1">{errors.revenueGoal.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Problems & Vision */}
            {currentStep === 'problems-vision' && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Problems & Your Vision</CardTitle>
                  <CardDescription>
                    What problems do you solve and where are you headed?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Main problems your customers face <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-600 mb-4">List at least 3 problems</p>
                    {customerProblems?.map((_, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          {...register(`customerProblems.${index}`)}
                          type="text"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder={`Problem ${index + 1}`}
                        />
                        {customerProblems.length > 3 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeProblem(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    {errors.customerProblems && (
                      <p className="text-red-500 text-sm mt-1">{errors.customerProblems.message}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addProblem}
                      className="mt-2"
                    >
                      Add another problem
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Your Vision <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('vision')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Where are you headed? What change do you want to create?"
                    />
                    {errors.vision && (
                      <p className="text-red-500 text-sm mt-1">{errors.vision.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GTM Approach */}
            {currentStep === 'gtm-approach' && (
              <Card>
                <CardHeader>
                  <CardTitle>Go-to-Market Approach</CardTitle>
                  <CardDescription>
                    How do customers buy from you?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Sales Approach <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('gtmApproach')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select approach...</option>
                      <option value="self-service">Self-service (they can sign up and start using)</option>
                      <option value="sales-team">Sales team required (demos, negotiations)</option>
                      <option value="partners">Through partners/resellers</option>
                      <option value="mix">Mix of above</option>
                    </select>
                    {errors.gtmApproach && (
                      <p className="text-red-500 text-sm mt-1">{errors.gtmApproach.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        {...register('hasFreeTrial')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Do you offer a free trial?</span>
                    </label>
                  </div>

                  {hasFreeTrial && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Free trial length (days) <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('freeTrialDays', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        max="365"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {errors.freeTrialDays && (
                        <p className="text-red-500 text-sm mt-1">{errors.freeTrialDays.message}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Target Customer - B2B */}
            {currentStep === 'target-customer' && businessType === 'b2b' && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Ideal B2B Customer</CardTitle>
                  <CardDescription>
                    Who is your target customer?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Company Size Min (employees) <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('companySizeMin', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Company Size Max (employees) <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('companySizeMax', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Industry Focus <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('industryFocus')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., SaaS, Financial Services, Healthcare"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Job Titles that Buy <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('jobTitles')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., CTO, VP Engineering, Head of Security"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Budget Range Min ($/year)
                      </label>
                      <input
                        {...register('budgetRangeMin', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Budget Range Max ($/year)
                      </label>
                      <input
                        {...register('budgetRangeMax', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Target Customer - B2C */}
            {currentStep === 'target-customer' && businessType === 'b2c' && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Ideal B2C Customer</CardTitle>
                  <CardDescription>
                    Who is your target consumer?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Age Range Min <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('ageRangeMin', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Age Range Max <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('ageRangeMax', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Income Level <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('incomeLevel')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., $30k-$50k, Middle class, High earners"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Main Interests <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('interests')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Technology, Fitness, Travel, Gaming"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Where They Shop/Hang Out Online
                    </label>
                    <input
                      {...register('onlinePresence')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Instagram, TikTok, Reddit, Amazon"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Optional Information */}
            {currentStep === 'optional-info' && (
              <Card>
                <CardHeader>
                  <CardTitle>Optional Information</CardTitle>
                  <CardDescription>
                    Additional details to enhance your segmentation (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Product Roadmap
                    </label>
                    <textarea
                      {...register('productRoadmap')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="What major features are planned for the next 6 months?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Main Competitors
                    </label>
                    <input
                      {...register('competitors')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Who do customers use today instead of you?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Existing Customers
                    </label>
                    <textarea
                      {...register('existingCustomers')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="If you have customers, describe your best ones"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStepIndex < FORM_STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Start Analysis
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}