import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Activity } from "lucide-react";
import api from "@/lib/api";
import useMissionWebSocket from "@/lib/ws";
import { toast } from "sonner";

const COLUMNS = [
  { key: "queued", label: "Queued", color: "#6b7280", testid: "col-queued" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6", testid: "col-in-progress" },
  { key: "completed", label: "Completed", color: "#10b981", testid: "col-completed" },
  { key: "failed", label: "Failed", color: "#ef4444", testid: "col-failed" },
];

function PriorityPill({ p }) {
  const map = {
    high: "bg-red-500/15 text-red-400 border-red-500/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono-display uppercase ${map[p]}`}>{p}</span>
  );
}

function TaskCard({ task, agent, onClick, onDelete }) {
  return (
    <div
      data-testid={`kanban-card-${task.id}`}
      onClick={() => onClick(task)}
      className="glass rounded-lg p-3 cursor-pointer hover:border-white/20 hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-medium leading-snug">{task.title}</div>
        <button
          data-testid={`kanban-delete-${task.id}`}
          onClick={(e) => { e.stopPropagation(); onDelete(task); }}
          className="text-gray-500 hover:text-red-400 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between mb-2.5">
        <PriorityPill p={task.priority} />
        <span className="text-[10px] text-gray-500 font-mono-term">{agent?.name?.replace("Agent-", "") || "—"}</span>
      </div>
      <Progress value={task.progress} className="h-1 bg-white/5" />
      <div className="text-[10px] text-gray-500 mt-1 font-mono-term">{task.progress}%</div>
    </div>
  );
}

function NewTaskDialog({ agents, onCreate }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [agentId, setAgentId] = useState("");
  const [priority, setPriority] = useState("medium");

  const submit = async () => {
    if (!title || !agentId) return toast.error("Provide title and agent");
    try {
      await onCreate({ title, agent_id: agentId, priority });
      setOpen(false);
      setTitle("");
    } catch (_) { toast.error("Create failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="new-task-btn" className="bg-blue-500 hover:bg-blue-400 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono-display text-xl">DISPATCH NEW TASK</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-gray-400">Title</Label>
            <Input
              data-testid="new-task-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 mt-1"
              placeholder="e.g. Summarise pull request #4421"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-gray-400">Assign Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger data-testid="new-task-agent-select" className="bg-white/5 border-white/10 mt-1">
                <SelectValue placeholder="Choose an operator..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1428] border-white/10 text-white">
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} · {a.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-gray-400">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="new-task-priority-select" className="bg-white/5 border-white/10 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1428] border-white/10 text-white">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="new-task-submit-btn" onClick={submit} className="bg-blue-500 hover:bg-blue-400 text-white">
            Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskLogDialog({ task, agent, onClose }) {
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white max-w-2xl">
        {task && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono-display text-xl">{task.title}</DialogTitle>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <PriorityPill p={task.priority} />
                <span className="text-gray-400">Agent: {agent?.name || "—"}</span>
                <span className="text-gray-400">Status: {task.status.replace("_", " ")}</span>
              </div>
            </DialogHeader>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase text-gray-500 font-mono-display">Progress</span>
                <span className="text-xs font-mono-term">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-2 bg-white/5" />
            </div>
            <div className="terminal rounded-md h-64 overflow-y-auto p-3" data-testid="task-log-terminal">
              {(task.log && task.log.length) ? task.log.map((l, i) => (
                <div key={i}>{l}</div>
              )) : (
                <>
                  <div>[init] task accepted</div>
                  <div>[plan] decomposing into 4 sub-steps</div>
                  <div>[exec] step 1/4 complete</div>
                  <div>[exec] step 2/4 in progress…</div>
                  <div>[info] checkpoint saved at {task.progress}%</div>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [active, setActive] = useState(null);

  const refresh = () => {
    api.get("/tasks").then((r) => setTasks(r.data)).catch(() => {});
  };

  useEffect(() => {
    refresh();
    api.get("/agents").then((r) => setAgents(r.data)).catch(() => {});
  }, []);

  useMissionWebSocket((evt) => {
    if (evt.type === "task.progress") setTasks(evt.tasks);
    if (evt.type === "agent.status") setAgents(evt.agents);
    if (evt.type === "snapshot") {
      if (evt.tasks) setTasks(evt.tasks);
      if (evt.agents) setAgents(evt.agents);
    }
  });

  const create = async (body) => {
    const r = await api.post("/tasks", body);
    setTasks((t) => [...t, r.data]);
    toast.success("Task dispatched");
  };

  const remove = async (task) => {
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks((t) => t.filter((x) => x.id !== task.id));
      toast.success("Task removed");
    } catch (_) { toast.error("Delete failed"); }
  };

  const counts = COLUMNS.reduce((acc, c) => {
    acc[c.key] = tasks.filter((t) => t.status === c.key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">Operations</div>
          <h1 className="font-mono-display text-3xl font-extrabold mt-1">TASK BOARD</h1>
        </div>
        <NewTaskDialog agents={agents} onCreate={create} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="glass rounded-xl p-4" data-testid={col.testid}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: col.color }}></span>
                <div className="font-mono-display text-xs uppercase tracking-wider">{col.label}</div>
              </div>
              <span className="text-xs text-gray-500 font-mono-term">{counts[col.key] || 0}</span>
            </div>
            <div className="space-y-2.5 min-h-[120px]">
              {tasks
                .filter((t) => t.status === col.key)
                .map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    agent={agents.find((a) => a.id === t.agent_id)}
                    onClick={setActive}
                    onDelete={remove}
                  />
                ))}
              {counts[col.key] === 0 && (
                <div className="text-center text-xs text-gray-600 py-6 font-mono-term">— empty —</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskLogDialog
        task={active}
        agent={active && agents.find((a) => a.id === active.agent_id)}
        onClose={() => setActive(null)}
      />
    </div>
  );
}
