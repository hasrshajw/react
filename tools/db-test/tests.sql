-- Database tests for supabase/schema.sql (task M-14). Plain SQL, no extension needed; run with tools/db-test/run.sh.
-- Each check prints "ok - <name>"; the first failing check raises an error and the run stops with a non-zero exit code.
-- Everything runs in one transaction and is rolled back at the end.
-- People: alice and bob are ordinary users, carol is an admin, anon is a visitor with only the public key.

begin;

-- ---------- small test helpers (schema t); callable by every role so checks can run "as" that role ----------
create schema t;
grant usage on schema t to public;

create function t.ok(name text, cond boolean) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL - %', name; end if;
  raise notice 'ok - %', name;
end $$;

-- the statement must fail; `expected` is the SQLSTATE it must fail with (42501 permission or row security, 23514 check, 23505 unique)
create function t.throws(name text, stmt text, expected text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate <> expected then raise exception 'FAIL - % (expected %, got %: %)', name, expected, sqlstate, sqlerrm; end if;
    raise notice 'ok - %', name;
    return;
  end;
  raise exception 'FAIL - % (it did not fail)', name;
end $$;

create function t.rows(q text) returns bigint language plpgsql as $$
declare n bigint;
begin execute 'select count(*) from (' || q || ') q' into n; return n; end $$;

create function t.affected(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin execute stmt; get diagnostics n = row_count; return n; end $$;

create function t.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, true); execute 'set local role authenticated'; end $$;
create function t.as_anon() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon'; end $$;
create function t.as_owner() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', true); end $$;

-- ---------- data (made as the database owner) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@example.com', '{"full_name":"Alice"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@example.com',   '{}'),
  ('cccccccc-0000-0000-0000-000000000003', 'carol@example.com', '{}');
insert into public.admins (user_id, email) values ('cccccccc-0000-0000-0000-000000000003', 'carol@example.com');

insert into public.categories (id, name) values ('test-c', 'Test category');
insert into public.templates (id, category_id, name, html_code) values ('test-t', 'test-c', 'Test template', '<p>X</p>');

insert into public.invitations (id, slug, owner, groom_name, bride_name, template_id, published, deleted_at) values
  ('a1', 'alice-wed',   'aaaaaaaa-0000-0000-0000-000000000001', 'A', 'B', 'test-t', true,  null),
  ('a2', 'alice-draft', 'aaaaaaaa-0000-0000-0000-000000000001', 'A', 'B', 'test-t', false, null),
  ('a3', 'alice-trash', 'aaaaaaaa-0000-0000-0000-000000000001', 'A', 'B', 'test-t', true,  now()),
  ('a4', 'alice-rate',  'aaaaaaaa-0000-0000-0000-000000000001', 'A', 'B', 'test-t', true,  null),
  ('a5', 'alice-old',   'aaaaaaaa-0000-0000-0000-000000000001', 'A', 'B', 'test-t', true,  now() - interval '31 days'),
  ('b1', 'bob-wed',     'bbbbbbbb-0000-0000-0000-000000000002', 'C', 'D', 'test-t', true,  null),
  ('b2', 'bob-old',     'bbbbbbbb-0000-0000-0000-000000000002', 'C', 'D', 'test-t', true,  now() - interval '31 days');

-- ============================================================
-- 1. sign-up
-- ============================================================
select t.ok('a profile row is created for every new user', (select count(*) from public.profiles) = 3);
select t.ok('the display name comes from the sign-up data, else from the email',
  (select name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Alice'
  and (select name from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'bob');
select t.ok('a new user is not an admin', not exists (select 1 from public.admins where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'));

-- ============================================================
-- 2. admin role (C-1)
-- ============================================================
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('is_admin() is true for an admin', public.is_admin());
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('is_admin() is false for an ordinary user', not public.is_admin());
select t.throws('the admins table cannot be read through the API', 'select * from public.admins', '42501');
select t.throws('a user cannot make themselves an admin', $$insert into public.admins (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, '42501');
select t.as_anon();
select t.throws('a visitor cannot call is_admin()', 'select public.is_admin()', '42501');
select t.throws('a visitor cannot read the admins table', 'select * from public.admins', '42501');
select t.as_owner();

-- ============================================================
-- 3. invitations: each owner sees and changes only their own rows
-- ============================================================
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('alice sees her own invitations', t.rows($$select 1 from public.invitations where id like 'a%'$$) = 5);
select t.ok('alice cannot see bob''s invitations', t.rows($$select 1 from public.invitations where id like 'b%'$$) = 0);
select t.ok('alice cannot change bob''s invitation', t.affected($$update public.invitations set groom_name = 'X' where id = 'b1'$$) = 0);
select t.ok('alice cannot delete bob''s invitation', t.affected($$delete from public.invitations where id = 'b1'$$) = 0);
select t.throws('alice cannot create an invitation owned by bob',
  $$insert into public.invitations (id, slug, owner) values ('x1', 'sneaky-one', 'bbbbbbbb-0000-0000-0000-000000000002')$$, '42501');
select t.ok('alice can change her own invitation', t.affected($$update public.invitations set groom_name = 'Alice G' where id = 'a2'$$) = 1);
select t.ok('alice can create an invitation', t.affected($$insert into public.invitations (id, slug) values ('a9', 'alice-nine')$$) = 1);
select t.ok('a new invitation belongs to the signed-in user by default',
  (select owner from public.invitations where id = 'a9') = 'aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('alice can delete her own invitation', t.affected($$delete from public.invitations where id = 'a9'$$) = 1);
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok('bob sees only his own invitations', t.rows('select 1 from public.invitations') = 2);
select t.as_anon();
select t.ok('a visitor cannot list invitations', t.rows('select 1 from public.invitations') = 0);
select t.throws('a visitor cannot create an invitation', $$insert into public.invitations (id, slug) values ('v1', 'visitor-one')$$, '42501');
select t.ok('a visitor cannot change an invitation', t.affected($$update public.invitations set groom_name = 'X'$$) = 0);
select t.ok('a visitor cannot delete an invitation', t.affected('delete from public.invitations') = 0);
select t.as_owner();

-- ============================================================
-- 4. templates and categories: admins only
-- ============================================================
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('an ordinary user sees no templates', t.rows('select 1 from public.templates') = 0);
select t.ok('an ordinary user sees no categories', t.rows('select 1 from public.categories') = 0);
select t.throws('an ordinary user cannot add a template', $$insert into public.templates (id, name, html_code) values ('evil', 'Evil', '<script>1</script>')$$, '42501');
select t.ok('an ordinary user cannot edit a template', t.affected($$update public.templates set html_code = '<script>1</script>'$$) = 0);
select t.throws('an ordinary user cannot add a category', $$insert into public.categories (id, name) values ('evil', 'Evil')$$, '42501');
select t.as_anon();
select t.ok('a visitor sees no templates', t.rows('select 1 from public.templates') = 0);
select t.throws('a visitor cannot add a template', $$insert into public.templates (id, name, html_code) values ('evil', 'Evil', 'x')$$, '42501');
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('an admin sees the templates', t.rows('select 1 from public.templates') >= 1);
select t.ok('an admin can add a template', t.affected($$insert into public.templates (id, name, html_code) values ('admin-t', 'Admin template', '<p>ok</p>')$$) = 1);
select t.ok('an admin can edit a template', t.affected($$update public.templates set name = 'Renamed' where id = 'admin-t'$$) = 1);
select t.as_owner();

-- ============================================================
-- 5. profiles (C-3): read your own, change only the name
-- ============================================================
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('alice sees only her own profile', t.rows('select 1 from public.profiles') = 1);
select t.ok('alice can change her display name', t.affected($$update public.profiles set name = 'Alice B' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 1);
select t.throws('alice cannot change her role', $$update public.profiles set role = 'Owner' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501');
select t.throws('alice cannot change her plan status', $$update public.profiles set plan_status = 'active' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501');
select t.throws('alice cannot extend her trial', $$update public.profiles set trial_ends_at = now() + interval '10 years'$$, '42501');
select t.ok('alice cannot change bob''s profile', t.affected($$update public.profiles set name = 'Hacked' where id = 'bbbbbbbb-0000-0000-0000-000000000002'$$) = 0);
select t.as_anon();
select t.ok('a visitor sees no profiles', t.rows('select 1 from public.profiles') = 0);
select t.as_owner();

-- ============================================================
-- 6. enquiries (H-5, L-7): anyone may send one, only admins read and change them
-- ============================================================
select t.as_anon();
select t.ok('a visitor can send an enquiry',
  t.affected($$insert into public.enquiries (name, phone, email, message) values ('Ravi', '+91 98765 43210', 'Ravi@Example.COM', 'Hello')$$) = 1);
select t.ok('a visitor cannot read enquiries', t.rows('select 1 from public.enquiries') = 0);
select t.throws('a visitor cannot choose the status', $$insert into public.enquiries (name, status) values ('X', 'called')$$, '42501');
select t.throws('a visitor cannot write a note', $$insert into public.enquiries (name, note) values ('X', 'n')$$, '42501');
select t.throws('a visitor cannot write the history', $$insert into public.enquiries (name, history) values ('X', '[{"a":1}]')$$, '42501');
select t.throws('a phone number with letters is refused', $$insert into public.enquiries (name, phone) values ('X', 'call-me-maybe')$$, '23514');
select t.throws('a phone number with too few digits is refused', $$insert into public.enquiries (name, phone) values ('X', '12345')$$, '23514');
select t.throws('an email without a domain is refused', $$insert into public.enquiries (name, email) values ('X', 'nobody@')$$, '23514');
select t.throws('a name over 100 characters is refused', format('insert into public.enquiries (name) values (%L)', repeat('n', 101)), '23514');
select t.throws('a message over 2000 characters is refused', format('insert into public.enquiries (name, message) values (%L, %L)', 'X', repeat('m', 2001)), '23514');
select t.ok('five enquiries from one phone number in an hour are accepted',
  (select count(*) from (select t.affected(format('insert into public.enquiries (name, phone) values (%L, %L)', 'R' || i, '9000000001')) from generate_series(1, 5) i) q) = 5);
select t.throws('the sixth enquiry from the same phone number in an hour is refused',
  $$insert into public.enquiries (name, phone) values ('R6', '9000000001')$$, '23514');
select t.ok('a visitor cannot change enquiries', t.affected($$update public.enquiries set status = 'called'$$) = 0);
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('an ordinary user cannot read enquiries', t.rows('select 1 from public.enquiries') = 0);
select t.ok('an ordinary user cannot change enquiries', t.affected($$update public.enquiries set status = 'called'$$) = 0);
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('an admin reads the enquiries', t.rows('select 1 from public.enquiries') = 6);
select t.ok('the email was stored in lower case', exists (select 1 from public.enquiries where email = 'ravi@example.com'));
select t.ok('a new enquiry starts as new, with no note and an empty history',
  (select status = 'new' and note = '' and history = '[]'::jsonb and follow_up_date is null from public.enquiries where email = 'ravi@example.com'));
select t.ok('an admin can change the status', t.affected($$update public.enquiries set status = 'called' where email = 'ravi@example.com'$$) = 1);
select t.ok('the database appended the status change to the history',
  (select jsonb_array_length(history) = 1 and history->0->>'status' = 'called' and history->0->>'at' ~ '^\d{4}-\d\d-\d\dT[\d:.]+Z$'
     from public.enquiries where email = 'ravi@example.com'));
select t.ok('an admin can change the status again', t.affected($$update public.enquiries set history = '[{"x":1}]'::jsonb, status = 'cancelled' where email = 'ravi@example.com'$$) = 1);
select t.ok('a history sent by the client is ignored',
  (select jsonb_array_length(history) = 2 and history->1->>'status' = 'cancelled' and not (history::text like '%"x"%')
     from public.enquiries where email = 'ravi@example.com'));
select t.ok('an admin can write a note', t.affected($$update public.enquiries set note = 'called twice' where email = 'ravi@example.com'$$) = 1);
select t.ok('a change that leaves the status alone adds nothing to the history',
  (select jsonb_array_length(history) = 2 from public.enquiries where email = 'ravi@example.com'));
select t.as_owner();

-- ============================================================
-- 7. public invitation page (H-4): what a guest can read and count
-- ============================================================
select t.as_anon();
select t.ok('a guest gets exactly the four fields the page needs',
  (select array_agg(k order by k) from jsonb_object_keys(public.get_public_invitation('alice-wed')) k)
    = array['bride_name', 'details', 'groom_name', 'html_code']);
select t.ok('the template html comes with it', public.get_public_invitation('alice-wed')->>'html_code' = '<p>X</p>');
select t.ok('the link is not case sensitive', public.get_public_invitation('ALICE-WED') is not null);
select t.ok('a draft is not public', public.get_public_invitation('alice-draft') is null);
select t.ok('an invitation in the trash is not public', public.get_public_invitation('alice-trash') is null);
select t.ok('an unknown link gives nothing', public.get_public_invitation('no-such-link') is null);
select t.ok('the link preview data is public for a published invitation', public.get_invitation_meta('alice-wed')->>'groom_name' = 'A');
select t.ok('the link preview data is not public for a draft', public.get_invitation_meta('alice-draft') is null);
select t.ok('the link preview data is not public for the trash', public.get_invitation_meta('alice-trash') is null);

select t.ok('the first visit counts', public.record_invitation_view('alice-wed', 'visitor-aaaaaaaaaaaa'));
select t.ok('the same visitor on the same day does not count again', not public.record_invitation_view('alice-wed', 'visitor-aaaaaaaaaaaa'));
select t.ok('another visitor counts', public.record_invitation_view('alice-wed', 'visitor-bbbbbbbbbbbb'));
select t.ok('a visitor id that is too short is ignored', not public.record_invitation_view('alice-wed', 'short'));
select t.ok('a visitor id with odd characters is ignored', not public.record_invitation_view('alice-wed', 'visitor-<script>-xxxxx'));
select t.ok('a draft cannot be counted', not public.record_invitation_view('alice-draft', 'visitor-cccccccccccc'));
select t.ok('an invitation in the trash cannot be counted', not public.record_invitation_view('alice-trash', 'visitor-cccccccccccc'));
select t.ok('an unknown link cannot be counted', not public.record_invitation_view('no-such-link', 'visitor-cccccccccccc'));
select t.throws('a visitor cannot read the list of who viewed', 'select * from public.invitation_view_seen', '42501');
select t.throws('a visitor cannot read the view counters', 'select * from public.invitation_view_rate', '42501');
select t.ok('a visitor cannot change the view count directly', t.affected($$update public.invitations set views = 99999$$) = 0);
do $$ begin
  for i in 1..125 loop perform public.record_invitation_view('alice-rate', 'visitor-' || lpad(i::text, 10, '0')); end loop;
end $$;
select t.as_owner();
select t.ok('reading the page does not count a view', (select views from public.invitations where id = 'a2') = 0);
select t.ok('two distinct visitors counted two views', (select views from public.invitations where id = 'a1') = 2);
select t.ok('at most 120 views are counted per invitation per minute', (select views from public.invitations where id = 'a4') = 120);

-- ============================================================
-- 8. trash (L-8)
-- ============================================================
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('alice''s expired trash is listed, and only hers',
  (select array_agg(x order by x) from public.expired_trash_ids() x) = array['a5']);
select t.ok('alice can move an invitation to the trash', t.affected($$update public.invitations set deleted_at = '2000-01-01' where id = 'a2'$$) = 1);
select t.ok('moving to the trash stamps the server time, not the client''s', (select deleted_at = now() from public.invitations where id = 'a2'));
select t.ok('alice can try to change the date of trash already in the trash', t.affected($$update public.invitations set deleted_at = '2000-01-01' where id = 'a3'$$) = 1);
select t.ok('the client cannot move the trash date of an invitation already in the trash', (select deleted_at <> '2000-01-01' from public.invitations where id = 'a3'));
select t.ok('alice can create an invitation that claims to be trashed long ago', t.affected($$insert into public.invitations (id, slug, deleted_at) values ('a8', 'alice-eight', '2000-01-01')$$) = 1);
select t.ok('a new invitation cannot be created already "trashed long ago"', (select deleted_at = now() from public.invitations where id = 'a8'));
select t.ok('alice can restore from the trash', t.affected($$update public.invitations set deleted_at = null where id = 'a2'$$) = 1);
select t.ok('restoring clears the trash date', (select deleted_at is null from public.invitations where id = 'a2'));
select t.throws('a signed-in user cannot run the purge job', 'select public.purge_expired_trash()', '42501');
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok('bob sees only his own expired trash', (select array_agg(x order by x) from public.expired_trash_ids() x) = array['b2']);
select t.as_anon();
select t.throws('a visitor cannot list expired trash', 'select * from public.expired_trash_ids()', '42501');
select t.throws('a visitor cannot run the purge job', 'select public.purge_expired_trash()', '42501');
select t.as_owner();
select t.ok('the purge job removes every expired invitation and returns how many', public.purge_expired_trash() = 2);
select t.ok('recent trash survives the purge', exists (select 1 from public.invitations where id = 'a3'));
select t.ok('expired trash is gone', not exists (select 1 from public.invitations where id in ('a5', 'b2')));

-- ============================================================
-- 9. link names and invitation details (M-9, H-2)
-- ============================================================
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.throws('a reserved link name is refused', $$insert into public.invitations (id, slug) values ('r1', 'dashboard')$$, '23514');
select t.throws('a reserved link name is refused whatever its case', $$insert into public.invitations (id, slug) values ('r2', 'Admin')$$, '23514');
select t.throws('a link name that is too short is refused', $$insert into public.invitations (id, slug) values ('r3', 'ab')$$, '23514');
select t.throws('a link name with a dot is refused', $$insert into public.invitations (id, slug) values ('r4', 'my.link')$$, '23514');
select t.throws('my is reserved for the client area (013)', $$insert into public.invitations (id, slug) values ('my', 'my')$$, '23514');
select t.throws('reviews is reserved for the review queue (014)', $$insert into public.invitations (id, slug) values ('reviews', 'reviews')$$, '23514');
select t.throws('a link name already used (ignoring case) is refused', $$insert into public.invitations (id, slug) values ('r5', 'ALICE-WED')$$, '23505');
select t.throws('a javascript: map link is refused', $$insert into public.invitations (id, slug, details) values ('d1', 'details-one', '{"venueMaps":"javascript:alert(1)"}')$$, '23514');
-- \t inside the JSON text is decoded by PostgreSQL into a real tab character, which the validator must strip before reading the scheme
select t.throws('a javascript: link hidden with a tab is refused', $$insert into public.invitations (id, slug, details) values ('d2', 'details-two', '{"venueMaps":"java\tscript:alert(1)"}')$$, '23514');
select t.throws('a preview image from another site is refused', $$insert into public.invitations (id, slug, details) values ('d3', 'details-three', '{"seoImage":"https://evil.example/x.jpg"}')$$, '23514');
select t.throws('a bad phone number in the details is refused', $$insert into public.invitations (id, slug, details) values ('d4', 'details-four', '{"groomFatherPhone":"abc"}')$$, '23514');
select t.throws('a list with more than 20 items is refused', format('insert into public.invitations (id, slug, details) values (%L, %L, %L)', 'd5', 'details-five', jsonb_build_object('events', (select jsonb_agg('{}'::jsonb) from generate_series(1, 21)))::text), '23514');
select t.throws('details that are not an object are refused', $$insert into public.invitations (id, slug, details) values ('d6', 'details-six', '[]')$$, '23514');
select t.throws('an edit that makes the details unsafe is refused', $$update public.invitations set details = '{"venueMaps":"javascript:1"}' where id = 'a1'$$, '23514');
select t.ok('ordinary details are accepted',
  t.affected($$insert into public.invitations (id, slug, details) values ('d7', 'details-seven', '{"groomEn":"A","venueMaps":"https://maps.example/x","groomFatherPhone":"+91 98765 43210","events":[{"name":"Sangeet","maps":"tel:100"}]}')$$) = 1);
select t.ok('a preview image from this app''s own bucket is accepted',
  t.affected($$insert into public.invitations (id, slug, details) values ('d8', 'details-eight', '{"seoImage":"https://abc.supabase.co/storage/v1/object/public/invitation-previews/aaaaaaaa-0000-0000-0000-000000000001/d8.jpg?v=1"}')$$) = 1);
select t.ok('other columns of an old row stay editable (the check runs only when details change)',
  t.affected($$update public.invitations set views = views where id = 'a1'$$) = 1);
select t.as_owner();

-- ============================================================
-- 10. link preview images in storage (M-4)
-- ============================================================
select t.ok('the bucket is public, 300 KB at most and JPEG only',
  (select public and file_size_limit = 307200 and allowed_mime_types = array['image/jpeg'] from storage.buckets where id = 'invitation-previews'));
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('alice can upload into her own folder',
  t.affected($$insert into storage.objects (bucket_id, name, owner) values ('invitation-previews', 'aaaaaaaa-0000-0000-0000-000000000001/a1.jpg', auth.uid())$$) = 1);
select t.throws('alice cannot upload into bob''s folder',
  $$insert into storage.objects (bucket_id, name, owner) values ('invitation-previews', 'bbbbbbbb-0000-0000-0000-000000000002/x.jpg', auth.uid())$$, '42501');
select t.throws('alice cannot upload to the top level of the bucket',
  $$insert into storage.objects (bucket_id, name, owner) values ('invitation-previews', 'x.jpg', auth.uid())$$, '42501');
select t.as_owner();
insert into storage.objects (bucket_id, name, owner) values ('invitation-previews', 'bbbbbbbb-0000-0000-0000-000000000002/b1.jpg', 'bbbbbbbb-0000-0000-0000-000000000002');
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('alice cannot replace bob''s file', t.affected($$update storage.objects set name = 'aaaaaaaa-0000-0000-0000-000000000001/stolen.jpg' where name like 'bbbbbbbb%'$$) = 0);
select t.ok('alice cannot delete bob''s file', t.affected($$delete from storage.objects where name like 'bbbbbbbb%'$$) = 0);
select t.ok('alice can delete her own file', t.affected($$delete from storage.objects where name like 'aaaaaaaa%'$$) = 1);
select t.as_anon();
select t.ok('anyone can read a preview image', t.rows('select 1 from storage.objects') = 1);
select t.throws('a visitor cannot upload',
  $$insert into storage.objects (bucket_id, name) values ('invitation-previews', 'aaaaaaaa-0000-0000-0000-000000000001/v.jpg')$$, '42501');
select t.as_owner();

-- ---------- 11. Client editing (Track B, B2): client_email, my_invitations, change requests ----------
-- dave is a client with a verified email, erin has not verified hers, bob is another ordinary user, carol is the admin.
insert into auth.users (id, email, email_confirmed_at) values
  ('dddddddd-0000-0000-0000-000000000004', 'dave@example.com', now()),
  ('eeeeeeee-0000-0000-0000-000000000005', 'erin@example.com', null);
insert into public.invitations (id, slug, owner, groom_name, bride_name, template_id, published, client_email, details) values
  ('c1', 'client-one',   'aaaaaaaa-0000-0000-0000-000000000001', 'Old', 'B', 'test-t', true, 'dave@example.com',
    '{"groomEn":"Old","venueMaps":"https://maps.google.com/x","events":[]}'),
  ('c2', 'client-two',   'aaaaaaaa-0000-0000-0000-000000000001', 'E', 'F', 'test-t', true, 'erin@example.com', '{}'),
  ('c3', 'client-none',  'aaaaaaaa-0000-0000-0000-000000000001', 'G', 'H', 'test-t', true, null, '{}');

update auth.users set email_confirmed_at = now() where id = 'bbbbbbbb-0000-0000-0000-000000000002';  -- bob: verified, but not a client
select t.throws('an upper-case client email is refused', $$update public.invitations set client_email = 'Dave@Example.com' where id = 'c3'$$, '23514');
select t.throws('a client email without an @ is refused', $$update public.invitations set client_email = 'nobody' where id = 'c3'$$, '23514');

-- who is the signed-in email: only a verified one counts (D3)
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('a verified email is returned lower-cased', public.current_user_email() = 'dave@example.com');
select t.as_user('eeeeeeee-0000-0000-0000-000000000005');
select t.ok('an unverified email is not trusted', public.current_user_email() is null);
select t.as_anon();
select t.throws('a visitor cannot call current_user_email', $$select public.current_user_email()$$, '42501');
select t.throws('a visitor cannot call my_invitations', $$select * from public.my_invitations()$$, '42501');
select t.throws('a visitor cannot submit a change request',
  $$select public.submit_change_request('c1', '{"groomEn":"X"}'::jsonb, now())$$, '42501');

-- what a client can read
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('the client sees exactly the invitation linked to their email', t.rows('select 1 from public.my_invitations()') = 1);
select t.ok('my_invitations gives no owner, slug, views or client_email',
  not exists (select 1 from public.my_invitations() m where to_jsonb(m) ?| array['owner','slug','views','client_email']));
select t.ok('the client cannot read the invitations table directly', t.rows('select 1 from public.invitations') = 0);
select t.ok('the client cannot change an invitation', t.affected($$update public.invitations set groom_name = 'Hacked' where id = 'c1'$$) = 0);
select t.throws('the client cannot write a change request directly',
  $$insert into public.change_requests (invitation_id, requested_by, client_email, base_updated_at, proposed_details, changed_keys)
    values ('c1', auth.uid(), 'dave@example.com', now(), '{}', '{}')$$, '42501');
select t.as_user('eeeeeeee-0000-0000-0000-000000000005');
select t.ok('an unverified email sees no invitations', t.rows('select 1 from public.my_invitations()') = 0);
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok('another user sees no invitations', t.rows('select 1 from public.my_invitations()') = 0);

-- submitting: only allow-listed keys get through, the live invitation does not change
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select set_config('t.base', (select updated_at::text from public.my_invitations() where id = 'c1'), true);
select set_config('t.req1', public.submit_change_request('c1',
  '{"groomEn":"New","customId":"hijack","templateId":"evil","seoImage":"https://evil.test/x.jpg","published":false,"views":9999}'::jsonb,
  current_setting('t.base')::timestamptz)::text, true);
select t.ok('the request is pending and records only the allowed change',
  (select status = 'pending' and changed_keys = array['groomEn'] and proposed_details->>'groomEn' = 'New'
     and not (proposed_details ?| array['customId','templateId','seoImage','published','views'])
   from public.change_requests where id = current_setting('t.req1')::uuid));
select t.ok('the base version is the one the client started from',
  (select base_updated_at = current_setting('t.base')::timestamptz from public.change_requests where id = current_setting('t.req1')::uuid));
select t.as_owner();
select t.ok('the live invitation is unchanged', (select details->>'groomEn' = 'Old' and published and groom_name = 'Old' from public.invitations where id = 'c1'));
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('my_invitations shows the pending status', (select request_status = 'pending' from public.my_invitations() where id = 'c1'));
select t.ok('my_invitations includes proposed_details while pending',
  (select request_proposed_details is not null from public.my_invitations() where id = 'c1'));
select t.throws('a second pending request is refused',
  format($$select public.submit_change_request('c1', '{"groomEn":"Newer"}'::jsonb, %L)$$, current_setting('t.base')), '23505');

-- who can read and withdraw requests
select t.ok('the client reads their own request', t.rows('select 1 from public.change_requests') = 1);
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok('another user reads no requests', t.rows('select 1 from public.change_requests') = 0);
select t.throws('another user cannot withdraw it',
  format($$select public.withdraw_change_request(%L)$$, current_setting('t.req1')), 'P0002');
select t.throws('another user cannot submit for it',
  format($$select public.submit_change_request('c1', '{"groomEn":"Mine"}'::jsonb, %L)$$, current_setting('t.base')), 'P0002');
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('the admin reads every request', t.rows('select 1 from public.change_requests') = 1);
select t.throws('the admin cannot write a request directly', $$update public.change_requests set status = 'approved'$$, '42501');

-- the client link changing or the invitation being trashed cancels the pending request
select t.as_owner();
update public.invitations set client_email = 'dave2@example.com' where id = 'c1';
select t.ok('changing the client email cancels the pending request',
  (select status = 'superseded' from public.change_requests where id = current_setting('t.req1')::uuid));
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('the old client loses access at once', t.rows('select 1 from public.my_invitations()') = 0);
select t.throws('the old client cannot submit',
  format($$select public.submit_change_request('c1', '{"groomEn":"Late"}'::jsonb, %L)$$, current_setting('t.base')), 'P0002');
select t.as_owner();
update public.invitations set client_email = 'dave@example.com' where id = 'c1';

-- withdraw, then the checks that must fail
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select set_config('t.req2', public.submit_change_request('c1', '{"groomEn":"Second"}'::jsonb, current_setting('t.base')::timestamptz)::text, true);
select public.withdraw_change_request(current_setting('t.req2')::uuid);
select t.ok('the client can withdraw their pending request',
  (select status = 'withdrawn' from public.change_requests where id = current_setting('t.req2')::uuid));
select t.throws('a withdrawn request cannot be withdrawn again',
  format($$select public.withdraw_change_request(%L)$$, current_setting('t.req2')), 'P0002');
select t.throws('a javascript: link is refused',
  format($$select public.submit_change_request('c1', '{"venueMaps":"javascript:alert(1)"}'::jsonb, %L)$$, current_setting('t.base')), '23514');
select t.throws('a bad phone number is refused',
  format($$select public.submit_change_request('c1', '{"groomFatherPhone":"123"}'::jsonb, %L)$$, current_setting('t.base')), '23514');
select t.throws('a 2000-character name is refused',
  format($$select public.submit_change_request('c1', jsonb_build_object('groomEn', repeat('x', 2000)), %L)$$, current_setting('t.base')), '23514');
select t.throws('a request with no change is refused',
  format($$select public.submit_change_request('c1', '{"groomEn":"Old","brideEn":"","events":[]}'::jsonb, %L)$$, current_setting('t.base')), '22023');
select t.throws('a request with only keys outside the allow-list is refused',
  format($$select public.submit_change_request('c1', '{"templateId":"x","customId":"y"}'::jsonb, %L)$$, current_setting('t.base')), '22023');
select t.throws('details that are not an object are refused',
  format($$select public.submit_change_request('c1', '[1]'::jsonb, %L)$$, current_setting('t.base')), '22023');
select t.throws('a base version from the future is refused',
  $$select public.submit_change_request('c1', '{"groomEn":"Z"}'::jsonb, now() + interval '1 day')$$, '22023');
select t.throws('an invitation linked to nobody is not found',
  format($$select public.submit_change_request('c3', '{"groomEn":"Z"}'::jsonb, %L)$$, current_setting('t.base')), 'P0002');
select t.throws('an invitation linked to someone else is not found',
  format($$select public.submit_change_request('c2', '{"groomEn":"Z"}'::jsonb, %L)$$, current_setting('t.base')), 'P0002');
select t.as_user('eeeeeeee-0000-0000-0000-000000000005');
select t.throws('an unverified email cannot submit for its own linked invitation',
  format($$select public.submit_change_request('c2', '{"groomEn":"Z"}'::jsonb, %L)$$, current_setting('t.base')), '42501');

-- a list change counts, an absent key and an empty value do not
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select set_config('t.req3', public.submit_change_request('c1',
  '{"events":[{"id":"e1","name":"Haldi","date":"2026-12-01"}],"receptionEnabled":false,"muhurthamTime":""}'::jsonb,
  current_setting('t.base')::timestamptz)::text, true);
select t.ok('only the real changes are listed',
  (select changed_keys = array['events'] from public.change_requests where id = current_setting('t.req3')::uuid));
select t.as_owner();
update public.invitations set deleted_at = now() where id = 'c1';
select t.ok('trashing the invitation cancels the pending request',
  (select status = 'superseded' from public.change_requests where id = current_setting('t.req3')::uuid));
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('a trashed invitation is not listed for the client', t.rows('select 1 from public.my_invitations()') = 0);
select t.as_owner();
update public.invitations set deleted_at = null where id = 'c1';

-- rate limit: 10 requests an hour per person
insert into public.change_requests (invitation_id, requested_by, client_email, base_updated_at, proposed_details, changed_keys, status)
  select 'c1', 'dddddddd-0000-0000-0000-000000000004', 'dave@example.com', now(), '{}', '{x}', 'withdrawn' from generate_series(1, 8);
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.throws('the eleventh request in an hour is refused',
  format($$select public.submit_change_request('c1', '{"groomEn":"Again"}'::jsonb, %L)$$, current_setting('t.base')), '54000');
select t.as_owner();

-- ---------- 12. Client editing (Track B, B2): admin review, acknowledgement, audit log ----------
-- Pending requests are inserted as the database owner (dave is at the hourly limit from section 11).
insert into public.change_requests (id, invitation_id, requested_by, client_email, base_updated_at, proposed_details, changed_keys) values
  ('40000000-0000-0000-0000-000000000004', 'c1', 'dddddddd-0000-0000-0000-000000000004', 'dave@example.com', now(),
   '{"groomEn":"Rejected name","venueMaps":"https://maps.google.com/x","events":[]}', '{groomEn}');
update public.change_requests set created_at = now() + interval '1 minutes' where id = '40000000-0000-0000-0000-000000000004';

select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.throws('a client cannot review a request', $$select public.review_change_request('40000000-0000-0000-0000-000000000004', 'approve')$$, '42501');
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.throws('another user cannot review a request', $$select public.review_change_request('40000000-0000-0000-0000-000000000004', 'reject', 'no')$$, '42501');
select t.as_anon();
select t.throws('a visitor cannot review a request', $$select public.review_change_request('40000000-0000-0000-0000-000000000004', 'reject', 'no')$$, '42501');

select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.throws('an unknown decision is refused', $$select public.review_change_request('40000000-0000-0000-0000-000000000004', 'maybe')$$, '22023');
select t.throws('an unknown request is not found', $$select public.review_change_request('99999999-0000-0000-0000-000000000009', 'reject', 'x')$$, 'P0002');
select t.throws('rejecting needs a note', $$select public.review_change_request('40000000-0000-0000-0000-000000000004', 'reject', '   ')$$, '22023');
select t.throws('a 1001-character note is refused', $$select public.review_change_request('40000000-0000-0000-0000-000000000004', 'reject', repeat('n', 1001))$$, '22023');
select public.review_change_request('40000000-0000-0000-0000-000000000004', 'reject', 'Please use the full address');
select t.ok('reject records the decision, the note and who decided',
  (select status = 'rejected' and admin_note = 'Please use the full address' and reviewed_by = 'cccccccc-0000-0000-0000-000000000003' and reviewed_at is not null
   from public.change_requests where id = '40000000-0000-0000-0000-000000000004'));
select t.as_owner();
select t.ok('reject leaves the live invitation alone',
  (select details->>'groomEn' = 'Old' and groom_name = 'Old' from public.invitations where id = 'c1'));
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.throws('a decided request cannot be reviewed again', $$select public.review_change_request('40000000-0000-0000-0000-000000000004', 'approve')$$, '22023');

-- the client sees the rejection until they acknowledge it
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('the client sees the rejection and the note',
  (select request_status = 'rejected' and request_admin_note = 'Please use the full address' and request_acknowledged_at is null from public.my_invitations() where id = 'c1'));
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.throws('another user cannot acknowledge it', $$select public.acknowledge_rejection('40000000-0000-0000-0000-000000000004')$$, 'P0002');
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select public.acknowledge_rejection('40000000-0000-0000-0000-000000000004');
select t.ok('acknowledging sets the time', (select request_acknowledged_at is not null from public.my_invitations() where id = 'c1'));
select t.throws('it cannot be acknowledged twice', $$select public.acknowledge_rejection('40000000-0000-0000-0000-000000000004')$$, 'P0002');

-- approve: only the changed keys are applied, over the current live details
select t.as_owner();
insert into public.change_requests (id, invitation_id, requested_by, client_email, base_updated_at, proposed_details, changed_keys) values
  ('40000000-0000-0000-0000-000000000005', 'c1', 'dddddddd-0000-0000-0000-000000000004', 'dave@example.com', now(),
   '{"groomEn":"Approved name","weddingDate":"2027-01-15","venueMaps":"https://evil.test/x","events":[{"id":"e1","name":"Haldi"}]}', '{groomEn,weddingDate,events}');
update public.change_requests set created_at = now() + interval '2 minutes' where id = '40000000-0000-0000-0000-000000000005';
select t.ok('before approval the audit log is empty of approvals', (select count(*) from public.audit_log where action like 'approve%') = 0);
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select public.review_change_request('40000000-0000-0000-0000-000000000005', 'approve', 'Looks good');
select t.as_owner();
select t.ok('approve applies the changed keys to the live invitation',
  (select details->>'groomEn' = 'Approved name' and groom_name = 'Approved name' and event_date = date '2027-01-15'
     and details->'events'->0->>'name' = 'Haldi' from public.invitations where id = 'c1'));
select t.ok('approve does not apply a key that was not listed as changed, and keeps the rest',
  (select details->>'venueMaps' = 'https://maps.google.com/x' and bride_name = 'B' from public.invitations where id = 'c1'));
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('approve marks the request and keeps the note',
  (select status = 'approved' and admin_note = 'Looks good' and reviewed_by is not null from public.change_requests where id = '40000000-0000-0000-0000-000000000005'));
select t.ok('approve writes one audit row with different before and after hashes',
  (select count(*) = 1 and bool_and(before_hash <> after_hash and actor = 'cccccccc-0000-0000-0000-000000000003') from public.audit_log where action = 'approve'));
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('the client sees the approval', (select request_status = 'approved' and request_acknowledged_at is null from public.my_invitations() where id = 'c1'));
select public.acknowledge_rejection('40000000-0000-0000-0000-000000000005');
select t.ok('the client can dismiss an approval too', (select request_acknowledged_at is not null from public.my_invitations() where id = 'c1'));

-- D7: the invitation was edited after the client started
select t.as_owner();
insert into public.change_requests (id, invitation_id, requested_by, client_email, base_updated_at, proposed_details, changed_keys) values
  ('40000000-0000-0000-0000-000000000006', 'c1', 'dddddddd-0000-0000-0000-000000000004', 'dave@example.com', now() - interval '1 hour',
   '{"brideEn":"Late bride"}', '{brideEn}');
update public.change_requests set created_at = now() + interval '3 minutes' where id = '40000000-0000-0000-0000-000000000006';
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.throws('approve is refused when the invitation changed since the client started',
  $$select public.review_change_request('40000000-0000-0000-0000-000000000006', 'approve')$$, '40001');
select t.ok('the request is still pending after the refusal', (select status = 'pending' from public.change_requests where id = '40000000-0000-0000-0000-000000000006'));
select public.review_change_request('40000000-0000-0000-0000-000000000006', 'approve', null, true);
select t.as_owner();
select t.ok('approve with force applies it', (select bride_name = 'Late bride' from public.invitations where id = 'c1'));
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('a forced approval is marked in the audit log', (select count(*) = 1 from public.audit_log where action = 'approve-forced'));

-- the merged details are checked again against the live rules
select t.as_owner();
insert into public.change_requests (id, invitation_id, requested_by, client_email, base_updated_at, proposed_details, changed_keys) values
  ('40000000-0000-0000-0000-000000000007', 'c1', 'dddddddd-0000-0000-0000-000000000004', 'dave@example.com', now(),
   '{"venueMaps":"javascript:alert(1)"}', '{venueMaps}');
update public.change_requests set created_at = now() + interval '4 minutes' where id = '40000000-0000-0000-0000-000000000007';
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.throws('approve refuses details that break the live rules',
  $$select public.review_change_request('40000000-0000-0000-0000-000000000007', 'approve')$$, '23514');
select t.as_owner();
select t.ok('the live link is unchanged', (select details->>'venueMaps' = 'https://maps.google.com/x' from public.invitations where id = 'c1'));
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select public.review_change_request('40000000-0000-0000-0000-000000000007', 'reject', 'Link type not allowed');

-- the audit log: admins read it, nobody writes it
select t.ok('the admin reads the audit log', t.rows('select 1 from public.audit_log') = 4);
select t.throws('the admin cannot write the audit log directly', $$insert into public.audit_log (action) values ('x')$$, '42501');
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('a client reads no audit rows', t.rows('select 1 from public.audit_log') = 0);
select t.throws('a client cannot write the audit log', $$insert into public.audit_log (action) values ('x')$$, '42501');
select t.as_owner();

-- ---------- 13. Client editing (Track B, B2): notifications, client template read, role label ----------
-- Sections 11 and 12 already went through the RPCs: dave submitted 3 requests (3 admin notifications), and got 2 rejections,
-- 2 approvals and 2 cancellations (6 notifications).
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('the admin sees the 3 submit notifications and none addressed to a client',
  t.rows('select 1 from public.notifications') = 3 and t.rows($$select 1 from public.notifications where audience = 'user'$$) = 0);
select t.ok('an admin notification says who asked and what changed',
  (select payload->>'client_email' = 'dave@example.com' and payload->'changed_keys' = '["groomEn"]'::jsonb
   from public.notifications where type = 'change_submitted' order by id limit 1));
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('the client sees their 6 notifications and no admin ones',
  t.rows('select 1 from public.notifications') = 6 and t.rows($$select 1 from public.notifications where audience = 'admin'$$) = 0);
select t.ok('the client is told about rejections, approvals and cancellations',
  (select count(*) filter (where type = 'change_rejected') = 2 and count(*) filter (where type = 'change_approved') = 2
      and count(*) filter (where type = 'change_superseded') = 2 from public.notifications));
select t.ok('a rejection notification carries the admin note',
  exists (select 1 from public.notifications where type = 'change_rejected' and payload->>'note' = 'Please use the full address'));
select t.ok('the client can mark their own notification read',
  t.affected($$update public.notifications set read_at = now() where id = (select min(id) from public.notifications)$$) = 1);
select t.throws('the client cannot change anything but read_at', $$update public.notifications set type = 'x'$$, '42501');
select t.throws('the client cannot add a notification',
  $$insert into public.notifications (audience, type) values ('admin', 'fake')$$, '42501');
select t.ok('the client cannot mark an admin notification read', t.affected($$update public.notifications set read_at = now() where audience = 'admin'$$) = 0);
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok('another user sees no notifications', t.rows('select 1 from public.notifications') = 0);
select t.ok('another user cannot mark any read', t.affected('update public.notifications set read_at = now()') = 0);
select t.as_anon();
select t.throws('a visitor cannot read notifications', $$select 1 from public.notifications$$, '42501');
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.ok('an admin can mark the admin notifications read', t.affected($$update public.notifications set read_at = now() where audience = 'admin'$$) = 3);
select t.throws('an admin cannot add a notification', $$insert into public.notifications (audience, type) values ('admin', 'fake')$$, '42501');
select t.as_owner();
select t.throws('an admin notification cannot be addressed to a person',
  $$insert into public.notifications (audience, recipient_user_id, type) values ('admin', 'dddddddd-0000-0000-0000-000000000004', 'x')$$, '23514');
select t.throws('a user notification needs a person', $$insert into public.notifications (audience, type) values ('user', 'x')$$, '23514');

-- the template HTML for the client's editor preview
select t.as_user('dddddddd-0000-0000-0000-000000000004');
select t.ok('the client gets the template of their own invitation', public.client_template_html('c1') = '<p>X</p>');
select t.throws('the client cannot read the template of an unlinked invitation', $$select public.client_template_html('c3')$$, 'P0002');
select t.throws('the client cannot read the template of someone else''s invitation', $$select public.client_template_html('c2')$$, 'P0002');
select t.ok('the client still cannot read the templates table', t.rows('select 1 from public.templates') = 0);
select t.as_user('eeeeeeee-0000-0000-0000-000000000005');
select t.throws('an unverified email gets no template', $$select public.client_template_html('c2')$$, '42501');
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.throws('another user gets no template', $$select public.client_template_html('c1')$$, 'P0002');
select t.as_anon();
select t.throws('a visitor gets no template', $$select public.client_template_html('c1')$$, '42501');

-- the label in the menu: new accounts are Members, an admin row makes the account an Administrator
select t.as_owner();
select t.ok('an ordinary account is a Member', (select role = 'Member' from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select t.ok('an admin account is labelled Administrator', (select role = 'Administrator' from public.profiles where id = 'cccccccc-0000-0000-0000-000000000003'));
insert into auth.users (id, email) values ('ffffffff-0000-0000-0000-000000000006', 'frank@example.com');
select t.ok('a new sign-up is a Member', (select role = 'Member' from public.profiles where id = 'ffffffff-0000-0000-0000-000000000006'));
insert into public.admins (user_id, email) values ('ffffffff-0000-0000-0000-000000000006', 'frank@example.com');
select t.ok('adding an admin row relabels the profile', (select role = 'Administrator' from public.profiles where id = 'ffffffff-0000-0000-0000-000000000006'));
select t.ok('the label gives no permission: a Member row in profiles does not make an admin', not (
  select exists (select 1 from public.admins where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')));

rollback;
