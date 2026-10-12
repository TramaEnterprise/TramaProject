begin;

create function public.apply_bne_pilot_batch(
  p_batch jsonb,
  p_apply boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed text[] := array[
    '991061089253808606',
    '991061089014508606',
    '991061089253008606',
    '991058958289708606',
    '991061089021508606',
    '991058909429708606'
  ];

  v_item jsonb;
  v_patch jsonb;
  v_existing jsonb;
  v_current public.work_sources%rowtype;
  v_field text;
  v_changed boolean;
  v_changes integer := 0;
  v_details jsonb := '[]'::jsonb;
begin
  if p_apply is null then
    raise exception 'p_apply debe ser true o false.';
  end if;

  if jsonb_typeof(p_batch) is distinct from 'array' then
    raise exception 'El lote debe ser un array JSON.';
  end if;

  if jsonb_array_length(p_batch) <> 6 then
    raise exception 'El piloto requiere exactamente seis registros.';
  end if;

  if (
    select count(distinct e.value ->> 'source_record_id')
    from jsonb_array_elements(p_batch) as e(value)
  ) <> 6 then
    raise exception 'Hay identificadores ausentes o repetidos.';
  end if;

  -- Orden estable para bloquear las fuentes.
  for v_item in
    select e.value
    from jsonb_array_elements(p_batch) as e(value)
    order by e.value ->> 'source_record_id'
  loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Cada registro debe ser un objeto.';
    end if;

    if (
      select count(*) from jsonb_object_keys(v_item)
    ) <> 10 then
      raise exception 'El registro no tiene los diez campos del piloto.';
    end if;

    foreach v_field in array array[
      'source_record_id',
      'work_id',
      'language',
      'publisher',
      'edition_statement',
      'extent',
      'notes'
    ]
    loop
      if jsonb_typeof(v_item -> v_field) is distinct from 'string' then
        raise exception 'El campo % debe ser texto.', v_field;
      end if;
    end loop;

    if jsonb_typeof(v_item -> 'publication_year')
         is distinct from 'number'
       or (v_item ->> 'publication_year') !~ '^[1-9][0-9]{0,3}$'
    then
      raise exception 'Año de publicación no válido.';
    end if;

    if jsonb_typeof(v_item -> 'contributors')
         is distinct from 'array'
       or jsonb_typeof(v_item -> 'authorship_evidence')
         is distinct from 'object'
    then
      raise exception 'Colaboradores o evidencia de autoría no válidos.';
    end if;

    if not (
      (v_item ->> 'source_record_id') = any(v_allowed)
    ) then
      raise exception 'La fuente no pertenece al piloto.';
    end if;

    select s.*
    into v_current
    from public.work_sources s
    where s.source = 'bne'
      and s.source_record_id = v_item ->> 'source_record_id'
    for update;

    if not found then
      raise exception 'No existe la fuente %.',
        v_item ->> 'source_record_id';
    end if;

    if v_current.work_id is distinct from
       (v_item ->> 'work_id')::uuid
    then
      raise exception 'La fuente % pertenece a otra obra.',
        v_current.source_record_id;
    end if;

    if v_current.metadata_imported_at is null then
      raise exception 'Completa primero la carga inicial del piloto.';
    end if;

    -- Estos cambios requieren revisar también la ficha de works.
    if v_current.publication_year is distinct from
         (v_item ->> 'publication_year')::integer
       or v_current.language is distinct from
         (v_item ->> 'language')
       or v_current.publisher is distinct from
         (v_item ->> 'publisher')
       or v_current.contributors is distinct from
         (v_item -> 'contributors')
    then
      raise exception
        'La fuente % requiere revisar la publicación o la autoría.',
        v_current.source_record_id;
    end if;

    v_patch :=
      (v_item - 'source_record_id' - 'work_id')
      || jsonb_build_object(
        'normalization_version', 'bne-pilot-v1'
      );

    -- Compara exactamente los campos afectados.
    select jsonb_object_agg(
      k.key,
      to_jsonb(v_current) -> k.key
    )
    into v_existing
    from jsonb_object_keys(v_patch) as k(key);

    v_changed := v_existing is distinct from v_patch;

    if v_changed then
      v_changes := v_changes + 1;

      if p_apply then
        update public.work_sources
        set
          edition_statement = v_item ->> 'edition_statement',
          extent = v_item ->> 'extent',
          notes = v_item ->> 'notes',
          authorship_evidence = v_item -> 'authorship_evidence',
          normalization_version = 'bne-pilot-v1',
          metadata_imported_at = now()
        where source = 'bne'
          and source_record_id = v_current.source_record_id;
      end if;
    end if;

    v_details := v_details || jsonb_build_array(
      jsonb_build_object(
        'source_record_id', v_current.source_record_id,
        'would_change', v_changed
      )
    );
  end loop;

  return jsonb_build_object(
    'mode', case when p_apply then 'apply' else 'preview' end,
    'checked', 6,
    'would_update', v_changes,
    'updated', case when p_apply then v_changes else 0 end,
    'unchanged', 6 - v_changes,
    'records', v_details
  );
end;
$$;

-- La función no queda disponible para los clientes públicos.
revoke all on function public.apply_bne_pilot_batch(jsonb, boolean)
  from public, anon, authenticated;

grant execute on function public.apply_bne_pilot_batch(jsonb, boolean)
  to service_role;

commit;