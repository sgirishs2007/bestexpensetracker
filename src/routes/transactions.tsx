import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions, useCategories, useAccounts, type Transaction } from "@/hooks/use-data";
import { useProfile } from "@/hooks/use-data";
import { TransactionDrawer } from "@/components/transaction-drawer";
import { formatMoney, formatDateTime } from "@/lib/format";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/transactions")({ component: () => <AppShell><TxPage /></AppShell> });

function TxPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: transactions = [] } = useTransactions(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const { data: accounts = [] } = useAccounts(user?.id);
  const currency = profile?.currency ?? "USD";

  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [acc, setAcc] = useState<string>("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return transactions.filter(t => {
      if (type !== "all" && t.type !== type) return false;
      if (cat !== "all" && t.category_id !== cat) return false;
      if (acc !== "all" && t.account_id !== acc) return false;
      if (ql && !(t.merchant?.toLowerCase().includes(ql) || t.note?.toLowerCase().includes(ql))) return false;
      return true;
    });
  }, [transactions, q, type, cat, acc]);

  const openNew = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (t: Transaction) => { setEditing(t); setDrawerOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Transactions</h1>
          <p className="text-xs text-muted-foreground font-mono">{filtered.length} entries</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-500 hover:bg-emerald-400 text-black"><Plus size={14} className="mr-1.5" />New</Button>
      </div>

      <div className="border border-border bg-card rounded-md p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search merchant or note…" className="pl-8 h-8" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={acc} onValueChange={setAcc}>
          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border bg-card rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_140px_120px] md:grid-cols-[1fr_180px_180px_140px_120px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[10px] font-mono text-muted-foreground tracking-wider">
          <div>MERCHANT / NOTE</div>
          <div className="hidden md:block">CATEGORY</div>
          <div>ACCOUNT</div>
          <div>DATE</div>
          <div className="text-right">AMOUNT</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No transactions match the filters.</div>
        ) : filtered.map(t => {
          const c = categories.find(x => x.id === t.category_id);
          const a = accounts.find(x => x.id === t.account_id);
          return (
            <button
              key={t.id}
              onClick={() => openEdit(t)}
              className="w-full grid grid-cols-[1fr_140px_140px_120px] md:grid-cols-[1fr_180px_180px_140px_120px] gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/40 text-left transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{t.merchant ?? "—"}</div>
                {t.note && <div className="text-[10px] text-muted-foreground truncate">{t.note}</div>}
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                {c && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />}
                <span className="text-xs">{c?.name ?? "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{a?.name ?? "—"}</div>
              <div className="text-[11px] font-mono text-muted-foreground">{formatDateTime(t.occurred_at)}</div>
              <div className={`text-right font-mono text-xs font-medium ${t.type === "income" ? "text-emerald-400" : "text-foreground"}`}>
                {t.type === "income" ? "+" : "−"}{formatMoney(Number(t.amount), currency)}
              </div>
            </button>
          );
        })}
      </div>

      <TransactionDrawer open={drawerOpen} onOpenChange={setDrawerOpen} userId={user!.id} editing={editing} />
    </div>
  );
}
