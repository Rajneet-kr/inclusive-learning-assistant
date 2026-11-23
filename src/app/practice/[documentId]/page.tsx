import Link from "next/link";

interface PageProps {
  params: Promise<{ documentId: string }>;
}

export default async function PracticePage({ params }: PageProps) {
  const { documentId } = await params;

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-4">Practice Session: {documentId}</h1>
      <p className="text-slate-600 mb-6">
        Adaptive quiz questions, flashcards, and personalized study timeline.
      </p>
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        &larr; Back to Home
      </Link>
    </main>
  );
}
