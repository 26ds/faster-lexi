# LexiGuard: AI Strategic Alignment Agent for Legal Negotiations
> **Project Type**: Strategic Negotiation AI Agent with Alignment Layers
> 
> **Core Research**: AI Alignment via Strategic Intervention & Game Theory
> 
> **Development Paradigm**: AI-Assisted Engineering (Human-in-the-loop Architecture)

## Abstract & Core Value Proposition
 


### The Problem: Sycophancy Bias in LLMs & Solution with rationality
Current Large Language Models (LLMs) often exhibit **"Sycophancy Bias"**—prioritizing user sentiment over strategic outcomes. In high-stakes scenarios like legal negotiations, this behavior can be detrimental. For example, if a user is angry, a standard LLM might draft an aggressive email that validates their emotions but sabotages their legal standing.

**LexiGuard** is a vertical AI agent designed to act as a rational "Super-Ego." Instead of blindly following instructions, it introduces an **Intervention Layer** and a **Legal Asset State Machine**. This architecture aligns outputs not with the user's temporary mood, but with their **Ultimate Strategic Goal** (e.g., "terminate the contract and reserve the right to sue").

### User Value: The Strategic Shield
For users, LexiGuard acts as a **strategic shield**. The workflow ensures safety and maximization of results:
1.  **Narrative Correction**: Helps users recall and verify the narrative to understand their actual legal rights.
2.  **Emotional De-escalation**: Through guided conversation, it filters out emotional noise to focus on micro-details.
3.  **Actionable Strategy**: It provides concrete steps to maximize the realization of the user's goals within the legal framework.

### The Complete User Flow (End-to-End)
1.  **Initial Input**: User inputs context, Jurisdiction, and preferred languages.
2.  **Yellow Line Protocol**: AI identifies ambiguities. User verifies/corrects facts.
3.  **Legal Asset Discovery**: AI analyzes context to list potential **Legal Assets**.
4.  **Orange Line Protocol**: Potential laws highlighted. User verifies evidence status.
5.  **UI Lock & Analysis**: System evaluates verified assets against user's position.
6.  **Main Strategy Session**: User enters the main chat, equipped with a verified Context.

---

##  System Architecture

To maintain a clear project structure, I have broken down the core architecture of LexiGuard into the following five detailed documents. 
Please click the links to explore them in depth.

| Module ID | Component | Description |
| :--- | :--- | :--- |
| **01** | [**Context Construction**](./docs/01-context-construction.md) | **The Foundation:** Explains how the initial context is constructed via Socratic questioning to establish a ground truth before strategy generation. |
| **02** | [**Live Context**](./docs/02-live-context.md) | **Memory Management:** Manages token optimization and history rewriting in dynamic conversation flows, implementing a "Manual Attention Mechanism." |
| **03** | [**Intervention Layer**](./docs/03-intervention-layer.md) | **The "Super-Ego":** Acts as a safety guardrail. It intercepts high-risk prompts, blocks emotional venting, and enforces alignment with the user's Ultimate Goal. |
| **04** | [**Intent Control**](./docs/04-intent-control.md) | **Logic Hierarchy:** Defines an intent-aware decision pipeline integrated into the UI/UX and strictly distinguishes between "Analysis Mode" and "Drafting Mode" to prevent scope creep. |
| **05** | [**Legal Assets**](./docs/05-legal-assets.md) | **The "Orange Line" Protocol:** A state machine for evidence verification (Verified vs. Pending), jurisdiction logic, and dynamic asset discovery. |

---

## Performance & UX Engineering

LexiGuard is engineered for both depth of reasoning and speed of execution, utilizing a dual-model architecture.

*   **Async Streaming Architecture:**
    *   Implemented `getLexiguardStrategyStream` and `synthesizeContextStream` using **AsyncGenerators** in `MainWorkspace.tsx` and `ContextBuilder.tsx`.
    *   Moved from blocking HTTP calls to **Chunk-based Streaming**, significantly reducing the user's Time-to-First-Byte (TTFB) perception.

*   **Dual-Mode Rendering Logic:**
    *   **Pro Model (Sparkle):** Used for deep strategy. Includes a "Reasoning State" (default mode) before streaming to reflect complex logic processing.
    *   **Flash Model (Bolt):** Used for "Answer Now" actions. Optimized for instant execution with minimized latency overhead while retaining full logic constraints.

---

##   Future Roadmap & Optimizations

We are actively iterating on the following features to move from MVP to a production-grade vertical SaaS.

####  UI/UX Polish (Frontend)
*   **Granular Token-Level Streaming:** Currently, the stream yields text chunks. Future iterations will implement a **smooth typewriter effect** (character-by-character rendering) to mimic natural AI interaction.
*   **Visual Transitions:** Enhance the "Legal Asset" generation animation. Plan to add dynamic expansion animations for the Yellow/Orange boxes as content streams in, replacing static resizing.
*   **Mobile Responsiveness:** Refactor the 3-column layout (Sidebar/Main/Context) for seamless usability on mobile devices.

####  Legal Knowledge Engine (Hybrid RAG)
*   **Ground-Truth First Architecture:** Currently, legal asset discovery relies on the LLM's internal knowledge.
*   **Planned Logic Upgrade:** Implementing a **Tiered Retrieval System** for US jurisdictions:
    1.  **Tier 1 (Primary):** Query a structured, verified **US Legal Database** (e.g., integrating a Vector Database populated with Caselaw Access Project data).
    2.  **Tier 2 (Fallback):** Trigger AI Web Search only if the specific statute is not found in the primary database.
*   **Goal:** To eliminate hallucinated citations and ensure every "Legal Asset" is backed by verifiable statutes.

 
---

##  Run Locally

To run lexiguard locally, please following:

### Prerequisites
- Node.js installed

### Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Setup Environment**:
    Set the `GEMINI_API_KEY` in your `.env.local` file to your Gemini API key.

3.  **Run the app**:
    ```bash
    npm run dev
    ```

---
## LexiGuard Interface
<img width="2209" height="1174" alt="image" src="https://github.com/user-attachments/assets/2e0abc07-a06b-4870-8e62-f8d8abef9453" />

<img width="2231" height="1176" alt="image" src="https://github.com/user-attachments/assets/c4bf8d6b-f198-426d-a7f3-e91d68ca8159" />

### License & Copyright
© 2026 John Zhang. All Rights Reserved.
