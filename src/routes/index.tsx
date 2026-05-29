import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions, useCategories, useBudgets, useProfile, useAccounts } from "@/hooks/use-data";
import { formatMoney, formatDate, monthKey } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { toast } from "sonner";

// Shared AudioContext (created lazily on first user gesture)
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return null;
    if (!_audioCtx) _audioCtx = new Ctx();
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
    return _audioCtx;
  } catch { return null; }
}

function beep(ctx: AudioContext, freq: number, startOffset: number, duration: number, type: OscillatorType, peakGain: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.value = freq;
  const t0 = ctx.currentTime + startOffset;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  o.start(t0);
  o.stop(t0 + duration + 0.02);
}

function playOkBeep(monthLabel: string, surplus: number, currency: string) {
  const ctx = getAudioCtx();
  if (ctx) {
    beep(ctx, 880, 0, 0.18, "sine", 0.35);
    beep(ctx, 1175, 0.18, 0.22, "sine", 0.35);
  }
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const msg = surplus > 0
        ? `Good. In ${monthLabel}, you saved ${formatMoney(surplus, currency)}.`
        : `In ${monthLabel}, no activity recorded.`;
      const u = new SpeechSynthesisUtterance(msg);
      u.rate = 1; u.pitch = 1; u.volume = 1;
      setTimeout(() => window.speechSynthesis.speak(u), 420);
    }
  } catch {}
  toast.success(`${monthLabel}: ${surplus > 0 ? `surplus ${formatMoney(surplus, currency)}` : "no activity"}`);
}

function playExpenseAlert(monthLabel: string, deficit: number, currency: string) {
  const ctx = getAudioCtx();
  if (ctx) {
    beep(ctx, 660, 0, 0.2, "square", 0.4);
    beep(ctx, 520, 0.24, 0.2, "square", 0.4);
    beep(ctx, 660, 0.48, 0.2, "square", 0.4);
  }
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        `Alert. In ${monthLabel}, your expenses are greater than your income by ${formatMoney(deficit, currency)}.`
      );
      u.rate = 1; u.pitch = 1; u.volume = 1;
      setTimeout(() => window.speechSynthesis.speak(u), 700);
    }
  } catch {}
  toast.error(`${monthLabel}: expenses exceed income by ${formatMoney(deficit, currency)}`);
}

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  return (
    <AppShell>
      <Inner />
    </AppShell>
  );
}

function Inner() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: transactions = [], isLoading } = useTransactions(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const { data: budgets = [] } = useBudgets(user?.id);
  const { data: accounts = [] } = useAccounts(user?.id);
  const currency = profile?.currency ?? "USD";

  const { monthIncome, monthExpense, netWorth, areaData, donutData, recent, budgetRows } = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    let mIn = 0, mOut = 0;

    for (const t of transactions) {
      const d = new Date(t.occurred_at);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        if (t.type === "income") mIn += Number(t.amount);
        else mOut += Number(t.amount);
      }
    }

    const start = accounts.reduce((s, a) => s + Number(a.starting_balance), 0);
    const allIn = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const allOut = transactions.filter(t => t.type !== "income").reduce((s, t) => s + Number(t.amount), 0);
    const nw = start + allIn - allOut;

    // 6-month area
    const months: { key: string; label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(thisYear, thisMonth - i, 1);
      months.push({
        key: `${dt.getFullYear()}-${dt.getMonth()}`,
        label: dt.toLocaleDateString("en-US", { month: "short" }),
        income: 0, expense: 0,
      });
    }
    for (const t of transactions) {
      const d = new Date(t.occurred_at);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find(mm => mm.key === k);
      if (!m) continue;
      if (t.type === "income") m.income += Number(t.amount);
      else m.expense += Number(t.amount);
    }

    // Donut by category (expense)
    const byCat = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === "income") continue;
      const d = new Date(t.occurred_at);
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) continue;
      const id = t.category_id ?? "uncategorized";
      byCat.set(id, (byCat.get(id) ?? 0) + Number(t.amount));
    }
    const donut = Array.from(byCat.entries()).map(([id, value]) => {
      const cat = categories.find(c => c.id === id);
      return { name: cat?.name ?? "Uncategorized", value, color: cat?.color ?? "#6b7280" };
    }).sort((a, b) => b.value - a.value);

    // Budgets progress
    const mk = monthKey(now);
    const rows = budgets
      .filter(b => b.month?.startsWith(mk.slice(0, 7)))
      .map(b => {
        const cat = categories.find(c => c.id === b.category_id);
        const spent = transactions.filter(t =>
          t.category_id === b.category_id &&
          t.type !== "income" &&
          new Date(t.occurred_at).getMonth() === thisMonth &&
          new Date(t.occurred_at).getFullYear() === thisYear
        ).reduce((s, t) => s + Number(t.amount), 0);
        return { id: b.id, name: cat?.name ?? "—", color: cat?.color ?? "#10b981", spent, limit: Number(b.amount_limit) };
      });

    return {
      monthIncome: mIn,
      monthExpense: mOut,
      netWorth: nw,
      areaData: months,
      donutData: donut,
      recent: transactions.slice(0, 6),
      budgetRows: rows,
    };
  }, [transactions, categories, budgets, accounts]);

  const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="NET WORTH" value={formatMoney(netWorth, currency)} icon={<Wallet size={14} />} accent="emerald" />
        <MetricCard label="MONTH INCOME" value={formatMoney(monthIncome, currency)} icon={<ArrowUpRight size={14} />} accent="emerald" />
        <MetricCard label="MONTH EXPENSE" value={formatMoney(monthExpense, currency)} icon={<ArrowDownRight size={14} />} accent="crimson" />
        <MetricCard label="SAVINGS RATE" value={`${savingsRate.toFixed(1)}%`} icon={<TrendingUp size={14} />} accent={savingsRate >= 0 ? "emerald" : "crimson"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 border border-border bg-card rounded-md p-4 glow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-mono text-muted-foreground">CASH FLOW · 6M</div>
              <div className="text-sm font-medium mt-0.5">Income vs Expense trajectory</div>
            </div>
          </div>
          <div
            className="h-64 cursor-pointer"
            onClick={() => {
              // Fallback: if click misses a data point, alert on the latest (current) month
              const p = areaData[areaData.length - 1];
              if (!p) return;
              if (p.expense > p.income) playExpenseAlert(p.label, p.expense - p.income, currency);
              else playOkBeep(p.label, p.income - p.expense, currency);
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={areaData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  const p = state?.activePayload?.[0]?.payload as { label: string; income: number; expense: number } | undefined;
                  if (!p) return;
                  if (p.expense > p.income) {
                    playExpenseAlert(p.label, p.expense - p.income, currency);
                  } else {
                    playOkBeep(p.label, p.income - p.expense, currency);
                  }
                }}
              >
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0a0a10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={1.5} fill="url(#gIn)" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={1.5} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[10px] font-mono text-muted-foreground">Tip: tap any month on the chart for an audio status alert.</div>
        </motion.div>

        {/* Donut */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-border bg-card rounded-md p-4 glow-card">
          <div className="text-xs font-mono text-muted-foreground mb-1">THIS MONTH BY CATEGORY</div>
          <div className="text-sm font-medium">Expense allocation</div>
          <div className="h-56 mt-2">
            {donutData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No expenses yet this month</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="#08080c" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0a0a10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} formatter={(v: number) => formatMoney(v, currency)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent */}
        <div className="lg:col-span-2 border border-border bg-card rounded-md p-4">
          <div className="text-xs font-mono text-muted-foreground mb-3">RECENT ACTIVITY</div>
          <div className="space-y-1">
            {isLoading ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="text-xs text-muted-foreground">No transactions yet. Add one with ⌘K.</div>
            ) : recent.map(t => {
              const cat = categories.find(c => c.id === t.category_id);
              const acc = accounts.find(a => a.id === t.account_id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `${cat?.color ?? "#6b7280"}20` }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: cat?.color ?? "#6b7280" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{t.merchant ?? cat?.name ?? "Transaction"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{formatDate(t.occurred_at)} · {acc?.name}</div>
                    </div>
                  </div>
                  <div className={`text-xs font-mono font-medium ${t.type === "income" ? "text-emerald-400" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "−"}{formatMoney(Number(t.amount), currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budgets */}
        <div className="border border-border bg-card rounded-md p-4">
          <div className="text-xs font-mono text-muted-foreground mb-3">BUDGET PROGRESS</div>
          {budgetRows.length === 0 ? (
            <div className="text-xs text-muted-foreground">No budgets set. Visit Budgets to add one.</div>
          ) : (
            <div className="space-y-3">
              {budgetRows.map(b => {
                const pct = Math.min(100, (b.spent / b.limit) * 100);
                const tone = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#10b981";
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-muted-foreground">{b.name}</span>
                      <span style={{ color: tone }}>{formatMoney(b.spent, currency)} / {formatMoney(b.limit, currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full" style={{ background: tone }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: "emerald" | "crimson" | "amber" | "royal" }) {
  const colorMap = { emerald: "text-emerald-400", crimson: "text-red-400", amber: "text-amber-400", royal: "text-violet-400" };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-border bg-card rounded-md p-4 glow-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">{label}</span>
        <span className={colorMap[accent]}>{icon}</span>
      </div>
      <div className="font-mono text-xl font-semibold tabular-nums">{value}</div>
    </motion.div>
  );
}
