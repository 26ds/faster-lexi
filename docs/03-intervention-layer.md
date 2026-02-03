# Phase 3: The Intervention Layer (Strategic Alignment)

## 3.1 Core Philosophy
**Outcome Alignment vs. Intent Alignment**.
- **Standard AI**: Aligns with User Intent (e.g., User wants to vent anger -> AI writes angry email).
- **LexiGuard**: Aligns with **Ultimate Goal** stored in parameters (e.g., User wants full refund -> AI blocks angry email -> AI de-escalates and suggests professional negotiation).

## 3.2 The Intervention Gate (Logic Flow)
Before generating any text, the user prompt passes through a **3-Gate Safety System**:

### Gate 1: Emotional Risk Assessment
- Scans for profanity, excessive punctuation (!!), and hostility.
- **Action**: If detected, trigger `STOP` sequence. Do not generate draft.

### Gate 2: Goal Violation Check
- Compares `Current Request` against `Ultimate Strategic Goal`.
- **Example**: User language implies "giving up," but the context shows hope and the Goal is "get refund."
- **Action**: Intercept. Output: "This action violates your Ultimate Goal."

### Gate 3: Weaponization Assessment
- Analyzes if the user is trying to "weaponize" anger legally.
- Evaluates: Evidence Strength vs. Risk of Defamation.

## 3.3 The Socratic Intervention Output
If a Gate is triggered, the AI switches mode from "Assistant" to "Counselor":
1. **⚠️ Alert**: "High Emotional Risk Detected (e.g., Anger)."
2. **Analysis**: Explain *why* sending this now hurts leverage.
3. **Action Item**: Physical advice corresponding to the emotion (e.g., "Walk away from keyboard for 10 mins").
4. **Socratic Question**: "What direct benefit does this bring to your goal?" followed by "Is there a better alternative?"

## 3.4 Implementation Note
This mechanism utilizes an **Outcome-Oriented Alignment** approach, prioritizing long-term user welfare over short-term instruction following.
