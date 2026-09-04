"use client";

import React, { useState } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import DashboardContent from "./DashboardContent";
import { PanelRightClose, Sliders, Code, Sparkles, Check, ToggleLeft, ToggleRight } from "lucide-react";

export default function CopilotSidebarDemo() {
  const [sidebarTitle, setSidebarTitle] = useState("Copilot Sidebar");
  const [initialMessage, setInitialMessage] = useState("Hi! I'm pinned in your sidebar. I can help analyze your workflow and manage tasks.");
  const [placeholder, setPlaceholder] = useState("Ask sidebar copilot...");
  const [defaultOpen, setDefaultOpen] = useState(true);
  const [clickOutsideToClose, setClickOutsideToClose] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<CopilotSidebar
  defaultOpen={${defaultOpen}}
  clickOutsideToClose={${clickOutsideToClose}}
  instructions="Help the user while navigating their dashboard."
  labels={{
    title: "${sidebarTitle}",
    initial: "${initialMessage}",
    placeholder: "${placeholder}",
  }}
>
  {/* Your Page Content */}
  <DashboardContent />
</CopilotSidebar>`;

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
                &lt;CopilotSidebar /&gt;
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Collapsible Drawer / Slide-Over Component
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              CopilotSidebar - Collapsible Assistant Drawer
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Wraps your application layout and slides in seamlessly from the edge of the viewport. Can push or overlay page content with built-in trigger buttons.
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

      {/* Live Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-800">Live Sidebar Props & Controls</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Title Label</label>
            <input
              type="text"
              value={sidebarTitle}
              onChange={(e) => setSidebarTitle(e.target.value)}
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
          <div>
            <label className="font-medium text-slate-700 block mb-1">Default Open</label>
            <button
              onClick={() => setDefaultOpen(!defaultOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg font-medium transition-colors ${
                defaultOpen ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <span>{defaultOpen ? "Enabled (true)" : "Disabled (false)"}</span>
              {defaultOpen ? <ToggleRight className="w-5 h-5 text-indigo-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
            </button>
          </div>
          <div>
            <label className="font-medium text-slate-700 block mb-1">Click Outside To Close</label>
            <button
              onClick={() => setClickOutsideToClose(!clickOutsideToClose)}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg font-medium transition-colors ${
                clickOutsideToClose ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <span>{clickOutsideToClose ? "Enabled (true)" : "Disabled (false)"}</span>
              {clickOutsideToClose ? <ToggleRight className="w-5 h-5 text-indigo-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Wrapper Container */}
      <div className="relative rounded-2xl border border-slate-200/80 shadow-md overflow-hidden bg-white min-h-[720px]">
        <CopilotSidebar
          key={`sidebar-${defaultOpen}-${clickOutsideToClose}`}
          defaultOpen={defaultOpen}
          clickOutsideToClose={clickOutsideToClose}
          instructions="Help the user with sidebar assistant interactions."
          labels={{
            title: sidebarTitle,
            initial: initialMessage,
            placeholder: placeholder,
          }}
        >
          <div className="p-6">
            <DashboardContent title="Sidebar Wrapped Application View" />
          </div>
        </CopilotSidebar>
      </div>
    </div>
  );
}
