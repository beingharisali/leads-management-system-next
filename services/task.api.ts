import http, { getErrorMessage } from "./http";

/* ===================== TYPES ===================== */

export type TaskStatus = "todo" | "in_progress" | "blocked" | "submitted" | "completed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high";
export type TeamRole = "csr" | "staff";

export interface Workflow {
  key: string;
  label: string;
  checklist: string[];
}

export interface TaskMeta {
  workflows: Workflow[];
  statuses: TaskStatus[];
  priorities: TaskPriority[];
}

export interface TeamMember {
  _id: string;
  name: string;
  email?: string;
  role: TeamRole;
  status: "active" | "inactive";
}

export interface UserRef {
  _id: string;
  name: string;
  role?: string;
  email?: string;
}

// A task as it appears in lists
export interface TaskSummary {
  _id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  scheduledFor: string; // "YYYY-MM-DD"
  dueAt: string;
  requiresApproval: boolean;
  blockedReason?: string;
  assignedTo: UserRef;
  createdBy?: UserRef;
  // Added by the team member for themselves
  selfAssigned?: boolean;
  missedDeadline: boolean;
  isOverdue: boolean;
  recurring: boolean;
  checklistDone: number;
  checklistTotal: number;
  submissionCount: number;
  lastSubmittedAt?: string;
  lastDecision?: "pending" | "approved" | "rejected" | "auto";
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  _id: string;
  text: string;
  done: boolean;
  doneAt?: string;
}

export interface ProofFile {
  _id: string;
  name: string;
  mimeType?: string;
  size?: number;
  resourceType: "image" | "raw";
  url: string;
}

export interface Submission {
  _id: string;
  note: string;
  files: ProofFile[];
  submittedBy?: UserRef;
  submittedAt: string;
  late: boolean;
  decision: "pending" | "approved" | "rejected" | "auto";
  reviewNote?: string;
  reviewedBy?: UserRef;
  reviewedAt?: string;
}

export interface HistoryEntry {
  action: string;
  by?: UserRef;
  at: string;
  note?: string;
}

export interface TaskDetail extends Omit<TaskSummary, "checklistDone" | "checklistTotal" | "submissionCount" | "recurring"> {
  description: string;
  checklist: ChecklistItem[];
  submissions: Submission[];
  history: HistoryEntry[];
  recurringTask?: string;
  startedAt?: string;
}

export interface TaskListResponse {
  data: TaskSummary[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface TaskFilters {
  scope?: "open" | "history" | "all";
  assignedTo?: string;
  category?: string;
  status?: string;
  overdue?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

export interface WorkloadRow {
  _id: string;
  name: string;
  role: TeamRole;
  status: "active" | "inactive";
  open: number;
  dueToday: number;
  overdue: number;
  blocked: number;
  awaitingApproval: number;
  completedThisWeek: number;
  completedLateThisWeek: number;
}

export interface WorkflowRow {
  key: string;
  label: string;
  open: number;
  overdue: number;
  blocked: number;
  completedLast30Days: number;
  checklistDone: number;
  checklistTotal: number;
}

export interface TaskDashboard {
  summary: {
    open: number;
    overdue: number;
    blocked: number;
    pendingApprovals: number;
    dueToday: number;
    completedThisWeek: number;
  };
  overdueTasks: TaskSummary[];
  blockedTasks: TaskSummary[];
  pendingApprovals: TaskSummary[];
  workload: WorkloadRow[];
  workflows: WorkflowRow[];
}

export interface TaskInput {
  title: string;
  description?: string;
  category: string;
  priority: TaskPriority;
  assignedTo: string | string[];
  scheduledFor: string;
  dueAt: string;
  requiresApproval: boolean;
  checklist?: { _id?: string; text: string }[];
}

// A team member's task for themselves (always assigned to them, always approved by the admin)
export type OwnTaskInput = Omit<TaskInput, "assignedTo" | "requiresApproval">;

export type Frequency = "daily" | "weekly" | "monthly";

export interface RecurringTask {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  checklist: string[];
  requiresApproval: boolean;
  assignedTo: UserRef & { status?: string };
  frequency: Frequency;
  weekday?: number;
  dayOfMonth?: number;
  // daily: weekdays with no task (0 = Sunday). Older templates may only have skipSundays.
  skipWeekdays?: number[];
  skipSundays: boolean;
  dueTime: string;
  startDate: string;
  endDate?: string;
  active: boolean;
}

export interface RecurringInput {
  title: string;
  description?: string;
  category: string;
  priority: TaskPriority;
  checklist?: string[];
  requiresApproval: boolean;
  assignedTo: string;
  frequency: Frequency;
  weekday?: number;
  dayOfMonth?: number;
  skipWeekdays?: number[];
  skipSundays?: boolean;
  dueTime: string;
  startDate?: string;
  endDate?: string | null;
  active?: boolean;
}

export interface AppNotification {
  _id: string;
  type: "task_assigned" | "task_overdue" | "task_submitted" | "task_approved" | "task_rejected" | "task_blocked" | "task_cancelled" | "task_self_created";
  message: string;
  task?: string;
  read: boolean;
  createdAt: string;
}

/* ===================== HELPERS ===================== */

const wrap = async <T,>(fn: () => Promise<T>, fallback: string): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    throw new Error(getErrorMessage(err, fallback));
  }
};

/* ===================== TASKS ===================== */

export const getTaskMeta = () =>
  wrap(async () => (await http.get("/tasks/meta")).data.data as TaskMeta, "Failed to load task settings");

export const getTeam = () =>
  wrap(async () => (await http.get("/tasks/team")).data.data as TeamMember[], "Failed to load the team");

export const getTasks = (filters: TaskFilters = {}) =>
  wrap(async () => {
    const params: Record<string, string | number> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === false) return;
      params[k] = v === true ? "1" : (v as string | number);
    });
    const res = await http.get("/tasks", { params });
    return { data: res.data.data, pagination: res.data.pagination } as TaskListResponse;
  }, "Failed to load tasks");

export const getTask = (id: string) =>
  wrap(async () => (await http.get(`/tasks/${id}`)).data.data as TaskDetail, "Failed to load the task");

export const getTaskDashboard = () =>
  wrap(async () => (await http.get("/tasks/dashboard")).data.data as TaskDashboard, "Failed to load the dashboard");

export const createTask = (input: TaskInput) =>
  wrap(async () => (await http.post("/tasks", input)).data.data as TaskSummary[], "Failed to create the task");

export const createOwnTask = (input: OwnTaskInput) =>
  wrap(async () => (await http.post("/tasks/self", input)).data.data as TaskSummary, "Failed to add the task");

export const updateTask = (id: string, input: Partial<TaskInput>) =>
  wrap(async () => (await http.patch(`/tasks/${id}`, input)).data.data, "Failed to update the task");

export const cancelTask = (id: string, reason: string) =>
  wrap(async () => (await http.post(`/tasks/${id}/cancel`, { reason })).data.data, "Failed to cancel the task");

export const updateTaskProgress = (id: string, action: "start" | "block" | "unblock", reason?: string) =>
  wrap(async () => (await http.patch(`/tasks/${id}/progress`, { action, reason })).data.data, "Failed to update the task");

export const toggleChecklistItem = (id: string, itemId: string, done: boolean) =>
  wrap(async () => (await http.patch(`/tasks/${id}/checklist/${itemId}`, { done })).data.data, "Failed to update the checklist");

export const submitTask = (id: string, note: string, files: File[]) =>
  wrap(async () => {
    const form = new FormData();
    form.append("note", note);
    files.forEach((f) => form.append("files", f));
    // Uploads can take longer than the default 15s timeout
    return (await http.post(`/tasks/${id}/submit`, form, { timeout: 120000 })).data.data;
  }, "Failed to submit the task");

export const reviewTask = (id: string, decision: "approve" | "reject", note: string) =>
  wrap(async () => (await http.post(`/tasks/${id}/review`, { decision, note })).data.data, "Failed to save the review");

/* ===================== REPEATING TASKS ===================== */

export const getRecurringTasks = () =>
  wrap(async () => (await http.get("/tasks/recurring")).data.data as RecurringTask[], "Failed to load repeating tasks");

export const createRecurringTask = (input: RecurringInput) =>
  wrap(async () => (await http.post("/tasks/recurring", input)).data as { data: RecurringTask; createdToday: boolean }, "Failed to create the repeating task");

export const updateRecurringTask = (id: string, input: Partial<RecurringInput>) =>
  wrap(async () => (await http.patch(`/tasks/recurring/${id}`, input)).data.data as RecurringTask, "Failed to update the repeating task");

export const deleteRecurringTask = (id: string) =>
  wrap(async () => (await http.delete(`/tasks/recurring/${id}`)).data, "Failed to remove the repeating task");

/* ===================== NOTIFICATIONS ===================== */

export const getNotifications = () =>
  wrap(async () => (await http.get("/notifications")).data.data as { items: AppNotification[]; unread: number }, "Failed to load notifications");

export const markNotificationRead = (id: string) =>
  wrap(async () => (await http.patch(`/notifications/${id}/read`)).data, "Failed to update notification");

export const markAllNotificationsRead = () =>
  wrap(async () => (await http.patch("/notifications/read-all")).data, "Failed to update notifications");
