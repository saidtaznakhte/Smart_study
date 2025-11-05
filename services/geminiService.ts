import { GoogleGenAI, Type, Modality, GenerateContentResponse } from '@google/genai';
import { Flashcard, QuizQuestion, ChatMessage, SubjectDifficulty, TimetableAnalysis, QuizType, Subject, ProgressEvent, GenerationAmount, DashboardInsights } from '../types';

// Function to get a new Gemini client instance
const getGeminiClient = () => {
    // Ensure API_KEY is read right before creating the client
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API Key is not defined. Please ensure process.env.API_KEY is set and valid.");
        throw new Error("API Key is missing. Please ensure your API key is correctly configured.");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper for retrying Gemini API calls with exponential backoff
const callGeminiWithRetry = async <T>(apiCall: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await apiCall();
    } catch (error: any) {
        const isRateLimitError = error.toString().includes('429') || error.toString().toLowerCase().includes('resource_exhausted');

        if (isRateLimitError && retries > 0) {
            console.warn(`Rate limit exceeded or resource exhausted. Retrying in ${delay / 1000}s... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, delay));
            return callGeminiWithRetry(apiCall, retries - 1, delay * 2); // Exponential backoff
        } else {
            console.error("Gemini API call failed after retries or with a non-retriable error:", error);
            throw error;
        }
    }
};

const MAX_TEXT_INPUT_LENGTH = 20000;
const warnIfTooLong = (input: string | undefined, inputName: string) => {
    if (input && input.length > MAX_TEXT_INPUT_LENGTH) {
        console.warn(`Gemini input for '${inputName}' is too long (${input.length} characters). Please consider shortening it.`);
    }
};


const flashcardSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      term: { type: Type.STRING, description: 'The key term, concept, or formula.' },
      definition: { type: Type.STRING, description: 'The definition or explanation of the term.' },
    },
    required: ['term', 'definition'],
  },
};

const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: 'The quiz question. For fill-in-the-blank, use three underscores (___) to represent the blank.' },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'An array of possible answers. For True/False, this must be ["True", "False"]. For Fill-in-the-Blank, this should be an empty array.',
      },
      correctAnswer: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'An array of correct answers. For True/False and Fill-in-the-Blank, this must be an array with a single string. For Multiple Choice, it can contain one or more strings.'
      },
      explanation: { type: Type.STRING, description: 'A brief explanation for why the answer is correct.' },
    },
    required: ['question', 'options', 'correctAnswer', 'explanation'],
  },
};

const getLanguageInstruction = (language: 'en' | 'fr') => 
  `IMPORTANT: Your entire response must be in ${language === 'fr' ? 'French' : 'English'}.`;


const getAmountMapping = (amount: GenerationAmount) => {
    return {
      [GenerationAmount.FEW]: { flashcards: 5, quizzes: 3 },
      [GenerationAmount.NORMAL]: { flashcards: 10, quizzes: 5 },
      [GenerationAmount.A_LOT]: { flashcards: 20, quizzes: 8 },
    }[amount];
};

const buildContentParts = (material: string, prompt: string, files?: { mimeType: string; data: string }[]) => {
    const contentParts: any[] = [];
    if (files && files.length > 0) {
      files.forEach(file => {
        contentParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data,
          },
        });
      });
    }

    const textParts: string[] = [];
    if (material.trim()) {
      const textPrefix = (files && files.length > 0) ? 'In addition to the file(s), here is some text to consider:' : 'Here is the study material:';
      textParts.push(`${textPrefix}\n\n${material}`);
    }
    
    textParts.push(prompt);
    contentParts.push({ text: textParts.join('\n\n') });
    return contentParts;
}

export const generateSummary = async (
  material: string,
  language: 'en' | 'fr',
  focus: string,
  files?: { mimeType: string; data: string }[]
): Promise<string> => {
    try {
        warnIfTooLong(material, 'study material');
        warnIfTooLong(focus, 'focus area');

        const model = 'gemini-2.5-flash';
        const langInstruction = getLanguageInstruction(language);
        const focusInstruction = focus ? `Pay special attention to the following topics or concepts: "${focus}".` : '';

        const prompt = `Analyze the provided study material and generate a comprehensive, well-structured study guide. The output must be meticulously organized to resemble a high-quality educational document, making it easy for a student to understand and learn from.

**Formatting and Structure Requirements (Strictly Enforced for Visual Readability):**
The goal is to create a document that is not only informative but also *visually easy to read and scan*. To achieve this, strictly adhere to the following:

1.  **Overall Title:**
    *   Begin with a single, clear, and descriptive main title for the entire study guide.
    *   Use a Markdown H1 heading (e.g., \`# [Main Title of the Subject]\`).

2.  **Logical Sections and Hierarchy:**
    *   Break down the content into logical, distinct sections using headings to create a clear hierarchy.
    *   Use Markdown H2 headings for major sections (e.g., \`## Key Concepts\`).
    *   Use H3 headings for subsections (e.g., \`### Photosynthesis Process\`).

3.  **Content Presentation:**
    *   **Paragraphs:** Write clear and concise paragraphs to explain concepts.
    *   **Lists:** Use bullet points (\`*\` or \`-\`) for lists of items, facts, or key takeaways. Use numbered lists (\`1.\`, \`2.\`) for sequential steps or processes.
    *   **Highlights and Emphasis:** Use **bold text** (\`**important term**\`) to highlight essential keywords, definitions, and main ideas so they stand out visually. Do not overuse bolding; apply it strategically to key information.

4.  **Spacing and Indentation (Crucial for Scannability):**
    *   **ALWAYS** place a blank line between all distinct Markdown elements. This includes:
        *   Between a heading and the paragraph that follows it.
        *   Between paragraphs.
        *   Between a paragraph and a list.
        *   Between list items if they are multi-line.
    *   Ensure lists (bulleted and numbered) are properly indented by Markdown for clear hierarchy.
    *   This meticulous use of spacing and indentation is critical for creating a clean, professional, and easy-to-read document where main ideas are immediately apparent.

**Example Structure:**

\`\`\`markdown
# Title of the Study Guide

## Section 1: Introduction to the Topic
A brief overview paragraph explaining what this section covers.

A second paragraph providing more context.

## Section 2: Core Concepts
Here is an explanation of the first core concept.

*   **Key Term 1:** Definition of the first term.
*   **Key Term 2:** Definition of the second term.

### Subsection 2.1: A Deeper Dive
This subsection explores a specific aspect of the core concept.

1.  First step in the process.
2.  Second step in the process.
\`\`\`

---
${focusInstruction}

${langInstruction}`;
        
        const contentParts = buildContentParts(material, prompt, files);

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
            const ai = getGeminiClient(); // Get client dynamically
            return ai.models.generateContent({
                model,
                contents: { parts: contentParts },
                config: { thinkingConfig: { thinkingBudget: 0 } },
            });
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating summary:", error);
        throw new Error("Failed to generate summary with Gemini API.");
    }
};

export const generateFlashcards = async (
  material: string,
  language: 'en' | 'fr',
  amount: GenerationAmount,
  focus: string,
  files?: { mimeType: string; data: string }[],
  regenerationHint?: string
): Promise<Omit<Flashcard, 'id' | 'easinessFactor' | 'interval' | 'repetitions' | 'dueDate'>[]> => {
    try {
        warnIfTooLong(material, 'study material');
        warnIfTooLong(focus, 'focus area');

        const model = 'gemini-2.5-flash';
        const langInstruction = getLanguageInstruction(language);
        const quantities = getAmountMapping(amount);
        const focusInstruction = focus ? `Pay special attention to the following topics or concepts: "${focus}".` : '';
        const regenerationInstruction = regenerationHint ? ` (Internal generation hint: ${regenerationHint})` : '';

        const schema = {
            type: Type.OBJECT,
            properties: {
                flashcards: { ...flashcardSchema, description: `An array of key flashcards.` },
            },
            required: ['flashcards'],
        };
        
        const prompt = `Based on the provided study material, generate a reasonable number of key flashcards, up to a maximum of ${quantities.flashcards}. The actual number of flashcards should be appropriate for the length and complexity of the material. ${focusInstruction} ${langInstruction}${regenerationInstruction} Your output must be a single JSON object that strictly adheres to the provided schema.`;

        const contentParts = buildContentParts(material, prompt, files);

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
            const ai = getGeminiClient(); // Get client dynamically
            return ai.models.generateContent({
                model,
                contents: { parts: contentParts },
                config: { responseMimeType: 'application/json', responseSchema: schema, thinkingConfig: { thinkingBudget: 0 } },
            });
        });

        const result = JSON.parse(response.text.trim());
        return result.flashcards;

    } catch (error) {
        console.error("Error generating flashcards:", error);
        throw new Error("Failed to generate flashcards with Gemini API.");
    }
};

export const generateQuizzes = async (
  material: string,
  language: 'en' | 'fr',
  difficulty: SubjectDifficulty,
  amount: GenerationAmount,
  focus: string,
  files?: { mimeType: string; data: string }[],
  regenerationHint?: string
): Promise<{ [key in QuizType]?: QuizQuestion[] }> => {
    try {
        warnIfTooLong(material, 'study material');
        warnIfTooLong(focus, 'focus area');

        const model = 'gemini-2.5-flash';
        const langInstruction = getLanguageInstruction(language);
        const quantities = getAmountMapping(amount);
        const focusInstruction = focus ? `Pay special attention to the following topics or concepts: "${focus}".` : '';
        const regenerationInstruction = regenerationHint ? ` (Internal generation hint: ${regenerationHint})` : '';

        const schema = {
            type: Type.OBJECT,
            properties: {
                [QuizType.MULTIPLE_CHOICE]: { ...quizSchema, description: `An array of multiple-choice quiz questions.` },
                [QuizType.TRUE_FALSE]: { ...quizSchema, description: `An array of true/false quiz questions.` },
                [QuizType.FILL_IN_THE_BLANK]: { ...quizSchema, description: `An array of fill-in-the-blank quiz questions.` },
            },
            required: [QuizType.MULTIPLE_CHOICE, QuizType.TRUE_FALSE, QuizType.FILL_IN_THE_BLANK]
        };
        
        const prompt = `Based on the provided study material, generate a set of high-quality, accurate, and challenging quizzes. The overall difficulty for all quizzes should be '${difficulty.toLowerCase()}'. ${focusInstruction}
The set must include three types of quizzes. For each quiz type, generate a number of questions that is reasonable and appropriate for the length and complexity of the material provided, up to a maximum of ${quantities.quizzes} questions per quiz type.

1.  **Multiple-choice quiz:** Generate questions with 4 options each. The number of correct answers MUST vary to effectively test the user's knowledge: include some questions with a single correct answer, some with two, and some with three. Do not make all questions have the same number of correct answers.
2.  **True/false quiz:** The options must be ["True", "False"], and \`correctAnswer\` must be an array with one element (e.g., ["True"]).
3.  **Fill-in-the-blank quiz:** Use "___" for blanks. The \`options\` array must be empty, and \`correctAnswer\` must be an array with a single string for the blank.

${langInstruction}${regenerationInstruction}
Your output must be a single JSON object that strictly adheres to the provided schema.`;

        const contentParts = buildContentParts(material, prompt, files);

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
            const ai = getGeminiClient(); // Get client dynamically
            return ai.models.generateContent({
                model,
                contents: { parts: contentParts },
                config: { responseMimeType: 'application/json', responseSchema: schema, thinkingConfig: { thinkingBudget: 0 } },
            });
        });

        const result = JSON.parse(response.text.trim());
        return result;

    } catch (error) {
        console.error("Error generating quizzes:", error);
        throw new Error("Failed to generate quizzes with Gemini API.");
    }
};


export const getChatResponse = async (
    material: string, 
    history: ChatMessage[], 
    language: 'en' | 'fr', 
    files?: { mimeType: string; data: string }[]
): Promise<string> => {
  try {
    warnIfTooLong(material, 'chat material context');
    history.forEach((msg, index) => warnIfTooLong(msg.content, `chat message ${index}`));

    const model = 'gemini-2.5-flash';
    const langInstruction = getLanguageInstruction(language);
      
    const systemInstruction = `You are a helpful and supportive AI study assistant. Your goal is to answer questions to help the user study effectively.
- Use the provided "STUDY MATERIAL" and any attached files as your primary source of information to answer questions.
- You can also use your general knowledge to provide additional explanations, give examples, or answer questions not covered in the material.
- Integrate information from all sources seamlessly to provide the most comprehensive and helpful answer.
${langInstruction}

STUDY MATERIAL:
---
${material || "No text material provided. Rely on attached files and general knowledge."}
---`;

    const fileParts = files?.map(f => ({
        inlineData: {
            mimeType: f.mimeType,
            data: f.data
        }
    })) || [];

    const historyForApi = history.map((message, index) => {
        // Attach files only to the last user message, as that's the context for the current query
        if (message.role === 'user' && index === history.length - 1) {
            return {
                role: message.role,
                parts: [{ text: message.content }, ...fileParts]
            }
        }
        return {
            role: message.role,
            parts: [{ text: message.content }]
        }
    });

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
        const ai = getGeminiClient(); // Get client dynamically
        // @ts-ignore - The `role` in `ChatMessage` matches the expected 'user'|'model'.
        return ai.models.generateContent({
            model,
            contents: historyForApi,
            config: {
                systemInstruction,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
    });

    return response.text.trim();

  } catch (error) {
    console.error("Error getting chat response:", error);
    throw new Error("Failed to get chat response from Gemini API.");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    warnIfTooLong(text, 'speech input text');

    const model = 'gemini-2.5-flash-preview-tts';
    const voice = 'Kore';

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
        const ai = getGeminiClient(); // Get client dynamically
        return ai.models.generateContent({
            model,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received from API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate speech with Gemini API.");
  }
};

export const generateQuizFeedback = async (language: 'en' | 'fr', incorrectQuestions: QuizQuestion[]): Promise<string> => {
    if (incorrectQuestions.length === 0) return "";
    try {
        const model = 'gemini-2.5-flash';
        const langInstruction = getLanguageInstruction(language);
        const prompt = `A student took a quiz and answered the following questions incorrectly. Provide 2-3 concise, actionable learning tips to help them understand the core concepts they're struggling with. Use markdown for formatting. ${langInstruction}\n\nIncorrect Questions:\n${incorrectQuestions.map(q => `- ${q.question} (Correct Answer: ${q.correctAnswer.join(', ')})`).join('\n')}`;

        warnIfTooLong(prompt, 'quiz feedback prompt');

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
            const ai = getGeminiClient(); // Get client dynamically
            return ai.models.generateContent({ 
                model, 
                contents: prompt,
                config: { thinkingConfig: { thinkingBudget: 0 } },
            });
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating quiz feedback:", error);
        throw error; // Re-throw the error
    }
}

const timetableAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        schedule: {
            type: Type.ARRAY,
            description: 'The extracted class schedule.',
            items: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING, description: 'Name of the class or subject.' },
                    day: { type: Type.STRING, description: 'Day of the week (e.g., Monday, Tuesday).' },
                    startTime: { type: Type.STRING, description: 'Start time in HH:MM format.' },
                    endTime: { type: Type.STRING, description: 'End time in HH:MM format.' },
                },
                required: ['subject', 'day', 'startTime', 'endTime'],
            },
        },
        studyWindows: {
            type: Type.ARRAY,
            description: 'The identified optimal study windows.',
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING, description: 'Day of the week for the study slot.' },
                    startTime: { type: Type.STRING, description: 'Start time of the study slot in HH:MM format.' },
                    endTime: { type: Type.STRING, description: 'End time of the study slot in HH:MM format.' },
                    suggestion: { type: Type.STRING, description: 'A brief suggestion for this study window (e.g., "Good for a quick review", "Ideal for deep work").' },
                },
                required: ['day', 'startTime', 'endTime', 'suggestion'],
            },
        }
    },
    required: ['schedule', 'studyWindows'],
};


export const analyzeTimetable = async (
  language: 'en' | 'fr',
  file?: { mimeType: string; data: string },
  manualEntry?: string
): Promise<TimetableAnalysis> => {
  try {
    warnIfTooLong(manualEntry, 'manual timetable entry');

    const model = 'gemini-2.5-flash';
    const langInstruction = getLanguageInstruction(language);
    
    const prompt = `You are an expert student advisor. Analyze the following school timetable. It is provided either as an image/PDF or as text. Extract all scheduled classes, including the subject, day of the week, start time, and end time. Assume a Monday-Friday week unless other days are specified. Identify all free periods between classes and after the last class of the day (until 8 PM). These are potential study windows. Structure the output as a JSON object. ${langInstruction}`;

    const contentParts: any[] = [{ text: prompt }];

    if (file) {
      contentParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data,
        },
      });
    }

    if (manualEntry) {
      contentParts.push({ text: `Here is the schedule entered as text:\n\n${manualEntry}` });
    }

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
        const ai = getGeminiClient(); // Get client dynamically
        return ai.models.generateContent({
            model,
            contents: { parts: contentParts },
            config: { responseMimeType: 'application/json', responseSchema: timetableAnalysisSchema, thinkingConfig: { thinkingBudget: 0 } },
        });
    });

    const result = JSON.parse(response.text.trim()) as TimetableAnalysis;
    
    result.schedule = result.schedule.map(item => ({...item, id: crypto.randomUUID() }));
    result.studyWindows = result.studyWindows.map(item => ({...item, id: crypto.randomUUID() }));

    return result;

  } catch (error) {
    console.error("Error analyzing timetable:", error);
    throw new Error("Failed to analyze timetable with Gemini API.");
  }
};

export const generateDashboardInsights = async (subjects: Subject[], language: 'en' | 'fr'): Promise<DashboardInsights> => {
    try {
        const model = 'gemini-2.5-flash';
        const langInstruction = getLanguageInstruction(language);

        const schema = {
            type: Type.OBJECT,
            properties: {
                dailyReport: {
                    type: Type.STRING,
                    description: "A short, encouraging summary (2-3 sentences) of the student's study activities from the last 24 hours. If no activity, provide a motivational message to get started."
                },
                learningTip: {
                    type: Type.STRING,
                    description: "One single, concise, and highly actionable learning tip (2-3 sentences). It should introduce a specific method (like Feynman technique, active recall, etc.) that addresses the student's weakest subject based on their readiness score."
                },
                reminders: {
                    type: Type.ARRAY,
                    description: "An array of short, friendly reminder messages (1-2 sentences) for subjects with upcoming exams (within 7 days) that haven't been studied in the last 3 days. If no subjects meet this criteria, return an empty array.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            subjectName: { type: Type.STRING, description: 'The name of the subject for the reminder.' },
                            text: { type: Type.STRING, description: 'The reminder message text.' },
                        },
                        required: ['subjectName', 'text'],
                    }
                }
            },
            required: ['dailyReport', 'learningTip', 'reminders'],
        };
        
        // Prepare context from subjects data
        const subjectsContext = subjects.map(s => {
            const recentProgress = s.progress
                .filter(p => new Date(p.date) > new Date(Date.now() - 24 * 60 * 60 * 1000))
                .map(p => p.type === 'quiz' ? `took a quiz (score: ${p.score}%)` : `reviewed ${p.cardsReviewed} flashcards`)
                .join(', ');

            return {
                name: s.name,
                readinessScore: s.readinessScore,
                examDate: s.examDate,
                lastStudied: s.progress.length > 0 ? s.progress[s.progress.length-1].date : 'never',
                recentProgress: recentProgress || 'none in last 24h',
            };
        });

        const prompt = `You are a motivational and insightful AI study coach. Analyze the provided student data and generate a JSON object with a daily report, a learning tip, and reminders.
        
Context:
- Today's Date: ${new Date().toISOString()}
- Student Subjects Data:
${JSON.stringify(subjectsContext, null, 2)}

Instructions:
1.  **Daily Report**: Based on 'recentProgress', write an encouraging summary. If there's no progress, write a motivational quote to encourage studying today.
2.  **Learning Tip**: Identify the subject with the lowest 'readinessScore'. Provide a specific, actionable study technique to help improve in that area.
3.  **Reminders**: Create reminders ONLY for subjects where the 'examDate' is within the next 7 days AND the 'lastStudied' date is more than 3 days ago. If none fit, the array must be empty.

${langInstruction}
Your output must be a single JSON object that strictly adheres to the provided schema.`;

        warnIfTooLong(prompt, 'dashboard insights prompt'); // Check combined prompt content

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
            const ai = getGeminiClient(); // Get client dynamically
            return ai.models.generateContent({
                model,
                contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema: schema, thinkingConfig: { thinkingBudget: 0 } },
            });
        });

        const result = JSON.parse(response.text.trim());
        // Trim individual string properties within the result
        return {
            ...result,
            dailyReport: result.dailyReport.trim(),
            learningTip: result.learningTip.trim(),
            reminders: result.reminders.map((r: any) => ({
                subjectName: r.subjectName.trim(),
                text: r.text.trim(),
            })),
        };

    } catch (error) {
        console.error("Error generating dashboard insights:", error);
        throw new Error("Failed to generate dashboard insights with Gemini API.");
    }
};


export const generateQuizStrategyTip = async (score: number, language: 'en' | 'fr'): Promise<string> => {
    try {
        const model = 'gemini-2.5-flash';
        const langInstruction = getLanguageInstruction(language);
        let userPerformanceContext = '';
        if (score < 50) {
            userPerformanceContext = `The student scored ${score}%, which is quite low. The tip should be encouraging and focus on foundational learning techniques.`;
        } else if (score < 80) {
            userPerformanceContext = `The student scored ${score}%. They understand some concepts but need to solidify their knowledge. Suggest a technique for deeper understanding.`;
        } else {
            userPerformanceContext = `The student scored ${score}%, which is great! Suggest a technique for knowledge retention and preparing for more advanced topics.`;
        }

        const prompt = `You are an expert learning coach. Based on a student's recent quiz performance, provide one concise, encouraging, and actionable study strategy tip. The tip should introduce a specific, well-known learning method (like the Feynman technique, spaced repetition, active recall, mind mapping, etc.) relevant to their performance level. Keep the tip to 2-3 sentences. ${userPerformanceContext} ${langInstruction}`;

        warnIfTooLong(prompt, 'quiz strategy tip prompt'); // Check combined prompt content

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
            const ai = getGeminiClient(); // Get client dynamically
            return ai.models.generateContent({ 
                model, 
                contents: prompt,
                config: { thinkingConfig: { thinkingBudget: 0 } },
            });
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating quiz strategy tip:", error);
        throw error; // Re-throw the error
    }
};

export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    warnIfTooLong(prompt, 'image edit prompt');

    const model = 'gemini-2.5-flash-image';

    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: prompt,
    };

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => {
        const ai = getGeminiClient(); // Get client dynamically
        return ai.models.generateContent({
            model,
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data received from API in editImage.");

  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Failed to edit image with Gemini API.");
  }
};