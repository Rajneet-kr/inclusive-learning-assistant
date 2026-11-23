import { createClient } from "@deepgram/sdk";

const deepgramApiKey = process.env.DEEPGRAM_API_KEY || "";

export const deepgramClient = createClient(deepgramApiKey);
