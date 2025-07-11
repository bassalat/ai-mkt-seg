'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Cpu, Search } from 'lucide-react';
import { CostSummary } from '@/services/cost-tracker.service';

interface CostTrackerProps {
  costs?: CostSummary;
  isMinimized?: boolean;
}

export default function CostTracker({ costs, isMinimized = false }: CostTrackerProps) {
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Animate the total cost
  useEffect(() => {
    if (costs) {
      const targetValue = costs.totalCost;
      const duration = 500; // Animation duration in ms
      const steps = 20;
      const increment = (targetValue - animatedTotal) / steps;
      
      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        setAnimatedTotal(prev => {
          const next = prev + increment;
          return currentStep === steps ? targetValue : next;
        });
        
        if (currentStep === steps) {
          clearInterval(timer);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [costs?.totalCost]);

  if (!costs) return null;

  // Format currency with appropriate precision
  const formatCost = (cost: number) => {
    if (cost < 0.01) return '$0.00';
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform"
        onClick={() => setShowBreakdown(!showBreakdown)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="font-mono font-semibold">{formatCost(animatedTotal)}</span>
          <TrendingUp className="h-4 w-4 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-purple-400" />
          API Cost Tracking
        </h3>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          {showBreakdown ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Total Cost Display */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400 font-mono">
          {formatCost(animatedTotal)}
        </div>
        <div className="text-sm text-gray-400 mt-1">Total API Costs</div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Claude Costs */}
        <div className="bg-black/30 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Claude AI</span>
            </div>
            <span className="text-sm font-mono text-purple-400">
              {formatCost(costs.claude.totalCost)}
            </span>
          </div>
          
          {showBreakdown && (
            <div className="space-y-1 mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Operations:</span>
                <span className="text-gray-400">{costs.claude.operations}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Input tokens:</span>
                <span className="text-gray-400">{formatNumber(costs.claude.inputTokens)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Output tokens:</span>
                <span className="text-gray-400">{formatNumber(costs.claude.outputTokens)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Serper Costs */}
        <div className="bg-black/30 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Serper Search</span>
            </div>
            <span className="text-sm font-mono text-blue-400">
              {formatCost(costs.serper.totalCost)}
            </span>
          </div>
          
          {showBreakdown && (
            <div className="space-y-1 mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Searches:</span>
                <span className="text-gray-400">{costs.serper.searchCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Per search:</span>
                <span className="text-gray-400">$0.01</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Operations:</span>
                <span className="text-gray-400">{costs.serper.operations}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost Efficiency Metrics */}
      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-500">Cost per Segment</div>
              <div className="text-gray-300 font-mono">
                {costs.claude.operations >= 4 ? formatCost(animatedTotal / 6) : '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Avg Token Cost</div>
              <div className="text-gray-300 font-mono">
                {costs.claude.inputTokens > 0 
                  ? formatCost(costs.claude.totalCost / (costs.claude.inputTokens + costs.claude.outputTokens) * 1000)
                  : '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Data Points</div>
              <div className="text-gray-300 font-mono">
                {costs.serper.searchCount * 20}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animated Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Analysis Progress</span>
          <span>{Math.min(Math.round((costs.claude.operations / 6) * 100), 100)}%</span>
        </div>
        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${Math.min((costs.claude.operations / 6) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}