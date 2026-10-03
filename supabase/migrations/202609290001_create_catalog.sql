begin;

create table public.works (
  id uuid primary key default gen_random_uuid(),

  -- Datos visibles de la obra.
  title text not null
    check (length(btrim(title)) > 0),

  original_title text,
  alternative_titles text[] not null default '{}',
  author_names text[] not null default '{}',

  -- Primera publicación de la obra, solo cuando se conozca.
  original_publication_year integer
    check (
      original_publication_year is null
      or original_publication_year between -9999 and 9999
         and original_publication_year <> 0
    ),

  -- Publicación seleccionada para representar la obra.
  selected_publication_year integer
    check (
      selected_publication_year is null
      or selected_publication_year between 1 and 9999
    ),

  selected_language text,
  selected_publisher text,

  -- Páginas de la publicación seleccionada, si se conocen.
  pages integer check (pages is null or pages > 0),

  cover_url text,
  synopsis text,

  -- Clasificación propia de Trama.
  genres text[] not null default '{}',

  -- Una obra nueva no se publica automáticamente.
  status text not null default 'review'
    check (status in ('review', 'active', 'hidden')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_sources (
  source text not null,
  source_record_id text not null,

  work_id uuid not null
    references public.works(id) on delete restrict,

  -- Identificadores normalizados y válidos de este registro.
  isbns text[] not null default '{}',

  -- Indica qué registro aporta la publicación seleccionada.
  is_selected boolean not null default false,

  imported_at timestamptz not null default now(),

  primary key (source, source_record_id),

  check (
    source = btrim(source)
    and length(source) > 0
  ),

  check (
    source_record_id = btrim(source_record_id)
    and length(source_record_id) > 0
  )
);

create index work_sources_work_id_idx
  on public.work_sources (work_id);

create index work_sources_isbns_idx
  on public.work_sources using gin (isbns);

-- Como máximo un registro seleccionado por obra.
create unique index work_sources_one_selected_idx
  on public.work_sources (work_id)
  where is_selected;

create function public.set_work_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger works_set_updated_at
before update on public.works
for each row
execute function public.set_work_updated_at();

-- Permisos del catálogo.
alter table public.works enable row level security;
alter table public.work_sources enable row level security;

revoke all on table public.works
  from public, anon, authenticated;

revoke all on table public.work_sources
  from public, anon, authenticated;

grant select on table public.works
  to anon, authenticated;

grant select, insert, update, delete
  on table public.works, public.work_sources
  to service_role;

create policy works_public_read
on public.works
for select
to anon, authenticated
using (status = 'active');

commit;