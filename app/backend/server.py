"""Personal Freelance OS — FastAPI backend.

Single-user, no auth. All collections store UUID `id` strings (not ObjectId).
All responses exclude Mongo's `_id`.
"""

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, APIRouter, HTTPException
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone, date
from typing import List, Optional, Literal, Dict, Any
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Freelance OS API")
api_router = APIRouter(prefix="/api")


# ---------- helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def strip_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


# ---------- Models ----------
TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["high", "medium", "low"]
TaskCategory = Literal["client_work", "startup", "learning", "personal"]


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = ""
    category: TaskCategory = "personal"
    priority: TaskPriority = "medium"
    due_at: Optional[str] = None  # ISO date/time
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
    start_at: str  # ISO
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


# ---------- Tasks ----------
@api_router.get("/tasks", response_model=List[Task])
async def list_tasks(status: Optional[TaskStatus] = None, category: Optional[TaskCategory] = None):
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    if category:
        q["category"] = category
    docs = await db.tasks.find(q, {"_id": 0}).sort("order", 1).to_list(5000)
    return docs


@api_router.post("/tasks", response_model=Task)
async def create_task(body: TaskIn):
    doc = body.model_dump()
    # default order = current epoch ms so new items append at the end
    if doc.get("order") is None:
        doc["order"] = datetime.now(timezone.utc).timestamp() * 1000
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    doc["completed_at"] = None
    await db.tasks.insert_one(doc.copy())
    return strip_id(doc)


@api_router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, body: TaskPatch):
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if patch.get("status") == "done":
        patch["completed_at"] = now_iso()
    elif "status" in patch and patch["status"] != "done":
        patch["completed_at"] = None
    res = await db.tasks.find_one_and_update(
        {"id": task_id}, {"$set": patch}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Task not found")
    return res


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    res = await db.tasks.delete_one({"id": task_id})
    if not res.deleted_count:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


class ReorderBody(BaseModel):
    ids: List[str]  # ordered list, top first


@api_router.post("/tasks/reorder")
async def reorder_tasks(body: ReorderBody):
    for idx, tid in enumerate(body.ids):
        await db.tasks.update_one({"id": tid}, {"$set": {"order": float(idx)}})
    return {"ok": True}


# ---------- Clients ----------
@api_router.get("/clients", response_model=List[ClientOut])
async def list_clients():
    return await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)


@api_router.post("/clients", response_model=ClientOut)
async def create_client(body: ClientIn):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.clients.insert_one(doc.copy())
    return strip_id(doc)


@api_router.patch("/clients/{cid}", response_model=ClientOut)
async def update_client(cid: str, body: ClientIn):
    res = await db.clients.find_one_and_update(
        {"id": cid}, {"$set": body.model_dump()}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Client not found")
    return res


@api_router.delete("/clients/{cid}")
async def delete_client(cid: str):
    await db.clients.delete_one({"id": cid})
    await db.projects.delete_many({"client_id": cid})
    return {"ok": True}


# ---------- Projects ----------
@api_router.get("/projects", response_model=List[ProjectOut])
async def list_projects(client_id: Optional[str] = None):
    q: Dict[str, Any] = {}
    if client_id:
        q["client_id"] = client_id
    return await db.projects.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)


@api_router.post("/projects", response_model=ProjectOut)
async def create_project(body: ProjectIn):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.projects.insert_one(doc.copy())
    return strip_id(doc)


@api_router.patch("/projects/{pid}", response_model=ProjectOut)
async def update_project(pid: str, body: ProjectIn):
    res = await db.projects.find_one_and_update(
        {"id": pid}, {"$set": body.model_dump()}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Project not found")
    return res


@api_router.delete("/projects/{pid}")
async def delete_project(pid: str):
    await db.projects.delete_one({"id": pid})
    return {"ok": True}


# ---------- Events ----------
@api_router.get("/events", response_model=List[EventOut])
async def list_events():
    return await db.events.find({}, {"_id": 0}).sort("start_at", 1).to_list(5000)


@api_router.post("/events", response_model=EventOut)
async def create_event(body: EventIn):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.events.insert_one(doc.copy())
    return strip_id(doc)


@api_router.patch("/events/{eid}", response_model=EventOut)
async def update_event(eid: str, body: EventIn):
    res = await db.events.find_one_and_update(
        {"id": eid}, {"$set": body.model_dump()}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Event not found")
    return res


@api_router.delete("/events/{eid}")
async def delete_event(eid: str):
    await db.events.delete_one({"id": eid})
    return {"ok": True}


# ---------- Habits ----------
@api_router.get("/habits", response_model=List[HabitOut])
async def list_habits():
    return await db.habits.find({}, {"_id": 0}).sort("created_at", 1).to_list(50)


@api_router.post("/habits", response_model=HabitOut)
async def create_habit(body: HabitIn):
    count = await db.habits.count_documents({})
    if count >= 7:
        raise HTTPException(400, "Max 7 habits — keep the list short on purpose.")
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.habits.insert_one(doc.copy())
    return strip_id(doc)


@api_router.patch("/habits/{hid}", response_model=HabitOut)
async def update_habit(hid: str, body: HabitIn):
    res = await db.habits.find_one_and_update(
        {"id": hid}, {"$set": body.model_dump()}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Habit not found")
    return res


@api_router.delete("/habits/{hid}")
async def delete_habit(hid: str):
    await db.habits.delete_one({"id": hid})
    await db.habit_logs.delete_many({"habit_id": hid})
    return {"ok": True}


@api_router.get("/habit-logs", response_model=List[HabitLogOut])
async def list_habit_logs(start: Optional[str] = None, end: Optional[str] = None):
    q: Dict[str, Any] = {}
    if start or end:
        q["date"] = {}
        if start:
            q["date"]["$gte"] = start
        if end:
            q["date"]["$lte"] = end
    return await db.habit_logs.find(q, {"_id": 0}).to_list(20000)


@api_router.post("/habit-logs/toggle", response_model=HabitLogOut)
async def toggle_habit_log(body: HabitLogIn):
    existing = await db.habit_logs.find_one(
        {"habit_id": body.habit_id, "date": body.date}, {"_id": 0}
    )
    if existing:
        if existing["done"]:
            await db.habit_logs.delete_one({"id": existing["id"]})
            existing["done"] = False
            return existing
        await db.habit_logs.update_one({"id": existing["id"]}, {"$set": {"done": True}})
        existing["done"] = True
        return existing
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["done"] = True
    await db.habit_logs.insert_one(doc.copy())
    return strip_id(doc)


# ---------- Daily Focus ----------
@api_router.get("/daily-focus/{day}", response_model=DailyFocus)
async def get_focus(day: str):
    doc = await db.daily_focus.find_one({"date": day}, {"_id": 0})
    return doc or {"date": day, "text": ""}


@api_router.put("/daily-focus/{day}", response_model=DailyFocus)
async def set_focus(day: str, body: DailyFocus):
    payload = {"date": day, "text": body.text}
    await db.daily_focus.update_one({"date": day}, {"$set": payload}, upsert=True)
    return payload


# ---------- Export / Import ----------
@api_router.get("/export")
async def export_all():
    collections = ["tasks", "clients", "projects", "events", "habits", "habit_logs", "daily_focus"]
    out: Dict[str, Any] = {"exported_at": now_iso(), "version": 1}
    for c in collections:
        out[c] = await db[c].find({}, {"_id": 0}).to_list(50000)
    return out


@api_router.post("/import")
async def import_all(payload: Dict[str, Any]):
    collections = ["tasks", "clients", "projects", "events", "habits", "habit_logs", "daily_focus"]
    for c in collections:
        if c in payload and isinstance(payload[c], list):
            await db[c].delete_many({})
            if payload[c]:
                await db[c].insert_many([{**doc} for doc in payload[c]])
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"app": "Freelance OS", "ok": True}


# Middleware must be added before include_router so it wraps all routes
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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()