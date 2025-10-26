export interface BcraVariable {
  idVariable: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  valor: number;
}

export interface BcraSeriesDataPoint {
  fecha: string;
  valor: number;
}

export interface BcraAvailableSeriesResponse {
  results: BcraVariable[];
}

export interface BcraSeriesDataResponse {
  results: BcraSeriesDataPoint[];
}
