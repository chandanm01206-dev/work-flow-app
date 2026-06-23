"""Personal Freelance OS — FastAPI backend with Supabase.

Single-user, no auth. All collections use string `id`s (UUIDs).
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
import uuid
import hashlib
import secrets
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)

supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

app = FastAPI(title="Freelance OS API")
api_router = APIRouter(prefix="/api")


# ---------- helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    salt = "freelance_os_"
    return hashlib.sha256((salt + password).encode()).hexdigest()

def get_current_user(request: Request) -> str:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid token")
    token = auth.split(" ")[1]
    res = supabase.table("users").select("id").eq("token", token).execute()
    if not res.data:
        raise HTTPException(401, "Invalid token")
    return res.data[0]["id"]


# ---------- Models ----------
class RegisterIn(BaseModel):
    username: str
    password: str

class LoginIn(BaseModel):
    username: str
    password: str

class AuthOut(BaseModel):
    token: str

TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["high", "medium", "low"]
TaskCategory = Literal["client_work", "startup", "learning", "personal"]


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = ""
    category: TaskCategory = "personal"
    priority: TaskPriority = "medium"
    due_at: Optional[str] = None
    status: TaskStatus = "todo"
    project_id: Optional[str] = None
    order: Optional[float] = None


class Task(TaskIn):
    id: str
    created_at: str
    completed_at: Optional[str] = None


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TaskCategory] = None
    priority: Optional[TaskPriority] = None
    due_at: Optional[str] = None
    status: Optional[TaskStatus] = None
    project_id: Optional[str] = None
    order: Optional[float] = None


class ClientIn(BaseModel):
    name: str
    contact: Optional[str] = ""
    notes: Optional[str] = ""


class ClientOut(ClientIn):
    id: str
    created_at: str


ProjectStatus = Literal["active", "delivered", "on_hold"]


class ProjectIn(BaseModel):
    client_id: str
    name: str
    description: Optional[str] = ""
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    status: ProjectStatus = "active"


class ProjectOut(ProjectIn):
    id: str
    created_at: str


EventType = Literal["meeting", "deadline", "block"]


class EventIn(BaseModel):
    title: str
    type: EventType = "meeting"
    start_at: str
    end_at: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    notes: Optional[str] = ""
    reminder_min: int = 30


class EventOut(EventIn):
    id: str
    created_at: str


class HabitIn(BaseModel):
    name: str
    emoji: Optional[str] = ""


class HabitOut(HabitIn):
    id: str
    created_at: str


class HabitLogIn(BaseModel):
    habit_id: str
    date: str  # YYYY-MM-DD
    done: bool = True


class HabitLogOut(HabitLogIn):
    id: str


class DailyFocus(BaseModel):
    date: str  # YYYY-MM-DD
    text: str = ""


# ---------- Auth ----------
@api_router.post("/auth/register", response_model=AuthOut)
def register(body: RegisterIn):
    existing = supabase.table("users").select("id").eq("username", body.username).execute()
    if existing.data:
        raise HTTPException(400, "Username already exists")
    
    token = secrets.token_hex(32)
    user_id = new_id()
    doc = {
        "id": user_id,
        "username": body.username,
        "password_hash": hash_password(body.password),
        "token": token,
        "created_at": now_iso()
    }
    supabase.table("users").insert(doc).execute()
    return {"token": token}

@api_router.post("/auth/login", response_model=AuthOut)
def login(body: LoginIn):
    res = supabase.table("users").select("*").eq("username", body.username).execute()
    if not res.data:
        raise HTTPException(401, "Invalid username or password")
    user = res.data[0]
    if user["password_hash"] != hash_password(body.password):
        raise HTTPException(401, "Invalid username or password")
    
    token = secrets.token_hex(32)
    supabase.table("users").update({"token": token}).eq("id", user["id"]).execute()
    return {"token": token}


# ---------- Tasks ----------
@api_router.get("/tasks", response_model=List[Task])
def list_tasks(status: Optional[TaskStatus] = None, category: Optional[TaskCategory] = None, user_id: str = Depends(get_current_user)):
    query = supabase.table("tasks").select("*").eq("user_id", user_id).order("order")
    if status:
        query = query.eq("status", status)
    if category:
        query = query.eq("category", category)
    res = query.execute()
    return res.data


@api_router.post("/tasks", response_model=Task)
def create_task(body: TaskIn, user_id: str = Depends(get_current_user)):
    doc = body.model_dump()
    doc["user_id"] = user_id
    if doc.get("order") is None:
        doc["order"] = datetime.now(timezone.utc).timestamp() * 1000
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    doc["completed_at"] = None
    res = supabase.table("tasks").insert(doc).execute()
    return res.data[0]


@api_router.patch("/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, body: TaskPatch, user_id: str = Depends(get_current_user)):
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if patch.get("status") == "done":
        patch["completed_at"] = now_iso()
    elif "status" in patch and patch["status"] != "done":
        patch["completed_at"] = None
    res = supabase.table("tasks").update(patch).eq("id", task_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Task not found")
    return res.data[0]


@api_router.delete("/tasks/{task_id}")
def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


class ReorderBody(BaseModel):
    ids: List[str]


@api_router.post("/tasks/reorder")
def reorder_tasks(body: ReorderBody, user_id: str = Depends(get_current_user)):
    for idx, tid in enumerate(body.ids):
        supabase.table("tasks").update({"order": float(idx)}).eq("id", tid).eq("user_id", user_id).execute()
    return {"ok": True}


# ---------- Clients ----------
@api_router.get("/clients", response_model=List[ClientOut])
def list_clients(user_id: str = Depends(get_current_user)):
    res = supabase.table("clients").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data


@api_router.post("/clients", response_model=ClientOut)
def create_client(body: ClientIn, user_id: str = Depends(get_current_user)):
    doc = body.model_dump()
    doc["user_id"] = user_id
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    res = supabase.table("clients").insert(doc).execute()
    return res.data[0]


@api_router.patch("/clients/{cid}", response_model=ClientOut)
def update_client(cid: str, body: ClientIn, user_id: str = Depends(get_current_user)):
    res = supabase.table("clients").update(body.model_dump()).eq("id", cid).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Client not found")
    return res.data[0]


@api_router.delete("/clients/{cid}")
def delete_client(cid: str, user_id: str = Depends(get_current_user)):
    supabase.table("clients").delete().eq("id", cid).eq("user_id", user_id).execute()
    return {"ok": True}


# ---------- Projects ----------
@api_router.get("/projects", response_model=List[ProjectOut])
def list_projects(client_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    query = supabase.table("projects").select("*").eq("user_id", user_id).order("created_at", desc=True)
    if client_id:
        query = query.eq("client_id", client_id)
    res = query.execute()
    return res.data


@api_router.post("/projects", response_model=ProjectOut)
def create_project(body: ProjectIn, user_id: str = Depends(get_current_user)):
    doc = body.model_dump()
    doc["user_id"] = user_id
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    res = supabase.table("projects").insert(doc).execute()
    return res.data[0]


@api_router.patch("/projects/{pid}", response_model=ProjectOut)
def update_project(pid: str, body: ProjectIn, user_id: str = Depends(get_current_user)):
    res = supabase.table("projects").update(body.model_dump()).eq("id", pid).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Project not found")
    return res.data[0]


@api_router.delete("/projects/{pid}")
def delete_project(pid: str, user_id: str = Depends(get_current_user)):
    supabase.table("projects").delete().eq("id", pid).eq("user_id", user_id).execute()
    return {"ok": True}


# ---------- Events ----------
@api_router.get("/events", response_model=List[EventOut])
def list_events(user_id: str = Depends(get_current_user)):
    res = supabase.table("events").select("*").eq("user_id", user_id).order("start_at").execute()
    return res.data


@api_router.post("/events", response_model=EventOut)
def create_event(body: EventIn, user_id: str = Depends(get_current_user)):
    doc = body.model_dump()
    doc["user_id"] = user_id
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    res = supabase.table("events").insert(doc).execute()
    return res.data[0]


@api_router.patch("/events/{eid}", response_model=EventOut)
def update_event(eid: str, body: EventIn, user_id: str = Depends(get_current_user)):
    res = supabase.table("events").update(body.model_dump()).eq("id", eid).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Event not found")
    return res.data[0]


@api_router.delete("/events/{eid}")
def delete_event(eid: str, user_id: str = Depends(get_current_user)):
    supabase.table("events").delete().eq("id", eid).eq("user_id", user_id).execute()
    return {"ok": True}


# ---------- Habits ----------
@api_router.get("/habits", response_model=List[HabitOut])
def list_habits(user_id: str = Depends(get_current_user)):
    res = supabase.table("habits").select("*").eq("user_id", user_id).order("created_at").execute()
    return res.data


@api_router.post("/habits", response_model=HabitOut)
def create_habit(body: HabitIn, user_id: str = Depends(get_current_user)):
    count_res = supabase.table("habits").select("id", count="exact").eq("user_id", user_id).execute()
    if count_res.count and count_res.count >= 7:
        raise HTTPException(400, "Max 7 habits — keep the list short on purpose.")
    doc = body.model_dump()
    doc["user_id"] = user_id
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    res = supabase.table("habits").insert(doc).execute()
    return res.data[0]


@api_router.patch("/habits/{hid}", response_model=HabitOut)
def update_habit(hid: str, body: HabitIn, user_id: str = Depends(get_current_user)):
    res = supabase.table("habits").update(body.model_dump()).eq("id", hid).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Habit not found")
    return res.data[0]


@api_router.delete("/habits/{hid}")
def delete_habit(hid: str, user_id: str = Depends(get_current_user)):
    supabase.table("habits").delete().eq("id", hid).eq("user_id", user_id).execute()
    return {"ok": True}


@api_router.get("/habit-logs", response_model=List[HabitLogOut])
def list_habit_logs(start: Optional[str] = None, end: Optional[str] = None, user_id: str = Depends(get_current_user)):
    query = supabase.table("habit_logs").select("*").eq("user_id", user_id)
    if start:
        query = query.gte("date", start)
    if end:
        query = query.lte("date", end)
    res = query.execute()
    return res.data


@api_router.post("/habit-logs/toggle", response_model=HabitLogOut)
def toggle_habit_log(body: HabitLogIn, user_id: str = Depends(get_current_user)):
    existing = supabase.table("habit_logs").select("*").eq("habit_id", body.habit_id).eq("date", body.date).eq("user_id", user_id).execute()
    if existing.data:
        log = existing.data[0]
        if log["done"]:
            supabase.table("habit_logs").delete().eq("id", log["id"]).execute()
            log["done"] = False
            return log
        supabase.table("habit_logs").update({"done": True}).eq("id", log["id"]).execute()
        log["done"] = True
        return log
    doc = body.model_dump()
    doc["user_id"] = user_id
    doc["id"] = new_id()
    doc["done"] = True
    res = supabase.table("habit_logs").insert(doc).execute()
    return res.data[0]


# ---------- Daily Focus ----------
@api_router.get("/daily-focus/{day}", response_model=DailyFocus)
def get_focus(day: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("daily_focus").select("*").eq("user_id", user_id).eq("date", day).execute()
    if res.data:
        return res.data[0]
    return {"date": day, "text": ""}


@api_router.put("/daily-focus/{day}", response_model=DailyFocus)
def set_focus(day: str, body: DailyFocus, user_id: str = Depends(get_current_user)):
    payload = {
        "id": f"{user_id}_{day}",
        "user_id": user_id,
        "date": day, 
        "text": body.text
    }
    supabase.table("daily_focus").upsert(payload).execute()
    return payload


# ---------- Export / Import ----------
@api_router.get("/export")
def export_all(user_id: str = Depends(get_current_user)):
    collections = ["tasks", "clients", "projects", "events", "habits", "habit_logs", "daily_focus"]
    out: Dict[str, Any] = {"exported_at": now_iso(), "version": 1}
    for c in collections:
        res = supabase.table(c).select("*").eq("user_id", user_id).execute()
        out[c] = res.data
    return out


@api_router.post("/import")
def import_all(payload: Dict[str, Any], user_id: str = Depends(get_current_user)):
    collections = ["tasks", "clients", "projects", "events", "habits", "habit_logs", "daily_focus"]
    for c in collections:
        if c in payload and isinstance(payload[c], list):
            supabase.table(c).delete().eq("user_id", user_id).execute()
            if payload[c]:
                # Force user_id on all imported records
                for record in payload[c]:
                    record["user_id"] = user_id
                supabase.table(c).insert(payload[c]).execute()
    return {"ok": True}


@api_router.get("/")
def root():
    return {"app": "Freelance OS", "ok": True}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)