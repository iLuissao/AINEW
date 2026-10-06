/**
 * Centralized API Client Architecture for PV-ESS Application
 * Supports Web Development, Capacitor Android, Staging, Production, and Offline fallback.
 */

export type EnvironmentType = 'development' | 'staging' | 'production';

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs: number;
  environment: EnvironmentType;
}

/**
 * Determines the API Base URL based on environment and runtime (Web vs Capacitor Android).
 */
export function getApiBaseUrl(): string {
  // Check if running inside Capacitor native app
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
  
  // Custom environment injection if available
  const envCustom = typeof window !== 'undefined' && (window as any).__PV_API_BASE_URL__;
  if (envCustom) {
    return envCustom;
  }

  if (isCapacitor) {
    // In Capacitor Android production/staging, point to deployed backend
    return 'https://ais-dev-s5hbktcbqk7kxiylecix6p-201304765716.us-west1.run.app';
  }

  // Web environment: use relative or development host
  if (typeof window !== 'undefined' && window.location.origin.includes('run.app')) {
    return window.location.origin;
  }

  // Local development default
  return 'http://localhost:3000';
}

export interface ApiHealthStatus {
  apiBaseUrl: string;
  networkAvailable: boolean;
  dnsReachable: boolean;
  tlsValid: boolean;
  httpStatus: number;
  authStatus: string;
  backendVersion: string;
  latencyMs: number;
  timestamp: string;
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

class ApiClient {
  private config: ApiClientConfig;

  constructor() {
    this.config = {
      baseUrl: getApiBaseUrl(),
      timeoutMs: 15000,
      environment: window.location.hostname === 'localhost' ? 'development' : 'production',
    };
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.config.baseUrl = url;
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Executes a robust fetch with timeout, error handling, and optional retry.
   */
  public async request<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { timeoutMs = this.config.timeoutMs, retries = 1, ...fetchOptions } = options;

    if (!this.isOnline()) {
      throw new Error('OFFLINE_ERROR: Dispositivo sin conexión a internet. Operando en modo local.');
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.config.baseUrl}${cleanEndpoint}`;

    let lastError: any = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers || {}),
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`HTTP Error ${response.status}: ${response.statusText} - ${errorBody}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return (await response.text()) as unknown as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new Error(`TIMEOUT_ERROR: La solicitud excedió el tiempo límite de ${timeoutMs}ms`);
        }
        if (attempt === retries) {
          break;
        }
        // Wait before retry
        await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
      }
    }

    console.error(`[ApiClient] Request failed for ${url}:`, lastError);
    throw lastError;
  }

  /**
   * Diagnostic API Health Check for development & auditing
   */
  public async checkHealth(): Promise<ApiHealthStatus> {
    const startTime = performance.now();
    const networkAvailable = this.isOnline();
    let httpStatus = 0;
    let backendVersion = 'unknown';
    let tlsValid = true;
    let dnsReachable = true;

    if (!networkAvailable) {
      return {
        apiBaseUrl: this.config.baseUrl,
        networkAvailable: false,
        dnsReachable: false,
        tlsValid: false,
        httpStatus: 0,
        authStatus: 'OFFLINE',
        backendVersion: 'N/A (Offline)',
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const res = await this.request<{ version?: string; status?: string }>('/api/health', {
        timeoutMs: 5000,
        retries: 0,
      });
      httpStatus = 200;
      backendVersion = res?.version || res?.status || '1.0.0';
    } catch (err: any) {
      httpStatus = 500;
      dnsReachable = !err.message.includes('ENOTFOUND') && !err.message.includes('Failed to fetch');
      tlsValid = !err.message.includes('CERT_');
    }

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      apiBaseUrl: this.config.baseUrl,
      networkAvailable,
      dnsReachable,
      tlsValid,
      httpStatus,
      authStatus: httpStatus === 200 ? 'AUTHORIZED' : 'UNAVAILABLE',
      backendVersion,
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  }
}

export const apiClient = new ApiClient();
