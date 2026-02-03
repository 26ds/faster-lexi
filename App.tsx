import React, { useState } from 'react';
import { ProjectList } from './components/ProjectList';
import { ContextBuilder } from './components/ContextBuilder';
import { MainWorkspace } from './components/MainWorkspace';
import { Project, PlatformType } from './types';
import { Shield } from 'lucide-react';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const handleCreateProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Project ${projects.length + 1}`,
      status: 'drafting_context',
      activeContextId: 'current',
      rawContext: '',
      finalizedContext: '',
      ambiguities: [],
      legalAssets: [], // Initialize empty
      gameTheory: {
        platform: PlatformType.EMAIL,
        interactionLanguage: 'Native English', // Default
        draftingLanguage: 'Native English',    // Default
        replyTimeMinutes: 60,
        userGoal: '',
        userGoalSelected: true,
        files: [],
        userJurisdiction: '',
        counterpartJurisdiction: ''
      },
      contextHistory: [],
      chatDraft: {
        theirLastMessage: '',
        chatHistory: []
      }
    };
    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects(projects.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans">
      <ProjectList 
        projects={projects}
        activeProjectId={activeProjectId}
        onCreateProject={handleCreateProject}
        onSelectProject={setActiveProjectId}
        onDeleteProject={handleDeleteProject}
      />

      <div className="flex-1 flex flex-col h-full relative">
        {!activeProject ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 space-y-4">
             <Shield size={64} className="text-gray-200" />
             <h1 className="text-2xl font-bold text-gray-400">LEXIGUARD 2.0</h1>
             <p>Select or create a project to begin negotiation support.</p>
          </div>
        ) : (
          <>
            {/* Conditional Rendering based on Flow */}
            {activeProject.status === 'drafting_context' ? (
              <ContextBuilder 
                project={activeProject} 
                onUpdateProject={handleUpdateProject}
                onFinalize={(finalizedProject) => handleUpdateProject({ 
                  ...(finalizedProject || activeProject), 
                  status: 'active' 
                })}
              />
            ) : (
              <MainWorkspace 
                project={activeProject} 
                onUpdateProject={handleUpdateProject}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;