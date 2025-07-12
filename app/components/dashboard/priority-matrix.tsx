'use client';

import { useRef } from 'react';
import { Scatter } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Segment } from '@/types';
import { priorityMatrixOptions, getSegmentColor } from '@/lib/chart-config';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Chart,
} from 'chart.js';

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PriorityMatrixProps {
  segments: Segment[];
}

export function PriorityMatrix({ segments }: PriorityMatrixProps) {
  const chartRef = useRef<ChartJS>(null);


  // If no segments, show empty state
  if (!segments || segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Priority Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No segment data available</p>
        </CardContent>
      </Card>
    );
  }

  // Extract scores
  const attractivenessScores = segments.map(s => s.priorityScore?.marketAttractiveness || 50);
  const accessibilityScores = segments.map(s => s.priorityScore?.accessibility || 50);
  
  // Calculate min/max for dynamic scaling with padding
  const minX = Math.min(...attractivenessScores);
  const maxX = Math.max(...attractivenessScores);
  const minY = Math.min(...accessibilityScores);
  const maxY = Math.max(...accessibilityScores);
  
  // Add padding (10% on each side)
  const xPadding = (maxX - minX) * 0.1 || 10;
  const yPadding = (maxY - minY) * 0.1 || 10;
  
  const scaleMinX = Math.max(0, minX - xPadding);
  const scaleMaxX = Math.min(100, maxX + xPadding);
  const scaleMinY = Math.max(0, minY - yPadding);
  const scaleMaxY = Math.min(100, maxY + yPadding);
  
  // Calculate medians for quadrant boundaries
  const sortedX = [...attractivenessScores].sort((a, b) => a - b);
  const sortedY = [...accessibilityScores].sort((a, b) => a - b);
  const medianX = sortedX[Math.floor(sortedX.length / 2)] || 50;
  const medianY = sortedY[Math.floor(sortedY.length / 2)] || 50;

  // Create scatter data
  const data = {
    datasets: [{
      label: 'Segments',
      data: segments.map((segment, index) => {
        const x = segment.priorityScore?.marketAttractiveness || 50;
        const y = segment.priorityScore?.accessibility || 50;
        return { 
          x, 
          y,
          label: segment.name 
        };
      }),
      backgroundColor: segments.map((segment) => {
        const x = segment.priorityScore?.marketAttractiveness || 50;
        const y = segment.priorityScore?.accessibility || 50;
        return getSegmentColor(x, y, medianX, medianY);
      }),
      pointRadius: segments.map(segment => {
        const size = Math.sqrt((segment.size?.value || 10000000) / 1000000);
        return Math.max(10, Math.min(30, size * 2));
      }),
      pointHoverRadius: segments.map(segment => {
        const size = Math.sqrt((segment.size?.value || 10000000) / 1000000);
        return Math.max(12, Math.min(32, size * 2 + 2));
      }),
      borderColor: segments.map((segment) => {
        const x = segment.priorityScore?.marketAttractiveness || 50;
        const y = segment.priorityScore?.accessibility || 50;
        return getSegmentColor(x, y, medianX, medianY).replace('0.8', '1');
      }),
      borderWidth: 2,
    }],
  };

  // Custom plugin to draw quadrant lines
  const quadrantPlugin = {
    id: 'quadrantLines',
    afterDraw: (chart: Chart<'scatter'>) => {
      const ctx = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      
      // Draw vertical line at median X
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xScale.getPixelForValue(medianX), yScale.top);
      ctx.lineTo(xScale.getPixelForValue(medianX), yScale.bottom);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      
      // Draw horizontal line at median Y
      ctx.beginPath();
      ctx.moveTo(xScale.left, yScale.getPixelForValue(medianY));
      ctx.lineTo(xScale.right, yScale.getPixelForValue(medianY));
      ctx.stroke();
      ctx.restore();
    }
  };

  // Create custom options with dynamic scales
  const dynamicOptions = {
    ...priorityMatrixOptions,
    scales: {
      ...priorityMatrixOptions.scales,
      x: {
        ...priorityMatrixOptions.scales?.x,
        min: scaleMinX,
        max: scaleMaxX,
      },
      y: {
        ...priorityMatrixOptions.scales?.y,
        min: scaleMinY,
        max: scaleMaxY,
      },
    },
    plugins: {
      ...priorityMatrixOptions.plugins,
      [quadrantPlugin.id]: quadrantPlugin,
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Priority Matrix</CardTitle>
        <p className="text-sm text-gray-600">
          Bubble size represents market value. Position indicates strategic priority.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Scatter 
            ref={chartRef as React.RefObject<ChartJS<'scatter', { x: number; y: number }[], unknown>>}
            options={dynamicOptions} 
            data={data} 
            plugins={[quadrantPlugin]}
          />
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }} />
            <span className="text-sm">High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(251, 191, 36, 0.8)' }} />
            <span className="text-sm">Medium-High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.8)' }} />
            <span className="text-sm">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
            <span className="text-sm">Low Priority</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}