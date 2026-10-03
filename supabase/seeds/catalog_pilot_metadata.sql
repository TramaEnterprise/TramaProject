begin;

-- El JSON contiene los datos recuperados de cada registro BNE.
create temporary table pilot_metadata on commit drop as
select
  p.*,
  p.publication_year::text as publication_date_raw,
  ''::text as contents,
  '[]'::jsonb as grouping_signals,
  'bne-pilot-v1'::text as normalization_version
from jsonb_to_recordset(
$pilot$
[
  {
    "source_record_id": "991061089253808606",
    "work_id": "9d018ffb-e1e7-4b58-830e-ba8525c833c4",
    "publication_year": 2024,
    "language": "español",
    "publisher": "Planeta DeAgostini",
    "edition_statement": "",
    "extent": "541 páginas",
    "notes": "",
    "contributors": [
      {
        "name": "Zola, Émile",
        "roles": ["author"],
        "raw": "Zola, Émile, ( 1840-1902)( autor)",
        "needsReview": false
      }
    ],
    "authorship_evidence": {
      "source": "bne_explicit_roles"
    }
  },
  {
    "source_record_id": "991061089014508606",
    "work_id": "9d018ffb-e1e7-4b58-830e-ba8525c833c4",
    "publication_year": 2024,
    "language": "francés",
    "publisher": "Editorial Planeta DeAgostini SAU",
    "edition_statement": "",
    "extent": "541 páginas",
    "notes": "",
    "contributors": [
      {
        "name": "Zola, Émile",
        "roles": ["author"],
        "raw": "Zola, Émile, ( 1840-1902)( autor)",
        "needsReview": false
      }
    ],
    "authorship_evidence": {
      "source": "bne_explicit_roles"
    }
  },
  {
    "source_record_id": "991061089253008606",
    "work_id": "02369ccc-8e87-4a23-b9e0-537917a4f413",
    "publication_year": 2024,
    "language": "español",
    "publisher": "Planeta DeAgostini",
    "edition_statement": "",
    "extent": "396 páginas",
    "notes": "",
    "contributors": [
      {
        "name": "James, Henry",
        "roles": ["author"],
        "raw": "James, Henry, ( 1843-1916)( autor)",
        "needsReview": false
      }
    ],
    "authorship_evidence": {
      "source": "bne_explicit_roles"
    }
  },
  {
    "source_record_id": "991058958289708606",
    "work_id": "02369ccc-8e87-4a23-b9e0-537917a4f413",
    "publication_year": 2005,
    "language": "español",
    "publisher": "Siruela",
    "edition_statement": "6ª ed.",
    "extent": "202 p.",
    "notes": "Traducción de: The turn of the screw",
    "contributors": [
      {
        "name": "James, Henry",
        "roles": ["author"],
        "raw": "James, Henry, ( 1843-1916)",
        "needsReview": false,
        "roleEvidence": {
          "source": "responsibility_name_match",
          "statement": "Henry James"
        }
      }
    ],
    "authorship_evidence": {
      "source": "bne_roles_and_credit_inference"
    }
  },
  {
    "source_record_id": "991061089021508606",
    "work_id": "b210e867-27aa-4669-b428-d45349c95f9a",
    "publication_year": 2024,
    "language": "español",
    "publisher": "Planeta DeAgostini",
    "edition_statement": "",
    "extent": "541 páginas",
    "notes": "",
    "contributors": [
      {
        "name": "Kipling, Rudyard",
        "roles": ["author"],
        "raw": "Kipling, Rudyard, ( 1865-1936)( autor)",
        "needsReview": false
      }
    ],
    "authorship_evidence": {
      "source": "bne_explicit_roles"
    }
  },
  {
    "source_record_id": "991058909429708606",
    "work_id": "b210e867-27aa-4669-b428-d45349c95f9a",
    "publication_year": 2004,
    "language": "español",
    "publisher": "EDIMAT",
    "edition_statement": "",
    "extent": "201 p.",
    "notes": "Traducción de: Captains courageous",
    "contributors": [
      {
        "name": "Kipling, Rudyard",
        "roles": ["author"],
        "raw": "Kipling, Rudyard, ( 1865-1936)",
        "needsReview": false,
        "roleEvidence": {
          "source": "responsibility_name_match",
          "statement": "Rudyard Kipling"
        }
      }
    ],
    "authorship_evidence": {
      "source": "bne_roles_and_credit_inference"
    }
  }
]
$pilot$::jsonb
) as p (
  source_record_id text,
  work_id uuid,
  publication_year integer,
  language text,
  publisher text,
  edition_statement text,
  extent text,
  notes text,
  contributors jsonb,
  authorship_evidence jsonb
);

alter table pilot_metadata
  add primary key (source_record_id);

-- Comprueba y bloquea las filas del piloto durante esta carga.
do $$
begin
  perform s.source_record_id
  from public.work_sources s
  join pilot_metadata p
    on s.source = 'bne'
   and s.source_record_id = p.source_record_id
  for update of s;

  if exists (
    select 1
    from pilot_metadata p
    left join public.work_sources s
      on s.source = 'bne'
     and s.source_record_id = p.source_record_id
    where s.source_record_id is null
       or s.work_id is distinct from p.work_id
  ) then
    raise exception
      'Falta una fuente del piloto o está vinculada a otra obra.';
  end if;
end;
$$;

-- Actualiza únicamente cuando los metadatos son distintos
-- o todavía no consta su importación.
update public.work_sources s
set
  publication_year = p.publication_year,
  publication_date_raw = p.publication_date_raw,
  language = p.language,
  publisher = p.publisher,
  edition_statement = p.edition_statement,
  extent = p.extent,
  notes = p.notes,
  contents = p.contents,
  contributors = p.contributors,
  authorship_evidence = p.authorship_evidence,
  grouping_signals = p.grouping_signals,
  normalization_version = p.normalization_version,
  metadata_imported_at = now()
from pilot_metadata p
where s.source = 'bne'
  and s.source_record_id = p.source_record_id
  and s.work_id = p.work_id
  and (
    s.metadata_imported_at is null
    or not (to_jsonb(s) @> to_jsonb(p))
  );

-- Verificación antes de confirmar.
do $$
begin
  if exists (
    select 1
    from pilot_metadata p
    left join public.work_sources s
      on s.source = 'bne'
     and s.source_record_id = p.source_record_id
    where s.source_record_id is null
       or not (to_jsonb(s) @> to_jsonb(p))
       or s.metadata_imported_at is null
  ) then
    raise exception
      'La carga de metadatos del piloto no coincide con lo esperado.';
  end if;
end;
$$;

commit;