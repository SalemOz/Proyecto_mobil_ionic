import { describe, expect, it } from 'vitest';
import { describeWeather, suggestMode } from './weather.service';

describe('weather helpers', () => {
  it('describe el código de clima', () => {
    expect(describeWeather(0).text).toBe('Despejado');
    expect(describeWeather(63).text).toBe('Lluvia');
    expect(describeWeather(95).text).toBe('Tormenta eléctrica');
  });

  it('sugiere modo Alto con lluvia o viento fuerte', () => {
    expect(suggestMode({ temperature: 20, humidity: 80, wind: 5, code: 63 })?.mode).toBe('high');
    expect(suggestMode({ temperature: 20, humidity: 50, wind: 30, code: 3 })?.mode).toBe('high');
  });

  it('sugiere modo Bajo con clima tranquilo', () => {
    expect(suggestMode({ temperature: 28, humidity: 40, wind: 4, code: 0 })?.mode).toBe('low');
  });

  it('sugiere modo Alto con tormenta eléctrica (código 95)', () => {
    expect(suggestMode({ temperature: 21, humidity: 90, wind: 5, code: 95 })?.mode).toBe('high');
  });

  it('sugiere modo Alto con lluvia (código 61)', () => {
    expect(suggestMode({ temperature: 18, humidity: 85, wind: 8, code: 61 })?.mode).toBe('high');
  });

  it('sugiere modo Alto con viento de 25 km/h aunque el cielo esté nublado', () => {
    expect(suggestMode({ temperature: 24, humidity: 50, wind: 25, code: 3 })?.mode).toBe('high');
  });

  it('no sugiere nada con cielo nublado y viento bajo', () => {
    expect(suggestMode({ temperature: 24, humidity: 50, wind: 10, code: 3 })).toBeNull();
  });

  it('describe nublado, lluvia y un código desconocido', () => {
    expect(describeWeather(3).text).toBe('Nublado');
    expect(describeWeather(61).text).toBe('Lluvia');
    expect(describeWeather(20).text).toBe('Clima no identificado');
  });
});
