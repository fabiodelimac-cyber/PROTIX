-- RT1.0 — Welcome Screen: adiciona flag has_seen_welcome na user_profiles
-- Controla se o usuário já viu a tela de boas-vindas (exibida apenas uma vez)
-- Data: 2026-05-06

ALTER TABLE "public"."user_profiles"
    ADD COLUMN IF NOT EXISTS "has_seen_welcome" boolean NOT NULL DEFAULT false;

-- Comentário descritivo
COMMENT ON COLUMN "public"."user_profiles"."has_seen_welcome"
    IS 'Indica se o usuário já visualizou a tela de boas-vindas. Exibida apenas na primeira sessão.';
