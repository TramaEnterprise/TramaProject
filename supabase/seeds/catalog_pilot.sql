begin;

-- Tablas temporales: describen exactamente el lote esperado.
-- Desaparecen al terminar la transacción.

create temporary table pilot_works on commit drop as
select
  id,
  title,
  author_names,
  original_publication_year,
  selected_publication_year,
  selected_language,
  selected_publisher,
  status
from public.works
where false;

create temporary table pilot_sources on commit drop as
select
  source,
  source_record_id,
  work_id,
  isbns,
  is_selected,
  source_title,
  source_responsibility_statement,
  source_series_statement
from public.work_sources
where false;

-- UUID propios y fijos para poder repetir este piloto.

insert into pilot_works values
(
  '9d018ffb-e1e7-4b58-830e-ba8525c833c4',
  'Thérèse Raquin',
  array['Zola, Émile'],
  null,
  2024,
  'español',
  'Planeta DeAgostini',
  'review'
),
(
  '02369ccc-8e87-4a23-b9e0-537917a4f413',
  'Otra vuelta de tuerca',
  array['James, Henry'],
  null,
  2024,
  'español',
  'Planeta DeAgostini',
  'review'
),
(
  'b210e867-27aa-4669-b428-d45349c95f9a',
  'Capitanes intrépidos',
  array['Kipling, Rudyard'],
  null,
  2024,
  'español',
  'Planeta DeAgostini',
  'review'
);

insert into pilot_sources values
(
  'bne',
  '991061089253808606',
  '9d018ffb-e1e7-4b58-830e-ba8525c833c4',
  array['9788410580848'],
  true,
  'Thérèse Raquin',
  'Émile Zola',
  ''
),
(
  'bne',
  '991061089014508606',
  '9d018ffb-e1e7-4b58-830e-ba8525c833c4',
  array['9788411098830'],
  false,
  'Thérèse Raquin',
  'Émile Zola',
  ''
),
(
  'bne',
  '991061089253008606',
  '02369ccc-8e87-4a23-b9e0-537917a4f413',
  array['9788410581050'],
  true,
  'Otra vuelta de tuerca',
  'Henry James',
  ''
),
(
  'bne',
  '991058958289708606',
  '02369ccc-8e87-4a23-b9e0-537917a4f413',
  array['8478442979'],
  false,
  'Otra vuelta de tuerca',
  'Henry James ; traducción de José Bianco',
  'Siruela bolsillo 21'
),
(
  'bne',
  '991061089021508606',
  'b210e867-27aa-4669-b428-d45349c95f9a',
  array['9788411099042'],
  true,
  'Capitanes intrépidos',
  'Rudyard Kipling',
  ''
),
(
  'bne',
  '991058909429708606',
  'b210e867-27aa-4669-b428-d45349c95f9a',
  array['8497645537'],
  false,
  'Capitanes intrépidos',
  'Rudyard Kipling ; [traducción, María Jesús Sevillano Ureta]',
  'Clásicos de la literatura n. 76'
);

-- Inserta lo que falta; no sobrescribe registros existentes.

insert into public.works (
  id,
  title,
  author_names,
  original_publication_year,
  selected_publication_year,
  selected_language,
  selected_publisher,
  status
)
select
  id,
  title,
  author_names,
  original_publication_year,
  selected_publication_year,
  selected_language,
  selected_publisher,
  status
from pilot_works
on conflict (id) do nothing;

insert into public.work_sources (
  source,
  source_record_id,
  work_id,
  isbns,
  is_selected,
  source_title,
  source_responsibility_statement,
  source_series_statement
)
select
  source,
  source_record_id,
  work_id,
  isbns,
  is_selected,
  source_title,
  source_responsibility_statement,
  source_series_statement
from pilot_sources
on conflict (source, source_record_id) do nothing;

-- Comprueba que los datos almacenados coinciden con el piloto.
-- Si un identificador ya existía con otros datos, aborta el lote.

do $$
begin
  if exists (
    select 1
    from pilot_works p
    left join public.works w on w.id = p.id
    where w.id is null
       or not (to_jsonb(w) @> to_jsonb(p))
  ) then
    raise exception
      'Una obra del piloto no coincide con los datos esperados.';
  end if;

  if exists (
    select 1
    from pilot_sources p
    left join public.work_sources s
      on s.source = p.source
     and s.source_record_id = p.source_record_id
    where s.source_record_id is null
       or not (to_jsonb(s) @> to_jsonb(p))
  ) then
    raise exception
      'Un registro de BNE ya tiene otra asociación o datos distintos.';
  end if;

  if exists (
    select p.id
    from pilot_works p
    left join public.work_sources s on s.work_id = p.id
    group by p.id
    having count(s.source_record_id) <> 2
       or count(*) filter (where s.is_selected) <> 1
  ) then
    raise exception
      'Cada obra del piloto debe tener dos fuentes y una seleccionada.';
  end if;
end;
$$;

commit;