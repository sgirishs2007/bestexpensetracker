import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useAccounts, useCategories, useUpsertAccount, useUpsertCategory, useDeleteAccount, useDeleteCategory, useProfile } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/manage")({ component: () => <AppShell><ManagePage /></AppShell> });

const SWATCHES = ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#eab308"];

function ManagePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: accounts = [] } = useAccounts(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const upsertAcc = useUpsertAccount(user?.id);
  const upsertCat = useUpsertCategory(user?.id);
  const delAcc = useDeleteAccount(user?.id);
  const delCat = useDeleteCategory(user?.id);
  const currency = profile?.currency ?? "USD";

  // Account dialog state
  const [accOpen, setAccOpen] = useState(false);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("bank");
  const [accColor, setAccColor] = useState(SWATCHES[0]);
  const [accBalance, setAccBalance] = useState("0");

  // Category dialog state
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catKind, setCatKind] = useState<"expense" | "income">("expense");
  const [catColor, setCatColor] = useState(SWATCHES[0]);

  const saveAccount = async () => {
    if (!accName) return toast.error("Name required");
    try {
      await upsertAcc.mutateAsync({
        name: accName, type: accType, color: accColor,
        starting_balance: parseFloat(accBalance) || 0,
        user_id: user!.id,
      });
      toast.success("Account added"); setAccOpen(false); setAccName(""); setAccBalance("0");
    } catch (e: any) { toast.error(e.message); }
  };

  const saveCategory = async () => {
    if (!catName) return toast.error("Name required");
    try {
      await upsertCat.mutateAsync({ name: catName, kind: catKind, color: catColor, user_id: user!.id });
      toast.success("Category added"); setCatOpen(false); setCatName("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Categories &amp; Accounts</h1>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs text-muted-foreground font-mono">{categories.length} CATEGORIES</div>
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black"><Plus size={12} className="mr-1" />New category</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input value={catName} onChange={e => setCatName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={catKind} onValueChange={(v) => setCatKind(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {SWATCHES.map(s => (
                        <button key={s} onClick={() => setCatColor(s)} className={`h-6 w-6 rounded-md border-2 transition-all ${catColor === s ? "border-white scale-110" : "border-transparent"}`} style={{ background: s }} />
                      ))}
                    </div>
                  </div>
                  <Button onClick={saveCategory} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {categories.map(c => (
              <div key={c.id} className="border border-border bg-card rounded-md px-3 py-2.5 flex items-center justify-between glow-card">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-sm truncate">{c.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{c.kind}</span>
                </div>
                <button onClick={() => { if (confirm(`Delete ${c.name}?`)) delCat.mutate(c.id); }} className="text-muted-foreground hover:text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs text-muted-foreground font-mono">{accounts.length} ACCOUNTS</div>
            <Dialog open={accOpen} onOpenChange={setAccOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black"><Plus size={12} className="mr-1" />New account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New account</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input value={accName} onChange={e => setAccName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={accType} onValueChange={setAccType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="card">Credit card</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Starting balance</Label>
                    <Input type="number" step="0.01" value={accBalance} onChange={e => setAccBalance(e.target.value)} className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {SWATCHES.map(s => (
                        <button key={s} onClick={() => setAccColor(s)} className={`h-6 w-6 rounded-md border-2 transition-all ${accColor === s ? "border-white scale-110" : "border-transparent"}`} style={{ background: s }} />
                      ))}
                    </div>
                  </div>
                  <Button onClick={saveAccount} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {accounts.map(a => (
              <div key={a.id} className="border border-border bg-card rounded-md p-3 glow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                      <div className="text-sm font-medium">{a.name}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">{a.type}</div>
                  </div>
                  <button onClick={() => { if (confirm(`Delete ${a.name}?`)) delAcc.mutate(a.id); }} className="text-muted-foreground hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="mt-3 font-mono text-base">{formatMoney(Number(a.starting_balance), currency)}</div>
                <div className="text-[10px] text-muted-foreground font-mono">STARTING BALANCE</div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
