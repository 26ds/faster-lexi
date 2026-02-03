# Phase 2: Live Context Architecture & Token Optimization

## 2.1 Problem Definition
Standard LLMs suffer from "Context Dilution" and high token costs when handling long legal negotiations. We need a system that allows **Selective Injection** of history.

## 2.2 The "Context Item" State Machine
Every conversation turn is encapsulated as a `ContextItem` object with a lifecycle:

`[Raw Interaction] -> [AI Summarization] -> [Active Storage] -> [User Verification/Update]`

### Data Structure
- **Display Title**: AI-generated 10-15 word summary.
- **Full Summary**: Includes Counterparty Input + User Reply + Emotional State + Strategic Intent.
- **Status**: `Active` (Checked) / `Inactive` (Unchecked) / `Modified` (Triggered after user edit & confirm).
- **Visual Reference**: *(Insert Image: Right Sidebar Context Items)*

## 2.3 Selective Injection Mechanism
- **Logic**: Instead of feeding the entire chat history to the LLM, we use a **"Manual Attention Mechanism"**.
- **UI**: Checkboxes (☑️) next to each history item.
- **Backend**: The Prompt Builder filters the `history` array, injecting *only* the items marked `Active` by the user.
- **Benefit**: Reduces hallucinations caused by irrelevant history and significantly lowers API costs.

## 2.4 Dynamic History Rewriting
- **Scenario**: User updates a previous summary (e.g., clarifying a detail).
- **Protocol**:
  1. User clicks **"Edit Pen"**.
  2. System locks the item state.
  3. User modifies text and clicks **"Confirm Update"**.
  4. **Critical**: Subsequent inference MUST reference the *updated* content (Cache Invalidation).
