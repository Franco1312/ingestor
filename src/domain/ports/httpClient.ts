export interface IHttpClient {
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
