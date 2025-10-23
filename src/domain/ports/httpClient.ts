/**
 * HTTP client port for external API calls
 */
export interface IHttpClient {
  /**
   * Make HTTP GET request
   */
  get(
    url: string,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<{
    statusCode: number;
    body: unknown;
  }>;

  /**
   * Make HTTP POST request
   */
  post(
    url: string,
    data?: unknown,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<{
    statusCode: number;
    body: unknown;
  }>;

  /**
   * Make HTTP PUT request
   */
  put(
    url: string,
    data?: unknown,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<{
    statusCode: number;
    body: unknown;
  }>;

  /**
   * Make HTTP DELETE request
   */
  delete(
    url: string,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<{
    statusCode: number;
    body: unknown;
  }>;
}
