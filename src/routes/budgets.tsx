import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useBudgets, useCategories, useTransactions, useUpsertBudget, useDeleteBudget, useProfile } from "@/hooks/use-data";
import { formatMoney, monthKey } from "@/lib/format";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/budgets")({ component: () => <AppShell><BudgetsPage /></AppShell> });

function BudgetsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: budgets = [] } = useBudgets(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const { data: transactions = [] } = useTransactions(user?.id);
  const upsert = useUpsertBudget(user?.id);
  const del = useDeleteBudget(user?.id);
  const currency = profile?.currency ?? "USD";

  const [open, setOpen] = useState(false);
  const [catId, setCatId] = useState<string>("");
  const [amount, setAmount] = useState("");

  const now = new Date();
  const mk = monthKey(now);

  const rows = useMemo(() => {
    return budgets
      .filter(b => b.month?.startsWith(mk.slice(0, 7)))
      .map(b => {
        const cat = categories.find(c => c.id === b.category_id);
        const spent = transactions
          .filter(t => t.category_id === b.category_id && t.type !== "income"
            && new Date(t.occurred_at).getMonth() === now.getMonth()
            && new Date(t.occurred_at).getFullYear() === now.getFullYear())
          .reduce((s, t) => s + Number(t.amount), 0);
        return { ...b, cat, spent, limit: Number(b.amount_limit) };
      });
  }, [budgets, categories, transactions, mk]);

  const expenseCategories = categories.filter(c => c.kind === "expense");

  const submit = async () => {
    const a = parseFloat(amount);
    if (!catId || !a || a <= 0) return toast.error("Pick a category and amount");
    try {
      await upsert.mutateAsync({ category_id: catId, amount_limit: a, month: mk, user_id: user!.id });
      toast.success("Budget saved");
      setOpen(false); setAmount(""); setCatId("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Budgets</h1>
          <p className="text-xs text-muted-foreground font-mono">{now.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-black"><Plus size={14} className="mr-1.5" />New budget</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New monthly budget</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={catId} onValueChange={setCatId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Monthly limit</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="font-mono" />
              </div>
              <Button onClick={submit} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black">Save budget</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <div className="border border-border bg-card rounded-md p-8 text-center text-xs text-muted-foreground">
          No budgets for this month yet. Add one to start tracking limits.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(r => {
            const pct = Math.min(100, (r.spent / r.limit) * 100);
            const over = r.spent > r.limit;
            const tone = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#10b981";
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-border bg-card rounded-md p-4 glow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.cat?.color }} />
                      <div className="text-sm font-medium">{r.cat?.name ?? "—"}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">MONTHLY LIMIT</div>
                  </div>
                  <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="font-mono text-lg" style={{ color: tone }}>{formatMoney(r.spent, currency)}</span>
                    <span className="font-mono text-xs text-muted-foreground">/ {formatMoney(r.limit, currency)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full" style={{ background: tone }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                    <span>{pct.toFixed(0)}% used</span>
                    <span style={{ color: over ? "#ef4444" : undefined }}>
                      {over ? `Over by ${formatMoney(r.spent - r.limit, currency)}` : `${formatMoney(r.limit - r.spent, currency)} left`}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
