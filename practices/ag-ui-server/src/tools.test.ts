import assert from "node:assert/strict";
import test from "node:test";
import { calculateExpression, getCurrentWeather } from "./tools.js";

test("calculator handles precedence, parentheses, decimals, and unary operators", () => {
  assert.equal(calculateExpression("2 + 3 * 4"), 14);
  assert.equal(calculateExpression("(2 + 3) * 4"), 20);
  assert.equal(calculateExpression("-10 / 4"), -2.5);
  assert.equal(calculateExpression("10 % 4"), 2);
  assert.throws(() => calculateExpression("1 / 0"), /Division by zero/);
  assert.throws(() => calculateExpression("process.exit()"), /Expected a number/);
});

test("weather tool resolves a location and normalizes current conditions", async () => {
  const requestedUrls: string[] = [];
  const fakeFetch = async (input: string | URL): Promise<Response> => {
    const url = input.toString();
    requestedUrls.push(url);
    if (url.includes("geocoding-api")) {
      return Response.json({
        results: [{
          name: "Bangkok",
          admin1: "Bangkok",
          country: "Thailand",
          latitude: 13.75,
          longitude: 100.51667,
          timezone: "Asia/Bangkok",
        }],
      });
    }
    return Response.json({
      timezone: "Asia/Bangkok",
      current: {
        time: "2026-09-17T10:00",
        temperature_2m: 31.2,
        apparent_temperature: 36.1,
        relative_humidity_2m: 68,
        precipitation: 0,
        weather_code: 2,
        cloud_cover: 44,
        wind_speed_10m: 9.5,
      },
    });
  };

  const result = await getCurrentWeather("Bangkok", "celsius", fakeFetch);
  assert.equal(result.location, "Bangkok, Bangkok, Thailand");
  assert.equal(result.condition, "Partly cloudy");
  assert.equal(result.units.temperature, "°C");
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[1] ?? "", /current=temperature_2m/);
});
