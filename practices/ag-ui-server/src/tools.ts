export type WeatherUnits = "celsius" | "fahrenheit";

export interface WeatherResult {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  observedAt: string;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  precipitation: number;
  cloudCover: number;
  windSpeed: number;
  units: {
    temperature: "°C" | "°F";
    precipitation: "mm";
    windSpeed: "km/h" | "mph";
  };
}

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface GeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    timezone?: string;
    admin1?: string;
    country?: string;
  }>;
}

interface ForecastResponse {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
  };
}

export async function getCurrentWeather(
  location: string,
  units: WeatherUnits = "celsius",
  fetcher: Fetcher = fetch,
): Promise<WeatherResult> {
  const query = location.trim();
  if (query.length < 2) throw new Error("Weather location must contain at least two characters.");

  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodingUrl.search = new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  }).toString();

  const geocodingResponse = await fetcher(geocodingUrl, { signal: AbortSignal.timeout(8_000) });
  if (!geocodingResponse.ok) {
    throw new Error(`Weather location lookup failed with HTTP ${geocodingResponse.status}.`);
  }

  const geocoding = (await geocodingResponse.json()) as GeocodingResponse;
  const match = geocoding.results?.[0];
  if (!match) throw new Error(`No weather location found for “${query}”.`);

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.search = new URLSearchParams({
    latitude: String(match.latitude),
    longitude: String(match.longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
    ].join(","),
    temperature_unit: units,
    wind_speed_unit: units === "fahrenheit" ? "mph" : "kmh",
    timezone: "auto",
  }).toString();

  const forecastResponse = await fetcher(forecastUrl, { signal: AbortSignal.timeout(8_000) });
  if (!forecastResponse.ok) {
    throw new Error(`Weather forecast lookup failed with HTTP ${forecastResponse.status}.`);
  }

  const forecast = (await forecastResponse.json()) as ForecastResponse;
  const current = forecast.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.apparent_temperature !== "number" ||
    typeof current.relative_humidity_2m !== "number" ||
    typeof current.precipitation !== "number" ||
    typeof current.weather_code !== "number" ||
    typeof current.cloud_cover !== "number" ||
    typeof current.wind_speed_10m !== "number"
  ) {
    throw new Error("The weather provider returned an incomplete current-conditions response.");
  }

  return {
    location: [match.name, match.admin1, match.country].filter(Boolean).join(", "),
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: forecast.timezone ?? match.timezone ?? "UTC",
    observedAt: current.time ?? new Date().toISOString(),
    condition: describeWeatherCode(current.weather_code),
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    relativeHumidity: current.relative_humidity_2m,
    precipitation: current.precipitation,
    cloudCover: current.cloud_cover,
    windSpeed: current.wind_speed_10m,
    units: {
      temperature: units === "fahrenheit" ? "°F" : "°C",
      precipitation: "mm",
      windSpeed: units === "fahrenheit" ? "mph" : "km/h",
    },
  };
}

export function calculateExpression(expression: string): number {
  const source = expression.trim();
  if (!source) throw new Error("A mathematical expression is required.");
  if (source.length > 200) throw new Error("The mathematical expression is too long.");
  return new ArithmeticParser(source).parse();
}

class ArithmeticParser {
  private position = 0;

  constructor(private readonly source: string) {}

  parse(): number {
    const result = this.parseExpression();
    this.skipWhitespace();
    if (this.position !== this.source.length) {
      throw new Error(`Unexpected token at position ${this.position + 1}.`);
    }
    if (!Number.isFinite(result)) throw new Error("The calculation did not produce a finite number.");
    return normalizeNumber(result);
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      if (this.consume("+")) value += this.parseTerm();
      else if (this.consume("-")) value -= this.parseTerm();
      else return value;
    }
  }

  private parseTerm(): number {
    let value = this.parseUnary();
    while (true) {
      if (this.consume("*")) value *= this.parseUnary();
      else if (this.consume("/")) {
        const divisor = this.parseUnary();
        if (divisor === 0) throw new Error("Division by zero is not allowed.");
        value /= divisor;
      } else if (this.consume("%")) {
        const divisor = this.parseUnary();
        if (divisor === 0) throw new Error("Modulo by zero is not allowed.");
        value %= divisor;
      } else return value;
    }
  }

  private parseUnary(): number {
    if (this.consume("+")) return this.parseUnary();
    if (this.consume("-")) return -this.parseUnary();
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    if (this.consume("(")) {
      const value = this.parseExpression();
      if (!this.consume(")")) throw new Error(`Missing closing parenthesis at position ${this.position + 1}.`);
      return value;
    }

    this.skipWhitespace();
    const match = this.source.slice(this.position).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/iu);
    if (!match) throw new Error(`Expected a number at position ${this.position + 1}.`);
    this.position += match[0].length;
    return Number(match[0]);
  }

  private consume(token: string): boolean {
    this.skipWhitespace();
    if (!this.source.startsWith(token, this.position)) return false;
    this.position += token.length;
    return true;
  }

  private skipWhitespace() {
    while (/\s/u.test(this.source[this.position] ?? "")) this.position += 1;
  }
}

function normalizeNumber(value: number): number {
  return Number.parseFloat(value.toPrecision(15));
}

function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return `Weather code ${code}`;
}
