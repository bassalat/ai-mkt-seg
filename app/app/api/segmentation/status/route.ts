import { NextRequest } from 'next/server';
import { costTracker } from '@/services/cost-tracker.service';

import { ProcessingStatus } from '@/types';
import { statusUpdates, costUpdates } from '@/lib/status-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId') || request.headers.get('x-session-id') || 'default';
  
  console.log('[SSE] Session ID:', sessionId);
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = () => {
        const status = statusUpdates.get(sessionId);
        const costSummary = costTracker.getSummary();
        
        if (status || costSummary) {
          const combinedData = {
            ...status,
            costs: costSummary
          };
          const data = `data: ${JSON.stringify(combinedData)}\n\n`;
          controller.enqueue(encoder.encode(data));
          
          // Log what we're sending
          if (status?.phase) {
            console.log(`[SSE] Sending update for ${sessionId}: ${status.phase} - ${status.message}`);
          }
        }
      };

      // Send initial heartbeat
      const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', sessionId })}\n\n`;
      controller.enqueue(encoder.encode(heartbeat));
      
      // Send initial status
      sendUpdate();

      // Check for updates every 500ms
      const interval = setInterval(() => {
        sendUpdate();
      }, 500);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}