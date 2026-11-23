import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-4">Study Dashboard</h1>
      <p className="text-slate-600 mb-6">
        Access your converted documents, practice decks, and lecture transcripts.
      </p>
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        &larr; Back to Home &amp; Sample Note
      </Link>
    </main>
  );
}
