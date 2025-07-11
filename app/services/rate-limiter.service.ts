/**
 * Rate limiter service to prevent API rate limit errors
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  delayMs: number;
}

class RateLimiterService {
  private queues: Map<string, Array<() => Promise<void>>> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  
  private configs: Record<string, RateLimitConfig> = {
    claude: {
      maxRequests: 40, // More conservative limit to avoid 529 errors
      windowMs: 60000, // 1 minute
      delayMs: 2000, // 2 seconds between requests (increased from 1.2s)
    },
    serper: {
      maxRequests: 100,
      windowMs: 60000,
      delayMs: 600, // 0.6 seconds between requests
    },
  };

  async executeWithRateLimit<T>(
    service: string,
    operation: () => Promise<T>,
    retries: number = 3
  ): Promise<T> {
    const config = this.configs[service];
    if (!config) {
      return operation();
    }

    // Check if we need to wait
    await this.checkRateLimit(service, config);

    try {
      // Add delay between requests
      await this.delay(config.delayMs);
      
      // Execute the operation
      const result = await operation();
      
      // Update request count
      this.incrementRequestCount(service, config);
      
      return result;
    } catch (error: any) {
      // Handle rate limit errors
      if (error.status === 429 || error.message?.includes('rate limit')) {
        console.log(`[RateLimiter] Rate limit hit for ${service}, retrying in 60s...`);
        
        if (retries > 0) {
          // Wait longer for rate limit reset
          await this.delay(60000); // 1 minute
          return this.executeWithRateLimit(service, operation, retries - 1);
        }
      }
      
      throw error;
    }
  }

  private async checkRateLimit(service: string, config: RateLimitConfig): Promise<void> {
    const now = Date.now();
    const requestData = this.requestCounts.get(service);

    if (!requestData) {
      this.requestCounts.set(service, {
        count: 0,
        resetTime: now + config.windowMs,
      });
      return;
    }

    // Reset if window has passed
    if (now > requestData.resetTime) {
      requestData.count = 0;
      requestData.resetTime = now + config.windowMs;
    }

    // If at limit, wait until reset
    if (requestData.count >= config.maxRequests) {
      const waitTime = requestData.resetTime - now;
      console.log(`[RateLimiter] Waiting ${waitTime}ms for ${service} rate limit reset`);
      await this.delay(waitTime);
      
      // Reset after waiting
      requestData.count = 0;
      requestData.resetTime = Date.now() + config.windowMs;
    }
  }

  private incrementRequestCount(service: string, config: RateLimitConfig): void {
    const requestData = this.requestCounts.get(service);
    if (requestData) {
      requestData.count++;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current rate limit status
  getRateLimitStatus(service: string): { remaining: number; resetIn: number } {
    const config = this.configs[service];
    const requestData = this.requestCounts.get(service);
    
    if (!config || !requestData) {
      return { remaining: -1, resetIn: 0 };
    }

    const now = Date.now();
    const remaining = Math.max(0, config.maxRequests - requestData.count);
    const resetIn = Math.max(0, requestData.resetTime - now);

    return { remaining, resetIn };
  }
}

export const rateLimiter = new RateLimiterService();