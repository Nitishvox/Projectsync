export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  name: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  projectsInProgress: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: 'PROJECT' | 'TASK' | 'AUTH';
  entity_id?: string;
  details?: string;
  created_at: string;
}

