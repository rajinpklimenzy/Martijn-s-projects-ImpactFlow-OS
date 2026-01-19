
import React from 'react';
import { MOCK_PROJECTS, MOCK_COMPANIES } from '../constants';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, MoreVertical, Plus, ChevronRight } from 'lucide-react';

interface ProjectsProps {
  onNavigate: (tab: string) => void;
  onCreateProject: () => void;
}

const Projects: React.FC<ProjectsProps> = ({ onNavigate, onCreateProject }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Project Workspace</h1>
          <p className="text-slate-500 text-sm">Active digital transformation initiatives</p>
        </div>
        <button 
          onClick={onCreateProject}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_PROJECTS.map(project => {
          const company = MOCK_COMPANIES.find(c => c.id === project.companyId);
          const getStatusIcon = (status: string) => {
            switch(status) {
              case 'Active': return <Clock className="w-4 h-4 text-blue-500" />;
              case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
              default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
            }
          };

          return (
            <div 
              key={project.id} 
              onClick={() => onNavigate('tasks')}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <FolderKanban className="w-6 h-6 text-indigo-600" />
                  </div>
                  <button className="p-1 hover:bg-slate-50 rounded">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                <p className="text-sm text-slate-500 mb-6">{company?.name}</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-400">Project Progress</span>
                    <span className="font-bold text-slate-900">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{width: `${project.progress}%`}} />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-center gap-2">
                  {getStatusIcon(project.status)}
                  <span className="text-xs font-bold text-slate-600">{project.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img src="https://picsum.photos/seed/p1/40/40" className="w-6 h-6 rounded-full border-2 border-white" />
                    <img src="https://picsum.photos/seed/p2/40/40" className="w-6 h-6 rounded-full border-2 border-white" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Projects;
