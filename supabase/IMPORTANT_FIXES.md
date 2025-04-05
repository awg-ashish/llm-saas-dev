# Important Fixes Required

## JWT Syntax Fix

There's an auto-formatting issue in the `20250403160000_row_level_security.sql` file that needs to be fixed manually before running the migrations.

Please change these lines:

```sql
CREATE POLICY "Admins can manage blog posts" ON blog_posts USING ((auth.jwt () - > > 'role') = 'admin');

CREATE POLICY "Admins can manage announcements" ON announcements USING ((auth.jwt () - > > 'role') = 'admin');
```

To:

```sql
CREATE POLICY "Admins can manage blog posts" ON blog_posts USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can manage announcements" ON announcements USING ((auth.jwt() ->> 'role') = 'admin');
```

The auto-formatter incorrectly changes the PostgreSQL JSON operator `->>` to `- > >` which will cause syntax errors.

## Running Migrations

After making this fix, you can run the migrations with:

```bash
npx supabase db push
```

And then seed the database with:

```bash
npx supabase db execute --file supabase/seed.sql
```
