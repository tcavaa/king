-- ─────────────────────────────────────────────────────────────────────────
-- KingScoreApp — seasons naming & themes migration
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- What it enables:
--   • seasons.name  — the user-chosen season name ("Summer Showdown 2026")
--   • seasons.theme — one of: casual | summer | mountain | christmas
--   • an OPEN season row (ended_at IS NULL) that represents the CURRENT
--     season; "End Season" closes it (sets champion_name + ended_at) and
--     opens the next one.
--
-- The app still works without this migration, it just can't store season
-- names/themes until it runs.
-- ─────────────────────────────────────────────────────────────────────────

alter table seasons add column if not exists name text;
alter table seasons add column if not exists theme text;

-- The current-season row is open-ended and has no champion yet.
alter table seasons alter column champion_name drop not null;
alter table seasons alter column ended_at drop not null;
alter table seasons alter column started_at set default now();

-- Optional: name/theme the season that is running right now, instead of
-- waiting for the next "End Season". Adjust the values and uncomment:
--
-- insert into seasons (name, theme, started_at, champion_name, ended_at)
-- values (
--   'My Season Name',
--   'casual',                                         -- casual|summer|mountain|christmas
--   coalesce((select max(ended_at) from seasons), now()),
--   null,
--   null
-- );
--
-- (The app can also do this for you: press ✎ on the season banner.)

-- No changes are needed for game_results for ties: tied winners are stored
-- in the existing winner_name column joined with ' & ' (e.g. 'Maks & Misha').

-- Game clock: completed games save how long they took. Without this column
-- the app simply saves games without a duration.
alter table game_results add column if not exists duration_seconds integer;
