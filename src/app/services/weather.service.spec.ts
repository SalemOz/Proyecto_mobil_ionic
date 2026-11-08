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
});
