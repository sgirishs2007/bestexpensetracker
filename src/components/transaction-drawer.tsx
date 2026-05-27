import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts, useCategories, useUpsertTransaction, useDeleteTransaction, type Transaction } from "@/hooks/use-data";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  editing?: Transaction | null;
};

export function TransactionDrawer({ open, onOpenChange, userId, editing }: Props) {
  const { data: accounts = [] } = useAccounts(userId);
  const { data: categories = [] } = useCategories(userId);
  const upsert = useUpsertTransaction(userId);
  const del = useDeleteTransaction(userId);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<string>(() => new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (editing) {
      setType((editing.type as "expense" | "income") ?? "expense");
      setAmount(String(editing.amount));
      setMerchant(editing.merchant ?? "");
      setNote(editing.note ?? "");
      setAccountId(editing.account_id ?? "");
      setCategoryId(editing.category_id ?? "");
      setOccurredAt(new Date(editing.occurred_at).toISOString().slice(0, 16));
    } else if (open) {
      setType("expense"); setAmount(""); setMerchant(""); setNote("");
      setAccountId(accounts[0]?.id ?? "");
      setCategoryId("");
      setOccurredAt(new Date().toISOString().slice(0, 16));
    }
  }, [editing, open, accounts]);

  const filteredCategories = categories.filter(c => c.kind === type);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!accountId) return toast.error("Pick an account");
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        amount: amt,
        type,
        merchant: merchant || null,
        note: note || null,
        account_id: accountId,
        category_id: categoryId || null,
        occurred_at: new Date(occurredAt).toISOString(),
        user_id: userId,
      });
      toast.success(editing ? "Transaction updated" : "Transaction added");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!confirm("Delete this transaction?")) return;
    try {
      await del.mutateAsync(editing.id);
      toast.success("Deleted");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm tracking-wide">
            {editing ? "EDIT TRANSACTION" : "NEW TRANSACTION"}
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-muted">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-1.5 text-xs rounded font-medium transition-colors ${
                  type === t
                    ? t === "expense" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Amount</Label>
            <Input
              type="number" step="0.01" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-lg h-12 bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Merchant</Label>
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Whole Foods" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date &amp; time</Label>
            <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Optional…" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={submit} disabled={upsert.isPending} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black">
              {editing ? "Save" : "Add transaction"}
            </Button>
            {editing && (
              <Button onClick={onDelete} variant="outline" size="icon" className="text-red-400 hover:text-red-300">
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
