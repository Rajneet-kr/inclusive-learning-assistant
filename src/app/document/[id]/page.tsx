import { sampleBiologyNote, samplePracticePlan } from "@/lib/sampleData";
import { OfflineStudyPack } from "@/types/api";
import { DocumentWorkspaceClient } from "./DocumentWorkspaceClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;

  const defaultPack: OfflineStudyPack = {
    documentId: id,
    title: `Document ${id} Study Pack`,
    generatedAt: new Date().toISOString(),
    language: "en",
    simplifiedSections: sampleBiologyNote.simplifiedSections,
    glossary: sampleBiologyNote.simplifiedSections.flatMap((s) =>
      s.jargon.map((j) => ({
        term: j.term,
        plainMeaning: j.plainMeaning,
        language: "en" as const,
        source: "document" as const,
        documentId: id,
      }))
    ),
    flashcards: samplePracticePlan.flashcards.map((f) => ({
      id: f.id,
      front: f.front,
      back: f.back,
      concept: f.concept,
    })),
    quiz: samplePracticePlan.quiz.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
    studyPlan: samplePracticePlan.studyPlan.map((p) => ({
      day: p.day,
      title: p.title,
      tasks: p.tasks,
      estimatedMinutes: p.estimatedMinutes,
    })),
  };

  return <DocumentWorkspaceClient id={id} defaultPack={defaultPack} />;
}

