"use client";

import { useState } from "react";
import Navbar, { ComponentTab } from "@/components/Navbar";
import CopilotChatDemo from "@/components/CopilotChatDemo";
import CopilotSidebarDemo from "@/components/CopilotSidebarDemo";
import CopilotPopupDemo from "@/components/CopilotPopupDemo";
import { MessageSquare, PanelRightClose, Bot, BookOpen } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ComponentTab>("chat");

  const componentComparison = [
    {
      name: "CopilotChat",
      type: "Embedded / Inline",
      bestFor: "Custom layouts, dedicated AI pages, side-by-side dashboards",
      keyProps: "instructions, labels, makeSystemMessage, className",
      icon: MessageSquare,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      name: "CopilotSidebar",
      type: "Slide Drawer",
      bestFor: "Full-page workspace assistant, non-intrusive collapsible side panel",
      keyProps: "defaultOpen, clickOutsideToClose, expanded, shortcut, labels",
      icon: PanelRightClose,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      name: "CopilotPopup",
      type: "Floating Modal / Widget",
      bestFor: "Quick ask button, bottom-corner customer support or copilot trigger",
      keyProps: "defaultOpen, clickOutsideToClose, hitEscapeToClose, shortcut, labels",
      icon: Bot,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header / Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Active Demo Section */}
        {activeTab === "chat" && <CopilotChatDemo />}
        {activeTab === "sidebar" && <CopilotSidebarDemo />}
        {activeTab === "popup" && <CopilotPopupDemo />}

        {/* Comparison & Documentation Table */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm mt-12">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">CopilotKit UI Components Comparison</h2>
              <p className="text-xs text-slate-500">Overview of when to use each component in your application UI</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {componentComparison.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx} 
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    activeTab === (item.name === "CopilotChat" ? "chat" : item.name === "CopilotSidebar" ? "sidebar" : "popup")
                      ? "border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-500/10"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
                  }`}
                  onClick={() => {
                    if (item.name === "CopilotChat") setActiveTab("chat");
                    if (item.name === "CopilotSidebar") setActiveTab("sidebar");
                    if (item.name === "CopilotPopup") setActiveTab("popup");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm font-mono">{`<${item.name} />`}</h3>
                      <span className="text-[11px] font-medium text-slate-500">{item.type}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Best Used For:</span>
                      <p className="text-slate-700 mt-0.5">{item.bestFor}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 font-medium block">Common Props:</span>
                      <code className="text-[11px] text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded font-mono block mt-1">
                        {item.keyProps}
                      </code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CopilotKit UI Examples</span>
            <span>•</span>
            <span>Branch: <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">examples</code></span>
          </div>
          <div>
            <span>Demonstrates CopilotChat, CopilotSidebar & CopilotPopup</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
