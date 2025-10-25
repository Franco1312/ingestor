import { BaseHttpClient } from '@/infrastructure/http/baseHttpClient.js';
import { config } from '@/infrastructure/config/index.js';

export class DatosArgentinaClient extends BaseHttpClient {
  constructor() {
    super(
      config.externalServices.datosArgentina.baseUrl,
      config.externalServices.datosArgentina.timeout
    );
  }

  async getSeriesRange(params: {
    id: string;
    from: string;
    to: string;
  }): Promise<Array<{ ts: Date; value: number }>> {
    const { id, from, to } = params;

    try {
      const url = `/series?ids=${id}&start_date=${from}&end_date=${to}&format=json`;
      const response = await this.axiosInstance.get(url);

      const data = response.data as { data: Array<[string, number]> };
      const results = data.data.map(([date, value]) => ({
        ts: new Date(date),
        value,
      }));

      return results;
    } catch (error) {
      throw new Error(
        `Failed to fetch Datos Argentina series range: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getSeriesData(params: {
    seriesId: string;
    from: string;
    to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<unknown> {
    const { seriesId, from, to, limit, offset } = params;

    try {
      let url = `/series?ids=${seriesId}&start_date=${from}&format=json`;

      if (to) url += `&end_date=${to}`;
      if (limit) url += `&limit=${limit}`;
      if (offset) url += `&start=${offset}`;

      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch Datos Argentina series data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async healthCheck(): Promise<{ isHealthy: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();

    try {
      const url = '/series?ids=143.3_NO_PR_2004_A_21:IPC&start_date=2024-01-01&format=json&limit=1';
      await this.axiosInstance.get(url);
      return { isHealthy: true, responseTime: Date.now() - startTime };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      };
    }
  }
}
