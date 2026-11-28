"use client";

import * as React from "react";
import { StudyDay } from "@/types/api";
import { Calendar, CheckSquare, Clock } from "lucide-react";

interface StudyPlanTimelineProps {
  studyPlan: StudyDay[];
}

export function StudyPlanTimeline({ studyPlan }: StudyPlanTimelineProps) {
  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Personalized 5-Day Study Schedule
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
          ~20 mins / day
        </span>
      </div>

      <div className="space-y-4">
        {studyPlan.map((day) => (
          <div
            key={day.day}
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/80 backdrop-blur-sm hover:bg-slate-50/95 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded">
                Day {day.day}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {day.estimatedMinutes} mins
              </span>
            </div>

            <h3 className="font-bold text-base text-slate-900 mb-2">{day.title}</h3>

            <ul className="space-y-1.5">
              {day.tasks.map((task, tIdx) => (
                <li
                  key={tIdx}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
