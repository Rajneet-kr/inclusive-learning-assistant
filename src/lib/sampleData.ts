import biologyNotesData from "../../public/samples/biology-notes.json";
import lectureTranscriptData from "../../public/samples/lecture-transcript.json";
import practicePlanData from "../../public/samples/practice-plan.json";
import {
  IngestResponse,
  TranscribeResponse,
  PracticeResponse,
  SimplifyResponse,
} from "@/types/api";

export interface SampleBiologyNote extends IngestResponse {
  simplifiedSections: SimplifyResponse["sections"];
}

export const sampleBiologyNote: SampleBiologyNote = biologyNotesData as unknown as SampleBiologyNote;
export const sampleLectureTranscript: TranscribeResponse = lectureTranscriptData as unknown as TranscribeResponse;
export const samplePracticePlan: PracticeResponse = practicePlanData as unknown as PracticeResponse;

export async function fetchSampleNote(): Promise<SampleBiologyNote> {
  // Directly returns bundled offline data; safe for client or server components
  return sampleBiologyNote;
}

export async function fetchSampleTranscript(): Promise<TranscribeResponse> {
  return sampleLectureTranscript;
}

export async function fetchSamplePracticePlan(): Promise<PracticeResponse> {
  return samplePracticePlan;
}
