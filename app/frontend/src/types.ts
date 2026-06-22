export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskCategory = "client_work" | "startup" | "learning" | "personal";

export interface Task {
    id: string;
    title: string;
    description?: string;
    category: TaskCategory;
    priority: TaskPriority;
    due_at?: string | null;
    status: TaskStatus;
    project_id?: string | null;
    order?: number;
    created_at: string;
    completed_at?: string | null;
}

export interface Client {
    id: string;
    name: string;
    contact?: string;
    notes?: string;
    created_at: string;
}

export type ProjectStatus = "active" | "delivered" | "on_hold";

export interface Project {
    id: string;
    client_id: string;
    name: string;
    description?: string;
    start_date?: string | null;
    deadline?: string | null;
    status: ProjectStatus;
    created_at: string;
}

export type EventType = "meeting" | "deadline" | "block";

export interface CalendarEvent {
    id: string;
    title: string;
    type: EventType;
    start_at: string;
    end_at?: string | null;
    client_id?: string | null;
    project_id?: string | null;
    notes?: string;
    reminder_min: number;
    created_at: string;
}

export interface Habit {
    id: string;
    name: string;
    emoji?: string;
    created_at: string;
}

export interface HabitLog {
    id: string;
    habit_id: string;
    date: string; // YYYY-MM-DD
    done: boolean;
}