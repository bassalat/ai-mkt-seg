import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import PDFParser from 'pdf2json';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
});

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute timeout

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Prepare the prompt
    const extractionPrompt = `Extract business information from this document and map it to these fields. Return ONLY a JSON object with the extracted information. Only include fields where you find relevant information in the document:

Fields to extract:
- businessType: "b2b" or "b2c" (determine based on content)
- productOverview: Description of the product/service (at least 50 characters)
- stage: "pre-launch", "early-stage", "growth", or "mature"
- businessModel: "subscription", "usage-based", "one-time", "freemium", or "other"
- businessModelOther: If businessModel is "other", specify
- priceRangeMin: Minimum price (number)
- priceRangeMax: Maximum price (number)
- revenueGoal: Revenue target (number)
- customerProblems: Array of at least 3 customer problems/pain points
- vision: Company vision or mission statement
- gtmApproach: "self-service", "sales-team", "partners", or "mix"
- hasFreeTrial: true/false
- freeTrialDays: Number of trial days if applicable

For B2B:
- companySizeMin: Minimum company size (employees)
- companySizeMax: Maximum company size (employees)
- industryFocus: Target industries
- jobTitles: Target job titles/roles
- budgetRangeMin: Minimum customer budget
- budgetRangeMax: Maximum customer budget

For B2C:
- ageRangeMin: Minimum age
- ageRangeMax: Maximum age
- incomeLevel: Income level description
- interests: Customer interests
- onlinePresence: Where customers are online

Optional:
- productRoadmap: Future plans/roadmap
- competitors: List of competitors
- existingCustomers: Description of current customers

Return ONLY the JSON object, no explanations or markdown.`;

    let response;

    if (file.type === 'application/pdf') {
      try {
        // Handle PDF files using pdf2json
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Extract text from PDF
        // Type assertion for pdf2json which lacks TypeScript definitions
        const pdfParser = new (PDFParser as unknown as new () => {
          parseBuffer: (buffer: Buffer) => void;
          on: (event: string, callback: (data: unknown) => void) => void;
        })();
        
        const pdfText = await new Promise<string>((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: unknown) => {
          const error = errData as { parserError: Error };
          reject(error.parserError);
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData: unknown) => {
          try {
            // Extract text from all pages
            let text = '';
            const data = pdfData as {
              Pages?: Array<{
                Texts?: Array<{
                  R?: Array<{ T?: string }>;
                }>;
              }>;
            };
            if (data.Pages) {
              data.Pages.forEach((page) => {
                if (page.Texts) {
                  page.Texts.forEach((textItem) => {
                    if (textItem.R) {
                      textItem.R.forEach((r) => {
                        if (r.T) {
                          // Decode URI component to get actual text
                          text += decodeURIComponent(r.T) + ' ';
                        }
                      });
                    }
                  });
                  text += '\n';
                }
              });
            }
            resolve(text);
          } catch (error) {
            reject(error);
          }
        });
        
        // Parse the PDF buffer
        pdfParser.parseBuffer(buffer);
      });
      
      if (!pdfText || pdfText.trim().length === 0) {
        return NextResponse.json(
          { error: 'Could not extract text from PDF. Please ensure the PDF contains selectable text (not scanned images).' },
          { status: 400 }
        );
      }
      
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: extractionPrompt + '\n\nDocument content:\n' + pdfText
          }
        ],
      });
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to extract text from PDF. Please ensure the PDF contains selectable text and is not corrupted.' },
          { status: 400 }
        );
      }
    } else {
      // Handle text files
      const text = await file.text();
      
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: 'File appears to be empty. Please ensure it contains text content.' },
          { status: 400 }
        );
      }

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: extractionPrompt + '\n\nDocument content:\n' + text
          }
        ],
      });
    }

    // Parse the response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse extracted information');
    }
    
    // Validate and clean the data
    const cleanedData: Record<string, unknown> = {};
    
    // Process each field
    if (extractedData.businessType) cleanedData.businessType = extractedData.businessType;
    if (extractedData.productOverview) cleanedData.productOverview = extractedData.productOverview;
    if (extractedData.stage) cleanedData.stage = extractedData.stage;
    if (extractedData.businessModel) cleanedData.businessModel = extractedData.businessModel;
    if (extractedData.businessModelOther) cleanedData.businessModelOther = extractedData.businessModelOther;
    if (typeof extractedData.priceRangeMin === 'number') cleanedData.priceRangeMin = extractedData.priceRangeMin;
    if (typeof extractedData.priceRangeMax === 'number') cleanedData.priceRangeMax = extractedData.priceRangeMax;
    if (typeof extractedData.revenueGoal === 'number') cleanedData.revenueGoal = extractedData.revenueGoal;
    if (Array.isArray(extractedData.customerProblems)) cleanedData.customerProblems = extractedData.customerProblems;
    if (extractedData.vision) cleanedData.vision = extractedData.vision;
    if (extractedData.gtmApproach) cleanedData.gtmApproach = extractedData.gtmApproach;
    if (typeof extractedData.hasFreeTrial === 'boolean') cleanedData.hasFreeTrial = extractedData.hasFreeTrial;
    if (typeof extractedData.freeTrialDays === 'number') cleanedData.freeTrialDays = extractedData.freeTrialDays;
    
    // B2B fields
    if (typeof extractedData.companySizeMin === 'number') cleanedData.companySizeMin = extractedData.companySizeMin;
    if (typeof extractedData.companySizeMax === 'number') cleanedData.companySizeMax = extractedData.companySizeMax;
    if (extractedData.industryFocus) cleanedData.industryFocus = extractedData.industryFocus;
    if (extractedData.jobTitles) cleanedData.jobTitles = extractedData.jobTitles;
    if (typeof extractedData.budgetRangeMin === 'number') cleanedData.budgetRangeMin = extractedData.budgetRangeMin;
    if (typeof extractedData.budgetRangeMax === 'number') cleanedData.budgetRangeMax = extractedData.budgetRangeMax;
    
    // B2C fields
    if (typeof extractedData.ageRangeMin === 'number') cleanedData.ageRangeMin = extractedData.ageRangeMin;
    if (typeof extractedData.ageRangeMax === 'number') cleanedData.ageRangeMax = extractedData.ageRangeMax;
    if (extractedData.incomeLevel) cleanedData.incomeLevel = extractedData.incomeLevel;
    if (extractedData.interests) cleanedData.interests = extractedData.interests;
    if (extractedData.onlinePresence) cleanedData.onlinePresence = extractedData.onlinePresence;
    
    // Optional fields
    if (extractedData.productRoadmap) cleanedData.productRoadmap = extractedData.productRoadmap;
    if (extractedData.competitors) cleanedData.competitors = extractedData.competitors;
    if (extractedData.existingCustomers) cleanedData.existingCustomers = extractedData.existingCustomers;

    return NextResponse.json({ extractedData: cleanedData });
  } catch (error) {
    console.error('Document extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract information from document. Please try again.' },
      { status: 500 }
    );
  }
}