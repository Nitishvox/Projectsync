import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Task, Project, TaskPriority, TaskStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Loader2,
  Plus,
  X,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  CheckSquare,
  Square,
  AlertCircle,
  FolderKanban,
  Edit2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const taskSchema = z.object({
  name: z.string().trim().min(1, 'Task name is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  dueDate: z.string().optional(),
  projectId: z.string().min(1, 'Please select a project'),
});

type TaskForm = z.infer<typeof taskSchema>;

const priorityStyles: Record<TaskPriority, { bg: string; text: string; border: string; label: string }> = {
  LOW: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', label: 'Low' },
  MEDIUM: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', label: 'Medium' },
  HIGH: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', label: 'High' },
};

const statusStyles: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300', text: 'Pending', label: 'Pending' },
  IN_PROGRESS: { bg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300', text: 'In Progress', label: 'In Progress' },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300', text: 'Completed', label: 'Completed' },
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || 'ALL';

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'MEDIUM',
      status: 'PENDING',
      description: '',
      dueDate: '',
      projectId: '',
    },
  });

  // 300ms Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch projects for dropdown
      const projRes = await api.get('/projects');
      if (projRes.data.success) {
        setProjects(projRes.data.data);
      }

      // Fetch tasks with real combined AND filters
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter && priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (selectedProjectId && selectedProjectId !== 'ALL') params.append('projectId', selectedProjectId);

      const taskRes = await api.get(`/tasks?${params.toString()}`);
      if (taskRes.data.success) {
        setTasks(taskRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleCopilotAction = () => fetchData();
    window.addEventListener('copilot-action', handleCopilotAction);
    return () => window.removeEventListener('copilot-action', handleCopilotAction);
  }, [debouncedSearch, statusFilter, priorityFilter, selectedProjectId]);

  const openCreateModal = () => {
    setEditingTask(null);
    setActionError(null);
    reset({
      name: '',
      description: '',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: '',
      projectId: selectedProjectId !== 'ALL' ? selectedProjectId : projects[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setActionError(null);
    setValue('name', task.name);
    setValue('description', task.description || '');
    setValue('priority', task.priority);
    setValue('status', task.status);
    setValue('dueDate', task.dueDate ? task.dueDate.split('T')[0] : '');
    setValue('projectId', task.projectId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setActionError(null);
    reset();
  };

  const onSubmit = async (data: TaskForm) => {
    try {
      setActionError(null);
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate || null,
        projectId: data.projectId,
      };

      if (editingTask) {
        const res = await api.put(`/tasks/${editingTask.id}`, payload);
        if (res.data.success) {
          success(`Task "${data.name}" updated successfully!`);
          closeModal();
          fetchData();
        }
      } else {
        const res = await api.post('/tasks', payload);
        if (res.data.success) {
          success(`Task "${data.name}" created successfully!`);
          closeModal();
          fetchData();
        }
      }
    } catch (err: any) {
      const rawMsg = err.response?.data?.error || err.message || 'Failed to save deliverable';
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg?.message || JSON.stringify(rawMsg));
      setActionError(msg);
      toastError(msg);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.patch(`/tasks/${task.id}/complete`, { status: nextStatus });
      fetchData();
    } catch (err: any) {
      toastError('Could not toggle deliverable status');
    }
  };

  const promptDeleteTask = (task: Task) => {
    setTaskToDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      setIsDeleting(true);
      const res = await api.delete(`/tasks/${taskToDelete.id}`);
      if (res.data.success) {
        success(`Task "${taskToDelete.name}" deleted.`);
        setTaskToDelete(null);
        fetchData();
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Deliverables & Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Track individual milestones, priority queues, and assignments</p>
        </div>
        <button
          id="btn-new-task"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer gap-2"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => {
              const active = statusFilter === st;
              const labels = {
                ALL: 'All Tasks',
                PENDING: 'Pending',
                IN_PROGRESS: 'In Progress',
                COMPLETED: 'Completed',
              };
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-800'
                  }`}
                >
                  {labels[st]}
                </button>
              );
            })}
          </div>

          {/* Debounced Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-task-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search deliverables..."
              className="w-full pl-9 pr-8 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
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

        {/* Dropdown Filters row (AND logic) */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSearchParams(e.target.value === 'ALL' ? {} : { projectId: e.target.value });
              }}
              className="px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {(searchInput || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || selectedProjectId !== 'ALL') && (
            <button
              onClick={() => {
                setSearchInput('');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setSelectedProjectId('ALL');
                setSearchParams({});
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium ml-auto cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading deliverables...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <CheckSquare className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {searchInput || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || selectedProjectId !== 'ALL'
              ? 'No matching deliverables found'
              : 'No deliverables tracked yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
            {searchInput || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || selectedProjectId !== 'ALL'
              ? 'Try widening your filters to see more tasks.'
              : 'Keep your team aligned by creating granular tasks with priorities and deadlines.'}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Deliverable
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden">
          {tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            const priStyle = priorityStyles[task.priority];
            const statStyle = statusStyles[task.status];
            const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !isDone;

            return (
              <div
                key={task.id}
                className={`p-4 hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3.5 group ${
                  isDone ? 'bg-gray-50/40 dark:bg-slate-800/30 opacity-75' : ''
                }`}
              >
                {/* Complete Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTaskStatus(task)}
                  className="mt-0.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex-shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-950" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-semibold tracking-tight ${
                        isDone ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {task.name}
                    </span>

                    {/* Priority badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${priStyle.bg} ${priStyle.text} ${priStyle.border}`}
                    >
                      {priStyle.label}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${statStyle.bg}`}
                    >
                      {statStyle.label}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 mb-1.5">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-slate-300 font-medium">
                      <FolderKanban className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                      {task.projectName || 'General'}
                    </span>

                    {task.dueDate && (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {isOverdue && 'Overdue: '}
                        {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    title="Edit Task"
                    onClick={() => openEditModal(task)}
                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    title="Delete Task"
                    onClick={() => promptDeleteTask(task)}
                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 relative border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingTask ? 'Edit Deliverable' : 'Create New Deliverable'}
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
                  Deliverable Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  placeholder="e.g. Implement OAuth SSO callback handler"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('projectId')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.projectId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={2}
                  placeholder="Acceptance criteria and technical details..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    {...register('dueDate')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Deliverable"
        message={`Are you sure you want to delete "${taskToDelete?.name}"? This action will permanently remove the task.`}
        confirmLabel="Delete Task"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteTask}
        onClose={() => setTaskToDelete(null)}
      />
    </div>
  );
}
