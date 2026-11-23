import { supabase } from "./client";

export async function fetchDocumentById(id: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.warn("Supabase query error:", error.message);
    return null;
  }
  return data;
}
