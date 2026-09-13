import React, { startTransition, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Project, ProjectStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Loader2,
  Plus,
  X,
  Search,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

const projectSchema = z
  .object({
    name: z.string().trim().min(1, 'Project name is required'),
    description: z.string().optional(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

type ProjectForm = z.infer<typeof projectSchema>;

const statusStyles: Record<ProjectStatus, { bg: string; text: string; border: string; label: string }> = {
  NOT_STARTED: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', label: 'Not Started' },
  IN_PROGRESS: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', label: 'In Progress' },
  COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', label: 'Completed' },
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounced search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const requestId = useRef(0);
  const searchController = useRef<AbortController | null>(null);

  const { success, error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: 'NOT_STARTED', description: '', startDate: '', endDate: '' },
  });

  // 300ms Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchProjects = async () => {
    const currentRequest = ++requestId.current;
    searchController.current?.abort();
    const controller = new AbortController();

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await api.get(`/projects?${params.toString()}`, { signal: controller.signal });
      if (currentRequest === requestId.current && response.data.success) {
        startTransition(() => setProjects(response.data.data));
      }
    } catch (err: any) {
      if (err?.code !== 'ERR_CANCELED') {
        console.error('Failed to fetch projects', err);
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProjects();

    const handleCopilotAction = () => fetchProjects();
    window.addEventListener('copilot-action', handleCopilotAction);
    return () => {
      requestId.current += 1;
      searchController.current?.abort();
      window.removeEventListener('copilot-action', handleCopilotAction);
    };
  }, [debouncedSearch, statusFilter]);

  const openCreateModal = () => {
    setEditingProject(null);
    setActionError(null);
    reset({
      name: '',
      description: '',
      status: 'NOT_STARTED',
      startDate: '',
      endDate: '',
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setActionError(null);
    setValue('name', project.name);
    setValue('description', project.description || '');
    setValue('status', project.status);
    setValue('startDate', project.startDate ? project.startDate.split('T')[0] : '');
    setValue('endDate', project.endDate ? project.endDate.split('T')[0] : '');
    setIsCreateModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingProject(null);
    setActionError(null);
    reset();
  };

  const onSubmit = async (data: ProjectForm) => {
    try {
      setActionError(null);
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        status: data.status,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      };

      if (editingProject) {
        const res = await api.put(`/projects/${editingProject.id}`, payload);
        if (res.data.success) {
          success(`Project "${data.name}" updated successfully!`);
          closeModal();
          fetchProjects();
        }
      } else {
        const res = await api.post('/projects', payload);
        if (res.data.success) {
          success(`Project "${data.name}" created successfully!`);
          closeModal();
          fetchProjects();
        }
      }
    } catch (err: any) {
      const rawMsg = err.response?.data?.error || err.message || 'Failed to save project';
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg?.message || JSON.stringify(rawMsg));
      setActionError(msg);
      toastError(msg);
    }
  };

  const promptDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      setIsDeleting(true);
      const res = await api.delete(`/projects/${projectToDelete.id}`);
      if (res.data.success) {
        success(`Project "${projectToDelete.name}" and associated tasks deleted.`);
        setProjectToDelete(null);
        fetchProjects();
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      const res = await api.post('/seed');
      if (res.data.success) {
        success('Sample projects and deliverables created!');
        fetchProjects();
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to seed sample projects');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage and organize your team's initiatives and milestones</p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length === 0 && (
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            >
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Load Starter Data
            </button>
          )}
          <button
            id="btn-new-project"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => {
            const active = statusFilter === st;
            const labels = {
              ALL: 'All Projects',
              NOT_STARTED: 'Not Started',
              IN_PROGRESS: 'In Progress',
              COMPLETED: 'Completed',
            };
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-800'
                  }`}
              >
                {labels[st]}
              </button>
            );
          })}
        </div>

        {/* Debounced Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-project-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <FolderKanban className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {searchInput || statusFilter !== 'ALL' ? 'No matching projects found' : 'No projects yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
            {searchInput || statusFilter !== 'ALL'
              ? 'Try adjusting your search terms or filter criteria.'
              : 'Create your first project or load starter data to start tracking milestones.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {searchInput || statusFilter !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchInput('');
                  setStatusFilter('ALL');
                }}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create First Project
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const style = statusStyles[project.status];
            const taskTotal = project.taskCount || 0;
            const taskDone = project.completedTaskCount || 0;
            const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {style.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Edit Project"
                        onClick={() => openEditModal(project)}
                        className="p-1 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete Project"
                        onClick={() => promptDeleteProject(project)}
                        className="p-1 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <Link to={`/tasks?projectId=${project.id}`} className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1.5">{project.name}</h3>
                  </Link>

                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
                      <span>Tasks Progress</span>
                      <span className="font-semibold text-gray-700 dark:text-slate-300">
                        {taskDone}/{taskTotal} ({progress}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                    <span>
                      {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'No start date'}
                    </span>
                  </div>
                  <Link
                    to={`/tasks?projectId=${project.id}`}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                  >
                    View Tasks
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 relative border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  placeholder="e.g. Q3 Mobile App Launch"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Outline key objectives and scope..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    {...register('startDate')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  End Date
                </label>
                <input
                  {...register('endDate')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.endDate && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.endDate.message}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? All associated tasks will also be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete Project"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteProject}
        onClose={() => setProjectToDelete(null)}
      />
    </div>
  );
}
