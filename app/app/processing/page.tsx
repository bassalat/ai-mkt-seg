'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ProcessingStatus, ProcessingPhase } from '@/types';
import CostTracker from '@/components/CostTracker';
import { CostSummary } from '@/services/cost-tracker.service';
import { 
  Loader2, 
  CheckCircle2, 
  Brain, 
  Search, 
  Users, 
  Lightbulb, 
  Rocket, 
  FileText,
  Sparkles
} from 'lucide-react';

const PHASE_ICONS: Record<ProcessingPhase, React.ComponentType<{ className?: string }>> = {
  'collecting-input': FileText,
  'market-research': Search,
  'market-analysis': Brain,
  'segment-identification': Users,
  'persona-development': Lightbulb,
  'strategy-development': Rocket,
  'generating-report': FileText,
  'complete': CheckCircle2,
};

const PHASE_TITLES: Record<ProcessingPhase, string> = {
  'collecting-input': 'Preparing Your Data',
  'market-research': 'Deep Market Research',
  'market-analysis': 'AI Market Analysis',
  'segment-identification': 'Identifying Segments',
  'persona-development': 'Creating Personas',
  'strategy-development': 'Building Strategy',
  'generating-report': 'Generating Report',
  'complete': 'Analysis Complete!',
};

const SEARCH_PLATFORMS = [
  { name: 'Reddit', icon: '🔴', color: 'text-orange-600' },
  { name: 'LinkedIn', icon: '💼', color: 'text-blue-600' },
  { name: 'GitHub', icon: '🐙', color: 'text-gray-800' },
  { name: 'Stack Overflow', icon: '📚', color: 'text-orange-500' },
  { name: 'Twitter', icon: '🐦', color: 'text-blue-400' },
  { name: 'Quora', icon: '❓', color: 'text-red-600' },
  { name: 'Medium', icon: '📝', color: 'text-gray-700' },
  { name: 'Product Hunt', icon: '🚀', color: 'text-orange-600' },
  { name: 'Hacker News', icon: '🔶', color: 'text-orange-600' },
  { name: 'Industry Forums', icon: '💬', color: 'text-purple-600' },
];

const ANALYSIS_STEPS = [
  'Analyzing market size and growth trends',
  'Identifying key competitors and their strategies',
  'Understanding customer pain points',
  'Mapping the competitive landscape',
  'Discovering market opportunities',
  'Evaluating industry dynamics',
];

export default function ProcessingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ProcessingStatus>({
    phase: 'collecting-input',
    message: 'Starting analysis...',
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const [searchStats, setSearchStats] = useState({ completed: 0, total: 0 });
  const [costs, setCosts] = useState<CostSummary | undefined>();
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    startProcessing();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [startProcessing]);

  const startProcessing = useCallback(async () => {
    try {
      // Get product input from session storage
      const productInputStr = sessionStorage.getItem('productInput');
      if (!productInputStr) {
        throw new Error('No product data found');
      }

      const productInput = JSON.parse(productInputStr);

      // Set up SSE connection for real-time updates
      console.log('[Processing] Setting up SSE connection with sessionId:', sessionId);
      const eventSource = new EventSource(`/api/segmentation/status?sessionId=${sessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[Processing] SSE connection opened');
      };

      eventSource.onmessage = (event) => {
        console.log('[Processing] SSE message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data) {
            // Extract status and costs separately
            const { costs: costData, ...statusData } = data;
            
            if (statusData.phase || statusData.message) {
              console.log('[Processing] Updating status:', statusData);
              setStatus(statusData);
            }
            
            // Update costs if provided
            if (costData) {
              setCosts(costData);
            }
            
            // Extract additional info from message
            if (data.message) {
              console.log('[Processing] Checking message for search info:', data.message);
              
              if (data.message.includes('Searching')) {
                const platformMatch = data.message.match(/Searching ([^(]+)/);
                if (platformMatch) {
                  const platform = platformMatch[1].trim();
                  console.log('[Processing] Current platform:', platform);
                  setCurrentPlatform(platform);
                }
                
                const progressMatch = data.message.match(/\((\d+)% complete\)/);
                if (progressMatch) {
                  const percentage = parseInt(progressMatch[1]);
                  const completed = Math.round((percentage / 100) * 250);
                  console.log('[Processing] Search progress:', completed, '/', 250);
                  setSearchStats({ completed, total: 250 });
                }
              }
            }
          }
        } catch (error) {
          console.error('[Processing] Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        console.error('SSE connection error');
      };

      // Make API call without client-side timeout - let the server handle it
      const controller = new AbortController();
      
      let result;
      try {
        const response = await fetch('/api/segmentation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId,
          },
          body: JSON.stringify(productInput),
          signal: controller.signal,
        });

        eventSource.close();

        if (!response.ok) {
          let errorData;
          try {
            const text = await response.text();
            console.error('Raw error response:', text);
            errorData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse error response:', e);
            errorData = { error: 'Server error - check console for details' };
          }
          console.error('API Error:', errorData);
          throw new Error(errorData.error || 'Analysis failed');
        }

        result = await response.json();
      } catch (err: any) {
        eventSource.close();
        
        if (err.name === 'AbortError') {
          throw new Error('Analysis is taking longer than expected. This usually happens with complex markets. Please try again with a simpler query.');
        }
        throw err;
      }
      
      // Store result and navigate to results page
      sessionStorage.setItem('segmentationResult', JSON.stringify(result));
      
      setStatus({
        phase: 'complete',
        message: 'Analysis complete!',
        progress: 100,
      });

      // Wait a moment before redirecting
      setTimeout(() => {
        router.push('/results');
      }, 1500);

    } catch (err) {
      console.error('Processing error:', err);
      
      // Log more details about the error
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      
      // Check if this is a timeout or other specific error
      let errorMessage = 'An error occurred during processing';
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('AbortError')) {
          errorMessage = 'The analysis is taking longer than expected (over 5 minutes). This is a platform limitation. Try simplifying your query or running locally.';
        } else if (err.message.includes('fetch failed')) {
          errorMessage = 'Connection to the server was lost. The analysis might be too long for the current hosting environment.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  }, [router, sessionId]);

  const getPhaseStatus = (phase: ProcessingPhase) => {
    const phases: ProcessingPhase[] = [
      'market-research',
      'market-analysis',
      'segment-identification',
      'persona-development',
      'strategy-development',
      'generating-report',
      'complete',
    ];

    const currentIndex = phases.indexOf(status.phase);
    const phaseIndex = phases.indexOf(phase);

    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'active';
    return 'pending';
  };

  const renderPhaseContent = () => {
    console.log('[Processing] Rendering phase:', status.phase, 'with stats:', searchStats);
    
    switch (status.phase) {
      case 'collecting-input':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
            <h3 className="text-xl font-semibold">Preparing Your Analysis</h3>
            <p className="text-gray-600">Setting up AI-powered market intelligence...</p>
          </div>
        );
        
      case 'market-research':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Searching Across Multiple Platforms</h3>
              <p className="text-gray-600">Gathering insights from communities, forums, and industry sources</p>
            </div>

            {/* Platform Grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {SEARCH_PLATFORMS.map((platform) => (
                <div
                  key={platform.name}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    currentPlatform.includes(platform.name.toLowerCase())
                      ? 'border-blue-500 bg-blue-50 scale-105'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="text-2xl text-center mb-1">{platform.icon}</div>
                  <div className={`text-xs text-center font-medium ${platform.color}`}>
                    {platform.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Search Progress */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Search Progress</span>
                <span className="text-gray-600">
                  {searchStats.completed} / {searchStats.total} queries
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${(searchStats.completed / searchStats.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Live Search Feed */}
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-32 overflow-y-auto">
              <div className="space-y-1">
                <div>{'>'} Analyzing best platforms for your market...</div>
                <div>{'>'} Generated {searchStats.total || '250+'} intelligent search queries</div>
                {searchStats.completed > 0 && (
                  <div className="text-blue-400">
                    {'>'} Completed: {searchStats.completed} searches
                  </div>
                )}
                {currentPlatform && (
                  <div className="text-yellow-400">
                    {'>'} Currently searching: {currentPlatform}
                  </div>
                )}
                <div className="animate-pulse">{'>'} {status.message || 'Initializing search...'}</div>
              </div>
            </div>
          </div>
        );

      case 'market-analysis':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">AI Analyzing Market Intelligence</h3>
              <p className="text-gray-600">Processing thousands of data points to understand your market</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {ANALYSIS_STEPS.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm">
                    {index + 1}
                  </div>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Brain className="w-16 h-16 text-purple-600 animate-pulse" />
            </div>
          </div>
        );

      case 'segment-identification':
        return (
          <div className="text-center space-y-4">
            <Users className="w-16 h-16 text-blue-600 mx-auto animate-bounce" />
            <h3 className="text-xl font-semibold">Identifying Customer Segments</h3>
            <p className="text-gray-600">Using AI to find distinct groups with unique needs</p>
          </div>
        );

      case 'persona-development':
        return (
          <div className="text-center space-y-4">
            <Lightbulb className="w-16 h-16 text-yellow-600 mx-auto animate-pulse" />
            <h3 className="text-xl font-semibold">Creating Detailed Personas</h3>
            <p className="text-gray-600">Building profiles for each customer segment</p>
          </div>
        );

      case 'strategy-development':
        return (
          <div className="text-center space-y-4">
            <Rocket className="w-16 h-16 text-purple-600 mx-auto animate-pulse" />
            <h3 className="text-xl font-semibold">Developing GTM Strategy</h3>
            <p className="text-gray-600">Creating your implementation roadmap</p>
          </div>
        );

      default:
        return (
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
            <h3 className="text-xl font-semibold">{status.message}</h3>
          </div>
        );
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Processing Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            {(error.includes('rate limit') || error.includes('overloaded')) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tip:</strong> {
                    error.includes('overloaded') 
                      ? 'Claude AI servers are experiencing high demand. This is temporary - please wait 2-3 minutes and try again. The system will automatically retry with exponential backoff.'
                      : 'We&apos;ve implemented automatic retry with rate limiting. The system will wait and retry automatically. You can also wait 2-3 minutes before trying again to ensure the rate limit has reset.'
                  }
                </p>
              </div>
            )}
            <button
              onClick={() => router.push('/questionnaire')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {PHASE_TITLES[status.phase]}
          </h1>
          <p className="text-xl text-gray-600">
            {status.phase === 'market-research' 
              ? `Estimated time remaining: ${Math.max(1, Math.round((250 - searchStats.completed) / 20))} minutes`
              : 'Processing your market intelligence...'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left: Phase Timeline */}
          <div className="col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Analysis Progress</h3>
                <div className="space-y-3">
                  {(Object.keys(PHASE_TITLES) as ProcessingPhase[])
                    .filter(phase => phase !== 'collecting-input' && phase !== 'complete')
                    .map((phase) => {
                      const PhaseIcon = PHASE_ICONS[phase];
                      const phaseStatus = getPhaseStatus(phase);
                      
                      return (
                        <div 
                          key={phase}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                            phaseStatus === 'active' 
                              ? 'bg-blue-50 border border-blue-200' 
                              : phaseStatus === 'completed'
                              ? 'bg-green-50'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            phaseStatus === 'active'
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                              : phaseStatus === 'completed'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}>
                            {phaseStatus === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <PhaseIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              phaseStatus === 'pending' ? 'text-gray-500' : 'text-gray-900'
                            }`}>
                              {PHASE_TITLES[phase]}
                            </h4>
                          </div>
                          {phaseStatus === 'active' && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Fun Facts */}
            <Card className="mt-6 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Did you know?
                </h3>
                <p className="text-sm text-gray-700">
                  We&apos;re analyzing {searchStats.total || '250+'} sources across {SEARCH_PLATFORMS.length} platforms. 
                  This deep analysis would take a human analyst 4-6 weeks and cost $50,000+!
                </p>
              </CardContent>
            </Card>

            {/* Cost Tracker */}
            <Card className="mt-6">
              <CardContent className="p-0">
                <CostTracker costs={costs} />
              </CardContent>
            </Card>
          </div>

          {/* Center: Main Content */}
          <div className="col-span-2">
            <Card className="h-full">
              <CardContent className="p-8">
                {renderPhaseContent()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Floating Cost Tracker */}
      <CostTracker costs={costs} isMinimized={true} />
    </div>
  );
}