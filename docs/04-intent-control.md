# Phase 4: Intent Control & Model Architecture

## 4.1 Design Motivation
To resolve **Implicit Assumption Errors**, users must explicitly declare their intent type.

## 4.2 Intent Chips (Explicit Instruction)
**Location**: Above the main text input area.
**Behavior**: Multi-select chips. Active state changes color.

**Chip Definitions**:
- `🎯 Situation Analysis`: Pure objective analysis. No drafting.
- `🧐 Intent Analysis`: Analyzing counterpart psychology.
- `✍️ Draft Reply`: Generating actual text.
- `👣 Action Rec`: Recommend physical actions (non-text).
- **Emotional Selectors**: `😡 Anger`, `😣 Despair`, `Neutral`,`Fatigue`, `Anxiety`. (Used as Tone Parameters).

**Negative Constraints**: The System Prompt injects prohibitions based on *unselected* chips (e.g., "If Draft Reply is NOT selected, DO NOT output any conversational text to save tokens.").

## 4.3 Logic Hierarchy (Pipeline)
`Input + Intent Chips` ->
1.  **Sanity Check**: Is the Ultimate Goal feasible?
2.  **Risk Assessment**: Scan for emotional/strategic risks.
3.  **Goal Alignment Check**: Current Request vs. Ultimate Goal.
4.  **Execution**: Generate output based *strictly* on selected chips.

**Handling Violations**: If a user selects an emotional chip (non-neutral), the system automatically triggers an emotional soothing or intervention routine.

## 4.4 Model Hot-Swap Architecture ("Answer Now")
**Feature**: Seamless toggling between Intelligence (Pro) and Speed (Flash).

- **Default**: `gemini-3-pro` (Deep Reasoning).
- **"⚡ Answer Now"**: Triggers `gemini-3-flash` (Low Latency).

**Critical Constraints**:
- **State Persistence**: Switching models does NOT clear Session State or Context.
- **Logic Parity**: The Flash model MUST still run the **Intervention Layer**. It is not just a chatbot; it checks for safety and alignment just like Pro, only faster.
