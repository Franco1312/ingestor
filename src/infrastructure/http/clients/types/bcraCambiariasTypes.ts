export interface CambiariasMoneda {
  codigo: string;
  denominacion: string;
}

export interface CambiariasMonedasResponse {
  status: number;
  results: CambiariasMoneda[];
}

export interface CambiariasCotizacionDetalle {
  codigoMoneda?: string;
  tipoCotizacion?: number;
}

export interface CambiariasCotizacion {
  fecha: string;
  detalle: CambiariasCotizacionDetalle[];
}

export interface CambiariasExchangeRateResponse {
  results: CambiariasCotizacion[];
}
