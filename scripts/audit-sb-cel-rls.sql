-- Audit: sb_* vs cel_* RLS policies (public schema).
-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/audit-sb-cel-rls.sql
-- Or paste into Supabase Dashboard → SQL Editor (single run).

/* ========== A) Cel-only tables (no sb_<suffix> in public) ========== */
WITH cel AS (
  SELECT table_name AS cel_table,
         regexp_replace(table_name, '^cel_', 'sb_') AS sb_expected
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'cel_%'
),
present_sb AS (
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
)
SELECT 'A_cel_only_or_paired' AS report,
       c.cel_table,
       CASE WHEN EXISTS (SELECT 1 FROM present_sb p WHERE p.table_name = c.sb_expected)
            THEN 'paired'
            ELSE 'cel_only'
       END AS pairing
FROM cel c
ORDER BY pairing DESC, c.cel_table;

/* ========== B) Paired tables — policy names & RLS flags ========== */
WITH cel AS (
  SELECT table_name AS cel_table,
         regexp_replace(table_name, '^cel_', 'sb_') AS sb_table
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'cel_%'
),
paired AS (
  SELECT c.cel_table, c.sb_table
  FROM cel c
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = c.sb_table
  )
),
sb_names AS (
  SELECT tablename AS tbl, array_agg(policyname ORDER BY policyname) AS policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'sb_%'
  GROUP BY tablename
),
cel_names AS (
  SELECT tablename AS tbl, array_agg(policyname ORDER BY policyname) AS policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'cel_%'
  GROUP BY tablename
),
cls AS (
  SELECT n.nspname,
         c.relname,
         c.relrowsecurity AS rls_enabled,
         c.relforcerowsecurity AS rls_force
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
)
SELECT 'B_pair_diff' AS report,
       p.sb_table,
       p.cel_table,
       COALESCE(sb.policies, ARRAY[]::text[]) AS sb_policy_names,
       COALESCE(ce.policies, ARRAY[]::text[]) AS cel_policy_names,
       ARRAY(
         SELECT x FROM unnest(COALESCE(sb.policies, ARRAY[]::text[])) AS x
         EXCEPT SELECT y FROM unnest(COALESCE(ce.policies, ARRAY[]::text[])) AS y
       ) AS missing_on_cel,
       ARRAY(
         SELECT y FROM unnest(COALESCE(ce.policies, ARRAY[]::text[])) AS y
         EXCEPT SELECT x FROM unnest(COALESCE(sb.policies, ARRAY[]::text[])) AS x
       ) AS extra_on_cel,
       COALESCE(sb_cls.rls_enabled, false) AS sb_rls_enabled,
       COALESCE(ce_cls.rls_enabled, false) AS cel_rls_enabled
FROM paired p
LEFT JOIN sb_names sb ON sb.tbl = p.sb_table
LEFT JOIN cel_names ce ON ce.tbl = p.cel_table
LEFT JOIN cls sb_cls ON sb_cls.relname = p.sb_table
LEFT JOIN cls ce_cls ON ce_cls.relname = p.cel_table
ORDER BY
  CASE WHEN CARDINALITY(
    ARRAY(
      SELECT x FROM unnest(COALESCE(sb.policies, ARRAY[]::text[])) AS x
      EXCEPT SELECT y FROM unnest(COALESCE(ce.policies, ARRAY[]::text[])) AS y
    )
  ) > 0 THEN 0 ELSE 1 END,
  p.sb_table;

/* ========== C) sb_* tables with no cel_* sibling ========== */
WITH sb AS (
  SELECT table_name AS sb_table,
         regexp_replace(table_name, '^sb_', 'cel_') AS cel_expected
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'sb_%'
)
SELECT 'C_sb_without_cel' AS report,
       sb.sb_table
FROM sb
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_name = sb.cel_expected
)
ORDER BY sb.sb_table;

/* ========== D) Policies on pairs where counts differ ========== */
WITH cel AS (
  SELECT table_name AS cel_table,
         regexp_replace(table_name, '^cel_', 'sb_') AS sb_table
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'cel_%'
),
paired AS (
  SELECT c.cel_table, c.sb_table
  FROM cel c
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = c.sb_table
  )
),
cnt AS (
  SELECT p.sb_table, p.cel_table,
         (SELECT COUNT(*) FROM pg_policies pp WHERE pp.schemaname='public' AND pp.tablename = p.sb_table) AS sb_n,
         (SELECT COUNT(*) FROM pg_policies pp WHERE pp.schemaname='public' AND pp.tablename = p.cel_table) AS cel_n
  FROM paired p
)
SELECT 'D_policy_detail_mismatch' AS report,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    SELECT sb_table FROM cnt WHERE sb_n IS DISTINCT FROM cel_n
    UNION
    SELECT cel_table FROM cnt WHERE sb_n IS DISTINCT FROM cel_n
  )
ORDER BY tablename, policyname;
