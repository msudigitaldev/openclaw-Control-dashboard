import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Skull, Send, Compass, Cpu, Coins, Clock, Activity, X } from "lucide-react";
import api from "@/lib/api";
import useMissionWebSocket from "@/lib/ws";
import { toast } from "sonner";

const STATUS_LABEL = { active: "ACTIVE", thinking: "THINKING", idle: "IDLE", error: "ERROR" };

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono-display border bg-status-${status}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {STATUS_LABEL[status] || status?.toUpperCase()}
    </span>
  );
}

function AgentCard({ agent, onOpen }) {
  return (
    <Card
      data-testid={`agent-card-${agent.id}`}
      className="glass rounded-xl p-5 cursor-pointer hover:border-white/20 hover:-translate-y-0.5 transition-all"
      onClick={() => onOpen(agent)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-md grid place-items-center font-mono-display font-bold text-sm"
            style={{ background: `${agent.color}22`, color: agent.color, border: `1px solid ${agent.color}55` }}
          >
            {agent.name.replace("Agent-", "").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white">{agent.name}</div>
            <div className="font-mono-term text-[11px] text-gray-400">{agent.model}</div>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="text-xs text-gray-400 mb-4 line-clamp-2 min-h-[2.5em]">
        » {agent.current_task}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
        <div>
          <div className="text-[10px] uppercase text-gray-500 font-mono-display">Tokens</div>
          <div className="font-mono-term text-sm text-white">{(agent.tokens_used / 1000).toFixed(1)}K</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-gray-500 font-mono-display">Cost</div>
          <div className="font-mono-term text-sm text-emerald-400">${agent.cost.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-gray-500 font-mono-display">Success</div>
          <div className="font-mono-term text-sm text-white">{agent.success_rate}%</div>
        </div>
      </div>
    </Card>
  );
}

function AgentDetailPanel({ agent, onClose, agents }) {
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState("");
  const termRef = useRef(null);

  useEffect(() => {
    if (!agent) return;
    api.get(`/agents/${agent.id}/logs`).then((r) => setLogs(r.data)).catch(() => {});
  }, [agent]);

  useMissionWebSocket((evt) => {
    if (!agent) return;
    if (evt.type === "log.entry" && evt.log?.agent_id === agent.id) {
      setLogs((prev) => [...prev.slice(-120), evt.log]);
    }
  });

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  if (!agent) return null;

  // Get latest version from live list
  const live = agents.find((a) => a.id === agent.id) || agent;

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    try {
      await api.post(`/agents/${agent.id}/message`, { content: msg });
      toast.success(`Message delivered to ${agent.name}`);
      setMsg("");
    } catch (_) {
      toast.error("Failed");
    }
  };

  const steer = async () => {
    try {
      await api.post(`/agents/${agent.id}/message`, { content: "STEER: refocus on highest priority task" });
      toast.success(`${agent.name} steered`);
    } catch (_) { toast.error("Steer failed"); }
  };

  const kill = async () => {
    try {
      await api.post(`/agents/${agent.id}/kill`, {});
      toast.success(`${agent.name} terminated`);
    } catch (_) { toast.error("Kill failed"); }
  };

  return (
    <Sheet open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="!w-full sm:!max-w-2xl bg-[#0a0e1a] border-l border-white/10 text-white p-0 overflow-y-auto"
      >
        <SheetHeader className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-md grid place-items-center font-mono-display font-bold"
                style={{ background: `${live.color}22`, color: live.color, border: `1px solid ${live.color}55` }}
              >
                {live.name.replace("Agent-", "").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <SheetTitle className="font-mono-display text-2xl font-extrabold text-white">{live.name}</SheetTitle>
                <div className="font-mono-term text-xs text-gray-400">{live.model}</div>
              </div>
            </div>
            <StatusBadge status={live.status} />
          </div>
        </SheetHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6">
          {[
            { l: "Tokens", v: `${(live.tokens_used / 1000).toFixed(1)}K`, i: Cpu, c: "#3b82f6" },
            { l: "Cost", v: `$${live.cost.toFixed(2)}`, i: Coins, c: "#10b981" },
            { l: "Uptime", v: `${Math.floor(live.uptime_seconds / 60)}m`, i: Clock, c: "#f59e0b" },
            { l: "Latency", v: `${live.avg_latency_ms}ms`, i: Activity, c: "#a855f7" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-lg p-3" data-testid={`agent-stat-${s.l.toLowerCase()}`}>
              <div className="flex items-center justify-between mb-1">
                <s.i className="w-3.5 h-3.5" style={{ color: s.c }} />
                <span className="text-[10px] uppercase text-gray-500 font-mono-display">{s.l}</span>
              </div>
              <div className="font-mono-display text-xl font-bold">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="px-6 flex gap-2 flex-wrap">
          <form onSubmit={sendMessage} className="flex flex-1 gap-2 min-w-[260px]">
            <Input
              data-testid="agent-message-input"
              placeholder="Send a message..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="bg-white/5 border-white/10 font-mono-term"
            />
            <Button data-testid="agent-message-send-btn" type="submit" className="bg-blue-500 hover:bg-blue-400 text-white">
              <Send className="w-4 h-4 mr-1.5" /> Message
            </Button>
          </form>
          <Button
            data-testid="agent-steer-btn"
            variant="outline"
            onClick={steer}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
          >
            <Compass className="w-4 h-4 mr-1.5" /> Steer
          </Button>
          <Button
            data-testid="agent-kill-btn"
            variant="outline"
            onClick={kill}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
          >
            <Skull className="w-4 h-4 mr-1.5" /> Kill
          </Button>
        </div>

        {/* Action timeline */}
        <div className="px-6 mt-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display mb-3">
            Action Timeline
          </div>
          <div className="space-y-2">
            {logs.slice(-5).reverse().map((l) => (
              <div key={l.id} className="flex gap-3 text-xs">
                <span className="text-gray-500 font-mono-term">{new Date(l.timestamp).toLocaleTimeString()}</span>
                <span className="text-gray-300">{l.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live terminal */}
        <div className="px-6 my-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">
              Live Terminal
            </div>
            <div className="text-[10px] text-emerald-500 font-mono-term">● STREAMING</div>
          </div>
          <div
            ref={termRef}
            data-testid="agent-terminal"
            className="terminal rounded-lg p-4 h-72 overflow-y-auto"
          >
            {logs.length === 0 && <div className="text-emerald-700">Waiting for stream...</div>}
            {logs.map((l) => (
              <div key={l.id} className={`term-line-${l.level} slide-in`}>
                <span className="text-emerald-700">[{new Date(l.timestamp).toLocaleTimeString()}]</span>{" "}
                {l.message}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api.get("/agents").then((r) => setAgents(r.data)).catch(() => {});
  }, []);

  useMissionWebSocket((evt) => {
    if (evt.type === "agent.status") setAgents(evt.agents);
    if (evt.type === "snapshot" && evt.agents) setAgents(evt.agents);
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">Fleet</div>
          <h1 className="font-mono-display text-3xl font-extrabold mt-1">AGENTS</h1>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono-display">
          {agents.length} DEPLOYED
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} onOpen={setActive} />
        ))}
      </div>

      <AgentDetailPanel agent={active} onClose={() => setActive(null)} agents={agents} />
    </div>
  );
}
