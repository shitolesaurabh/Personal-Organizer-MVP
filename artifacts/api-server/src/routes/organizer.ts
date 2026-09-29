import { Router, type IRouter } from "express";
import { asc, count, eq, sql } from "drizzle-orm";
import { db, notesTable, tasksTable } from "@workspace/db";
import {
  CreateNoteBody,
  CreateTaskBody,
  DeleteNoteParams,
  DeleteTaskParams,
  GetOrganizerSummaryResponse,
  ListNotesResponse,
  ListTasksResponse,
  UpdateNoteBody,
  UpdateNoteParams,
  UpdateTaskBody,
  UpdateTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const taskResponse = (task: typeof tasksTable.$inferSelect) => ({
  ...task,
  createdAt: task.createdAt.toISOString(),
});

const noteResponse = (note: typeof notesTable.$inferSelect) => ({
  ...note,
  updatedAt: note.updatedAt.toISOString(),
});

let seedPromise: Promise<void> | null = null;

async function seedIfEmpty(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const [{ taskCount }] = await db.select({ taskCount: count() }).from(tasksTable);
    if (Number(taskCount) === 0) {
      await db.insert(tasksTable).values([
        { title: "Set up your Today list", completed: false, priority: "high" },
        { title: "Take a real lunch break", completed: false, priority: "medium" },
        { title: "Review the week", completed: true, priority: "low" },
      ]);
    }

    const [{ noteCount }] = await db.select({ noteCount: count() }).from(notesTable);
    if (Number(noteCount) === 0) {
      await db.insert(notesTable).values([
        { title: "A small beginning", body: "Capture one thing you want to remember here." },
        { title: "Ideas to revisit", body: "A quiet place for thoughts that are not tasks yet." },
      ]);
    }
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });

  return seedPromise;
}

router.get("/tasks", async (_req, res): Promise<void> => {
  await seedIfEmpty();
  const tasks = await db.select().from(tasksTable).orderBy(asc(tasksTable.completed), asc(tasksTable.createdAt));
  res.json(ListTasksResponse.parse(tasks.map(taskResponse)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    title: parsed.data.title,
    dueDate: parsed.data.dueDate ?? null,
    priority: parsed.data.priority ?? "medium",
  }).returning();
  res.status(201).json(taskResponse(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(taskResponse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/notes", async (_req, res): Promise<void> => {
  await seedIfEmpty();
  const notes = await db.select().from(notesTable).orderBy(sql`${notesTable.updatedAt} desc`);
  res.json(ListNotesResponse.parse(notes.map(noteResponse)));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db.insert(notesTable).values(parsed.data).returning();
  res.status(201).json(noteResponse(note));
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db.update(notesTable).set(parsed.data).where(eq(notesTable.id, params.data.id)).returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(noteResponse(note));
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db.delete(notesTable).where(eq(notesTable.id, params.data.id)).returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/organizer/summary", async (_req, res): Promise<void> => {
  await seedIfEmpty();
  const [taskTotals] = await db.select({
    totalTasks: count(),
    completedTasks: sql<number>`count(*) filter (where ${tasksTable.completed} = true)`,
    todayTasks: sql<number>`count(*) filter (where ${tasksTable.dueDate} = current_date and ${tasksTable.completed} = false)`,
  }).from(tasksTable);
  const [noteTotals] = await db.select({ totalNotes: count() }).from(notesTable);
  res.json(GetOrganizerSummaryResponse.parse({
    totalTasks: Number(taskTotals.totalTasks),
    completedTasks: Number(taskTotals.completedTasks),
    openTasks: Number(taskTotals.totalTasks) - Number(taskTotals.completedTasks),
    todayTasks: Number(taskTotals.todayTasks),
    totalNotes: Number(noteTotals.totalNotes),
  }));
});

export default router;