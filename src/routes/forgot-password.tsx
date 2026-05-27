import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the reset link");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-border bg-card rounded-md p-6">
        <h1 className="text-lg font-semibold">Reset password</h1>
        <p className="text-xs text-muted-foreground mt-1">Enter your email and we'll send you a reset link.</p>
        <form onSubmit={submit} className="space-y-3 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black">
            Send reset link
          </Button>
        </form>
        <Link to="/auth" className="block mt-4 text-xs text-muted-foreground hover:text-foreground text-center">Back to sign in</Link>
      </div>
    </div>
  );
}
