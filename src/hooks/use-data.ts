import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Transaction = Tables<"transactions">;
export type Account = Tables<"accounts">;
export type Category = Tables<"categories">;
export type Budget = Tables<"budgets">;
export type Profile = Tables<"profiles">;

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAccounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["accounts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCategories(userId: string | undefined) {
  return useQuery({
    queryKey: ["categories", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransactions(userId: string | undefined) {
  return useQuery({
    queryKey: ["transactions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgets(userId: string | undefined) {
  return useQuery({
    queryKey: ["budgets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTransaction(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"transactions"> & { id?: string }) => {
      const payload = { ...input, user_id: userId! };
      if (input.id) {
        const { error } = await supabase.from("transactions").update(payload as TablesUpdate<"transactions">).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", userId] }),
  });
}

export function useDeleteTransaction(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", userId] }),
  });
}

export function useUpsertCategory(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"categories"> & { id?: string }) => {
      const payload = { ...input, user_id: userId! };
      if (input.id) {
        const { error } = await supabase.from("categories").update(payload as TablesUpdate<"categories">).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", userId] }),
  });
}

export function useDeleteCategory(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", userId] }),
  });
}

export function useUpsertAccount(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"accounts"> & { id?: string }) => {
      const payload = { ...input, user_id: userId! };
      if (input.id) {
        const { error } = await supabase.from("accounts").update(payload as TablesUpdate<"accounts">).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts", userId] }),
  });
}

export function useDeleteAccount(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts", userId] }),
  });
}

export function useUpsertBudget(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"budgets">) => {
      const payload = { ...input, user_id: userId! };
      const { error } = await supabase
        .from("budgets")
        .upsert(payload, { onConflict: "user_id,category_id,month" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets", userId] }),
  });
}

export function useDeleteBudget(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets", userId] }),
  });
}
