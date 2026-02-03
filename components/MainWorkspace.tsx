import React, { useState, useRef, useEffect } from 'react';
import { Project, PlatformType, ChatMessage, ContextItem, IntentTag, UserEmotion, LegalAsset, LANGUAGES } from '../types';
import { getLexiguardStrategyStream, summarizeInteraction, translateContent, checkForDynamicLegalAssets } from '../services/gemini';
import { 
  Settings, Clock, Target, Paperclip, Send, 
  ArrowRightCircle, ChevronRight, ChevronLeft,
  MessageSquare, FileText, CheckSquare, Square, PenLine, MoreHorizontal, X, GripVertical,
  Brain, Search, Footprints, PenTool, Zap, Loader2, Check, Scale, Hourglass, AlertTriangle, PlusCircle,
  Globe, PenTool as PenIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MainWorkspaceProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({ project, onUpdateProject }) => {
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // Resizable Sidebar State
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const isDragging = useRef(false);

  // Local state for inputs
  const [inputTheirMsg, setInputTheirMsg] = useState('');
  const [inputUserThinking, setInputUserThinking] = useState('');
  
  // Loading State
  const [isThinking, setIsThinking] = useState(false);
  // Track which items are currently being updated in the background
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  // To track the latest request ID to allow "cancellation" (ignoring old results)
  const latestRequestId = useRef(0);
  
  // UI States (Chips & Emotion)
  const [selectedTags, setSelectedTags] = useState<IntentTag[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<UserEmotion>('neutral');

  // Editing states
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);
  const [tempSummaryContent, setTempSummaryContent] = useState(''); // For editing context
  
  // Legal Asset UI State
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [newlyDiscoveredAsset, setNewlyDiscoveredAsset] = useState<LegalAsset | null>(null);

  // Translation & Saving feedback
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  
  // Persistent Commit Menu State
  const [showCommitMenu, setShowCommitMenu] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Resizable Logic ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth >= 250 && newWidth <= 600) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // --- Auto-resize Textarea Logic ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputUserThinking]);

  // --- Derived State for Center Panel ---
  const isCurrentView = project.activeContextId === 'current';
  
  const activeLogItem = !isCurrentView 
    ? project.contextHistory.find(i => i.id === project.activeContextId) 
    : null;

  const displayChatHistory = isCurrentView 
    ? project.chatDraft.chatHistory 
    : (activeLogItem?.chatHistory || []);

  useEffect(() => {
    if (isCurrentView) {
      setInputTheirMsg(project.chatDraft.theirLastMessage || '');
    } else if (activeLogItem) {
      setInputTheirMsg(extractTheirMsg(activeLogItem.fullContent) || '');
    }
  }, [project.activeContextId, activeLogItem, project.chatDraft.theirLastMessage]);

  const extractTheirMsg = (fullContent?: string) => {
    if(!fullContent) return '';
    const match = fullContent.match(/Them: (.*?)\n/s);
    return match ? match[1] : '';
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayChatHistory]);
  
  // --- Dynamic Legal Asset Discovery Logic ---
  useEffect(() => {
      if (!isThinking && inputTheirMsg && isCurrentView) {
          // Debounce this or only run when user stops typing in real app
          // Here we can assume we run it once after message is "stable" or user is interacting
          // For now, we simulate detection on input change with delay
          const timer = setTimeout(async () => {
              const newAsset = await checkForDynamicLegalAssets(inputTheirMsg, project.legalAssets);
              if (newAsset) {
                  setNewlyDiscoveredAsset(newAsset);
              }
          }, 2000);
          return () => clearTimeout(timer);
      }
  }, [inputTheirMsg]);

  const isSendEnabled = inputUserThinking.trim().length > 0 || selectedTags.length > 0;

  // --- Handlers ---

  const toggleTag = (tag: IntentTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // 3-State Toggle Logic for Legal Assets
  const toggleLegalAssetStatus = (assetId: string) => {
      const updated = project.legalAssets.map((a): LegalAsset => {
          if (a.id === assetId) {
              const nextStatus: LegalAsset['status'] = a.status === 'verified' ? 'pending' 
                               : a.status === 'pending' ? 'inactive' 
                               : 'verified';
              return { ...a, status: nextStatus };
          }
          return a;
      });
      onUpdateProject({ ...project, legalAssets: updated });
  };
  
  const handleAddDynamicAsset = () => {
      if (newlyDiscoveredAsset) {
          onUpdateProject({
              ...project,
              legalAssets: [...project.legalAssets, newlyDiscoveredAsset]
          });
          setNewlyDiscoveredAsset(null);
      }
  };

  // Helper to update chat history in the project structure
  const updateChatHistory = (newHistory: ChatMessage[]) => {
    if (isCurrentView) {
        onUpdateProject({
          ...project,
          chatDraft: {
            ...project.chatDraft,
            theirLastMessage: inputTheirMsg,
            chatHistory: newHistory
          }
        });
      } else if (activeLogItem) {
        const updatedLogs = project.contextHistory.map(item => 
          item.id === activeLogItem.id ? { ...item, chatHistory: newHistory } : item
        );
        onUpdateProject({ ...project, contextHistory: updatedLogs });
      }
  };

  const handleSendMessage = async (forceFlash: boolean = false) => {
    // Determine the history to send
    let historyToSend = [...displayChatHistory];
    
    // If it's a new message (not a "Switch to Flash" retry), add it to history
    if (!forceFlash) {
        if (!isSendEnabled) return;
        if (inputUserThinking.trim()) {
            const newUserMsg: ChatMessage = { role: 'user', text: inputUserThinking };
            historyToSend.push(newUserMsg);
        }
        // Update UI immediately
        updateChatHistory(historyToSend);
        setInputUserThinking('');
        setSelectedTags([]); 
    }

    // Add placeholder for streaming response
    // If forceFlash, we might skip showing spinner state visually in CSS, but logic remains same
    const placeholderMsg: ChatMessage = { role: 'model', text: '', isThinking: true };
    const historyWithPlaceholder = [...historyToSend, placeholderMsg];
    updateChatHistory(historyWithPlaceholder);

    setIsThinking(true);
    
    // ID tracking for cancellation/switch logic
    const requestId = Date.now();
    latestRequestId.current = requestId;

    // Trigger visual loading state for historical context item
    if (!isCurrentView && activeLogItem) {
        setUpdatingItems(prev => new Set(prev).add(activeLogItem.id));
    }

    try {
      const stream = getLexiguardStrategyStream(
        project, 
        "", // currentInput is empty as it's in history
        historyToSend, // This contains the user's latest input
        selectedTags,
        currentEmotion,
        forceFlash
      );
      
      let fullResponseText = "";
      let isFirstChunk = true;

      for await (const chunk of stream) {
        // Concurrency check inside loop
        if (latestRequestId.current !== requestId) break;

        fullResponseText += chunk;
        
        if (isFirstChunk) {
            setIsThinking(false);
            isFirstChunk = false;
        }

        // Update the last message (placeholder) with current text
        const streamingHistory = [...historyToSend, { role: 'model' as const, text: fullResponseText, isThinking: false }];
        updateChatHistory(streamingHistory);
      }
      
      // Finalize
      if (latestRequestId.current === requestId) {
          setIsThinking(false);
          // AUTO-UPDATE LOGIC: Re-summarize historical context if we just added to it
          if (!isCurrentView && activeLogItem) {
              const fullTranscript = `Them: ${inputTheirMsg}\n` + 
                  (historyWithPlaceholder.map(m => `${m.role === 'user' ? 'Me' : 'AI'}: ${m.text}`).join('\n')) + 
                  `AI: ${fullResponseText}`;
              
              // Run summary agent in background
              summarizeInteraction(inputTheirMsg, "", project.finalizedContext, fullTranscript)
                .then(result => {
                    const updatedLogs = project.contextHistory.map(item => 
                        item.id === activeLogItem.id ? {
                            ...item,
                            title: result.title,
                            detailedSummary: result.detailedSummary,
                            chatHistory: [...historyToSend, { role: 'model' as const, text: fullResponseText }]
                        } : item
                    );
                    
                    onUpdateProject({
                        ...project,
                        contextHistory: updatedLogs
                    });

                    setUpdatingItems(prev => {
                        const next = new Set(prev);
                        next.delete(activeLogItem.id);
                        return next;
                    });
                });
          }
      }
    } catch (e) {
      console.error(e);
      if (latestRequestId.current === requestId) {
          setIsThinking(false);
          // Remove placeholder on error
          updateChatHistory(historyToSend); 
          if (!isCurrentView && activeLogItem) {
             setUpdatingItems(prev => {
                const next = new Set(prev);
                next.delete(activeLogItem.id);
                return next;
             });
          }
      }
    }
  };

  const handleCommitInteraction = async (finalReply: string) => {
    if (!finalReply) return;
    setIsThinking(true);

    const { title, detailedSummary } = await summarizeInteraction(inputTheirMsg, finalReply, project.finalizedContext);
    
    if (isCurrentView) {
      const newItem: ContextItem = {
        id: Date.now().toString(),
        type: 'interaction',
        title: title,
        detailedSummary: detailedSummary,
        language: 'English',
        fullContent: `Them: ${inputTheirMsg}\n\nMe: ${finalReply}`,
        timestamp: Date.now(),
        chatHistory: project.chatDraft.chatHistory, 
        isSelected: true 
      };

      onUpdateProject({
        ...project,
        contextHistory: [newItem, ...project.contextHistory], 
        chatDraft: { theirLastMessage: '', chatHistory: [] }, 
        activeContextId: 'current' 
      });
    } else if (activeLogItem) {
      const updatedLogs = project.contextHistory.map(item => 
        item.id === activeLogItem.id ? {
          ...item,
          title: title,
          detailedSummary: detailedSummary,
          fullContent: `Them: ${inputTheirMsg}\n\nMe: ${finalReply}`,
        } : item
      );
      onUpdateProject({ ...project, contextHistory: updatedLogs });
    }
    
    setInputTheirMsg('');
    setIsThinking(false);
    setShowCommitMenu(false);
  };

  const handleToggleSelect = (id: string) => {
    const updated = project.contextHistory.map(item => 
      item.id === id ? { ...item, isSelected: !item.isSelected } : item
    );
    onUpdateProject({ ...project, contextHistory: updated });
  };

  const handleDeleteLog = (id: string) => {
    const updated = project.contextHistory.filter(i => i.id !== id);
    const newActive = project.activeContextId === id ? 'current' : project.activeContextId;
    onUpdateProject({ ...project, contextHistory: updated, activeContextId: newActive });
  };

  const handleRenameLog = (id: string, newTitle: string) => {
    const updated = project.contextHistory.map(item => 
      item.id === id ? { ...item, title: newTitle } : item
    );
    onUpdateProject({ ...project, contextHistory: updated });
    setEditingTitleId(null);
  };

  const handleUpdateContextSummary = (id: string) => {
    const updatedLogs = project.contextHistory.map(item => 
      item.id === id ? { ...item, detailedSummary: tempSummaryContent } : item
    );
    onUpdateProject({ ...project, contextHistory: updatedLogs });
    
    // Provide visual feedback
    setJustSavedId(id);
    setTimeout(() => setJustSavedId(null), 2000);
  };
  
  const handleUpdateContextLanguage = async (id: string, lang: string) => {
     // 1. Update language state
     const updatedLogs = project.contextHistory.map(item => 
      item.id === id ? { ...item, language: lang } : item
    );
    onUpdateProject({ ...project, contextHistory: updatedLogs });
    
    // 2. Translate content
    setTranslatingId(id);
    const translated = await translateContent(tempSummaryContent, lang);
    setTempSummaryContent(translated);
    setTranslatingId(null);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white">
      
      {/* --- LEFT: Game Theory Sidebar --- */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Settings size={14} /> Game Theory Parameters
          </h2>
          
          <div className="space-y-4 mb-6">
             <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Platform</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                  value={project.gameTheory.platform}
                  onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, platform: e.target.value}})}
                >
                  {Object.values(PlatformType).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
             </div>

             {/* DUAL LANGUAGE INPUTS */}
             <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                   <Globe size={10} /> Interaction Language
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                  value={project.gameTheory.interactionLanguage}
                  onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, interactionLanguage: e.target.value}})}
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
             </div>

             <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                   <PenIcon size={10} /> Drafting Language
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                  value={project.gameTheory.draftingLanguage}
                  onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, draftingLanguage: e.target.value}})}
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
             </div>
             
             {/* Jurisdiction Configuration */}
             <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">User Jurisdiction</label>
                <input 
                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                  placeholder="e.g. California"
                  value={project.gameTheory.userJurisdiction || ''}
                  onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, userJurisdiction: e.target.value}})}
                />
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Counterpart Jurisdiction</label>
                <input 
                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                  placeholder="e.g. Delaware"
                  value={project.gameTheory.counterpartJurisdiction || ''}
                  onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, counterpartJurisdiction: e.target.value}})}
                />
             </div>
          </div>

          <div className="h-px bg-gray-200 mb-6"></div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={() => onUpdateProject({
                  ...project, 
                  gameTheory: {...project.gameTheory, userGoalSelected: !project.gameTheory.userGoalSelected}
                })}
                className="text-blue-600 hover:text-blue-700 transition-colors"
                title={project.gameTheory.userGoalSelected ? "Goal is Active in Context" : "Goal is Excluded from Context"}
              >
                {project.gameTheory.userGoalSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Target size={12} /> Ultimate Objective
              </label>
            </div>
            <textarea 
              className={`w-full p-3 border rounded-md text-sm h-24 resize-none transition-all ${project.gameTheory.userGoalSelected ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'}`}
              placeholder="e.g. Get full refund + apology..."
              value={project.gameTheory.userGoal}
              onChange={(e) => onUpdateProject({...project, gameTheory: {...project.gameTheory, userGoal: e.target.value}})}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Paperclip size={12} /> Reference Profile
            </label>
            <div className="mt-2 space-y-1">
              {project.gameTheory.files.map((f, i) => (
                <div key={i} className="text-xs bg-white p-1 px-2 border rounded flex items-center gap-2">
                  <FileText size={10} /> {f}
                </div>
              ))}
              <div className="text-xs text-gray-400 italic p-1">No files attached</div>
            </div>
          </div>

          {/* NEW SECTION: LEGAL ASSETS */}
          <div className="mt-6 border-t border-gray-200 pt-4">
             <div className="flex justify-between items-center mb-3">
                 <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                   <Scale size={14} className="text-orange-500" /> Legal Assets
                 </h2>
                 <button 
                    className="text-gray-400 hover:text-blue-500"
                    title="Advanced Research coming soon"
                 >
                     <PlusCircle size={14} />
                 </button>
             </div>
             
             <div className="space-y-2">
                 {project.legalAssets.map((asset) => (
                     <div key={asset.id} className="bg-white border border-gray-200 rounded-md overflow-hidden">
                        <div className="flex items-center p-2 bg-gray-50">
                            {/* 3-State Checkbox Logic */}
                            <button 
                                onClick={() => toggleLegalAssetStatus(asset.id)}
                                className="mr-2 focus:outline-none"
                            >
                                {asset.status === 'verified' && <CheckSquare size={16} className="text-green-600" />}
                                {asset.status === 'pending' && <Hourglass size={16} className="text-yellow-600" />}
                                {asset.status === 'inactive' && <Square size={16} className="text-gray-300" />}
                            </button>
                            
                            <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => setExpandedAssetId(expandedAssetId === asset.id ? null : asset.id)}
                            >
                                <div className="text-xs font-bold text-gray-700 truncate">{asset.code}</div>
                            </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {expandedAssetId === asset.id && (
                            <div className="p-2 text-xs bg-white border-t border-gray-100">
                                <p className="mb-2 text-gray-600">{asset.summary}</p>
                                
                                {asset.status === 'pending' && (
                                    <div className="bg-yellow-50 p-2 rounded border border-yellow-100 mb-1">
                                        <div className="font-bold text-yellow-700 mb-1 flex items-center gap-1">
                                            <AlertTriangle size={10} /> Needs Action
                                        </div>
                                        <p className="text-yellow-800">{asset.actionItem}</p>
                                    </div>
                                )}
                                
                                <div className="text-[10px] text-gray-400 mt-2">
                                    Reasoning: {asset.reasoning}
                                </div>
                            </div>
                        )}
                     </div>
                 ))}
                 
                 {project.legalAssets.length === 0 && (
                     <div className="text-xs text-gray-400 italic text-center py-2">No assets defined.</div>
                 )}
             </div>
          </div>
        </div>
      </div>

      {/* --- CENTER: Drafting Workspace --- */}
      <div className="flex-1 flex flex-col relative bg-white min-w-0">
        
        {/* Top: Their Message Input */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex justify-between items-center mb-2">
             <label className="block text-sm font-bold text-gray-700">
               {isCurrentView ? "Counterparty's Current Message / Event" : "Past Event (Editing Log)"}
             </label>
             {!isCurrentView && (
               <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                 Viewing History
               </span>
             )}
          </div>
          <textarea 
            className="w-full p-3 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-800"
            placeholder={isCurrentView ? "Paste their new email, text, or describe the latest event here..." : "What they said in this past interaction..."}
            rows={3}
            value={inputTheirMsg}
            onChange={(e) => setInputTheirMsg(e.target.value)}
          />
        </div>

        {/* Dynamic Discovery Suggestion Card */}
        {newlyDiscoveredAsset && isCurrentView && (
            <div className="mx-6 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm animate-in slide-in-from-top-4 flex justify-between items-start">
                <div className="flex gap-3">
                    <div className="bg-orange-100 p-2 rounded-full">
                        <Zap size={20} className="text-orange-600" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            New Legal Asset Detected
                            <span className="text-[10px] bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full">Beta</span>
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                            The opponent's message may implicate <strong>{newlyDiscoveredAsset.code}</strong>.
                        </p>
                        <p className="text-xs text-gray-500 mt-1 italic">{newlyDiscoveredAsset.summary}</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleAddDynamicAsset}
                        className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 transition-colors"
                    >
                        Add to Assets
                    </button>
                    <button 
                        onClick={() => setNewlyDiscoveredAsset(null)}
                        className="px-3 py-1.5 text-gray-400 hover:text-gray-600 text-xs transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        )}

        {/* Middle: Chat Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          {displayChatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
              <MessageSquare size={48} className="mb-4" />
              <p>Select an intent or type to start.</p>
            </div>
          )}

          {displayChatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none prose prose-sm'
                }`}
              >
                {/* 
                   If msg.isThinking is true, it means we are waiting for the FIRST token.
                   If text is empty and thinking, show spinner.
                   If text is present, show text (streaming has started).
                */}
                {msg.role === 'model' ? (
                   <>
                     {msg.text ? <ReactMarkdown>{msg.text}</ReactMarkdown> : null}
                     {msg.isThinking && !msg.text && (
                       <div className="flex items-center gap-2 h-6">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75" />
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150" />
                       </div>
                     )}
                   </>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          
          {/* 
             The global isThinking state controls the Input area lock and the "Answer Now" button visibility.
             It does NOT control the spinner inside the chat bubble (that's per-message state).
          */}
          {isThinking && (
             <div className="flex justify-start items-center gap-3 pl-2">
                {/* Hot-Swap Flash Model Button - Only visible if we are waiting/streaming */}
               <button 
                 onClick={() => handleSendMessage(true)}
                 className="text-xs font-bold text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-2 rounded-full border border-yellow-200 flex items-center gap-1 transition-all"
                 title="Switch to faster model immediately (keeps context)"
               >
                 <Zap size={12} className="fill-yellow-500" />
                 ⚡ Answer now
               </button>
             </div>
          )}
        </div>

        {/* Bottom: Action Area with Chips */}
        <div className="p-4 border-t border-gray-100 bg-white">
          
          {/* Intent Chips Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
             <button 
               onClick={() => toggleTag('analysis_situation')}
               className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selectedTags.includes('analysis_situation') ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
             >
               <Brain size={12} /> 🎯 Situation Analysis
             </button>
             <button 
               onClick={() => toggleTag('analysis_intent')}
               className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selectedTags.includes('analysis_intent') ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
             >
               <Search size={12} /> 🧐 Intent Analysis
             </button>
             <button 
               onClick={() => toggleTag('recommendation')}
               className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selectedTags.includes('recommendation') ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
             >
               <Footprints size={12} /> 🏃 Action Rec
             </button>
             <button 
               onClick={() => toggleTag('draft_reply')}
               className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selectedTags.includes('draft_reply') ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
             >
               <PenTool size={12} /> ✍️ Draft Reply
             </button>

             <div className="h-6 w-px bg-gray-200 mx-2" />

             {/* Emotion Selector */}
             <div className="relative">
                <select 
                  value={currentEmotion}
                  onChange={(e) => setCurrentEmotion(e.target.value as UserEmotion)}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300
                    ${currentEmotion === 'neutral' ? 'bg-gray-100 border-gray-200 text-gray-500' : ''}
                    ${currentEmotion === 'anger' ? 'bg-red-100 border-red-300 text-red-700' : ''}
                    ${currentEmotion === 'despair' ? 'bg-slate-700 border-slate-800 text-slate-100' : ''}
                    ${currentEmotion === 'anxiety' ? 'bg-orange-100 border-orange-300 text-orange-700' : ''}
                    ${currentEmotion === 'fatigue' ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}
                  `}
                >
                  <option value="neutral">😐 Neutral</option>
                  <option value="anger">😡 Anger</option>
                  <option value="despair">🌑 Despair</option>
                  <option value="fatigue">😫 Fatigue</option>
                  <option value="anxiety">😰 Anxiety</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={10} className="opacity-50" />
                </div>
             </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea 
                ref={textareaRef}
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none overflow-hidden min-h-[50px] max-h-[200px]"
                placeholder="Discuss strategy or draft response..."
                rows={1}
                value={inputUserThinking}
                onChange={(e) => setInputUserThinking(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(false);
                    }
                }}
              />
              
              {/* Send Button Only */}
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <button 
                  onClick={() => handleSendMessage(false)}
                  disabled={isThinking || !isSendEnabled}
                  className={`p-2 rounded-full transition-colors
                    ${isSendEnabled ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            
            {/* Persistent Commit Dialog */}
            <div className="relative shrink-0 h-[50px]">
               <button 
                onClick={() => setShowCommitMenu(!showCommitMenu)}
                className={`h-full px-6 rounded-xl font-bold transition-colors flex items-center gap-2 text-white
                  ${isCurrentView ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}
                `}
               >
                 {isCurrentView ? "Commit" : "Log"} <ArrowRightCircle size={18} />
               </button>
               
               {showCommitMenu && (
                 <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-in fade-in slide-in-from-bottom-2 z-50">
                   <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-bold text-gray-800">
                        {isCurrentView ? "Finalize this Turn" : "Update Interaction Log"}
                      </h4>
                      <button 
                        onClick={() => setShowCommitMenu(false)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                      >
                        <X size={14} />
                      </button>
                   </div>
                   
                   <p className="text-xs text-gray-500 mb-3">
                     {isCurrentView ? "Paste exactly what you sent to log it." : "Update the record of what was sent."}
                   </p>
                   
                   <textarea 
                      id="finalCommitText"
                      className="w-full p-2 border border-gray-300 rounded text-sm mb-2 h-24"
                      placeholder="I sent: ..."
                      defaultValue={!isCurrentView && activeLogItem?.fullContent ? activeLogItem.fullContent.split('Me: ')[1] : ''}
                   />
                   
                   <button 
                     onClick={() => {
                       const val = (document.getElementById('finalCommitText') as HTMLTextAreaElement).value;
                       handleCommitInteraction(val);
                     }}
                     className={`w-full py-2 rounded-lg text-sm font-bold text-white
                       ${isCurrentView ? 'bg-green-600' : 'bg-orange-500'}
                     `}
                     disabled={isThinking}
                   >
                     {isCurrentView ? "Confirm & Log" : "Save Changes"}
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Toggle Right Panel & Resizer */}
        <button 
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="absolute top-1/2 right-0 translate-x-1/2 z-10 bg-white border border-gray-200 shadow-md p-1 rounded-full text-gray-500 hover:text-blue-600"
        >
          {showRightPanel ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* --- RIGHT: Resizable Live Context History --- */}
      {showRightPanel && (
        <div className="flex h-full shrink-0 relative">
            <div 
                className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors bg-transparent absolute left-0 top-0 bottom-0 z-20 flex flex-col justify-center items-center group"
                onMouseDown={() => {
                    isDragging.current = true;
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                }}
            >
                <GripVertical size={12} className="text-gray-300 opacity-0 group-hover:opacity-100" />
            </div>

            <div 
                style={{ width: rightPanelWidth }}
                className="bg-slate-50 border-l border-gray-200 flex flex-col h-full animate-in slide-in-from-right-10 duration-300"
            >
              <div className="p-5 bg-white border-b border-gray-200 shadow-sm z-10 shrink-0">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Live Context
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                
                <div 
                  onClick={() => onUpdateProject({ ...project, activeContextId: 'current' })}
                  className={`
                    p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer relative
                    ${isCurrentView 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-300 bg-gray-50 hover:bg-white text-gray-500'}
                  `}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-1">
                    {isCurrentView ? 'Active Workspace' : 'Click to Resume'}
                  </div>
                  <div className="font-semibold text-sm">
                     Current Conversation
                  </div>
                  {isCurrentView && <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest my-2">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <span>Log</span>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                {project.contextHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className={`
                      bg-white rounded-xl border shadow-sm transition-all group relative break-words
                      ${project.activeContextId === item.id ? 'border-orange-400 ring-1 ring-orange-100' : 'border-gray-200 hover:border-blue-300'}
                    `}
                  >
                     {/* SHIMMER LOADING STATE FOR THIS ITEM */}
                     {updatingItems.has(item.id) ? (
                        <div className="p-4 space-y-3 animate-pulse">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        </div>
                     ) : (
                        // STANDARD CONTENT
                        <>
                            <div className="p-3 flex items-start gap-2">
                       
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleToggleSelect(item.id); }}
                                    className={`mt-1 hover:scale-110 transition-transform ${item.isSelected ? 'text-blue-600' : 'text-gray-300'} shrink-0`}
                                    title={item.isSelected ? "Included in Strategy" : "Excluded from Strategy"}
                                >
                                    {item.isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>

                                <div 
                                    className="flex-1 cursor-pointer min-w-0"
                                    onClick={() => onUpdateProject({ ...project, activeContextId: item.id })}
                                >
                                    <div className="text-[10px] text-gray-400 mb-1 flex justify-between">
                                        {item.type === 'background' ? 'BACKGROUND STORY' : new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                    
                                    {editingTitleId === item.id ? (
                                        <input 
                                        autoFocus
                                        className="w-full text-sm font-bold border-b border-blue-500 outline-none"
                                        defaultValue={item.title}
                                        onBlur={(e) => handleRenameLog(item.id, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameLog(item.id, e.currentTarget.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <h4 className="text-sm font-bold text-gray-700 leading-tight">
                                        {item.title}
                                        </h4>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button 
                                        onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setExpandedSummaryId(expandedSummaryId === item.id ? null : item.id);
                                        setTempSummaryContent(item.detailedSummary);
                                        }}
                                        className={`p-1 rounded hover:bg-gray-100 ${expandedSummaryId === item.id ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                        title="View Analysis"
                                    >
                                        <PenLine size={14} />
                                    </button>
                                    
                                    <div className="relative group/menu">
                                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                                        <MoreHorizontal size={14} />
                                        </button>
                                        <div className="absolute right-0 top-full bg-white border border-gray-200 shadow-lg rounded-lg p-1 hidden group-hover/menu:block z-50 w-24">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingTitleId(item.id); }}
                                            className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 text-gray-700 block"
                                        >
                                            Rename
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteLog(item.id); }}
                                            className="w-full text-left px-2 py-1 text-xs hover:bg-red-50 text-red-600 block"
                                        >
                                            Delete
                                        </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {expandedSummaryId === item.id && (
                            <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1">
                                <div className="bg-gray-50 p-2 rounded-lg text-xs border border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="font-semibold text-gray-400 text-[10px] uppercase">Lexiguard Context</div>
                                    
                                    <button 
                                    onClick={() => handleUpdateContextSummary(item.id)}
                                    className={`text-[10px] px-2 py-0.5 rounded transition-all flex items-center gap-1
                                        ${justSavedId === item.id 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }
                                    `}
                                    title="Confirm Update Context"
                                    >
                                    {justSavedId === item.id ? (
                                        <><Check size={10} /> Saved</>
                                    ) : (
                                        "Confirm Update"
                                    )}
                                    </button>
                                </div>
                                
                                <div className="relative">
                                    <textarea 
                                        className="w-full bg-white border border-gray-200 rounded p-1 text-gray-700 mb-2 focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[80px]"
                                        value={tempSummaryContent}
                                        onChange={(e) => setTempSummaryContent(e.target.value)}
                                        disabled={translatingId === item.id}
                                    />
                                    {translatingId === item.id && (
                                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                        <Loader2 size={16} className="animate-spin text-blue-600" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="relative">
                                        <select 
                                        value={item.language}
                                        onChange={(e) => handleUpdateContextLanguage(item.id, e.target.value)}
                                        className="appearance-none bg-white border border-gray-200 text-gray-500 rounded px-2 py-0.5 text-[10px] pr-4 cursor-pointer focus:border-blue-300 outline-none"
                                        >
                                        <option value="English">English</option>
                                        <option value="Chinese">Chinese</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="French">French</option>
                                        </select>
                                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>

                                    {item.fullContent && (
                                        <span className="italic text-[9px] text-gray-300">
                                        Based on transcript
                                        </span>
                                    )}
                                </div>
                                </div>
                            </div>
                            )}
                        </>
                     )}
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}

    </div>
  );
};
function ChevronDown(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}