-- "Para quem é esta trilha": um parágrafo dizendo a quem o conteúdo
-- serve. O desenho reserva um cartão inteiro para isso e não havia
-- campo nenhum no banco.
alter table public.courses add column if not exists audience text;

update public.courses
   set audience = 'Profissionais de finanças, controladoria e áreas relacionadas que querem aplicar IA de forma prática e segura.'
 where slug = 'ia-aplicada-ao-financeiro' and audience is null;

update public.courses
   set audience = 'Gestores e líderes que precisam decidir onde a IA entra na operação antes de escolher qualquer ferramenta.'
 where slug = 'ia-para-lideres' and audience is null;

update public.courses
   set audience = 'Quem cuida de operação e precisa entender o que sustenta uma automação rodando todo dia.'
 where slug = 'ecossistema-cloud' and audience is null;
