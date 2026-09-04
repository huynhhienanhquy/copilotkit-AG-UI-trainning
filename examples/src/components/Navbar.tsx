"use client";

import React from "react";
import { MessageSquare, PanelRightClose, Bot, Sparkles, Layers } from "lucide-react";

export type ComponentTab = "chat" | "sidebar" | "popup";

interface NavbarProps {
  activeTab: ComponentTab;
  setActiveTab: (tab: ComponentTab) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const tabs = [
    {
      id: "chat" as ComponentTab,
      label: "CopilotChat",
      icon: MessageSquare,
      badge: "Inline / Embedded",
      desc: "Embed chat directly inside any UI container",
    },
    {
      id: "sidebar" as ComponentTab,
      label: "CopilotSidebar",
      icon: PanelRightClose,
      badge: "Slide Drawer",
      desc: "Slide-in AI assistant drawer on the right/left",
    },
    {
      id: "popup" as ComponentTab,
      label: "CopilotPopup",
      icon: Bot,
      badge: "Floating Widget",
      desc: "Floating bottom-corner trigger button & modal",
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">CopilotKit</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                  UI Demos
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">React UI Component Showcase</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Meta Info */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              UI Sandbox Active
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
