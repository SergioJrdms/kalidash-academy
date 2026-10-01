-- =====================================================================
-- Nível declarado no onboarding de 3 etapas do design novo.
--
-- O onboarding pergunta área, objetivo e NÍVEL. Os dois primeiros já
-- existiam em profiles; o terceiro é novo.
--
-- O trigger guard_profile_privileges continua protegendo role, email e
-- access_level. `level` é campo da própria pessoa, como area e goal.
-- =====================================================================

alter table public.profiles add column if not exists level text;

comment on column public.profiles.level is
  'Nível declarado no onboarding: Iniciante | Intermediário | Avançado';
