'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TAMDisplay } from '@/components/dashboard/tam-display';
import { SegmentCard } from '@/components/dashboard/segment-card';
import { PriorityMatrix } from '@/components/dashboard/priority-matrix';
import { CompetitorTable } from '@/components/dashboard/competitor-table';
import { SegmentationResult } from '@/types';
import { ArrowLeft, Download, FileJson, FileText, TrendingUp, Users, Target, Lightbulb } from 'lucide-react';
import { PDFExportButton } from '@/lib/pdf-generator';

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'personas' | 'strategy'>('overview');

  useEffect(() => {
    // Get result from session storage
    const resultStr = sessionStorage.getItem('segmentationResult');
    if (!resultStr) {
      router.push('/');
      return;
    }
    
    try {
      const parsedResult = JSON.parse(resultStr);
      setResult(parsedResult);
    } catch (error) {
      console.error('Failed to parse results:', error);
      router.push('/');
    }
  }, [router]);

  // PDF export is handled by PDFExportButton component

  const handleExportJSON = () => {
    if (!result) return;
    
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `market-segmentation-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Market Overview', icon: TrendingUp },
    { id: 'segments', label: 'Segments', icon: Users },
    { id: 'personas', label: 'Personas', icon: Target },
    { id: 'strategy', label: 'GTM Strategy', icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <h1 className="text-2xl font-bold gradient-text">AI Market Segmentation</h1>
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <PDFExportButton result={result}>
                <Button size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </PDFExportButton>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Market Segmentation Analysis</h2>
          <p className="text-gray-600">
            Generated on {new Date(result.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Warning if using fallback data */}
        {(result as any).warnings && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> {(result as any).warnings[0]}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'gradient-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* TAM Display */}
              <section>
                <h3 className="text-2xl font-semibold mb-6">Total Addressable Market</h3>
                <TAMDisplay marketAnalysis={result.marketAnalysis} />
              </section>

              {/* Market Insights */}
              <section>
                <h3 className="text-2xl font-semibold mb-6">Market Intelligence</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Growth Factors */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Growth Drivers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.marketAnalysis.growthFactors && Object.entries(result.marketAnalysis.growthFactors).map(([category, factors]) => (
                          <div key={category}>
                            <h4 className="font-medium capitalize mb-2">{category}</h4>
                            <ul className="space-y-1">
                              {Array.isArray(factors) && factors.slice(0, 2).map((factor, i) => (
                                <li key={i} className="text-sm text-gray-600">• {factor}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Commercial Urgencies */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Commercial Urgencies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.marketAnalysis.commercialUrgencies.map((urgency, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary-600 font-medium">{i + 1}.</span>
                            <span className="text-sm">{urgency}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Competitors */}
              <section>
                <CompetitorTable competitors={result.marketAnalysis.competitors} />
              </section>
            </>
          )}

          {/* Segments Tab */}
          {activeTab === 'segments' && (
            <>
              {/* Priority Matrix */}
              <section>
                <PriorityMatrix segments={result.segments} />
              </section>

              {/* Segment Cards */}
              <section>
                <h3 className="text-2xl font-semibold mb-6">
                  Customer Segments ({result.segments.length} identified)
                </h3>
                {/* Show market complexity info if available */}
                {result.segments.length > 6 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>Complex Market:</strong> We've identified {result.segments.length} distinct segments based on high market complexity, 
                      {result.marketAnalysis.competitors.length} competitors, and diverse use cases. Each segment represents a unique go-to-market opportunity.
                    </p>
                  </div>
                )}
                <div className={`grid gap-6 ${
                  result.segments.length <= 6 ? 'md:grid-cols-2' : 
                  result.segments.length <= 8 ? 'md:grid-cols-2 lg:grid-cols-3' :
                  'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  {result.segments.map((segment, index) => (
                    <SegmentCard key={segment.id} segment={segment} index={index} />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Personas Tab */}
          {activeTab === 'personas' && (
            <section>
              <h3 className="text-2xl font-semibold mb-6">
                Buyer Personas ({result.personas.length} total across {result.segments.length} segments)
              </h3>
              {/* Show info about multiple personas per segment */}
              {result.personas.length > result.segments.length * 2 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Rich Persona Mapping:</strong> We've developed {Math.round(result.personas.length / result.segments.length)} personas per segment 
                    to represent the full buying committee, including Economic Buyers, Technical Buyers, User Champions, and Executive Sponsors.
                  </p>
                </div>
              )}
              <div className="space-y-8">
                {result.segments.map((segment) => {
                  const segmentPersonas = result.personas.filter(p => p.segmentId === segment.id);
                  return (
                    <div key={segment.id} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <h4 className="text-xl font-semibold">{segment.name}</h4>
                        <span className="text-sm text-gray-600">({segmentPersonas.length} personas)</span>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {segmentPersonas.map((persona, idx) => (
                          <Card key={`${persona.segmentId}-${idx}`} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-lg">{persona.name}</CardTitle>
                                  <CardDescription className="text-sm mt-1">
                                    {persona.role}
                                  </CardDescription>
                                </div>
                                <Badge variant={
                                  persona.personaType === 'Economic Buyer' ? 'default' :
                                  persona.personaType === 'Technical Buyer' ? 'secondary' :
                                  persona.personaType === 'User Champion' ? 'outline' :
                                  'outline'
                                }>
                                  {persona.personaType}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {/* Key Demographics */}
                              <div>
                                <p className="text-sm font-medium mb-2">Key Attributes</p>
                                <div className="space-y-1 text-sm">
                                  {persona.seniorityLevel && (
                                    <p><span className="text-gray-600">Level:</span> {persona.seniorityLevel}</p>
                                  )}
                                  {persona.teamSize && (
                                    <p><span className="text-gray-600">Team:</span> {persona.teamSize}</p>
                                  )}
                                  {persona.reportsTo && (
                                    <p><span className="text-gray-600">Reports to:</span> {persona.reportsTo}</p>
                                  )}
                                </div>
                              </div>

                              {/* Decision Style */}
                              {persona.psychographics?.decisionStyle && (
                                <div>
                                  <p className="text-sm font-medium mb-1">Decision Style</p>
                                  <p className="text-sm text-gray-700">{persona.psychographics.decisionStyle}</p>
                                </div>
                              )}

                              {/* Top JTBD */}
                              {persona.jobsToBeDone?.functional && persona.jobsToBeDone.functional.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Primary Job to be Done</p>
                                  <p className="text-sm text-gray-700 italic">
                                    "{persona.jobsToBeDone.functional[0]}"
                                  </p>
                                </div>
                              )}

                              {/* Buying Behavior */}
                              {persona.buyingBehavior && (
                                <div>
                                  <p className="text-sm font-medium mb-1">Buying Role</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={
                                      persona.buyingBehavior.influence === 'High' ? 'default' : 
                                      persona.buyingBehavior.influence === 'Medium' ? 'secondary' : 
                                      'outline'
                                    } className="text-xs">
                                      {persona.buyingBehavior.influence} Influence
                                    </Badge>
                                    <span className="text-xs text-gray-600">{persona.buyingBehavior.role}</span>
                                  </div>
                                </div>
                              )}

                              {/* Trust Anchors */}
                              {persona.psychographics?.trustAnchors && persona.psychographics.trustAnchors.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Trust Anchors</p>
                                  <div className="flex flex-wrap gap-1">
                                    {persona.psychographics.trustAnchors.slice(0, 3).map((anchor, i) => (
                                      <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded">
                                        {anchor}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Strategy Tab */}
          {activeTab === 'strategy' && (
            <>
              {/* Quick Wins */}
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Wins (30 Days)</CardTitle>
                    <CardDescription>
                      Immediate actions you can take to start capturing value
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {result.implementationRoadmap.quickWins.map((win, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 gradient-secondary rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {i + 1}
                          </span>
                          <span className="text-sm">{win}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Phased Approach */}
              <section>
                <h3 className="text-2xl font-semibold mb-6">Implementation Roadmap</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Phase 1 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Phase 1</CardTitle>
                        <span className="text-sm text-gray-600">0-3 months</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.implementationRoadmap.phased.phase1.map((item, i) => (
                          <li key={i} className="text-sm">• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Phase 2 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Phase 2</CardTitle>
                        <span className="text-sm text-gray-600">3-6 months</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.implementationRoadmap.phased.phase2.map((item, i) => (
                          <li key={i} className="text-sm">• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Phase 3 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Phase 3</CardTitle>
                        <span className="text-sm text-gray-600">6-12 months</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.implementationRoadmap.phased.phase3.map((item, i) => (
                          <li key={i} className="text-sm">• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Next Steps CTA */}
              <section>
                <Card className="gradient-primary text-white">
                  <CardContent className="p-8 text-center">
                    <h3 className="text-2xl font-bold mb-4">Ready to Execute?</h3>
                    <p className="text-lg mb-6 opacity-90">
                      You now have a comprehensive market segmentation strategy. 
                      Export your results and start implementing today!
                    </p>
                    <div className="flex gap-4 justify-center">
                      <PDFExportButton result={result}>
                        <Button variant="secondary" size="lg">
                          <Download className="h-5 w-5 mr-2" />
                          Download Full Report
                        </Button>
                      </PDFExportButton>
                      <Link href="/questionnaire">
                        <Button variant="outline" size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                          Run Another Analysis
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}