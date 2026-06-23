-- Supabase SQL Schema for Freelance OS with Users
-- Run this in the Supabase SQL Editor to create your tables.

-- WARNING: Running this script will DROP existing tables and data!
DROP TABLE IF EXISTS daily_focus CASCADE;
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id text PRIMARY KEY,
    username text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    token text UNIQUE,
    created_at text NOT NULL
);

CREATE TABLE clients (
    id text PRIMARY KEY,
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact text DEFAULT '',
    notes text DEFAULT '',
    created_at text NOT NULL
);

CREATE TABLE projects (
    id text PRIMARY KEY,
    user_id text REFERENCES users(id) ON DELETE CASCADE,
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
    user_id text REFERENCES users(id) ON DELETE CASCADE,
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
    user_id text REFERENCES users(id) ON DELETE CASCADE,
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
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    emoji text DEFAULT '',
    created_at text NOT NULL
);

CREATE TABLE habit_logs (
    id text PRIMARY KEY,
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    habit_id text REFERENCES habits(id) ON DELETE CASCADE,
    date text NOT NULL,
    done boolean DEFAULT true
);

CREATE TABLE daily_focus (
    id text PRIMARY KEY,
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    date text NOT NULL,
    text text DEFAULT '',
    UNIQUE(user_id, date)
);

-- We disable RLS on all tables to ensure the simple token-based FastAPI auth works without issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_focus DISABLE ROW LEVEL SECURITY;
