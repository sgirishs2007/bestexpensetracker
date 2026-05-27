import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useTransactions, useCategories, useAccounts } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, LogOut } from "lucide-react";

export const Route = createFileRoute("/settings")({ component: () => <AppShell><SettingsPage /></AppShell> });

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"];

function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, refetch } = useProfile(user?.id);
  const { data: transactions = [] } = useTransactions(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const { data: accounts = [] } = useAccounts(user?.id);

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setCurrency(profile.currency ?? "USD");
    }
  }, [profile]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({ display_name: name, currency, updated_at: new Date().toISOString() }).eq("id", user!.id);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); refetch(); }
  };

  const exportCsv = () => {
    const rows = [["Date", "Type", "Merchant", "Category", "Account", "Amount", "Note"]];
    for (const t of transactions) {
      const c = categories.find(x => x.id === t.category_id)?.name ?? "";
      const a = accounts.find(x => x.id === t.account_id)?.name ?? "";
      rows.push([
        new Date(t.occurred_at).toISOString(),
        t.type,
        (t.merchant ?? "").replace(/"/g, '""'),
        c, a,
        String(t.amount),
        (t.note ?? "").replace(/"/g, '""'),
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `aura-transactions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-lg font-semibold">Settings</h1>

      <div className="border border-border bg-card rounded-md p-4 space-y-4">
        <div className="text-xs font-mono text-muted-foreground">PROFILE</div>
        <div className="space-y-1.5">
          <Label className="text-xs">Display name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} className="bg-emerald-500 hover:bg-emerald-400 text-black">Save changes</Button>
      </div>

      <div className="border border-border bg-card rounded-md p-4 space-y-3">
        <div className="text-xs font-mono text-muted-foreground">DATA EXPORT</div>
        <p className="text-xs text-muted-foreground">Download all your transactions as a CSV file.</p>
        <Button onClick={exportCsv} variant="outline"><Download size={14} className="mr-1.5" />Export CSV</Button>
      </div>

      <div className="border border-border bg-card rounded-md p-4 space-y-3">
        <div className="text-xs font-mono text-muted-foreground">SESSION</div>
        <Button onClick={signOut} variant="outline" className="text-red-400 hover:text-red-300"><LogOut size={14} className="mr-1.5" />Sign out</Button>
      </div>
    </div>
  );
}
