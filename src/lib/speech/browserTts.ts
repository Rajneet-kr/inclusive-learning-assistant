// Browser SpeechSynthesis helpers

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakBrowserText(
  text: string,
  options: { rate?: number; pitch?: number; voiceIndex?: number } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisAvailable()) {
      reject(new Error("SpeechSynthesis is not supported in this browser."));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}
