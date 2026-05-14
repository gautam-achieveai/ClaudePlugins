# Database Migration Compatibility Reference

The database outlives every individual deploy. A migration that runs in seconds may need to be
compatible with code that has been writing data for years. Database schema changes are the
canonical example of a near-irreversible change — once data is written under the new shape,
the old shape is gone.

## The Expand–Migrate–Contract Pattern

Almost every schema change can be made safe by splitting it into three migrations, each
deployed separately and independently reversible:

### Expand

Add the new shape alongside the old. Keep the old shape working.

- New column? Add it nullable, with no default that would lock the table.
- Renaming a column? Add the new column, leave the old in place, dual-write from the app.
- Changing a type? Add the new column with the new type; the old column stays.
- New table? Create it; don't drop the old one yet.

After expand, the app writes both shapes (or only the old, with the new being backfilled). Old
code keeps reading the old shape and continues to work.

### Migrate

Backfill data into the new shape. Switch readers to prefer the new shape, with a fallback to
the old if the new is empty.

- Run a backfill job (in batches, with throttling for large tables) that copies old → new.
- Update the application to write to both shapes during the transition.
- Update readers one at a time to use the new shape; fall back to the old if the new is
  missing.

After migrate, every row has both old and new shape, and every reader has been updated.

### Contract

Remove the old shape. This is the only irreversible step.

- Stop writing the old column from the application.
- Verify no production reader still consults the old column (telemetry, traces, code search).
- Drop the column / drop the table / remove the constraint.

The contract step typically happens **weeks or months** after expand. Each step is its own PR.

## NOT NULL Without a Default

The single most common migration mistake: adding a NOT NULL column with no default to an
existing table.

```sql
-- This will fail on any non-empty table
ALTER TABLE Orders ADD COLUMN TenantId UUID NOT NULL;
```

The migration fails immediately because existing rows can't satisfy NOT NULL. Even if the
table happens to be empty in testing, it won't be in production.

The fix is the expand–migrate–contract pattern:
1. Add the column nullable (or with a placeholder default).
2. Backfill every row.
3. Optionally tighten to NOT NULL in a follow-up migration, once you've verified no NULLs
   remain.

Never write the original one-line "NOT NULL with no default" migration into a tracked file.
It always fails, and even if it succeeds locally on an empty table, it will fail in the first
non-empty environment.

## Online vs. Blocking DDL

Different databases have different lock behaviors for the same DDL statement. Be aware of
which operations lock the table for the entire migration:

| Operation                            | PostgreSQL    | MySQL/InnoDB   | SQL Server         |
|--------------------------------------|---------------|----------------|--------------------|
| `ADD COLUMN` (nullable, no default)  | Fast metadata | Fast metadata  | Fast metadata      |
| `ADD COLUMN ... DEFAULT ...`         | Rewrites table (pre-11) / Fast (11+) | Rewrites table | Fast (with `WITH VALUES` caveats) |
| `ALTER COLUMN ... SET NOT NULL`      | Full table scan, locks | Locks   | Locks              |
| `ADD INDEX`                          | Locks unless `CONCURRENTLY` | Online with `ALGORITHM=INPLACE` | Online with `ONLINE=ON` |
| `DROP COLUMN`                        | Fast metadata | Rewrites table | Fast metadata      |
| `RENAME COLUMN`                      | Fast metadata | Fast metadata  | Fast metadata      |

Long-running locking DDL can stall the application for the duration of the migration on a
large table — minutes to hours. Production migrations should explicitly use the online variant
(`CREATE INDEX CONCURRENTLY`, `ALGORITHM=INPLACE, LOCK=NONE`, `ONLINE=ON`).

## Defaults That Rewrite the Table

Adding a column with a non-`NULL` default may force the database to write the default into
every existing row, which is slow and locks the table on older engines.

- PostgreSQL ≥ 11: handles defaults as metadata; no rewrite.
- PostgreSQL < 11: rewrites the table; avoid `DEFAULT` in `ADD COLUMN` on large tables.
- MySQL: rewrites the table even with `ALGORITHM=INPLACE` for non-`NULL` defaults (depending
  on version).

When in doubt: add the column nullable, then set the default for new writes at the application
layer (or in a follow-up `ALTER COLUMN SET DEFAULT`).

## Constraints on Existing Data

Adding a `CHECK`, `UNIQUE`, or `FOREIGN KEY` constraint on an existing column scans every row
to verify the constraint. If any row violates it, the migration fails — and the offending row
is typically valid historical data, not corrupt.

Always audit data first:
```sql
-- Check before adding UNIQUE
SELECT email, COUNT(*) FROM Users GROUP BY email HAVING COUNT(*) > 1;
```

If duplicates exist, clean them in a separate migration step before adding the constraint —
or, if cleaning isn't acceptable, add the constraint with `NOT VALID` (Postgres) and validate
new rows only, leaving historical duplicates legal.

## Renaming Columns and Tables

A column rename is a backward-incompat change because every running application reads from the
old name. Treat it as expand–migrate–contract:

1. Add the new column. Dual-write from the application.
2. Update readers to prefer the new column. Backfill old rows into the new column.
3. Drop the old column.

A pure SQL `ALTER TABLE ... RENAME COLUMN` is convenient but is **only safe** when the
application is updated and deployed in lockstep — which is rarely possible.

## Down Migrations

If the project's convention is to provide `Down`/rollback migrations, flag a missing one. If
the convention is to not provide them (immutable-forward migrations), don't flag the absence —
but verify the team has a documented rollback plan for the case where the forward migration
turns out to be wrong.

A missing Down on a destructive forward migration (DROP COLUMN, DROP TABLE) is particularly
dangerous: rollback is impossible without a backup.

## Common Mistakes to Flag

1. **`ALTER TABLE … ADD COLUMN … NOT NULL`** with no default and no backfill. Always fails on
   any non-empty table. Refer to the user's memory: schema/migration issues stay HIGH+
   because undefined behavior from NULLs accumulates over time.
2. **Adding a UNIQUE constraint on a column with existing duplicates.** Audit the data first.
3. **Dropping a column in the same PR as removing the application's reads.** The deploy is
   not atomic; there's a window where one side has updated and the other hasn't.
4. **Renaming a column without expand–migrate–contract.** Old application pods can't find the
   column during the rolling deploy.
5. **Online-DDL operation written with the blocking form.** Production stalls during the
   migration on large tables.
6. **Default on `ADD COLUMN` on a large table (older engines).** Forces a full table rewrite
   that locks for the duration.
