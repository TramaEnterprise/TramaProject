begin;

alter table public.work_sources
  add column publication_year integer,
  add column publication_date_raw text,
  add column language text,
  add column publisher text,
  add column edition_statement text,
  add column extent text,
  add column notes text,
  add column contents text,
  add column contributors jsonb,
  add column authorship_evidence jsonb,
  add column grouping_signals jsonb,
  add column normalization_version text,
  add column metadata_imported_at timestamptz;

alter table public.work_sources
  add constraint work_sources_publication_year_valid
    check (
      publication_year is null
      or publication_year between 1 and 9999
    ),

  add constraint work_sources_contributors_array
    check (
      contributors is null
      or jsonb_typeof(contributors) = 'array'
    ),

  add constraint work_sources_authorship_evidence_object
    check (
      authorship_evidence is null
      or jsonb_typeof(authorship_evidence) = 'object'
    ),

  add constraint work_sources_grouping_signals_array
    check (
      grouping_signals is null
      or jsonb_typeof(grouping_signals) = 'array'
    ),

  add constraint work_sources_normalization_version_not_blank
    check (
      normalization_version is null
      or length(btrim(normalization_version)) > 0
    );

commit;