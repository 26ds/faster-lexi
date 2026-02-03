import React from 'react';
import { Plus, Folder, FolderOpen, Trash2 } from 'lucide-react';
import { Project } from '../types';

interface ProjectListProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject
}) => {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h1 className="font-bold text-lg tracking-wider">LEXIGUARD</h1>
        <button 
          onClick={onCreateProject}
          className="p-2 bg-blue-600 rounded-full hover:bg-blue-500 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {projects.length === 0 && (
          <div className="text-gray-500 text-sm text-center mt-10 p-4">
            No projects yet.<br/>Click + to start a new negotiation.
          </div>
        )}
        
        {projects.map((project) => (
          <div 
            key={project.id}
            className={`
              group flex items-center justify-between p-3 rounded-md cursor-pointer transition-all
              ${activeProjectId === project.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50'}
            `}
            onClick={() => onSelectProject(project.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {activeProjectId === project.id ? <FolderOpen size={18} className="text-blue-400" /> : <Folder size={18} />}
              <span className="truncate text-sm font-medium">{project.name}</span>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};