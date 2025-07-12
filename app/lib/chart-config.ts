import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  BubbleDataPoint,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const priorityMatrixOptions: ChartOptions<'scatter'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const point = context.raw as BubbleDataPoint & { label?: string; };
          const dataset = context.dataset;
          const dataIndex = context.dataIndex;
          const dataPoint = dataset.data[dataIndex] as BubbleDataPoint & { label?: string };
          return [
            dataPoint.label || 'Segment',
            `Market Attractiveness: ${point.x}`,
            `Accessibility: ${point.y}`,
            `Size: ${point.r ? `$${(point.r * point.r / 4).toFixed(1)}M` : 'N/A'}`,
          ];
        },
      },
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Market Attractiveness →',
        font: {
          size: 14,
          weight: 'bold',
        },
      },
      min: 0,
      max: 100,
      grid: {
        display: true,
      },
    },
    y: {
      title: {
        display: true,
        text: 'Accessibility →',
        font: {
          size: 14,
          weight: 'bold',
        },
      },
      min: 0,
      max: 100,
      grid: {
        display: true,
      },
    },
  },
};

export const getSegmentColor = (x: number, y: number, medianX: number, medianY: number): string => {
  // Quadrant colors based on position relative to median
  if (x >= medianX && y >= medianY) {
    return 'rgba(34, 197, 94, 0.8)'; // Green - High priority
  } else if (x >= medianX && y < medianY) {
    return 'rgba(251, 191, 36, 0.8)'; // Yellow - Medium-high priority
  } else if (x < medianX && y >= medianY) {
    return 'rgba(59, 130, 246, 0.8)'; // Blue - Medium priority
  } else {
    return 'rgba(239, 68, 68, 0.8)'; // Red - Low priority
  }
};