import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  Flag,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  getGetOrganizerSummaryQueryKey,
  getListNotesQueryKey,
  getListTasksQueryKey,
  useCreateNote,
  useCreateTask,
  useDeleteNote,
  useDeleteTask,
  useGetOrganizerSummary,
  useListNotes,
  useListTasks,
  useUpdateNote,
  useUpdateTask,
} from '@workspace/api-client-react';
import type { Note, Task } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();

type TaskPriority = 'low' | 'medium' | 'high';

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (date: string | null | undefined, fallback = 'No date') => {
  if (!date) return fallback;
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parsed);
};

const formatUpdated = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parsed);
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, kind: 'tasks' | 'notes') {
  void queryClient.invalidateQueries({ queryKey: kind === 'tasks' ? getListTasksQueryKey() : getListNotesQueryKey() });
  void queryClient.invalidateQueries({ queryKey: getGetOrganizerSummaryQueryKey() });
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { href: '/', label: 'Today', icon: LayoutDashboard },
    { href: '/notes', label: 'Notes', icon: NotebookPen },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <div className="app-noise min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setMobileOpen(false)} className="group flex items-center gap-3" data-testid="link-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-sidebar-primary-foreground shadow-sm transition-transform duration-200 group-hover:rotate-[-5deg]">
              <Sparkles size={19} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block font-display text-[19px] leading-none tracking-[-0.02em]">Personal</span>
              <span className="mt-1 block font-mono-app text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/55">Organizer</span>
            </span>
          </Link>
          <button type="button" className="rounded-lg p-2 text-sidebar-foreground/60 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu">
            <X size={18} />
          </button>
        </div>

        <div className="mt-14">
          <p className="mb-3 px-3 font-mono-app text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40">Your space</p>
          <nav className="space-y-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200 ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_hsl(var(--accent))]' : 'text-sidebar-foreground/62 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}
                  data-testid={`link-nav-${item.label.toLowerCase()}`}
                >
                  <Icon size={17} strokeWidth={active ? 2.4 : 1.8} />
                  <span className={active ? 'font-semibold' : ''}>{item.label}</span>
                  {active && <ArrowUpRight size={14} className="ml-auto text-accent" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/45 p-4">
          <div className="mb-3 flex items-center gap-2 text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono-app text-[10px] uppercase tracking-[0.16em]">A small reminder</span>
          </div>
          <p className="font-display text-[18px] leading-[1.25] text-sidebar-foreground/90">Make room for what matters next.</p>
          <div className="mt-4 h-px bg-sidebar-border/70" />
          <p className="mt-3 text-[11px] leading-relaxed text-sidebar-foreground/45">A quiet place for the things you want to remember and do.</p>
        </div>
      </aside>

      {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-sidebar/35 backdrop-blur-[2px] md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-overlay-menu" />}
      <main className="min-h-[100dvh] md:pl-[248px]">
        <div className="mx-auto max-w-[1320px] px-5 py-5 sm:px-8 sm:py-8 lg:px-12">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <button type="button" className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground" onClick={() => setMobileOpen(true)} data-testid="button-open-menu">
              <Menu size={20} />
            </button>
            <Link href="/" className="font-display text-[20px]" data-testid="link-mobile-brand">Personal Organizer</Link>
            <span className="h-9 w-9 rounded-full bg-accent/60" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 font-mono-app text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-[clamp(2.6rem,5vw,4.4rem)] leading-[.95] tracking-[-0.045em] text-foreground">{title}</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

function StatStrip({ total, done, open, today, notes }: { total: number; done: number; open: number; today: number; notes: number }) {
  const stats = [
    { label: 'In your orbit', value: total, accent: false },
    { label: 'Finished', value: done, accent: true },
    { label: 'Still open', value: open, accent: false },
    { label: 'Due today', value: today, accent: false },
    { label: 'Notes kept', value: notes, accent: false },
  ];
  return (
    <div className="mb-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-border/80 bg-card sm:grid-cols-5">
      {stats.map((stat, index) => (
        <div key={stat.label} className={`relative px-4 py-4 sm:px-5 ${index > 0 ? 'border-border/80 sm:border-l' : ''} ${index === 4 ? 'col-span-2 sm:col-span-1' : ''}`} data-testid={`stat-${stat.label.toLowerCase().replaceAll(' ', '-')}`}>
          <p className="font-mono-app text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</p>
          <p className={`mt-1 font-display text-3xl ${stat.accent ? 'text-primary' : 'text-foreground'}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

function TaskComposer({ onCreated }: { onCreated: () => void }) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || createTask.isPending) return;
    createTask.mutate({ data: { title: title.trim(), dueDate: dueDate || null, priority } }, {
      onSuccess: () => {
        setTitle('');
        setDueDate('');
        setPriority('medium');
        setExpanded(false);
        onCreated();
      },
    });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border/80 bg-card p-3 shadow-[0_10px_30px_hsl(var(--primary)/.04)]" data-testid="form-quick-add-task">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/45 text-muted-foreground"><Plus size={16} /></span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} onFocus={() => setExpanded(true)} placeholder="What would feel good to finish?" className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60" data-testid="input-quick-task-title" />
        <button type="submit" disabled={!title.trim() || createTask.isPending} className="rounded-lg bg-primary px-3.5 py-2 text-[12px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-create-task">
          {createTask.isPending ? 'Adding…' : 'Add task'}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 pl-11 animate-rise">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CalendarDays size={14} />
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none" data-testid="input-quick-task-date" />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Flag size={13} />
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none" data-testid="select-quick-task-priority">
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
          </label>
          <button type="button" onClick={() => setExpanded(false)} className="ml-auto p-1 text-muted-foreground hover:text-foreground" data-testid="button-collapse-task-options"><X size={14} /></button>
        </div>
      )}
    </form>
  );
}

function TaskRow({ task, onRefresh, onEdit }: { task: Task; onRefresh: () => void; onEdit: (task: Task) => void }) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggle = () => {
    updateTask.mutate({ id: task.id, data: { completed: !task.completed } }, {
      onSuccess: () => {
        invalidateAll(queryClient, 'tasks');
        onRefresh();
      },
    });
  };
  const remove = () => {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    deleteTask.mutate({ id: task.id }, { onSuccess: () => { invalidateAll(queryClient, 'tasks'); onRefresh(); } });
  };

  return (
    <div className={`task-row group relative flex items-center gap-3 border-b border-border/70 py-3.5 last:border-0 ${task.completed ? 'is-complete opacity-60' : ''}`} data-testid={`row-task-${task.id}`}>
      <button type="button" onClick={toggle} disabled={updateTask.isPending} className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${task.completed ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/35 bg-background text-transparent hover:border-primary hover:bg-accent/25'}`} data-testid={`button-toggle-task-${task.id}`}>
        {task.completed ? <Check size={13} strokeWidth={3} className="animate-check" /> : <Circle size={8} fill="currentColor" />}
      </button>
      <button type="button" onClick={() => onEdit(task)} className={`min-w-0 flex-1 text-left text-[14px] ${task.completed ? 'text-muted-foreground line-through decoration-primary/50' : 'text-foreground'}`} data-testid={`button-edit-task-${task.id}`}>
        <span className="block truncate">{task.title}</span>
        <span className="mt-1 flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80">
          {task.dueDate && <><CalendarDays size={11} /> {formatDate(task.dueDate)}</>}
          <span className={`h-1.5 w-1.5 rounded-full ${task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-accent' : 'bg-muted-foreground/45'}`} />
          {task.priority}
        </span>
      </button>
      <div className="relative shrink-0">
        <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-2 text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100" aria-label={`Actions for ${task.title}`} data-testid={`button-task-menu-${task.id}`}>
          <MoreHorizontal size={17} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-10 w-32 rounded-xl border border-border bg-popover p-1.5 shadow-lg animate-rise">
            <button type="button" onClick={() => { setMenuOpen(false); onEdit(task); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted" data-testid={`button-menu-edit-task-${task.id}`}><Pencil size={13} /> Edit</button>
            <button type="button" onClick={remove} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-destructive hover:bg-destructive/10" data-testid={`button-menu-delete-task-${task.id}`}><Trash2 size={13} /> Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskEditor({ task, onClose, onSaved }: { task: Task | null; onClose: () => void; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const [title, setTitle] = useState(task?.title ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  if (!task) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    updateTask.mutate({ id: task.id, data: { title: title.trim(), dueDate: dueDate || null, priority } }, {
      onSuccess: () => { invalidateAll(queryClient, 'tasks'); onSaved(); onClose(); },
    });
  };
  return (
    <Modal title="Refine this task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" data-testid="form-edit-task">
        <label className="block text-xs font-semibold text-foreground">Task title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" data-testid="input-edit-task-title" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-foreground">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs outline-none" data-testid="input-edit-task-date" /></label>
          <label className="block text-xs font-semibold text-foreground">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs outline-none" data-testid="select-edit-task-priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        </div>
        <ModalActions onClose={onClose} loading={updateTask.isPending} label="Save task" />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/20 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" data-testid="dialog-modal">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={onClose} data-testid="button-close-dialog-overlay" />
      <div className="relative z-10 w-full max-w-md rounded-t-[26px] border border-border bg-card p-6 shadow-2xl sm:rounded-[26px] animate-rise">
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-display text-2xl tracking-[-0.03em]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-close-dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, loading, label }: { onClose: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
      <button type="button" onClick={onClose} className="rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-cancel-dialog">Cancel</button>
      <button type="submit" disabled={loading} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-save-dialog">{loading ? 'Saving…' : label}</button>
    </div>
  );
}

function TodayPage() {
  const queryClient = useQueryClient();
  const tasksQuery = useListTasks();
  const notesQuery = useListNotes();
  const summaryQuery = useGetOrganizerSummary();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const tasks = tasksQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const summary = summaryQuery.data;
  const dateText = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const dueTodayCount = tasks.filter((task) => task.dueDate?.slice(0, 10) === todayKey()).length;
  const todayTasks = useMemo(() => tasks.filter((task) => !task.completed || task.dueDate?.slice(0, 10) === todayKey()), [tasks]);
  const openTasks = useMemo(() => todayTasks.filter((task) => !task.completed), [todayTasks]);
  const completedToday = todayTasks.filter((task) => task.completed && task.dueDate?.slice(0, 10) === todayKey()).length;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetOrganizerSummaryQueryKey() });
  };

  return (
    <>
      <PageHeading eyebrow={dateText} title={`${greeting()}, friend.`} subtitle="A clear little view of what is asking for your attention today." action={<div className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-accent" /><span className="font-mono-app text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Your space is ready</span></div>} />
      <StatStrip total={summary?.totalTasks ?? tasks.length} done={summary?.completedTasks ?? tasks.filter((task) => task.completed).length} open={summary?.openTasks ?? tasks.filter((task) => !task.completed).length} today={summary?.todayTasks ?? dueTodayCount} notes={summary?.totalNotes ?? notes.length} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.8fr)]">
        <section className="min-w-0 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 animate-rise" data-testid="section-today-tasks">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div><p className="font-mono-app text-[10px] uppercase tracking-[0.2em] text-muted-foreground">The near horizon</p><h2 className="mt-1 font-display text-3xl tracking-[-0.04em]">Today</h2></div>
            <span className="rounded-full bg-accent/20 px-2.5 py-1 font-mono-app text-[10px] text-foreground">{completedToday} / {todayTasks.length} done</span>
          </div>
          <TaskComposer onCreated={refresh} />
          <div className="mt-5">
            {tasksQuery.isLoading ? <TaskSkeleton /> : tasksQuery.isError ? <ErrorState label="Your tasks could not be loaded." onRetry={() => void tasksQuery.refetch()} /> : todayTasks.length === 0 ? <EmptyTasks /> : todayTasks.map((task) => <TaskRow key={task.id} task={task} onRefresh={refresh} onEdit={setEditingTask} />)}
          </div>
          {todayTasks.length > 0 && openTasks.length === 0 && <div className="mt-5 flex items-center gap-3 rounded-xl bg-accent/20 px-4 py-3 text-sm text-primary animate-rise"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary"><Check size={15} strokeWidth={3} /></span><span><strong>That’s the whole list.</strong> Let the rest of the day be yours.</span></div>}
        </section>
        <aside className="space-y-6">
          <ProgressCard completed={summary?.completedTasks ?? tasks.filter((task) => task.completed).length} total={summary?.totalTasks ?? tasks.length} />
          <NotesPeek notes={notes} loading={notesQuery.isLoading} />
        </aside>
      </div>
      {editingTask && <TaskEditor task={editingTask} onClose={() => setEditingTask(null)} onSaved={refresh} />}
    </>
  );
}

function TaskSkeleton() {
  return <div className="space-y-5 py-3" data-testid="loading-tasks">{[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3 animate-pulse"><span className="h-[22px] w-[22px] rounded-full bg-muted" /><span className="h-3 w-3/5 rounded bg-muted" /></div>)}</div>;
}

function EmptyTasks() {
  return <div className="my-7 rounded-2xl border border-dashed border-border bg-background/50 px-5 py-9 text-center" data-testid="empty-tasks"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/25 text-primary"><Sparkles size={18} /></div><p className="font-display text-xl">A quiet slate.</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Add the first thing you would like to move gently forward today.</p></div>;
}

function ErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-center" data-testid="status-error"><p className="text-sm text-destructive">{label}</p><button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold underline underline-offset-4" data-testid="button-retry">Try again</button></div>;
}

function ProgressCard({ completed, total }: { completed: number; total: number }) {
  const progress = total ? Math.round((completed / total) * 100) : 0;
  return <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground animate-rise animate-rise-delay-1" data-testid="card-daily-progress"><div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border-[22px] border-accent/15" /><div className="relative"><p className="font-mono-app text-[10px] uppercase tracking-[0.2em] text-primary-foreground/55">Daily progress</p><div className="mt-5 flex items-end justify-between"><span className="font-display text-6xl leading-none">{progress}<small className="ml-1 text-2xl">%</small></span><span className="pb-1 text-right text-xs text-primary-foreground/60">{completed} of {total}<br />commitments met</span></div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${progress}%` }} /></div><p className="mt-4 text-xs leading-relaxed text-primary-foreground/65">{progress === 100 ? 'A satisfying finish. You made space.' : progress > 50 ? 'The shape of the day is coming together.' : 'One small step is still a step.'}</p></div></div>;
}

function NotesPeek({ notes, loading }: { notes: Note[]; loading: boolean }) {
  return <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 animate-rise animate-rise-delay-2" data-testid="section-notes-peek"><div className="mb-5 flex items-center justify-between"><div><p className="font-mono-app text-[10px] uppercase tracking-[0.2em] text-muted-foreground">From the notebook</p><h2 className="mt-1 font-display text-2xl tracking-[-0.03em]">Recent notes</h2></div><Link href="/notes" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open all notes" data-testid="link-see-notes"><ArrowUpRight size={17} /></Link></div>{loading ? <div className="space-y-3 animate-pulse"><div className="h-4 w-3/4 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" /><div className="h-3 w-2/3 rounded bg-muted" /></div> : notes.length === 0 ? <p className="rounded-xl bg-background px-4 py-5 text-sm text-muted-foreground">Your notebook is open when you are.</p> : <div className="space-y-1">{notes.slice(0, 3).map((note) => <Link href="/notes" key={note.id} className="block rounded-xl px-3 py-3 transition-colors hover:bg-muted" data-testid={`card-recent-note-${note.id}`}><div className="flex items-baseline justify-between gap-2"><h3 className="truncate text-sm font-semibold">{note.title}</h3><span className="shrink-0 font-mono-app text-[9px] text-muted-foreground">{formatUpdated(note.updatedAt)}</span></div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{note.body}</p></Link>)}</div>}</section>;
}

function NoteEditor({ note, onClose, onSaved }: { note: Note | null; onClose: () => void; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const updateNote = useUpdateNote();
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  if (!note) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    updateNote.mutate({ id: note.id, data: { title: title.trim(), body: body.trim() } }, { onSuccess: () => { invalidateAll(queryClient, 'notes'); onSaved(); onClose(); } });
  };
  return <Modal title="Shape the note" onClose={onClose}><form onSubmit={submit} className="space-y-4" data-testid="form-edit-note"><label className="block text-xs font-semibold">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" data-testid="input-edit-note-title" /></label><label className="block text-xs font-semibold">Note<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary" data-testid="textarea-edit-note-body" /></label><ModalActions onClose={onClose} loading={updateNote.isPending} label="Save note" /></form></Modal>;
}

function NoteComposer({ onCreated }: { onCreated: () => void }) {
  const createNote = useCreateNote();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    createNote.mutate({ data: { title: title.trim(), body: body.trim() } }, { onSuccess: () => { setTitle(''); setBody(''); onCreated(); } });
  };
  return <form onSubmit={submit} className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6" data-testid="form-create-note"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/30 text-primary"><NotebookPen size={17} /></span><div><p className="font-mono-app text-[10px] uppercase tracking-[0.16em] text-muted-foreground">New entry</p><p className="font-display text-xl">Put it somewhere safe.</p></div></div><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A thought worth keeping" className="mb-2.5 w-full border-b border-border bg-transparent pb-2 text-[15px] font-semibold outline-none placeholder:text-muted-foreground/50 focus:border-primary" data-testid="input-create-note-title" /><textarea required value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a little or a lot…" rows={4} className="w-full resize-none bg-transparent py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50" data-testid="textarea-create-note-body" /><div className="mt-3 flex justify-end"><button type="submit" disabled={createNote.isPending || !title.trim() || !body.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40" data-testid="button-create-note"><Plus size={14} /> {createNote.isPending ? 'Saving…' : 'Keep note'}</button></div></form>;
}

function NotesPage() {
  const queryClient = useQueryClient();
  const notesQuery = useListNotes();
  const deleteNote = useDeleteNote();
  const [search, setSearch] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const notes = notesQuery.data ?? [];
  const visibleNotes = useMemo(() => notes.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(search.toLowerCase())), [notes, search]);
  const refresh = () => invalidateAll(queryClient, 'notes');
  const remove = (note: Note) => {
    if (!window.confirm(`Delete “${note.title}”?`)) return;
    deleteNote.mutate({ id: note.id }, { onSuccess: refresh });
  };
  return <><PageHeading eyebrow="The notebook" title="Notes" subtitle="Loose thoughts, useful details, and the things you do not want to lose." action={<button type="button" onClick={() => document.querySelector<HTMLInputElement>('[data-testid="input-create-note-title"]')?.focus()} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-focus-new-note"><Plus size={15} /> New note</button>} /><div className="grid gap-6 xl:grid-cols-[minmax(290px,.72fr)_minmax(0,1.5fr)]"><div><NoteComposer onCreated={refresh} /></div><section className="min-w-0 rounded-2xl border border-border/80 bg-card p-5 sm:p-6" data-testid="section-notes-list"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-mono-app text-[10px] uppercase tracking-[0.18em] text-muted-foreground">All entries</p><p className="mt-1 text-xs text-muted-foreground">{visibleNotes.length} {visibleNotes.length === 1 ? 'note' : 'notes'} in view</p></div><label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-xs text-muted-foreground sm:w-52"><Search size={14} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60" data-testid="input-search-notes" /></label></div>{notesQuery.isLoading ? <div className="space-y-4 animate-pulse">{[1, 2, 3].map((item) => <div key={item} className="rounded-xl bg-muted p-4"><div className="h-3 w-1/3 rounded bg-muted-foreground/15" /><div className="mt-3 h-3 w-full rounded bg-muted-foreground/15" /><div className="mt-2 h-3 w-4/5 rounded bg-muted-foreground/15" /></div>)}</div> : notesQuery.isError ? <ErrorState label="Your notes could not be loaded." onRetry={() => void notesQuery.refetch()} /> : visibleNotes.length === 0 ? <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center" data-testid="empty-notes"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/25 text-primary"><Search size={18} /></div><p className="font-display text-xl">{search ? 'Nothing matches yet.' : 'The page is blank on purpose.'}</p><p className="mt-1 text-xs text-muted-foreground">{search ? 'Try another phrase or clear your search.' : 'Start with the thought that keeps circling back.'}</p></div> : <div className="grid gap-3 sm:grid-cols-2">{visibleNotes.map((note, index) => <article key={note.id} className={`group relative rounded-xl border border-border/75 bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md ${index === 0 ? 'sm:col-span-2 sm:p-5' : ''}`} data-testid={`card-note-${note.id}`}><div className="flex items-start justify-between gap-3"><div><p className="font-mono-app text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{formatUpdated(note.updatedAt)}</p><h2 className="mt-1 font-display text-xl leading-tight tracking-[-0.02em]">{note.title}</h2></div><div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100"><button type="button" onClick={() => setEditingNote(note)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit ${note.title}`} data-testid={`button-edit-note-${note.id}`}><Pencil size={14} /></button><button type="button" onClick={() => remove(note)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${note.title}`} data-testid={`button-delete-note-${note.id}`}><Trash2 size={14} /></button></div></div><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{note.body}</p></article>)}</div>}</section></div>{editingNote && <NoteEditor note={editingNote} onClose={() => setEditingNote(null)} onSaved={refresh} />}</>;
}

function SettingsPage() {
  const [compact, setCompact] = useState(() => localStorage.getItem('organizer-compact') === 'true');
  const [weekStart, setWeekStart] = useState(() => localStorage.getItem('organizer-week') ?? 'monday');
  const [saved, setSaved] = useState(false);
  const save = () => { localStorage.setItem('organizer-compact', String(compact)); localStorage.setItem('organizer-week', weekStart); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  return <><PageHeading eyebrow="A few preferences" title="Settings" subtitle="Keep this space feeling like yours. These choices stay on this device." /><div className="max-w-2xl space-y-5"><section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7" data-testid="section-settings-preferences"><div className="mb-6"><p className="font-mono-app text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Display</p><h2 className="mt-1 font-display text-2xl">Make it comfortable</h2></div><div className="divide-y divide-border/70"><label className="flex cursor-pointer items-center justify-between gap-4 py-4 first:pt-0"><span><span className="block text-sm font-semibold">Compact task rows</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Fit a little more into your Today view.</span></span><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} className="h-5 w-5 accent-primary" data-testid="checkbox-compact-rows" /></label><label className="flex items-center justify-between gap-4 py-4"><span><span className="block text-sm font-semibold">Week begins on</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Used when dates become part of your planning rhythm.</span></span><select value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none" data-testid="select-week-start"><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label></div><div className="mt-5 flex items-center justify-end gap-3 border-t border-border/70 pt-5">{saved && <span className="flex items-center gap-1.5 text-xs text-primary animate-rise"><Check size={14} /> Saved on this device</span>}<button type="button" onClick={save} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-save-settings">Save preferences</button></div></section><section className="rounded-2xl border border-border/80 bg-secondary/35 p-5 sm:p-7" data-testid="section-settings-about"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/35 text-primary"><Sparkles size={17} /></span><div><p className="font-display text-xl">A softer way to stay on top of things.</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Personal Organizer is intentionally small: tasks for the doing, notes for the thinking, and Today for the gentle nudge between them.</p></div></div></section></div></>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch><Route path="/" component={TodayPage} /><Route path="/notes" component={NotesPage} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;