import { useEffect, useMemo, useState } from "react";
import { Activity, Cpu, Send, Heart, ListTodo, BotIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/lib/api";
import useMissionWebSocket from "@/lib/ws";

const STATUS_LABEL = {
  active: "ACTIVE",
  thinking: "THINKING",
  idle: "IDLE",
  error: "ERROR",
};

function StatCard({ label, value, sub, icon: Icon, accent, testid }) {
  return (
    <Card className="glass rounded-xl p-5 flex flex-col gap-3 hover:border-white/20 transition-colors" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">
          {label}
        </div>
        <div
          className="w-9 h-9 rounded-md grid place-items-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="font-mono-display text-4xl font-extrabold tracking-tight text-white">
        {value}
      </div>
      <div className="text-xs text-gray-500">{sub}</div>
    </Card>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono-display border bg-status-${status}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {STATUS_LABEL[status] || status.toUpperCase()}
    </span>
  );
}

function PriorityDot({ p }) {
  const map = { high: "bg-red-500", medium: "bg-amber-400", low: "bg-blue-500" };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[p] || "bg-gray-500"}`}></span>;
}

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({ active_tasks: 0, online_agents: 0, system_health: 100, tokens_total: 0, cost_total: 0 });
  const [filter, setFilter] = useState("all");
  const [cmd, setCmd] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "system", text: "Mission Control link established. Issue commands or address an agent (e.g. '@Agent-Coder check CI pipeline')." },
  ]);

  useEffect(() => {
    api.get("/agents").then((r) => setAgents(r.data)).catch(() => {});
    api.get("/tasks").then((r) => setTasks(r.data)).catch(() => {});
    api.get("/metrics/summary").then((r) => setMetrics(r.data)).catch(() => {});
  }, []);

  useMissionWebSocket((evt) => {
    if (evt.type === "agent.status") setAgents(evt.agents);
    if (evt.type === "task.progress") setTasks(evt.tasks);
    if (evt.type === "metrics.update") setMetrics((m) => ({ ...m, ...evt.metrics }));
    if (evt.type === "snapshot") {
      if (evt.agents) setAgents(evt.agents);
      if (evt.tasks) setTasks(evt.tasks);
    }
  });

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const submitCommand = async (e) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    const text = cmd.trim();
    setChatHistory((h) => [...h, { role: "user", text }]);
    setCmd("");

    // Try to route to agent
    const mention = text.match(/@(Agent-[A-Za-z]+)/);
    const target = mention ? agents.find((a) => a.name === mention[1]) : agents[0];
    if (target) {
      try {
        await api.post(`/agents/${target.id}/message`, { content: text });
        setChatHistory((h) => [
          ...h,
          { role: "agent", text: `${target.name} acknowledged. Engaging task...`, agent: target.name },
        ]);
      } catch (_) {
        toast.error("Command dispatch failed");
      }
    }
  };

  const tokenFmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

  return (
    <div className="space-y-6 fade-in">
      {/* Top Stat Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active Tasks"
          value={metrics.active_tasks}
          sub={`${metrics.tasks_completed || 0} completed · ${metrics.tasks_failed || 0} failed`}
          icon={ListTodo}
          accent="#3b82f6"
          testid="stat-active-tasks"
        />
        <StatCard
          label="Online Agents"
          value={`${metrics.online_agents}/${agents.length || metrics.total_agents || 4}`}
          sub="Fleet operational"
          icon={BotIcon}
          accent="#10b981"
          testid="stat-online-agents"
        />
        <StatCard
          label="System Health"
          value={`${metrics.system_health}%`}
          sub={`avg ${metrics.avg_latency_ms || "—"}ms · $${metrics.cost_total || 0}`}
          icon={Heart}
          accent={metrics.system_health >= 80 ? "#10b981" : metrics.system_health >= 50 ? "#f59e0b" : "#ef4444"}
          testid="stat-system-health"
        />
      </div>

      {/* Main Row */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* Live Agent Activity – 60% */}
        <Card className="glass rounded-xl lg:col-span-6 overflow-hidden" data-testid="live-agent-feed">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">
                Live Activity
              </div>
              <h3 className="font-mono-display text-lg font-bold mt-1">Agent Telemetry</h3>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono-display">
              REAL-TIME
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-gray-500 font-mono-display">
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3">Agent</th>
                  <th className="text-left py-3">Model</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Current Task</th>
                  <th className="text-right py-3">Tokens</th>
                  <th className="text-right px-5 py-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]" data-testid={`agent-row-${a.id}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: a.color }}></div>
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="font-mono-term text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-300">
                        {a.model}
                      </span>
                    </td>
                    <td className="py-3"><StatusBadge status={a.status} /></td>
                    <td className="py-3 text-gray-300 max-w-[300px] truncate">{a.current_task}</td>
                    <td className="py-3 text-right font-mono-term text-gray-200">{tokenFmt(a.tokens_used)}</td>
                    <td className="px-5 py-3 text-right font-mono-term text-emerald-400">${a.cost.toFixed(2)}</td>
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">Connecting to fleet...</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Command bar */}
          <div className="border-t border-white/5 p-4 bg-black/20">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-mono-display mb-2">
              Command Input
            </div>
            <form onSubmit={submitCommand} className="flex gap-2">
              <Input
                data-testid="command-input"
                placeholder="Type a command (use @Agent-Name to address)..."
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                className="bg-black/40 border-white/10 font-mono-term focus-visible:ring-blue-500/40"
              />
              <Button data-testid="command-send-btn" type="submit" className="bg-blue-500 hover:bg-blue-400 text-white">
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="mt-3 max-h-28 overflow-y-auto space-y-1 font-mono-term text-[11px]">
              {chatHistory.slice(-4).map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-blue-300" : m.role === "agent" ? "text-emerald-300" : "text-gray-500"}>
                  {m.role === "user" ? "› " : m.role === "agent" ? `[${m.agent}] ` : "» "}
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Task Queue – 40% */}
        <Card className="glass rounded-xl lg:col-span-4 overflow-hidden" data-testid="task-queue-panel">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">
                Task Queue
              </div>
              <h3 className="font-mono-display text-lg font-bold mt-1">{filteredTasks.length} pending</h3>
            </div>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>

          <Tabs value={filter} onValueChange={setFilter} className="px-4 pt-3">
            <TabsList className="bg-white/5 border border-white/5 font-mono-display text-[11px]">
              <TabsTrigger value="all" data-testid="task-filter-all">All</TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="task-filter-active">Active</TabsTrigger>
              <TabsTrigger value="queued" data-testid="task-filter-queued">Queued</TabsTrigger>
              <TabsTrigger value="completed" data-testid="task-filter-done">Done</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="p-4 space-y-2.5 max-h-[460px] overflow-y-auto">
            {filteredTasks.map((t) => {
              const agent = agents.find((a) => a.id === t.agent_id);
              return (
                <div
                  key={t.id}
                  data-testid={`task-card-${t.id}`}
                  className="rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 p-3 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <PriorityDot p={t.priority} />
                      <span className="text-sm truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono-term ml-2 shrink-0">
                      {agent?.name?.replace("Agent-", "") || "—"}
                    </span>
                  </div>
                  <Progress
                    value={t.progress}
                    className="h-1.5 bg-white/5"
                    style={{ "--progress-color": agent?.color || "#3b82f6" }}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-gray-500 font-mono-term uppercase">{t.status.replace("_", " ")}</span>
                    <span className="text-[10px] text-gray-400 font-mono-term">{t.progress}%</span>
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-500">No tasks in this lane.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
