"use client";

import { useState } from "react";
import { CopilotPopup } from "@copilotkit/react-ui";
import DashboardContent from "./DashboardContent";
import { Bot, Sliders, Code, Check, ToggleLeft, ToggleRight, MousePointerClick } from "lucide-react";

export default function CopilotPopupDemo() {
  const [popupTitle, setPopupTitle] = useState("Copilot Assistant");
  const [initialMessage, setInitialMessage] = useState("How can I help you today? Ask any questions or execute quick commands!");
  const [placeholder, setPlaceholder] = useState("Type a command or question...");
  const [defaultOpen, setDefaultOpen] = useState(true);
  const [clickOutsideToClose, setClickOutsideToClose] = useState(true);
  const [hitEscapeToClose, setHitEscapeToClose] = useState(true);
  const [shortcut, setShortcut] = useState("k");
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<CopilotPopup
  defaultOpen={${defaultOpen}}
  clickOutsideToClose={${clickOutsideToClose}}
  hitEscapeToClose={${hitEscapeToClose}}
  shortcut="${shortcut}"
  instructions="Help the user with quick assistant popup."
  labels={{
    title: "${popupTitle}",
    initial: "${initialMessage}",
    placeholder: "${placeholder}",
  }}
/>`;

  const copyCode = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 relative pb-16">
      {/* Component Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-xs font-semibold border border-indigo-100">
                &lt;CopilotPopup /&gt;
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Floating Action Modal / Corner Widget
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              CopilotPopup - Floating Assistant Widget
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Floating trigger button anchored in the bottom-right corner of the screen. Expands into a compact, beautiful chat modal with shortcut key support.
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
          <h2 className="text-sm font-semibold text-slate-800">Live Popup Props & Settings</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Title Label</label>
            <input
              type="text"
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
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
          <div>
            <label className="font-medium text-slate-700 block mb-1">Hit Escape To Close</label>
            <button
              onClick={() => setHitEscapeToClose(!hitEscapeToClose)}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg font-medium transition-colors ${
                hitEscapeToClose ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <span>{hitEscapeToClose ? "Enabled (true)" : "Disabled (false)"}</span>
              {hitEscapeToClose ? <ToggleRight className="w-5 h-5 text-indigo-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Popup Hint Banner */}
      <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-4 flex items-center justify-between text-xs text-indigo-900">
        <div className="flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 text-indigo-600 animate-bounce" />
          <span>
            Look at the <strong>bottom-right corner</strong> of your screen to see the floating <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono text-[11px]">&lt;CopilotPopup /&gt;</code> button!
          </span>
        </div>
        <span className="text-[11px] text-indigo-600 font-medium">Shortcut: Press / or Click icon</span>
      </div>

      {/* Main Page Dashboard View */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <DashboardContent title="Popup Overlay Background Page" />
      </div>

      {/* CopilotPopup Component */}
      <CopilotPopup
        key={`popup-${defaultOpen}-${clickOutsideToClose}-${hitEscapeToClose}`}
        defaultOpen={defaultOpen}
        clickOutsideToClose={clickOutsideToClose}
        hitEscapeToClose={hitEscapeToClose}
        shortcut={shortcut}
        instructions="Help the user with quick assistant popup."
        labels={{
          title: popupTitle,
          initial: initialMessage,
          placeholder: placeholder,
        }}
      />
    </div>
  );
}
