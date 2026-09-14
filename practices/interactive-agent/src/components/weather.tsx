"use client";

export type WeatherData = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  conditions: string;
  location: string;
};

interface WeatherCardProps {
  weather: WeatherData;
  themeColor: string;
}

export function WeatherCard({
  weather,
  themeColor,
}: WeatherCardProps) {
  return (
    <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Current weather
          </p>

          <h2 className="text-2xl font-semibold text-gray-900">
            {weather.location}
          </h2>
        </div>

        <span className="text-4xl">
          {getWeatherIcon(weather.conditions)}
        </span>
      </div>

      {/* Temperature */}
      <div className="mt-6">
        <div
          className="text-5xl font-bold"
          style={{ color: themeColor }}
        >
          {weather.temperature}°C
        </div>

        <p className="mt-2 text-gray-600">
          {weather.conditions}
        </p>

        <p className="text-sm text-gray-500">
          Feels like {weather.feelsLike}°C
        </p>
      </div>

      {/* Details */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <WeatherDetail
          label="Humidity"
          value={`${weather.humidity}%`}
        />

        <WeatherDetail
          label="Wind"
          value={`${weather.windSpeed} km/h`}
        />

        <WeatherDetail
          label="Wind gust"
          value={`${weather.windGust} km/h`}
        />
      </div>
    </div>
  );
}

function WeatherDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-100 p-3 text-center">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function getWeatherIcon(condition: string) {
  const value = condition.toLowerCase();

  if (
    value.includes("rain") ||
    value.includes("drizzle")
  ) {
    return "🌧️";
  }

  if (value.includes("thunder")) {
    return "⛈️";
  }

  if (value.includes("snow")) {
    return "❄️";
  }

  if (value.includes("fog")) {
    return "🌫️";
  }

  if (
    value.includes("cloud") ||
    value.includes("overcast")
  ) {
    return "☁️";
  }

  if (
    value.includes("clear") ||
    value.includes("sun")
  ) {
    return "☀️";
  }

  return "🌤️";
}