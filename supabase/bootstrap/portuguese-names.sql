-- Portuguese names for units, roles and the first people (2026-09-06).
-- Idempotent; run with: supabase db query --linked --file supabase/bootstrap/portuguese-names.sql
do $pt$
declare rec record;
begin
  -- Units in Portuguese (structure agreed with the owner, 2026-09-06).
  update public.organizational_units u set name = m.name
  from (values
    ('EXECUTIVE', 'Direcção Geral'),
    ('EXPANSION', 'Expansão e Apoio à Gestão'),
    ('SUPPORT_IT', 'Suporte & IT'),
    ('MARKETING', 'Marketing'),
    ('HAPPY_PEOPLE', 'Happy People'),
    ('COMMERCIAL', 'Comercial'),
    ('DOL', 'Operações e Logística (DOL)'),
    ('HACCP', 'HACCP'),
    ('CONTROL_PURCHASING', 'Controlo de Gestão & Compras'),
    ('MAINTENANCE', 'Manutenção'),
    ('DAF', 'DAF')
  ) m(code, name) where u.code = m.code;

  update public.roles r set name = m.name
  from (values
    ('GLOBAL_EXECUTIVE', 'Direcção geral'),
    ('SUPPORT_DIRECTOR', 'Director de departamento'),
    ('DOL_DIRECTOR', 'Director DOL'),
    ('DOL_SUBDIRECTOR', 'Subdirector DOL'),
    ('OPS_SUPERVISOR', 'Supervisor de operações'),
    ('RESTAURANT_MANAGER', 'Gerente de restaurante'),
    ('KITCHEN_MANAGER', 'Chefe de cozinha'),
    ('KITCHEN_SUPERVISOR', 'Supervisor de cozinha'),
    ('SHARED_SERVICE', 'Serviço partilhado')
  ) m(code, name) where r.code = m.code;

  -- Titles and departments of the people already in.
  for rec in select * from (values
    ('Ana Arié', 'CEO', 'EXECUTIVE'),
    ('André Março', 'Director de Expansão e Apoio à Gestão', 'EXPANSION'),
    ('Gui Rainho', 'Director de Suporte & IT · Administrador da plataforma', 'SUPPORT_IT'),
    ('Mafalda Zuzarte', 'Directora de Marketing', 'MARKETING'),
    ('Sara Barradas', 'Directora de Happy People', 'HAPPY_PEOPLE'),
    ('Margarida Vilarinho', 'Directora Comercial', 'COMMERCIAL'),
    ('João Novo', 'Director DOL', 'DOL'),
    ('Tiago Carvalho', 'Subdirector DOL', 'DOL'),
    ('Mariana Seabra', 'Subdirectora DOL', 'DOL'),
    ('Mónica Gomes', 'Subdirectora DOL', 'DOL'),
    ('Tiago Jonas', 'Supervisor de operações', 'DOL'),
    ('João Sobrinho', 'Supervisor de operações', 'DOL'),
    ('Ricardo Ferreira', 'Supervisor de operações', 'DOL'),
    ('Ana Serrano', 'Controlo de Gestão & Compras', 'CONTROL_PURCHASING')
  ) as t(name, title, unit) loop
    update public.organizational_assignments oa
    set title = rec.title,
        organizational_unit_id = (select id from public.organizational_units where code = rec.unit)
    from public.profiles p
    where p.id = oa.profile_id and p.display_name = rec.name and oa.is_active;
  end loop;

end $pt$;
