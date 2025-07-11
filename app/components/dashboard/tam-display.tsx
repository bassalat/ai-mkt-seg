import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign } from 'lucide-react';
import { MarketAnalysis } from '@/types';
import { formatCurrencyInBillions } from '@/lib/utils';

interface TAMDisplayProps {
  marketAnalysis: MarketAnalysis;
}

export function TAMDisplay({ marketAnalysis }: TAMDisplayProps) {
  const { tam, cagr } = marketAnalysis;
  
  const growthPercentage = tam.projectedValue && tam.currentValue
    ? ((tam.projectedValue - tam.currentValue) / tam.currentValue) * 100
    : 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Current Market */}
      <Card className="overflow-hidden">
        <div className="h-2 gradient-primary" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Market Size</p>
              <h3 className="text-3xl font-bold text-gray-900">
                {formatCurrencyInBillions(tam.currentValue)}
              </h3>
            </div>
            <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Total Addressable Market</span>
            <span className="text-primary-600 font-medium">{new Date().getFullYear()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Projected Market */}
      <Card className="overflow-hidden">
        <div className="h-2 gradient-secondary" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Projected Market Size</p>
              <h3 className="text-3xl font-bold text-gray-900">
                {formatCurrencyInBillions(tam.projectedValue)}
              </h3>
            </div>
            <div className="w-12 h-12 gradient-secondary rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              By <span className="text-secondary-600 font-medium">{tam.projectionYear}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">
                +{growthPercentage.toFixed(1)}%
              </span>
              <span className="text-gray-600">
                ({cagr.toFixed(1)}% CAGR)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}