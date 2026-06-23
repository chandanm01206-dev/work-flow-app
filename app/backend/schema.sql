-- Supabase SQL Schema for Freelance OS
-- Run this in the Supabase SQL Editor to create your tables.

CREATE TABLE clients (
    id text PRIMARY KEY,
    name text NOT NULL,
    contact text DEFAULT '',
    notes text DEFAULT '',
    created_at text NOT NULL
);

CREATE TABLE projects (
    id text PRIMARY KEY,
    client_id text REFERENCES clients(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text DEFAULT '',
    start_date text,
    deadline text,
    status text DEFAULT 'active',
    created_at text NOT NULL
);

CREATE TABLE tasks (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text DEFAULT '',
    category text DEFAULT 'personal',
    priority text DEFAULT 'medium',
    due_at text,
    status text DEFAULT 'todo',
    project_id text REFERENCES projects(id) ON DELETE SET NULL,
    "order" double precision NOT NULL,
    created_at text NOT NULL,
    completed_at text
);

CREATE TABLE events (
    id text PRIMARY KEY,
    title text NOT NULL,
    type text DEFAULT 'meeting',
    start_at text NOT NULL,
    end_at text,
    client_id text REFERENCES clients(id) ON DELETE SET NULL,
    project_id text REFERENCES projects(id) ON DELETE SET NULL,
    notes text DEFAULT '',
    reminder_min integer DEFAULT 30,
    created_at text NOT NULL
);

CREATE TABLE habits (
    id text PRIMARY KEY,
    name text NOT NULL,
    emoji text DEFAULT '',
    created_at text NOT NULL
);

CREATE TABLE habit_logs (
    id text PRIMARY KEY,
    habit_id text REFERENCES habits(id) ON DELETE CASCADE,
    date text NOT NULL,
    done boolean DEFAULT true
);

CREATE TABLE daily_focus (
    date text PRIMARY KEY,
    text text DEFAULT ''
);
