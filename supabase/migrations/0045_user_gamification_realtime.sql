-- Gamification Etapa 3: hero dinamica reage a mudancas de level_key em tempo real.

do $$ begin alter publication supabase_realtime add table public.user_gamification; exception when duplicate_object then null; end $$;
