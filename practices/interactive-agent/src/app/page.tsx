"use client";

// cSpell:ignore copilotkit

import { useEffect, useState } from "react";
import { z } from "zod";

import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  useAgent,
  useCopilotChatConfiguration,
  useConfigureSuggestions,
  useHumanInTheLoop,
  useRenderTool,
} from "@copilotkit/react-core/v2";

import "@copilotkit/react-core/v2/styles.css";

import { ConversationSidebar } from "@/components/conversation-sidebar";
import { WeatherCard } from "@/components/weather";
import type { AgentState } from "@/lib/types";

import styles from "./page.module.css";

const WeatherDataSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windGust: z.number(),
  conditions: z.string(),
  location: z.string(),
});

type WeatherData = z.infer<typeof WeatherDataSchema>;

export default function CopilotKitPage() {
  const [threadSelection, setThreadSelection] = useState<{
    id?: string;
    explicit: boolean;
  }>({ explicit: false });

  return (
    <CopilotChatConfigurationProvider
      agentId="default"
      threadId={threadSelection.id}
      hasExplicitThreadId={threadSelection.explicit}
    >
      <ChatWorkspace
        onNewThread={() =>
          setThreadSelection({
            id: crypto.randomUUID(),
            explicit: false,
          })
        }
        onSelectThread={(id) =>
          setThreadSelection({ id, explicit: true })
        }
      />
    </CopilotChatConfigurationProvider>
  );
}

function ChatWorkspace({
  onNewThread,
  onSelectThread,
}: Readonly<{
  onNewThread: () => void;
  onSelectThread: (threadId: string) => void;
}>) {
  const configuration = useCopilotChatConfiguration();

  return (
    <div className={styles.chatLayout}>
      <aside className={styles.threadPanel}>
        <ConversationSidebar
          activeThreadId={configuration?.threadId}
          onNewThread={onNewThread}
          onSelectThread={onSelectThread}
        />
      </aside>

      <main className={styles.chatPanel}>
        <WeatherChat key={configuration?.threadId} />
      </main>
    </div>
  );
}

function WeatherChat() {
  useConfigureSuggestions({
    available: "always",
    suggestions: [
      {
        title: "Da Nang",
        message: "Thời tiết tại Đà Nẵng bây giờ?",
      },
      {
        title: "Ha Noi",
        message: "Thời tiết tại Hà Nội bây giờ?",
      },
      {
        title: "Ho Chi Minh City",
        message: "Thời tiết tại Hồ Chí Minh bây giờ?",
      },
    ],
  });

  useHumanInTheLoop(
    {
      name: "confirm_weather",
      description:
        "Ask the user for confirmation before retrieving current weather.",

      parameters: z.object({
        location: z
          .string()
          .describe("Location to retrieve weather for"),
      }),

      render: ({ args, respond }) => {
        if (!respond) {
          return null;
        }

        return (
          <div className={styles.confirmCard}>
            <h3 className={styles.confirmTitle}>
              Confirm weather request
            </h3>

            <p className={styles.confirmText}>
              Get current weather for{" "}
              <strong>{args.location}</strong>?
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => {
                  respond({
                    approved: true,
                  });
                }}
              >
                Confirm
              </button>

              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  respond({
                    approved: false,
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      },
    },
    [],
  );

  useRenderTool(
    {
      name: "weatherTool",

      parameters: z.object({
        location: z.string(),
      }),

      render: ({ status, result }) => {
        if (status !== "complete") {
          return (
            <div className={styles.toolLoading}>
              Getting weather...
            </div>
          );
        }

        if (!result) {
          return (
            <div className={styles.toolError}>
              Unable to retrieve weather.
            </div>
          );
        }

        let parsedResult: unknown = result;

        if (typeof result === "string") {
          try {
            parsedResult = JSON.parse(result);
          } catch {
            return (
              <div className={styles.toolError}>
                Invalid weather response.
              </div>
            );
          }
        }

        const parsed =
          WeatherDataSchema.safeParse(parsedResult);

        if (!parsed.success) {
          console.error(
            "Invalid weather result:",
            parsed.error,
          );

          return (
            <div className={styles.toolError}>
              Invalid weather data.
            </div>
          );
        }

        return (
          <WeatherResult weather={parsed.data} />
        );
      },
    },
    [],
  );

  return <CopilotChat />;
}

function WeatherResult({
  weather,
}: Readonly<{
  weather: WeatherData;
}>) {
  const { agent } = useAgent({
    agentId: "default",
  });

  useEffect(() => {
    const currentState =
      (agent.state as AgentState | undefined) ?? {
        status: "idle",
      };

    const sameWeather =
      currentState.weather?.location ===
        weather.location &&
      currentState.weather?.temperature ===
        weather.temperature &&
      currentState.weather?.conditions ===
        weather.conditions;

    if (sameWeather) {
      return;
    }

    agent.setState({
      ...currentState,

      status: "success",

      weather: {
        location: weather.location,
        temperature: weather.temperature,
        feelsLike: weather.feelsLike,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        windGust: weather.windGust,
        conditions: weather.conditions,
      },
    });
  }, [
    agent,
    weather.location,
    weather.temperature,
    weather.feelsLike,
    weather.humidity,
    weather.windSpeed,
    weather.windGust,
    weather.conditions,
  ]);

  return (
    <WeatherCard
      weather={weather}
      themeColor="#6366f1"
    />
  );
}
