"use client";

import React, { useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import DashboardContent from "./DashboardContent";
import { MessageSquare, Sliders, Code, Info, Sparkles, Check } from "lucide-react";

export default function CopilotChatDemo() {
  const [chatTitle, setChatTitle] = useState("AI Workspace Assistant");
  const [initialMessage, setInitialMessage] = useState("Hi! 👋 I'm your Copilot assistant. Ask me about analytics, tasks, or write queries!");
  const [placeholder, setPlaceholder] = useState("Type a message or instruction...");
  const [instructions, setInstructions] = useState("Help the user understand analytics data and organize tasks.");
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<CopilotChat
  instructions="${instructions}"
  labels={{
    title: "${chatTitle}",
    initial: "${initialMessage}",
    placeholder: "${placeholder}",
  }}
  className="h-[650px] rounded-2xl border border-slate-200 shadow-sm"
/>`;

  const copyCode = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Component Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-xs font-semibold border border-indigo-100">
                &lt;CopilotChat /&gt;
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Embedded / Inline Component
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              CopilotChat - Embedded AI Chat Interface
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Renders a full-featured AI conversational assistant directly inside any page container, panel, or split grid layout.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Code className="w-3.5 h-3.5" />
              {showCode ? "Hide Code" : "View Code"}
            </button>
          </div>
        </div>

        {/* Code Snippet Drawer */}
        {showCode && (
          <div className="mt-4 pt-4 border-t border-slate-100 relative">
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto">
              <pre>{snippet}</pre>
            </div>
            <button
              onClick={copyCode}
              className="absolute top-6 right-3 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Main Showcase Layout: 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dashboard Content (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Live UI Props Controls</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Title Label</label>
                <input
                  type="text"
                  value={chatTitle}
                  onChange={(e) => setChatTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-1">Input Placeholder</label>
                <input
                  type="text"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-medium text-slate-700 block mb-1">Initial Welcome Message</label>
                <input
                  type="text"
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          <DashboardContent title="Embedded Context Dashboard" />
        </div>

        {/* Right Column: Embedded CopilotChat UI (5 cols) */}
        <div className="xl:col-span-5 sticky top-24">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden flex flex-col h-[700px]">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold tracking-wide">Live &lt;CopilotChat /&gt;</span>
              </div>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/20">
                Interactive
              </span>
            </div>

            <div className="flex-1 overflow-hidden">
              <CopilotChat
                instructions={instructions}
                labels={{
                  title: chatTitle,
                  initial: initialMessage,
                  placeholder: placeholder,
                }}
                className="h-full rounded-none border-none shadow-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
