# CONTEXTUAL "I'M STUCK" LEARNING ASSISTANT

## 1. Feature Overview

The "I'm Stuck" feature is an additional learning support functionality developed for the Inclusive Learning Assistant application. It helps students understand specific words, sentences, or concepts that they find difficult while reading educational content.

Instead of simplifying the entire document, students can select only the portion they do not understand and request an explanation.

## 2. Key Functionalities

- **Text Selection:** Students can select a specific word, sentence, or paragraph in the Dyslexia Reader.
- **Difficulty Classification:** Students can choose between Difficult Word, Long Sentence, and Unclear Concept.
- **AI-Based Explanation:** Gemini AI generates a simpler explanation based on the selected text and its surrounding context.
- **Real-World Example:** Each explanation includes a practical example to make the concept easier to understand.
- **Understanding Check:** The assistant generates a short question to help students check their understanding.
- **Save Difficult Concepts:** Students can save explanations for future revision.
- **My Difficult Concepts:** Students can view saved concepts, mark them as understood, or delete them.

## 3. Technologies Used

- Next.js and React – Frontend and application development.
- TypeScript – Type safety and data structure definitions.
- Gemini AI – Contextual explanation generation.
- API Routes – Communication between the frontend and AI processing layer.
- Browser localStorage – Saving and managing difficult concepts.
- Tailwind CSS – User interface styling.

## 4. Implementation Files

| File | Purpose |
|---|---|
| `DyslexiaReader.tsx` | Handles text selection and displays the "I'm Stuck" option. |
| `ImStuckAssistant.tsx` | Displays difficulty options and AI-generated explanations. |
| `MyDifficultConcepts.tsx` | Manages saved concepts and revision. |
| `stuck-helper/route.ts` | Handles backend requests and AI responses. |
| `stuckHelperPrompt.ts` | Defines instructions for Gemini AI. |
| `api.ts` | Defines request, response, and concept data types. |
| `page.tsx` | Integrates the feature into the existing application. |

## 5. Working Flow

1. The student opens the Dyslexia Reader.
2. The student selects a difficult word, sentence, or concept.
3. The "I'm Stuck" button appears.
4. The student selects the type of difficulty.
5. The selected text and surrounding context are sent to the backend API.
6. The backend validates the request and sends it to Gemini AI.
7. The generated explanation, real-world example, and check question are displayed.
8. The student can save the explanation under My Difficult Concepts.
9. Saved concepts can be revisited, marked as understood, or deleted.

## 6. Current Status

The feature implementation has been added to the existing application and pushed to the `feature/learning-gap-detector` GitHub branch.

TypeScript validation completed successfully using `npx tsc --noEmit`.

The Gemini API currently returns a 403 access-denied response because the project's Free Tier request-per-minute limits have been exceeded for some configured models. The fallback response is implemented, but successful AI-generated explanations still require further testing after API access becomes available.