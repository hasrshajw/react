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

rollback;
