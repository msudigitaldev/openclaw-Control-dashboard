import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Cpu, Coins, Activity, Zap, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import api from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7"];

function MetricCard({ label, value, sub, icon: Icon, accent, testid }) {
  return (
    <Card className="glass rounded-xl p-5" data-testid={testid}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">{label}</div>
        <div className="w-8 h-8 rounded-md grid place-items-center" style={{ background: `${accent}1a`, color: accent }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="font-mono-display text-3xl font-extrabold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </Card>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState({});
  const [tokens, setTokens] = useState([]);
  const [costs, setCosts] = useState([]);
  const [latency, setLatency] = useState([]);
  const [range, setRange] = useState("week");

  useEffect(() => {
    api.get("/metrics/summary").then((r) => setSummary(r.data)).catch(() => {});
    api.get(`/metrics/tokens?range=${range}`).then((r) => setTokens(r.data)).catch(() => {});
    api.get(`/metrics/cost?range=${range}`).then((r) => setCosts(r.data)).catch(() => {});
    api.get(`/metrics/latency?range=${range}`).then((r) => setLatency(r.data)).catch(() => {});
  }, [range]);

  const tokenKeys = tokens.length ? Object.keys(tokens[0]).filter((k) => k !== "date") : [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">Telemetry</div>
          <h1 className="font-mono-display text-3xl font-extrabold mt-1">ANALYTICS</h1>
        </div>
        <div className="flex items-center gap-2 glass rounded-md px-3 py-1.5" data-testid="date-range-picker">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="bg-transparent border-0 h-7 w-32 text-sm focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1428] border-white/10 text-white">
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Tokens Used"
          value={`${((summary.tokens_total || 0) / 1000).toFixed(0)}K`}
          sub="across fleet"
          icon={Cpu}
          accent="#3b82f6"
          testid="metric-tokens"
        />
        <MetricCard
          label="Total Cost"
          value={`$${summary.cost_total || 0}`}
          sub={`${range === "week" ? "this week" : "this month"}`}
          icon={Coins}
          accent="#10b981"
          testid="metric-cost"
        />
        <MetricCard
          label="Avg Latency"
          value={`${summary.avg_latency_ms || 0}ms`}
          sub="end-to-end"
          icon={Activity}
          accent="#f59e0b"
          testid="metric-latency"
        />
        <MetricCard
          label="Tasks Done"
          value={summary.tasks_completed || 0}
          sub={`${summary.tasks_failed || 0} failed`}
          icon={Zap}
          accent="#a855f7"
          testid="metric-tasks-done"
        />
      </div>

      {/* Bar chart */}
      <Card className="glass rounded-xl p-5" data-testid="chart-tokens-bar">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">
              Token Usage by Agent
            </div>
            <h3 className="font-mono-display text-lg font-bold mt-1">{range === "week" ? "Last 7 days" : "Last 30 days"}</h3>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tokens}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
              {tokenKeys.map((k, i) => (
                <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === tokenKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <Card className="glass rounded-xl p-5" data-testid="chart-cost-pie">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">Cost Split</div>
          <h3 className="font-mono-display text-lg font-bold mt-1 mb-4">By Agent</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costs} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {costs.map((entry, i) => (
                    <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} stroke="#0a0e1a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Line chart */}
        <Card className="glass rounded-xl p-5" data-testid="chart-latency-line">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">Latency Trend</div>
          <h3 className="font-mono-display text-lg font-bold mt-1 mb-4">p50 · p95 · p99 (ms)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latency}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
