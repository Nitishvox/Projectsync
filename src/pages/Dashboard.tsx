import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Project, Task, DashboardStats, AuditLog } from '../types';
import { useToast } from '../context/ToastContext';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  CheckCircle2,
  Loader2,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle,
  X,
  History,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick modals on Dashboard
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, projRes, taskRes, logsRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/projects'),
        api.get('/tasks'),
        api.get('/audit-logs').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (projRes.data.success) {
        setRecentProjects(projRes.data.data.slice(0, 4));
        if (projRes.data.data.length > 0 && !taskProjectId) {
          setTaskProjectId(projRes.data.data[0].id);
        }
      }
      if (taskRes.data.success) {
        setRecentTasks(taskRes.data.data.slice(0, 5));
      }
      if (logsRes.data.success && Array.isArray(logsRes.data.data)) {
        setRecentLogs(logsRes.data.data.slice(0, 6));
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleCopilotAction = () => fetchDashboardData();
    window.addEventListener('copilot-action', handleCopilotAction);
    return () => window.removeEventListener('copilot-action', handleCopilotAction);
  }, []);

  const handleQuickCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setProjectSubmitting(true);
      const res = await api.post('/projects', {
        name: projectName.trim(),
        description: projectDesc.trim(),
        status: 'IN_PROGRESS',
      });
      if (res.data.success) {
        success(`Project "${projectName}" created!`);
        setIsProjectModalOpen(false);
        setProjectName('');
        setProjectDesc('');
        fetchDashboardData();
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleQuickCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    try {
      setTaskSubmitting(true);
      const res = await api.post('/tasks', {
        name: taskName.trim(),
        projectId: taskProjectId || recentProjects[0]?.id,
        priority: taskPriority,
        status: 'PENDING',
      });
      if (res.data.success) {
        success(`Task "${taskName}" added!`);
        setIsTaskModalOpen(false);
        setTaskName('');
        fetchDashboardData();
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.patch(`/tasks/${task.id}/complete`, { status: nextStatus });
      fetchDashboardData();
    } catch (err: any) {
      toastError('Could not update task status');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Loading your project dashboard...</p>
      </div>
    );
  }

  const totalTasks = stats?.totalTasks || 0;
  const completedTasks = stats?.completedTasks || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statCards = [
    {
      name: 'Total Projects',
      value: stats?.totalProjects || 0,
      icon: FolderKanban,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/60',
      desc: 'All managed projects',
    },
    {
      name: 'Active Projects',
      value: stats?.projectsInProgress || 0,
      icon: Clock,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60',
      desc: 'In-flight initiatives',
    },
    {
      name: 'Total Tasks',
      value: stats?.totalTasks || 0,
      icon: CheckSquare,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      desc: 'Deliverables tracked',
    },
    {
      name: 'Tasks Completed',
      value: stats?.completedTasks || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      desc: `${progressPercent}% velocity rate`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Member'} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Here is a consolidated overview of your team's projects and pending deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="dash-btn-new-task"
            onClick={() => setIsTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            New Task
          </button>
          <button
            id="dash-btn-new-project"
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((item) => (
          <div
            key={item.name}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex items-start justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                {item.name}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{item.value}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{item.desc}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Overall Deliverables Progress</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
              {totalTasks === 0 ? 'No tasks yet' : `${completedTasks} of ${totalTasks} tasks finished`}
            </span>
          </div>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {totalTasks === 0 ? '0%' : `${progressPercent}% complete`}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Dual Column: Recent Projects & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Active Projects</h2>
              </div>
              <Link
                to="/projects"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1"
              >
                All Projects
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-slate-400">
                No active projects.{' '}
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="text-blue-600 dark:text-blue-400 font-medium underline cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((p) => {
                  const tTotal = p.taskCount || 0;
                  const tDone = p.completedTaskCount || 0;
                  const pct = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-lg border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 bg-gray-50/40 dark:bg-slate-800/40 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <Link
                          to={`/tasks?projectId=${p.id}`}
                          className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
                        >
                          {p.name}
                        </Link>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 flex-shrink-0">
                          {pct}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 mb-2">
                        {p.description || 'No description provided.'}
                      </p>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>Keep your project status updated</span>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              + Quick Project
            </button>
          </div>
        </div>

        {/* Priority Deliverables / Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Deliverables</h2>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1"
              >
                All Tasks
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-slate-400">
                No tasks available.{' '}
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="text-blue-600 dark:text-blue-400 font-medium underline cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTasks.map((task) => {
                  const isDone = task.status === 'COMPLETED';
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 transition-colors ${
                        isDone
                          ? 'bg-gray-50/50 dark:bg-slate-800/30 opacity-70'
                          : 'bg-white dark:bg-slate-900 hover:bg-gray-50/60 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => toggleTaskCompletion(task)}
                          className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0 cursor-pointer"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                          ) : (
                            <div className="w-4 h-4 rounded-sm border-2 border-gray-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400 transition-colors" />
                          )}
                        </button>
                        <span
                          className={`text-xs font-medium truncate ${
                            isDone ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-slate-200'
                          }`}
                        >
                          {task.name}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          task.priority === 'HIGH'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : task.priority === 'MEDIUM'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>Toggle check to complete tasks</span>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              + Quick Task
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity / Audit Log Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Workspace Activity</h2>
          </div>
          <span className="text-xs text-gray-400 dark:text-slate-500">Live operational log</span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 dark:text-slate-400">
            No recent actions recorded. When you create or update projects and tasks, events will appear here.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {recentLogs.map((log) => {
              const dateStr = log.created_at
                ? format(new Date(log.created_at), 'MMM d, h:mm a')
                : 'Just now';
              const isProject = log.entity_type === 'PROJECT';
              const isTask = log.entity_type === 'TASK';

              return (
                <div key={log.id} className="p-3.5 px-5 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-[10px] tracking-wide uppercase ${
                        isProject
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
                          : isTask
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800'
                          : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800'
                      }`}
                    >
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="text-gray-700 dark:text-slate-300 font-medium truncate">
                      {log.details || `${log.action} on ${log.entity_type.toLowerCase()}`}
                    </span>
                  </div>
                  <span className="text-gray-400 dark:text-slate-500 whitespace-nowrap text-[11px]">{dateStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Create Project Modal */}
      {isProjectModalOpen && (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsProjectModalOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Quick Create Project</h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickCreateProject} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile App Redesign"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectSubmitting || !projectName.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {projectSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Create Task Modal */}
      {isTaskModalOpen && (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsTaskModalOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Quick Create Task</h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickCreateTask} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Conduct user research"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Project</label>
                <select
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {recentProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting || !taskName.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {taskSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
