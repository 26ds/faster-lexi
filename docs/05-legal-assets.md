# Phase 5: Legal Asset State Machine (The "Orange Line")

## 5.1 Concept: Evidence-Based Reasoning
Transitioning from "Hallucinating Laws" to "Verifying Assets".

## 5.2 The Protocol
Inherited from the **Build Context** phase, LexiGuard classifies laws into three states based on user verification. Users can manually update these states in the main chat sidebar.

**The Three States**:
1.  **✅ Active Asset**: Hard evidence exists (photos, reports).
    *   *AI Action*: Use aggressively in negotiation. Injected into Context.
2.  **⏳ Pending Asset**: Law applies, but evidence is missing.
    *   *AI Action*: **Block** aggressive use. Advise user to collect evidence first.
3.  **Inactive (Empty)**: Not applicable.

**Interaction**: Users interact via a **Tri-State Checkbox** in the "Legal Assets" sidebar. Changing a state triggers a re-run of the Context Builder for the next turn.

## 5.3 Dynamic Discovery Protocol
**Trigger**: Implicitly runs `Legal_Scanner` during every conversation turn.
**Logic**: Checks if the Counterparty's *new* reply reveals a legal violation not present in the initial list.

**UI Output**:
- **Mechanism**: Does NOT pollute the chat stream.
- **Visual Reference**: *(Insert Image: Dismissible Recommendation Card)*
- **Action**: A pop-up card appears above the input box: "New Leverage Detected: [Law Code]. Add to Assets?"
- **Flow**: User clicks "Add" -> System prompts for Evidence Status (Default to Pending) -> Asset flies into the Left Sidebar.

## 5.4 Dual-Language Architecture
- **Interaction Language**: Choose any preferred language (for user clarity/strategy).
- **Drafting Language**: Choose any preferred language (for legal precision).
- **Implementation**: System Prompt maintains two separate language variables to prevent code-switching bleed.
