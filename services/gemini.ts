import { GoogleGenAI, Type } from "@google/genai";
import { Ambiguity, ChatMessage, Project, PlatformType, IntentTag, UserEmotion, LegalAsset } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Model Constants
const REASONING_MODEL = 'gemini-3-pro-preview';
const FAST_MODEL = 'gemini-3-flash-preview';

/**
 * Stage 1: Analyze Context for Ambiguities
 */
export const identifyAmbiguities = async (text: string, useFlashModel: boolean = false): Promise<Ambiguity[]> => {
  const model = useFlashModel ? FAST_MODEL : REASONING_MODEL;
  
  const prompt = `
    Analyze the following user story/context. 
    Identify 3-5 specific parts where the details are vague, ambiguous, or crucial information is missing.
    Do not guess. Ask the user.
    
    Return a JSON array where each item has:
    - id: number (1-based index)
    - quote: string (The exact substring from the text that is ambiguous)
    - question: string (The question to ask the user)
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Context: "${text}"\n\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              quote: { type: Type.STRING },
              question: { type: Type.STRING },
            },
            required: ["id", "quote", "question"],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any) => ({ ...item, resolved: false, userAnswer: '' }));
    }
    return [];
  } catch (error) {
    console.error("Error identifying ambiguities:", error);
    return [];
  }
};

/**
 * NEW: Identify Potential Legal Assets (Setup Phase)
 */
export const identifyLegalAssets = async (context: string, jurisdiction: string): Promise<LegalAsset[]> => {
  const prompt = `
    Based on the following story, identify 3-4 POTENTIAL legal statutes or concepts that could favor the user.
    The user is in: ${jurisdiction || 'General Jurisdiction'}.
    
    For each asset, formulate a specific question to ask the user to see if they have the evidence to support it.
    
    Return JSON:
    [
      {
        "id": "1",
        "code": "e.g., CA Civil Code 1941.1",
        "summary": "Short explanation of the legal point.",
        "question": "e.g. Do you have photos of the mold?"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: REASONING_MODEL,
      contents: `Story: ${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              code: { type: Type.STRING },
              summary: { type: Type.STRING },
              question: { type: Type.STRING }
            },
            required: ["id", "code", "summary", "question"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any) => ({ 
        ...item, 
        userAnswer: '', 
        status: 'pending', // Default
        reasoning: '',
        actionItem: ''
      }));
    }
    return [];
  } catch (e) {
    console.error("Legal Asset ID Error", e);
    return [];
  }
};

/**
 * NEW: Evaluate Legal Assets (Blocking State Logic)
 */
export const evaluateLegalAssets = async (assets: LegalAsset[]): Promise<LegalAsset[]> => {
  const prompt = `
    Evaluate the evidence for these legal assets based on the user's answers.
    
    Input Data:
    ${JSON.stringify(assets.map(a => ({ code: a.code, question: a.question, answer: a.userAnswer })))}
    
    Task:
    1. Determine status: 'verified' (strong evidence), 'pending' (weak evidence/needs more), 'inactive' (not applicable).
    2. Provide reasoning.
    3. If pending, provide a short Action Item.
    
    Return JSON array matching the input order.
  `;

  try {
    const response = await ai.models.generateContent({
      model: REASONING_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['verified', 'pending', 'inactive'] },
              reasoning: { type: Type.STRING },
              actionItem: { type: Type.STRING }
            },
            required: ["status", "reasoning"]
          }
        }
      }
    });

    if (response.text) {
      const evaluations = JSON.parse(response.text);
      // Merge back
      return assets.map((asset, idx) => {
        const ev = evaluations[idx];
        return {
          ...asset,
          status: ev?.status || 'pending',
          reasoning: ev?.reasoning || 'Analysis failed',
          actionItem: ev?.actionItem || ''
        };
      });
    }
    return assets;
  } catch (e) {
    console.error("Evaluation Error", e);
    return assets;
  }
};

/**
 * NEW: Dynamic Discovery (Implicit Scanner)
 */
export const checkForDynamicLegalAssets = async (theirMsg: string, currentAssets: LegalAsset[]): Promise<LegalAsset | null> => {
  const prompt = `
    Analyze this new message from the counterparty.
    Does it reveal a NEW legal violation or vulnerability not covered by current assets?
    
    Current Assets: ${currentAssets.map(a => a.code).join(', ')}
    New Message: "${theirMsg}"
    
    If yes, return a single JSON object for the new asset. If no, return null.
  `;

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             found: { type: Type.BOOLEAN },
             asset: {
                type: Type.OBJECT,
                properties: {
                   code: { type: Type.STRING },
                   summary: { type: Type.STRING },
                   question: { type: Type.STRING },
                   reasoning: { type: Type.STRING } // Why it was flagged
                }
             }
          }
        }
      }
    });
    
    if (response.text) {
        const res = JSON.parse(response.text);
        if (res.found && res.asset) {
            return {
                id: Date.now().toString(),
                code: res.asset.code,
                summary: res.asset.summary,
                question: res.asset.question,
                userAnswer: '',
                status: 'pending',
                reasoning: res.asset.reasoning,
                actionItem: 'Verify this new claim.'
            };
        }
    }
    return null;
  } catch (e) {
      return null;
  }
};

/**
 * Stage 2: Synthesize Final Context (Streaming)
 */
export async function* synthesizeContextStream(originalText: string, ambiguities: Ambiguity[]): AsyncGenerator<string> {
  const clarifications = ambiguities.map(a => `Regarding "${a.quote}": ${a.userAnswer}`).join('\n');
  
  const prompt = `
    Rewirte the following story into a clear, chronological, and accurate account of events.
    Combine the Original Story with the User Clarifications.
    
    Original Story:
    ${originalText}
    
    Clarifications:
    ${clarifications}
    
    Output the final coherent story.
  `;

  try {
    const stream = await ai.models.generateContentStream({
      model: REASONING_MODEL,
      contents: prompt,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (e) {
    console.error("Synthesis Stream Error", e);
    yield "Error generating context.";
  }
}

// Keep the old non-streaming version for backward compatibility if needed, but we will mostly use the stream.
export const synthesizeContext = async (originalText: string, ambiguities: Ambiguity[]): Promise<string> => {
    let text = "";
    for await (const chunk of synthesizeContextStream(originalText, ambiguities)) {
        text += chunk;
    }
    return text;
};

/**
 * Stage 3: Lexiguard Chat Strategy (The Core Brain) - Streaming
 */
export async function* getLexiguardStrategyStream(
  project: Project, 
  currentInput: string,
  history: ChatMessage[],
  intents: IntentTag[] = [],
  emotion: UserEmotion = 'neutral',
  useFlashModel: boolean = false
): AsyncGenerator<string> {
  
  // Model Selection
  const selectedModel = useFlashModel ? FAST_MODEL : REASONING_MODEL;

  // --- COMPOSITE CONTEXT ASSEMBLY (4 LAYERS) ---

  // LAYER 1: FOUNDATION (Background Story)
  const backgroundItem = project.contextHistory.find(i => i.type === 'background');
  const layer1_Foundation = backgroundItem 
      ? `[LAYER 1: FACTUAL FOUNDATION]\n${backgroundItem.detailedSummary}` 
      : `[LAYER 1: FACTUAL FOUNDATION]\n(No background story established yet)`;

  // LAYER 2: CONSTRAINT (Game Theory Parameters)
  const layer2_Constraint = `
    [LAYER 2: STRATEGIC CONSTRAINTS]
    - Platform: ${project.gameTheory.platform}
    - User Jurisdiction: ${project.gameTheory.userJurisdiction}
    - Counterpart Jurisdiction: ${project.gameTheory.counterpartJurisdiction}
    - Ultimate Goal: ${project.gameTheory.userGoalSelected ? project.gameTheory.userGoal : "Not Active"}
    - LEGAL ASSETS STATUS:
      ${project.legalAssets.filter(a => a.status !== 'inactive').map(a => `* [${a.status.toUpperCase()}] ${a.code} (${a.summary})`).join('\n      ')}
  `;

  // LAYER 3: SHORT-TERM MEMORY (Selected Live Context)
  const selectedHistory = project.contextHistory.filter(item => item.isSelected && item.type !== 'background');
  let layer3_Memory = `[LAYER 3: SHORT-TERM CONTEXT]`;
  if (selectedHistory.length > 0) {
    selectedHistory.forEach(item => {
      layer3_Memory += `\n> Event: ${item.title}\n  Summary: ${item.detailedSummary}`;
    });
  } else {
    layer3_Memory += `\n(No specific past interaction selected)`;
  }

  // LAYER 4: FOCUS (Current Input & Intent)
  const counterPartyMsg = project.chatDraft.theirLastMessage || "(No specific new message from them)";
  const intentList = intents.join(', ');
  const layer4_Focus = `
    [LAYER 4: IMMEDIATE FOCUS]
    - Counterparty's Latest: "${counterPartyMsg}"
    - User's Intent/Thinking: "${currentInput}"
    - User Emotion: ${emotion}
    - Requested Actions: [${intentList}]
  `;

  // --- DUAL-VARIABLE LANGUAGE LOGIC ---
  const INTERACTION_LANG = project.gameTheory.interactionLanguage || 'Native English';
  const DRAFT_LANG = project.gameTheory.draftingLanguage || 'Native English';

  // PLATFORM RULES
  let platformRules = "";
  if (project.gameTheory.platform === PlatformType.EMAIL) {
      platformRules = "Formal Email: Subject line required. Formal salutation/sign-off. Professional tone.";
  } else {
      platformRules = "Instant Messaging: Short bubbles. NO subject line. NO 'Dear X'. Conversational/Direct.";
  }

  // SYSTEM PROMPT CONSTRUCTION
  const systemInstruction = `
    You are Lexiguard 2.0, a sophisticated negotiation strategist and legal intervention agent.
    
    *** DUAL LANGUAGE PROTOCOL (STRICT) ***
    Variable A (Analysis): ${INTERACTION_LANG}
    Variable B (Drafting): ${DRAFT_LANG}
    
    INSTRUCTION: 
    1. You MUST use [Variable A: ${INTERACTION_LANG}] for all strategic analysis, explanations, warnings, socratic questions, and talking to the user.
    2. You MUST use [Variable B: ${DRAFT_LANG}] ONLY for the actual content of the draft reply/message intended for the opponent.
    
    *** CONTEXT ASSEMBLY ***
    ${layer1_Foundation}
    ${layer2_Constraint}
    ${layer3_Memory}
    ${layer4_Focus}

    *** INTERVENTION LOGIC ***
    1. LEGAL ASSETS: If user attacks with a [PENDING] asset, BLOCK it. Explain why in [${INTERACTION_LANG}].
    2. EMOTION: If user is angry, DO NOT draft. Warn in [${INTERACTION_LANG}].
    3. GOAL ALIGNMENT: If request violates Ultimate Goal, refuse and suggest alternatives in [${INTERACTION_LANG}].

    *** EXECUTION ***
    - Platform Rules: ${platformRules}
    - Jurisdiction: Apply laws from ${project.gameTheory.userJurisdiction} only.
    
    Output Structure:
    1. Analysis/Strategy (In ${INTERACTION_LANG})
    2. Intervention Warnings (if any) (In ${INTERACTION_LANG})
    3. Draft Reply (In ${DRAFT_LANG}) - Only if 'draft_reply' intent is present and safety checks pass.
  `;

  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: currentInput }]
  });

  try {
    const stream = await ai.models.generateContentStream({
      model: selectedModel,
      contents: contents,
      config: {
        systemInstruction,
        thinkingConfig: selectedModel === FAST_MODEL ? { thinkingBudget: 1024 } : { thinkingBudget: 4096 }
      }
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (e) {
    console.error("Strategy Stream Error", e);
    yield "I'm having trouble analyzing the strategy right now.";
  }
}

// Backward compatible wrapper
export const getLexiguardStrategy = async (
  project: Project, 
  currentInput: string,
  history: ChatMessage[],
  intents: IntentTag[] = [],
  emotion: UserEmotion = 'neutral',
  useFlashModel: boolean = false
): Promise<string> => {
  let text = "";
  for await (const chunk of getLexiguardStrategyStream(project, currentInput, history, intents, emotion, useFlashModel)) {
      text += chunk;
  }
  return text;
}

/**
 * Stage 4: Commit & Summarize
 */
export const summarizeInteraction = async (
  theirMsg: string, 
  userReply: string, 
  context: string,
  transcript?: string
): Promise<{ title: string, detailedSummary: string }> => {
  
  let contentToAnalyze = "";
  if (transcript) {
    contentToAnalyze = `Full Interaction Transcript:\n${transcript}`;
  } else {
    contentToAnalyze = `The Counterparty wrote: "${theirMsg}"\nThe User replied: "${userReply}"`;
  }

  const prompt = `
    Analyze this interaction for a strategic log.
    
    ${contentToAnalyze}
    
    General Context: "${context}"
    
    Output JSON with two fields:
    1. "title": A very short title (max 10-15 words/Chinese chars).
    2. "detailedSummary": A structured summary covering:
       - What they wanted.
       - What the user finalized/sent.
       - User's tone/emotion.
       - Key demands made.
       - Power shift.
       - IF UPDATING: Include the latest developments.
  `;

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            detailedSummary: { type: Type.STRING }
          },
          required: ["title", "detailedSummary"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (e) {
    console.error(e);
  }

  return { 
    title: "Interaction Log", 
    detailedSummary: transcript || `Them: ${theirMsg}\nMe: ${userReply}` 
  };
};

/**
 * Utility: Translate Content
 */
export const translateContent = async (text: string, targetLanguage: string): Promise<string> => {
  const prompt = `
    Translate the following text into ${targetLanguage}.
    Maintain professional, accurate tone suitable for legal/negotiation contexts.
    Only output the translated text. Do not add conversational filler.
    
    Text to translate:
    "${text}"
  `;
  
  try {
     const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt
     });
     return response.text?.trim() || text;
  } catch (e) {
     console.error("Translation error", e);
     return text;
  }
};