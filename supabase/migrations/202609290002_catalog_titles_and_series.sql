begin;

alter table public.works
  add column series_name text,
  add column series_position numeric(7, 2);

alter table public.works
  add constraint works_series_name_not_blank
    check (
      series_name is null
      or length(btrim(series_name)) > 0
    ),

  add constraint works_series_position_valid
    check (
      series_position is null
      or (
        series_position >= 0
        and series_name is not null
      )
    );

alter table public.work_sources
  add column source_title text,
  add column source_responsibility_statement text,
  add column source_series_statement text;

commit;