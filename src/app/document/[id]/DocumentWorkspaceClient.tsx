"use client";

import Link from "next/link";
import { StemVerbalizerPanel } from "@/components/stem/StemVerbalizerPanel";
import { StudyPackExporter } from "@/components/export/StudyPackExporter";
import { OfflineStudyPack } from "@/types/api";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";

interface DocumentWorkspaceClientProps {
  id: string;
  defaultPack: OfflineStudyPack;
}

export function DocumentWorkspaceClient({
  id,
  defaultPack,
}: DocumentWorkspaceClientProps) {
  const { settings } = useAccessibilitySettings();
  const isHighContrast = Boolean(settings.highContrast || settings.profile === "low_vision");

  return (
    <div
      className={`min-h-screen w-full relative flex flex-col transition-colors ${
        isHighContrast ? "text-yellow-300" : "text-slate-900"
      }`}
    >
      {/* Global Fixed AVIF Wireframe Background Layer */}
      <div
        aria-hidden="true"
        className="global-wireframe-bg fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/images/wireframe-bg.avif')" }}
      />
      {/* Scrim Overlay */}
      <div
        aria-hidden="true"
        className="global-scrim-overlay fixed inset-0 -z-10 pointer-events-none backdrop-blur-[2px] transition-colors duration-300"
        style={{
          backgroundColor: isHighContrast
            ? "rgba(0, 0, 0, 0.90)"
            : "rgba(253, 251, 247, 0.72)",
        }}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        <div
          className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b rounded-2xl p-6 border shadow-xs transition-colors ${
            isHighContrast
              ? "border-yellow-400 bg-black/95 text-yellow-300 border-2"
              : "border-slate-200/80 bg-white/90 backdrop-blur-md text-slate-900"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isHighContrast
                    ? "text-yellow-400 hover:text-yellow-300"
                    : "text-blue-600 hover:text-blue-800"
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Document Workspace:{" "}
              <span
                className={`font-mono ${
                  isHighContrast ? "text-yellow-400" : "text-indigo-600"
                }`}
              >
                {id}
              </span>
            </h1>
            <p
              className={`text-sm mt-1 ${
                isHighContrast ? "text-yellow-200/80" : "text-slate-600"
              }`}
            >
              Accessible STEM multimodal scan and diagram reasoning workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StudyPackExporter pack={defaultPack} />
            <Link
              href="/"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                isHighContrast
                  ? "bg-yellow-400 text-black hover:bg-yellow-300 font-bold border-2 border-yellow-400"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Return to Main Reader
            </Link>
          </div>
        </div>

        <StemVerbalizerPanel
          settings={settings}
          highContrast={isHighContrast}
          documentId={id}
        />
      </main>
    </div>
  );
}
