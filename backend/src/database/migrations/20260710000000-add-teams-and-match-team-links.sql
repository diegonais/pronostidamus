create extension if not exists pgcrypto;

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  "externalId" varchar(40) not null unique,
  name varchar(80) not null,
  "nameEn" varchar(80) not null,
  "fifaCode" varchar(10),
  iso2 varchar(12),
  "group" varchar(8),
  "flagUrl" varchar(255),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table matches
  add column if not exists "teamAId" uuid,
  add column if not exists "teamBId" uuid;

create index if not exists "IDX_teams_externalId" on teams ("externalId");
create index if not exists "IDX_matches_teamAId" on matches ("teamAId");
create index if not exists "IDX_matches_teamBId" on matches ("teamBId");

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'FK_matches_teamAId_teams'
  ) then
    alter table matches
      add constraint "FK_matches_teamAId_teams"
      foreign key ("teamAId") references teams(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'FK_matches_teamBId_teams'
  ) then
    alter table matches
      add constraint "FK_matches_teamBId_teams"
      foreign key ("teamBId") references teams(id) on delete set null;
  end if;
end $$;
