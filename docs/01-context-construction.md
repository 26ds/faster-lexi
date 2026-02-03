# Phase 1: Context Construction & Alignment Architecture

## 1.1 Objective
To eliminate "Garbage In, Garbage Out" by verifying facts and legal assets *before* the strategy session begins. This prevents hallucination and grounding errors.

## 1.2 The "Build Context" Workflow

### Step 1: Initialization
- **User Input**:
    - **Jurisdiction**: User Location & Counterpart Location (e.g., Berkeley, CA).
    - **Language**: Interaction Language (for strategy) & Drafting Language (for replies).
    - **Narrative**: Open text field for "What happened?".
- **Visual Reference**: *<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/fbf7692b-aa79-4de4-9a11-401515f2b217" />


### Step 2: Human-in-the-Loop Verification (The "Yellow Line")
- **Trigger**: Upon first submission.
- **AI Action**: Identifies ambiguous points, missing dates, or unclear attributions.
- **UI Interaction**:
    - A section titled **"Points needing clarification"** appears.
    - Ambiguities are highlighted in **Yellow**.
    - Clicking a highlight opens a dropdown input for user clarification.
    - Users must complete all checks (Red dots disappear upon completion) before proceeding.
- **Visual Reference**:  <img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/d87dbbaa-d2ec-488f-8962-4bfe5b1602e2" /> <img width="340" height="300" alt="image" src="https://github.com/user-attachments/assets/7311bcfd-288f-484f-8342-1f7b1a3191ad" />



### Step 3: Legal Asset Pre-Screening (The "Orange Line" Setup)
- **Trigger**: Upon clearing factual ambiguities.
- **AI Action**: Analyzes the "Finalized Context" against the specified Jurisdiction to identify potential legal leverage.
- **UI Interaction**:
    - A section titled **"Potential Legal Assets"** appears.
    - Laws are highlighted in **Orange**.
    - For each law, the user answers specific evidence questions (e.g., "Do you have photos?").
- **State Transition**: User answers determine the initial state of the asset (Active/Pending/Inactive).
- **Visual Reference**:<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/ef5aa6da-7a0e-4471-89fb-96ecf4319069" />


### Step 4: The Analysis Lock (Transition State)
- **Mechanism**: A full UI lock prevents the user from starting the chat while the AI processes the verified data.
- **Purpose**: Ensures the Main Chat starts with a fully converged context, avoiding "context drift."

### Step 5: Persistence & Handoff
- **Context Item #0**: The "Final Synthesized Story" is encapsulated as the mutable **"Background Story"** item in the Live Context sidebar (Default ☑️).
- **Parameter Auto-fill**: Jurisdiction and Language settings are automatically populated into the Main Chat's Left Sidebar.
