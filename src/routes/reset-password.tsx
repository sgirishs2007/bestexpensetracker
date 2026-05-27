import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); navigate({ to: "/" }); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-border bg-card rounded-md p-6">
        <h1 className="text-lg font-semibold">Set new password</h1>
        <form onSubmit={submit} className="space-y-3 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs">New password</Label>
            <Input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
