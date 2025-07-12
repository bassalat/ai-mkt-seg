import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Zap, AlertCircle } from 'lucide-react';
import { Segment } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface SegmentCardProps {
  segment: Segment;
  index: number;
}

export function SegmentCard({ segment }: SegmentCardProps) {

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl mb-2">{segment.name}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {formatNumber(segment.size.count)} companies
              </span>
              <span className="font-medium text-primary-600">
                {segment.size.percentage}% of TAM
              </span>
            </div>
          </div>
          {segment.size.growthRate && (
            <Badge className="bg-green-100 text-green-700">
              {segment.size.growthRate} growth
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Value */}
        <div>
          <p className="text-sm text-gray-600 mb-1">Market Value</p>
          <p className="text-2xl font-bold">{formatCurrency(segment.size.value)}</p>
          {segment.size.growthRate && (
            <p className="text-sm text-green-600 font-medium">↑ {segment.size.growthRate} YoY</p>
          )}
        </div>

        {/* Primary Pain Points */}
        {segment.painPoints && segment.painPoints.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Top Pain Points
            </p>
            <ul className="space-y-1">
              {segment.painPoints.slice(0, 2).map((pain, i) => (
                <li key={i} className="text-sm text-gray-600">
                  • {pain.pain}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Primary Use Case */}
        {segment.useCases && segment.useCases.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <Target className="h-4 w-4" />
              Primary Use Case
            </p>
            <p className="text-sm text-gray-600">
              {segment.useCases[0]?.scenario || 'Multiple use cases available'}
            </p>
          </div>
        )}

        {/* Messaging Hook */}
        {segment.messagingHooks && segment.messagingHooks.primary && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <Zap className="h-4 w-4" />
              Key Message
            </p>
            <p className="text-sm text-primary-600 font-medium italic">
              &quot;{segment.messagingHooks.primary}&quot;
            </p>
          </div>
        )}

        {/* Priority Scores */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-600">Market Attractiveness</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full gradient-primary"
                  style={{ width: `${segment.priorityScore.marketAttractiveness}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {segment.priorityScore.marketAttractiveness}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-600">Accessibility</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full gradient-secondary"
                  style={{ width: `${segment.priorityScore.accessibility}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {segment.priorityScore.accessibility}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}