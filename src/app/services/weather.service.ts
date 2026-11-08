import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';
import { AmbientMode, Weather } from '../models';

const API_URL = 'https://api.open-meteo.com/v1/forecast';
// Neiva, Huila: se usa si el usuario no da permiso de ubicación.
const DEFAULT_PLACE = { lat: 2.9273, lon: -75.2819 };

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

export interface WeatherResult {
  weather: Weather;
  fromGps: boolean;
}

export interface ModeSuggestion {
  mode: AmbientMode;
  reason: string;
}

/** Texto e ícono para cada código de clima WMO. */
export function describeWeather(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'Despejado', icon: 'sunny-outline' };
  if (code <= 2) return { text: 'Parcialmente nublado', icon: 'partly-sunny-outline' };
  if (code === 3) return { text: 'Nublado', icon: 'cloud-outline' };
  if (code === 45 || code === 48) return { text: 'Niebla', icon: 'cloud-outline' };
  if (code >= 51 && code <= 57) return { text: 'Llovizna', icon: 'rainy-outline' };
  if (code >= 61 && code <= 67) return { text: 'Lluvia', icon: 'rainy-outline' };
  if (code >= 71 && code <= 77) return { text: 'Nieve', icon: 'snow-outline' };
  if (code >= 80 && code <= 82) return { text: 'Chubascos', icon: 'rainy-outline' };
  if (code >= 85 && code <= 86) return { text: 'Chubascos de nieve', icon: 'snow-outline' };
  if (code >= 95) return { text: 'Tormenta eléctrica', icon: 'thunderstorm-outline' };
  return { text: 'Clima no identificado', icon: 'help-circle-outline' };
}

/**
 * Lluvia, tormenta o viento fuerte tapan los sonidos del entorno:
 * se sugiere el modo "Alto" para no perder lo que pasa del lado afectado.
 */
export function suggestMode(weather: Weather): ModeSuggestion | null {
  const rainy = (weather.code >= 51 && weather.code <= 67) || (weather.code >= 80 && weather.code <= 82);
  if (weather.code >= 95) return { mode: 'high', reason: 'Hay tormenta: el ruido tapa los sonidos del entorno.' };
  if (rainy) return { mode: 'high', reason: 'Está lloviendo: la lluvia tapa los sonidos del entorno.' };
  if (weather.wind >= 25) return { mode: 'high', reason: 'Hay viento fuerte: puede tapar los sonidos del entorno.' };
  if (weather.code === 0 || weather.code <= 2) return { mode: 'low', reason: 'Clima tranquilo: el modo Bajo es suficiente.' };
  return null;
}

/** Consulta el clima actual en Open-Meteo (API pública, sin clave) usando el GPS del teléfono. */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  async load(): Promise<WeatherResult> {
    const place = await this.locate();
    const response = await firstValueFrom(
      this.http.get<OpenMeteoResponse>(API_URL, {
        params: {
          latitude: place.lat,
          longitude: place.lon,
          current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m'
        }
      })
    );
    const c = response.current;
    return {
      fromGps: place.fromGps,
      weather: {
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        wind: c.wind_speed_10m,
        code: c.weather_code
      }
    };
  }

  /** GPS con el plugin de Capacitor; si no hay permiso o falla, usa la ubicación por defecto. */
  private async locate(): Promise<{ lat: number; lon: number; fromGps: boolean }> {
    try {
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
          throw new Error('Permiso de ubicación denegado');
        }
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 600000
      });
      return { lat: position.coords.latitude, lon: position.coords.longitude, fromGps: true };
    } catch {
      return { ...DEFAULT_PLACE, fromGps: false };
    }
  }
}
