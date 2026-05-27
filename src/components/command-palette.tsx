import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { LayoutDashboard, Receipt, Target, Layers, Settings, Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function CommandPalette({
  open, onOpenChange, onAddTx,
}: { open: boolean; onOpenChange: (o: boolean) => void; onAddTx: () => void }) {
  const navigate = useNavigate();
  const go = (to: string) => { onOpenChange(false); navigate({ to }); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={onAddTx}>
            <Plus className="mr-2 h-4 w-4 text-emerald-400" /> Add transaction
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/")}><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/transactions")}><Receipt className="mr-2 h-4 w-4" /> Transactions</CommandItem>
          <CommandItem onSelect={() => go("/budgets")}><Target className="mr-2 h-4 w-4" /> Budgets</CommandItem>
          <CommandItem onSelect={() => go("/manage")}><Layers className="mr-2 h-4 w-4" /> Categories &amp; Accounts</CommandItem>
          <CommandItem onSelect={() => go("/settings")}><Settings className="mr-2 h-4 w-4" /> Settings</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem onSelect={async () => { await supabase.auth.signOut(); go("/auth"); }}>
            <LogOut className="mr-2 h-4 w-4 text-red-400" /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
