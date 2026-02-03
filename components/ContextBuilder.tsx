import React, { useState, useEffect } from 'react';
import { Project, ContextItem, LANGUAGES } from '../types';
import { identifyAmbiguities, synthesizeContextStream, identifyLegalAssets, evaluateLegalAssets } from '../services/gemini';
import { AlertCircle, Check, ChevronDown, Edit3, Loader2, Sparkles, Zap, Scale, Info, MapPin, Globe, PenTool } from 'lucide-react';

interface ContextBuilderProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  onFinalize: (p?: Project) => void;
}

export const ContextBuilder: React.FC<ContextBuilderProps> = ({ project, onUpdateProject, onFinalize }) => {
  const [step, setStep] = useState<'input' | 'clarify' | 'review'>('input');
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState(project.rawContext || '');
  const [activeAmbiguityId, setActiveAmbiguityId] = useState<number | null>(null);
  
  // New: Legal Assets State
  const [blockingState, setBlockingState] = useState(false);

  // Initialize from project state if returning
  useEffect(() => {
    if (project.finalizedContext) setStep('review');
    else if (project.ambiguities.length > 0) setStep('clarify');
  }, [project]);

  const handleAnalyze = async (useFlash: boolean = false) => {
    if (!inputText.trim()) return;
    
    // VALIDATION: Check required fields
    if (!project.gameTheory.userJurisdiction || !project.gameTheory.counterpartJurisdiction) {
        alert("Please enter both Jurisdiction locations before analyzing.");
        return;
    }

    setLoading(true);
    
    // Save raw text immediately
    const updatedProject = { ...project, rawContext: inputText };
    onUpdateProject(updatedProject);

    // 3. Logic Parity: Calling the same function, just with a different model flag
    const ambiguities = await identifyAmbiguities(inputText, useFlash);
    onUpdateProject({ ...updatedProject, ambiguities });
    
    setLoading(false);
    if (ambiguities.length > 0) {
      setStep('clarify');
    } else {
      // Trigger streaming synthesis immediately if no ambiguities
      handleSynthesize(updatedProject);
    }
  };

  const handleResolveAmbiguity = (id: number, answer: string) => {
    const updated = project.ambiguities.map(a => a.id === id ? { ...a, userAnswer: answer, resolved: true } : a);
    onUpdateProject({ ...project, ambiguities: updated });
    setActiveAmbiguityId(null);
  };

  const handleSynthesize = async (projOverride?: Project) => {
    const currentProject = projOverride || project;
    setLoading(true);
    setStep('review'); // Move to review step immediately to show streaming text
    
    let synthesizedText = "";
    
    // STREAMING SYNTHESIS
    try {
        const stream = synthesizeContextStream(currentProject.rawContext, currentProject.ambiguities);
        for await (const chunk of stream) {
            synthesizedText += chunk;
            onUpdateProject({ ...currentProject, finalizedContext: synthesizedText });
        }
    } catch (e) {
        console.error("Streaming failed", e);
    }
    
    // After text is fully generated, identify legal assets
    const assets = await identifyLegalAssets(synthesizedText, currentProject.gameTheory.userJurisdiction);
    
    onUpdateProject({ 
        ...currentProject, 
        finalizedContext: synthesizedText, 
        legalAssets: assets,
        ambiguities: [] // Clear ambiguities if any were pending? actually keep them as record? Code clears them usually.
    });
    setLoading(false);
  };
  
  const handleUpdateAssetAnswer = (id: string, answer: string) => {
      const updated = project.legalAssets.map(a => a.id === id ? { ...a, userAnswer: answer } : a);
      onUpdateProject({ ...project, legalAssets: updated });
  };

  const finalizeContext = async () => {
      // 1. Trigger Blocking State
      setBlockingState(true);

      try {
          // 2. Evaluate Legal Assets (Verification/Status)
          const evaluatedAssets = await evaluateLegalAssets(project.legalAssets);
          
          // 3. PHASE 2 FIX: Create "Background Story" as Context Item #0
          // This ensures the setup summary persists into the main workspace
          const backgroundItem: ContextItem = {
              id: 'bg-story', // Fixed ID for the foundational layer
              type: 'background',
              title: 'Initial Background Story',
              detailedSummary: project.finalizedContext, // The synthesized truth
              language: project.gameTheory.interactionLanguage || 'Native English', // Use interaction lang
              fullContent: project.rawContext, // Keep raw text as backup
              timestamp: Date.now(),
              chatHistory: [],
              isSelected: true // DEFAULT CHECKED: Foundation Layer
          };
          
          // 4. Prepare Final Project State
          const finalProjectState: Project = { 
              ...project, 
              legalAssets: evaluatedAssets,
              contextHistory: [backgroundItem, ...project.contextHistory.filter(i => i.id !== 'bg-story')] 
          };

          // 5. Transition (Wait a sec for effect)
          setTimeout(() => {
              onFinalize(finalProjectState);
          }, 1500);

      } catch (e) {
          console.error("Evaluation Failed", e);
          setBlockingState(false);
      }
  };

  // Helper to highlight text
  const renderHighlightedText = () => {
    let content = project.rawContext;
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-200">
        {content}
      </div>
    );
  };
  
  // RENDER BLOCKING OVERLAY
  if (blockingState) {
      return (
          <div className="fixed inset-0 z-[100] bg-gray-900/95 flex flex-col items-center justify-center text-white space-y-6 animate-in fade-in duration-500">
              <Scale size={64} className="text-orange-500 animate-pulse" />
              <h2 className="text-2xl font-bold tracking-wider">LEXIGUARD 2.0</h2>
              <div className="flex flex-col items-center space-y-2">
                  <p className="text-lg">Analyzing legal leverage & evidence strength...</p>
                  <p className="text-sm text-gray-400">Comparing facts against statutes in {project.gameTheory.userJurisdiction || 'your region'}...</p>
              </div>
              <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 animate-[loading_2s_ease-in-out_infinite] w-1/2 rounded-full"></div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex-1 h-full bg-gray-50 flex flex-col overflow-hidden">
      <div className="max-w-4xl mx-auto w-full p-8 flex-1 overflow-y-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Build Context</h2>
          <p className="text-gray-500">Provide the foundational facts and constraints for your case.</p>
        </div>

        {/* PHASE 1: TOP-LEVEL INPUTS (Always Visible in 'input' step) */}
        {step === 'input' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-6 animate-in slide-in-from-top-2">
            
            {/* A. Jurisdiction Inputs */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <MapPin size={12} /> Your Location (Jurisdiction)
                   </label>
                   <input 
                     className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                     placeholder="e.g. Berkeley, CA, USA"
                     value={project.gameTheory.userJurisdiction}
                     onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, userJurisdiction: e.target.value}})}
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <MapPin size={12} /> Counterpart Location
                   </label>
                   <input 
                     className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                     placeholder="e.g. Corporate HQ, Texas"
                     value={project.gameTheory.counterpartJurisdiction}
                     onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, counterpartJurisdiction: e.target.value}})}
                   />
                </div>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* B. Dual Language Preferences */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Globe size={12} /> 🗣️ Interaction Language
                   </label>
                   <p className="text-[10px] text-gray-400 mb-2">LexiGuard explains analysis to you in this language.</p>
                   <div className="relative">
                      <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg appearance-none cursor-pointer hover:bg-white transition-colors"
                        value={project.gameTheory.interactionLanguage}
                        onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, interactionLanguage: e.target.value}})}
                      >
                         {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <PenTool size={12} /> ✍️ Drafting Language
                   </label>
                   <p className="text-[10px] text-gray-400 mb-2">The actual emails/messages sent to opponent.</p>
                   <div className="relative">
                      <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg appearance-none cursor-pointer hover:bg-white transition-colors"
                        value={project.gameTheory.draftingLanguage}
                        onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, draftingLanguage: e.target.value}})}
                      >
                         {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                   </div>
                </div>
            </div>

          </div>
        )}

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="space-y-4">
             <label className="block text-sm font-bold text-gray-700">What Happened? (The Story)</label>
            <textarea
              className="w-full h-64 p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg"
              placeholder="Tell me what happened... (e.g., received an angry email from a client after sending a quote...)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="flex justify-end gap-3 items-center">
              {/* 1. UI Implementation: Add 'Answer now' button next to Analyze */}
              <button
                onClick={() => handleAnalyze(true)}
                disabled={loading || !inputText}
                className="text-xs font-bold text-yellow-600 hover:text-yellow-700 flex items-center gap-1 disabled:opacity-50"
                title="Use faster Flash model"
              >
                <Zap size={14} className="fill-yellow-500" />
                Answer now (Fast)
              </button>

              <button
                onClick={() => handleAnalyze(false)}
                disabled={loading || !inputText}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                Analyze Situation (Deep)
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CLARIFY */}
        {step === 'clarify' && (
          <div className="space-y-6">
            <div className="prose max-w-none">
               <h3 className="text-lg font-semibold text-gray-700">Original Text</h3>
               {renderHighlightedText()}
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <AlertCircle className="text-yellow-500" />
                Points needing clarification
              </h3>
              
              {project.ambiguities.map((ambiguity) => (
                <div key={ambiguity.id} className="relative">
                   {/* Summary Row */}
                   <div 
                     onClick={() => setActiveAmbiguityId(activeAmbiguityId === ambiguity.id ? null : ambiguity.id)}
                     className={`
                        p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                        ${ambiguity.resolved ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'}
                     `}
                   >
                      <div className="flex items-center gap-3">
                        <span className={`
                          flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                          ${ambiguity.resolved ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}
                        `}>
                          {ambiguity.id}
                        </span>
                        <span className="font-medium text-gray-800">"{ambiguity.quote}"</span>
                        <span className="text-sm text-gray-500 ml-2">- {ambiguity.question}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!ambiguity.resolved && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                        <ChevronDown 
                          size={18} 
                          className={`transition-transform duration-300 ${activeAmbiguityId === ambiguity.id ? 'rotate-180' : ''}`}
                        />
                      </div>
                   </div>

                   {/* Input Drawer */}
                   {activeAmbiguityId === ambiguity.id && (
                     <div className="mt-2 pl-12 pr-4 animate-in fade-in slide-in-from-top-2">
                       <div className="flex gap-2">
                         <input 
                           type="text" 
                           autoFocus
                           className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="Clarify this point..."
                           defaultValue={ambiguity.userAnswer}
                           onKeyDown={(e) => {
                             if(e.key === 'Enter') handleResolveAmbiguity(ambiguity.id, e.currentTarget.value);
                           }}
                         />
                         <button 
                           onClick={(e) => {
                             // Find the input value
                             const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                             handleResolveAmbiguity(ambiguity.id, input.value);
                           }}
                           className="bg-green-500 text-white p-3 rounded-lg hover:bg-green-600"
                         >
                           <Check size={18} />
                         </button>
                       </div>
                     </div>
                   )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
               <button
                onClick={() => handleSynthesize()}
                disabled={!project.ambiguities.every(a => a.resolved) || loading}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                Synthesize Full Story
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & LEGAL ASSETS */}
        {step === 'review' && (
          <div className="space-y-6 h-full flex flex-col pb-10">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                  Finalized Context
                  {loading && <div className="text-xs text-blue-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Writing...</div>}
              </h3>
              <textarea 
                className="w-full text-gray-800 leading-relaxed outline-none resize-none h-48"
                value={project.finalizedContext}
                onChange={(e) => onUpdateProject({ ...project, finalizedContext: e.target.value })}
              />
              <div className="absolute top-4 right-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs">
                <Edit3 size={12} />
                Hold to edit
              </div>
            </div>

            {/* ORANGE THEME: LEGAL ASSETS */}
            {!loading && (
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-6 relative animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-4">
                    <Scale size={20} className="text-orange-600" />
                    <h3 className="text-lg font-bold text-orange-800">Potential Legal Assets</h3>
                </div>
                
                <p className="text-sm text-orange-700 mb-4">
                    Based on your story and jurisdiction ({project.gameTheory.userJurisdiction}), LexiGuard identified these potential leverage points. Answer the questions to verify them.
                </p>

                <div className="space-y-4">
                    {project.legalAssets.map((asset) => (
                        <div key={asset.id} className="bg-white rounded-lg border border-orange-200 shadow-sm overflow-hidden">
                        {/* Top: Code & Summary */}
                        <div className="p-4 border-b border-orange-100 bg-orange-50/30">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-orange-900">{asset.code}</h4>
                                {asset.userAnswer ? <Check size={16} className="text-green-500" /> : <Info size={16} className="text-orange-400" />}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{asset.summary}</p>
                        </div>
                        
                        {/* Bottom: Question */}
                        <div className="p-4 bg-white">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Verification Question:</p>
                            <p className="text-sm text-gray-800 italic mb-3">"{asset.question}"</p>
                            <input 
                                className="w-full p-2 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-orange-400 outline-none"
                                placeholder="Your answer (e.g., Yes, I have photos...)"
                                value={asset.userAnswer || ''}
                                onChange={(e) => handleUpdateAssetAnswer(asset.id, e.target.value)}
                            />
                        </div>
                        </div>
                    ))}
                    
                    {project.legalAssets.length === 0 && (
                        <div className="text-center text-gray-400 py-4 italic">No specific statutes identified yet.</div>
                    )}
                </div>
                </div>
            )}

            {!loading && (
                <div className="flex justify-end pt-4">
                <button
                    onClick={finalizeContext}
                    className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transform hover:scale-105 transition-all flex items-center gap-2"
                >
                    Start Strategy Session
                    <Check size={20} />
                </button>
                </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};