
-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Accounts
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank',
  starting_balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own accounts" ON public.accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own accounts" ON public.accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own accounts" ON public.accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'expense',
  color TEXT NOT NULL DEFAULT '#10b981',
  icon TEXT NOT NULL DEFAULT 'circle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own categories" ON public.categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own categories" ON public.categories FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own categories" ON public.categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  note TEXT,
  merchant TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own tx" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own tx" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own tx" ON public.transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own tx" ON public.transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_tx_user_date ON public.transactions(user_id, occurred_at DESC);

-- Budgets
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  amount_limit NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own budgets" ON public.budgets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own budgets" ON public.budgets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own budgets" ON public.budgets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own budgets" ON public.budgets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile + defaults on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.accounts (user_id, name, type, color) VALUES
    (NEW.id, 'Cash', 'cash', '#10b981'),
    (NEW.id, 'Primary Bank', 'bank', '#8b5cf6'),
    (NEW.id, 'Credit Card', 'card', '#ef4444');

  INSERT INTO public.categories (user_id, name, kind, color, icon) VALUES
    (NEW.id, 'Salary', 'income', '#10b981', 'briefcase'),
    (NEW.id, 'Freelance', 'income', '#10b981', 'laptop'),
    (NEW.id, 'Groceries', 'expense', '#f59e0b', 'shopping-cart'),
    (NEW.id, 'Dining', 'expense', '#ef4444', 'utensils'),
    (NEW.id, 'Transport', 'expense', '#8b5cf6', 'car'),
    (NEW.id, 'Utilities', 'expense', '#3b82f6', 'zap'),
    (NEW.id, 'Rent', 'expense', '#ef4444', 'home'),
    (NEW.id, 'Entertainment', 'expense', '#8b5cf6', 'film'),
    (NEW.id, 'Shopping', 'expense', '#f59e0b', 'shopping-bag'),
    (NEW.id, 'Health', 'expense', '#10b981', 'heart');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
