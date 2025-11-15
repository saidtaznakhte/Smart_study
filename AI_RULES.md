# AI Application Development Rules

This document outlines the core technologies and best practices for developing the PrepAI application. Adhering to these guidelines ensures consistency, maintainability, and optimal performance.

## Tech Stack Overview

1.  **React:** The primary JavaScript library for building the user interface.
2.  **TypeScript:** Utilized across the codebase for type safety, improved code quality, and better developer experience.
3.  **Tailwind CSS:** A utility-first CSS framework used for all styling, ensuring a consistent and responsive design.
4.  **Vite:** The build tool providing a fast development server and optimized production builds.
5.  **Google Gemini API (`@google/genai`):** The backbone for all AI-powered features, including content generation, chat, image editing, and data analysis.
6.  **Lucide React:** A comprehensive icon library integrated for all graphical icons within the application.
7.  **Marked:** A Markdown parser used to render AI-generated content (e.g., study guides, feedback) into HTML.
8.  **Workbox:** Implemented for Progressive Web App (PWA) capabilities, enabling offline access and efficient caching.
9.  **Shadcn/ui:** A collection of reusable UI components built on Radix UI and Tailwind CSS, preferred for new UI elements.
10. **Custom State-Based Routing:** The application manages navigation between different views (dashboard, subject, planner, etc.) using React's `useContext` and a central `AppState`.

## Library Usage Rules

*   **UI Components:**
    *   For new UI components, prioritize using `shadcn/ui` components. If a specific `shadcn/ui` component doesn't fit the requirements, create a new custom component using Tailwind CSS.
    *   Avoid modifying `shadcn/ui` source files directly; create wrappers or new components if customization is needed.
*   **Styling:**
    *   All styling must be done using **Tailwind CSS** classes. Avoid inline styles or separate CSS files unless absolutely necessary for third-party integrations that do not support Tailwind.
*   **AI Interactions:**
    *   All interactions with AI models (content generation, chat, image manipulation, data analysis, speech generation, insights) must be encapsulated within the `src/services/geminiService.ts` module, utilizing the `@google/genai` library.
*   **Icons:**
    *   Use icons exclusively from the `lucide-react` library.
*   **Markdown Rendering:**
    *   When displaying AI-generated content that is in Markdown format, use the `marked` library for parsing and rendering to HTML.
*   **State Management & Routing:**
    *   The application uses a global state managed by `AppContext` (`src/context/AppContext.tsx`) for application-wide data and view management.
    *   Navigation between major sections of the app is handled by updating the `view` property in the global state, as implemented in `src/App.tsx`.
*   **Audio Playback:**
    *   For playing AI-generated speech, use the utilities provided in `src/utils/audioUtils.ts`, which leverage the Web Audio API.
*   **PDF/Content Download:**
    *   For client-side PDF generation from HTML content, use the `printToPdf` utility located in `src/utils/downloadUtils.ts`.