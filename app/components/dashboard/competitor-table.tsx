'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, DollarSign, Users, Globe, Trophy, TrendingUp, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Competitor } from '@/types';

interface CompetitorTableProps {
  competitors: Competitor[];
}

export function CompetitorTable({ competitors }: CompetitorTableProps) {
  const [expandedTiers, setExpandedTiers] = useState<Set<number>>(new Set([1]));
  
  // Group competitors by tier
  const tier1Competitors = competitors.filter(c => c.tier === 1);
  const tier2Competitors = competitors.filter(c => c.tier === 2);
  const tier3Competitors = competitors.filter(c => c.tier === 3);
  const untieredCompetitors = competitors.filter(c => !c.tier);

  const toggleTier = (tier: number) => {
    const newExpanded = new Set(expandedTiers);
    if (newExpanded.has(tier)) {
      newExpanded.delete(tier);
    } else {
      newExpanded.add(tier);
    }
    setExpandedTiers(newExpanded);
  };

  const renderCompetitorRow = (competitor: Competitor, index: number) => {
    const tierBadge = competitor.tier ? (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        competitor.tier === 1 ? 'bg-red-100 text-red-800' :
        competitor.tier === 2 ? 'bg-yellow-100 text-yellow-800' :
        'bg-blue-100 text-blue-800'
      }`}>
        Tier {competitor.tier}
      </span>
    ) : null;

    return (
      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-3 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{competitor.name}</p>
              {tierBadge}
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {competitor.headquarters}
            </p>
            {competitor.foundedYear && (
              <p className="text-xs text-gray-500">Founded {competitor.foundedYear}</p>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {competitor.fundingTotal}
            </p>
            <p className="text-sm text-gray-600">{competitor.lastFunding}</p>
            {competitor.valuation && (
              <p className="text-xs text-purple-600 font-medium">{competitor.valuation}</p>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{competitor.employeeCount}</span>
            </div>
            {competitor.revenue && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {competitor.revenue}
              </p>
            )}
          </div>
        </td>
        <td className="py-3 px-4 max-w-xs">
          <p className="text-sm line-clamp-2">{competitor.specialty}</p>
          {competitor.keyProducts && competitor.keyProducts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {competitor.keyProducts.slice(0, 3).map((product, idx) => (
                <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                  <Package className="h-3 w-3 mr-0.5" />
                  {product}
                </span>
              ))}
            </div>
          )}
        </td>
        <td className="py-3 px-4">
          <div className="space-y-1">
            <p className="text-sm">{competitor.targetMarket}</p>
            {competitor.gtmMotion && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                {competitor.gtmMotion}
              </span>
            )}
          </div>
        </td>
        {competitor.tier === 1 && (
          <td className="py-3 px-4 max-w-xs">
            <div className="space-y-1">
              {competitor.competitiveStrength && (
                <p className="text-xs text-green-700">
                  <span className="font-medium">Strength:</span> {competitor.competitiveStrength}
                </p>
              )}
              {competitor.competitiveWeakness && (
                <p className="text-xs text-red-700">
                  <span className="font-medium">Weakness:</span> {competitor.competitiveWeakness}
                </p>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Competitive Landscape Analysis
        </CardTitle>
        <p className="text-sm text-gray-600">
          {competitors.length} competitors analyzed across 3 tiers with funding and positioning insights
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier 1: Direct Competitors */}
        {tier1Competitors.length > 0 && (
          <div>
            <button
              onClick={() => toggleTier(1)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 mb-3"
            >
              {expandedTiers.has(1) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              Tier 1: Direct Competitors ({tier1Competitors.length})
              <span className="text-sm font-normal text-gray-600">- Primary competitive threats</span>
            </button>
            {expandedTiers.has(1) && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Company</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Funding</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Size</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Specialty</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Target Market</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Competitive Intel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier1Competitors.map((competitor, index) => renderCompetitorRow(competitor, index))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tier 2: Adjacent Competitors */}
        {tier2Competitors.length > 0 && (
          <div>
            <button
              onClick={() => toggleTier(2)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 mb-3"
            >
              {expandedTiers.has(2) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              Tier 2: Adjacent Competitors ({tier2Competitors.length})
              <span className="text-sm font-normal text-gray-600">- Indirect competition & alternatives</span>
            </button>
            {expandedTiers.has(2) && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Company</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Funding</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Size</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Specialty</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Target Market</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier2Competitors.map((competitor, index) => renderCompetitorRow(competitor, index))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tier 3: Emerging Players */}
        {tier3Competitors.length > 0 && (
          <div>
            <button
              onClick={() => toggleTier(3)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 mb-3"
            >
              {expandedTiers.has(3) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              Tier 3: Emerging Players ({tier3Competitors.length})
              <span className="text-sm font-normal text-gray-600">- Startups & niche solutions</span>
            </button>
            {expandedTiers.has(3) && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Company</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Funding</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Size</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Specialty</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Target Market</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier3Competitors.map((competitor, index) => renderCompetitorRow(competitor, index))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Untiered competitors (fallback for old data) */}
        {untieredCompetitors.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              All Competitors ({untieredCompetitors.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Company</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Funding</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Size</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Specialty</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700 text-sm">Target Market</th>
                  </tr>
                </thead>
                <tbody>
                  {untieredCompetitors.map((competitor, index) => renderCompetitorRow(competitor, index))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-gray-900 mb-2">Competitive Landscape Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Competitors</p>
              <p className="font-semibold text-lg">{competitors.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Direct Threats</p>
              <p className="font-semibold text-lg text-red-600">{tier1Competitors.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Adjacent Players</p>
              <p className="font-semibold text-lg text-yellow-600">{tier2Competitors.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Emerging Startups</p>
              <p className="font-semibold text-lg text-blue-600">{tier3Competitors.length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}