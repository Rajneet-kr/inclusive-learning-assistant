import Link from "next/link";
import { StemVerbalizerPanel } from "@/components/stem/StemVerbalizerPanel";
import { ArrowLeft, BookOpen } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Document Workspace: <span className="font-mono text-indigo-600">{id}</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Accessible STEM multimodal scan and diagram reasoning workspace.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" /> Return to Main Reader
        </Link>
      </div>

      <StemVerbalizerPanel documentId={id} />
    </main>
  );
}
