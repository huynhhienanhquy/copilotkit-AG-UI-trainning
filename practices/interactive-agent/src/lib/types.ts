export type AgentState = {
  status?: "idle" | "loading" | "success" | "error";

  weather?: {
    location: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windGust: number;
    conditions: string;
  };
};