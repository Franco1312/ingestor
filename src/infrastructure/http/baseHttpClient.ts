import axios, { type AxiosInstance } from 'axios';
import https from 'https';
import http from 'http';
import fs from 'fs';

/**
 * Base HTTP Client with keep-alive agents
 * Simple base class that only handles agent creation
 */
export class BaseHttpClient {
  protected readonly axiosInstance: AxiosInstance;
  protected readonly baseUrl: string;

  constructor(baseUrl: string, timeout: number = 15000) {
    this.baseUrl = baseUrl;

    // Create HTTP agents with keep-alive
    const httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
    });

    const httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      rejectUnauthorized: process.env.NODE_ENV !== 'local', // Only disable TLS in local
    });

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout,
      httpAgent,
      httpsAgent,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ingestor/1.0.0',
      },
    });
  }

  /**
   * Load additional CA bundle if provided
   */
  protected loadCaBundle(caBundlePath?: string): string | undefined {
    if (!caBundlePath || !fs.existsSync(caBundlePath)) {
      return undefined;
    }

    try {
      return fs.readFileSync(caBundlePath, 'utf8');
    } catch {
      return undefined;
    }
  }

  /**
   * Create HTTPS agent with CA bundle
   */
  protected createHttpsAgent(caBundlePath?: string): https.Agent {
    const agentOptions: https.AgentOptions = {
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      rejectUnauthorized: process.env.NODE_ENV !== 'local',
    };

    const caBundle = this.loadCaBundle(caBundlePath);
    if (caBundle) {
      agentOptions.ca = caBundle;
    }

    return new https.Agent(agentOptions);
  }
}
