"use client";

import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Sparkles,
  CheckCircle2
} from "lucide-react";

export default function DashboardContent({ title = "Analytics Overview" }: { title?: string }) {
  const stats = [
    { label: "Total Revenue", value: "$48,295", change: "+14.2%", isPositive: true, icon: DollarSign, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { label: "Active Users", value: "3,842", change: "+8.1%", isPositive: true, icon: Users, color: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Conversion Rate", value: "4.35%", change: "-0.4%", isPositive: false, icon: TrendingUp, color: "text-amber-600 bg-amber-50 border-amber-100" },
    { label: "Total Orders", value: "1,429", change: "+12.5%", isPositive: true, icon: ShoppingBag, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
  ];

  const recentTasks = [
    { id: 1, title: "Optimize Landing Page CTA conversion", priority: "High", status: "In Progress", time: "2h ago" },
    { id: 2, title: "Update CopilotKit React UI package", priority: "Medium", status: "Completed", time: "4h ago" },
    { id: 3, title: "Refactor analytics dashboard metrics", priority: "Low", status: "Pending", time: "1d ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium text-white mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              CopilotKit UI Showcase
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Test how AI copilot interfaces embed or overlay on top of production web layouts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              ⚡ UI Mock Mode
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                <div className={`p-2 rounded-lg border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-800">{stat.value}</span>
                <span className={`inline-flex items-center text-xs font-semibold ${stat.isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {stat.isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart Mock */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Weekly Activity Trends</h3>
            </div>
            <span className="text-xs text-slate-400">Past 7 Days</span>
          </div>
          <div className="mt-6 flex items-end justify-between h-44 gap-2 pt-4 px-2">
            {[
              { day: "Mon", height: "45%", value: "$3.2k" },
              { day: "Tue", height: "70%", value: "$5.8k" },
              { day: "Wed", height: "55%", value: "$4.1k" },
              { day: "Thu", height: "85%", value: "$7.2k" },
              { day: "Fri", height: "65%", value: "$5.4k" },
              { day: "Sat", height: "95%", value: "$8.9k" },
              { day: "Sun", height: "75%", value: "$6.5k" },
            ].map((col, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {col.value}
                </span>
                <div 
                  className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md group-hover:from-indigo-500 group-hover:to-indigo-300 transition-all cursor-pointer"
                  style={{ height: col.height }}
                />
                <span className="text-xs text-slate-500 font-medium">{col.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Recent Tasks</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">3 Total</span>
          </div>
          <div className="mt-4 space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700 leading-snug">{task.title}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    task.priority === "High" ? "bg-rose-50 text-rose-600" :
                    task.priority === "Medium" ? "bg-amber-50 text-amber-600" : "bg-slate-200 text-slate-600"
                  }`}>
                    {task.priority}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
