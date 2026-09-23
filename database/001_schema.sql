-- Apply in the SQL editor of a Supabase-compatible Lovable PostgreSQL project.
create extension if not exists pgcrypto;
create table public.companies(id text primary key, name text not null, currency_code text not null default 'INR' check(currency_code='INR'), opening_cash_minor bigint not null default 0 check(opening_cash_minor>=0), opening_date date not null default current_date, revision integer not null default 0, created_at timestamptz not null default now());
create table public.profiles(id text primary key,user_id uuid not null references auth.users(id),company_id text not null references companies(id),full_name text not null,email text not null,created_at timestamptz not null default now(),unique(user_id,company_id));
create table public.user_roles(id text primary key,user_id uuid not null references auth.users(id),company_id text not null references companies(id),role text not null check(role in ('admin','finance','viewer')),created_at timestamptz not null default now(),unique(user_id,company_id));
create table public.vendors(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),name text not null,email text not null default '',category text not null default '',primary key(company_id,id));
create index vendors_company_idx on public.vendors(company_id);
create table public.categories(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),name text not null,primary key(company_id,id));
create index categories_company_idx on public.categories(company_id);
create table public.invoices(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),vendor_id text not null,category_id text not null,invoice_number text not null,invoice_date date not null,due_date date not null,scheduled_payment_date date,subtotal_minor bigint not null check(subtotal_minor>=0),tax_minor bigint not null check(tax_minor>=0),total_minor bigint not null check(total_minor=subtotal_minor+tax_minor),currency_code text not null check(currency_code='INR'),status text not null check(status in ('DRAFT','EXTRACTED','PENDING_REVIEW','APPROVED','SCHEDULED','PAID','REJECTED','INVESTIGATION')),source text not null,description text not null default '',file_id text,approved_at timestamptz,approved_by text,confirmed_at timestamptz,check(due_date>=invoice_date),foreign key(company_id,vendor_id) references vendors(company_id,id),foreign key(company_id,category_id) references categories(company_id,id),primary key(company_id,id));
create index invoices_company_idx on public.invoices(company_id);
create table public.payments(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),invoice_id text not null,amount_minor bigint not null check(amount_minor>0),payment_date date not null,currency_code text not null check(currency_code='INR'),reference text not null,status text not null check(status='COMPLETED'),unique(company_id,reference),foreign key(company_id,invoice_id) references invoices(company_id,id),primary key(company_id,id));
create index payments_company_idx on public.payments(company_id);
create table public.receivables(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),customer_name text not null,reference_number text not null,issue_date date not null,due_date date not null,amount_minor bigint not null check(amount_minor>0),received_minor bigint not null default 0 check(received_minor>=0 and received_minor<=amount_minor),currency_code text not null check(currency_code='INR'),unique(company_id,reference_number),check(due_date>=issue_date),primary key(company_id,id));
create index receivables_company_idx on public.receivables(company_id);
create table public.receipts(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),receivable_id text not null,amount_minor bigint not null check(amount_minor>0),receipt_date date not null,reference text not null,unique(company_id,reference),foreign key(company_id,receivable_id) references receivables(company_id,id),primary key(company_id,id));
create index receipts_company_idx on public.receipts(company_id);
create table public.budgets(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),category_id text not null,period_start date not null,period_end date not null,budget_minor bigint not null check(budget_minor>0),currency_code text not null check(currency_code='INR'),check(period_end>=period_start),foreign key(company_id,category_id) references categories(company_id,id),primary key(company_id,id));
create index budgets_company_idx on public.budgets(company_id);
create table public.alerts(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),invoice_id text,alert_type text not null,severity text not null,title text not null,description text,signal_data jsonb,evidence jsonb,status text not null default 'OPEN',primary key(company_id,id));
create index alerts_company_idx on public.alerts(company_id);
create table public.recommendations(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),status text not null check(status in ('OPEN','REVIEWED','ACCEPTED','DISMISSED','COMPLETED')),reason text not null default '',primary key(company_id,id));
create index recommendations_company_idx on public.recommendations(company_id);
create table public.audit_logs(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),user_id text not null,action text not null,entity_type text not null,entity_id text not null,previous_state jsonb,new_state jsonb,metadata jsonb,primary key(company_id,id));
create index audit_logs_company_idx on public.audit_logs(company_id);
create table public.imports(id text not null,company_id text not null references companies(id),created_at timestamptz not null default now(),file_hash text not null,file_name text not null,total_rows integer not null,valid_rows integer not null,status text not null,unique(company_id,file_hash),primary key(company_id,id));
create index imports_company_idx on public.imports(company_id);
create index invoices_lookup_idx on invoices(company_id,vendor_id,invoice_number);
create index invoices_due_idx on invoices(company_id,due_date,status);
create index invoices_category_idx on invoices(company_id,category_id,invoice_date);
create index payments_invoice_idx on payments(company_id,invoice_id);
create index audit_time_idx on audit_logs(company_id,created_at desc);
create or replace function public.is_member(c text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from user_roles where user_id=auth.uid() and company_id=c) $$;
revoke all on function public.is_member(text) from public;
grant execute on function public.is_member(text) to authenticated;
alter table public.companies enable row level security;
revoke all on public.companies from anon,authenticated;
grant select on public.companies to authenticated;
create policy company_read on public.companies for select to authenticated using(public.is_member(id));
alter table public.profiles enable row level security;
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
create policy company_read on public.profiles for select to authenticated using(public.is_member(company_id));
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon,authenticated;
grant select on public.user_roles to authenticated;
create policy company_read on public.user_roles for select to authenticated using(public.is_member(company_id));
alter table public.vendors enable row level security;
revoke all on public.vendors from anon,authenticated;
grant select on public.vendors to authenticated;
create policy company_read on public.vendors for select to authenticated using(public.is_member(company_id));
alter table public.categories enable row level security;
revoke all on public.categories from anon,authenticated;
grant select on public.categories to authenticated;
create policy company_read on public.categories for select to authenticated using(public.is_member(company_id));
alter table public.invoices enable row level security;
revoke all on public.invoices from anon,authenticated;
grant select on public.invoices to authenticated;
create policy company_read on public.invoices for select to authenticated using(public.is_member(company_id));
alter table public.payments enable row level security;
revoke all on public.payments from anon,authenticated;
grant select on public.payments to authenticated;
create policy company_read on public.payments for select to authenticated using(public.is_member(company_id));
alter table public.receivables enable row level security;
revoke all on public.receivables from anon,authenticated;
grant select on public.receivables to authenticated;
create policy company_read on public.receivables for select to authenticated using(public.is_member(company_id));
alter table public.receipts enable row level security;
revoke all on public.receipts from anon,authenticated;
grant select on public.receipts to authenticated;
create policy company_read on public.receipts for select to authenticated using(public.is_member(company_id));
alter table public.budgets enable row level security;
revoke all on public.budgets from anon,authenticated;
grant select on public.budgets to authenticated;
create policy company_read on public.budgets for select to authenticated using(public.is_member(company_id));
alter table public.alerts enable row level security;
revoke all on public.alerts from anon,authenticated;
grant select on public.alerts to authenticated;
create policy company_read on public.alerts for select to authenticated using(public.is_member(company_id));
alter table public.recommendations enable row level security;
revoke all on public.recommendations from anon,authenticated;
grant select on public.recommendations to authenticated;
create policy company_read on public.recommendations for select to authenticated using(public.is_member(company_id));
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon,authenticated;
grant select on public.audit_logs to authenticated;
create policy company_read on public.audit_logs for select to authenticated using(public.is_member(company_id));
alter table public.imports enable row level security;
revoke all on public.imports from anon,authenticated;
grant select on public.imports to authenticated;
create policy company_read on public.imports for select to authenticated using(public.is_member(company_id));
-- CAS revision lock prevents lost updates; all changes and audit events commit atomically.
create or replace function public.finance_commit(p_company text,p_revision integer,p_changes jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare current_revision integer; t text; cols text; assignments text; entry jsonb;
begin
 select revision into current_revision from companies where id=p_company for update;
 if not found or current_revision<>p_revision then raise exception 'Ledger changed. Refresh and retry.'; end if;
 for t,entry in select key,value from jsonb_each(p_changes) loop
  if t='company' then
   if entry->>'id' is distinct from p_company then raise exception 'Company mismatch'; end if;
   update companies set name=entry->>'name',opening_cash_minor=(entry->>'opening_cash_minor')::bigint,opening_date=(entry->>'opening_date')::date where id=p_company;
   continue;
  end if;
  if t not in ('vendors','categories','invoices','payments','receivables','receipts','budgets','alerts','recommendations','audit_logs','imports') then raise exception 'Invalid table'; end if;
  if exists(select 1 from jsonb_array_elements(entry) r where r->>'company_id' is distinct from p_company) then raise exception 'Company mismatch'; end if;
  select string_agg(quote_ident(column_name),',' order by ordinal_position), string_agg(format('%I=excluded.%I',column_name,column_name),',' order by ordinal_position) filter(where column_name not in ('id','company_id','created_at')) into cols,assignments from information_schema.columns where table_schema='public' and table_name=t;
  if t='audit_logs' then
   execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I,$1)',t,cols,cols,t) using entry;
  else
   execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I,$1) on conflict(company_id,id) do update set %s',t,cols,cols,t,assignments) using entry;
  end if;
 end loop;
 update companies set revision=revision+1 where id=p_company;
 return current_revision+1;
end $$;
revoke all on function public.finance_commit(text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.finance_commit(text,integer,jsonb) to service_role;
-- Role assignment is an authenticated admin operation, logged in the same transaction.
create or replace function public.finance_set_role(p_actor uuid,p_company text,p_user uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$
declare old_role text;
begin
 perform 1 from companies where id=p_company for update;
 if not exists(select 1 from user_roles where user_id=p_actor and company_id=p_company and role='admin') then raise exception 'Administrator required'; end if;
 if p_role not in ('admin','finance','viewer') then raise exception 'Invalid role'; end if;
 select role into old_role from user_roles where user_id=p_user and company_id=p_company;
 if old_role is null then raise exception 'User must already belong to company'; end if;
 if old_role='admin' and p_role<>'admin' and (select count(*) from user_roles where company_id=p_company and role='admin')<2 then raise exception 'Cannot remove the last administrator'; end if;
 update user_roles set role=p_role where user_id=p_user and company_id=p_company;
 insert into audit_logs(id,company_id,user_id,action,entity_type,entity_id,previous_state,new_state,metadata) values(gen_random_uuid()::text,p_company,p_actor::text,'ROLE_CHANGED','user',p_user::text,to_jsonb(old_role),to_jsonb(p_role),'{}');
end $$;
revoke all on function public.finance_set_role(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.finance_set_role(uuid,text,uuid,text) to service_role;
-- Private documents: access is granted only with company-scoped server-issued signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('invoices','invoices',false,10485760,array['application/pdf','image/png','image/jpeg']) on conflict(id) do nothing;

create or replace function public.finance_onboard(p_user uuid,p_name text,p_email text,p_company_name text) returns text language plpgsql security definer set search_path=public as $$
declare cid text;
begin
 perform pg_advisory_xact_lock(hashtext(p_user::text));
 select company_id into cid from user_roles where user_id=p_user limit 1;
 if cid is not null then return cid; end if;
 cid:=gen_random_uuid()::text;
 insert into companies(id,name) values(cid,p_company_name);
 insert into profiles(id,user_id,company_id,full_name,email) values(gen_random_uuid()::text,p_user,cid,p_name,p_email);
 insert into user_roles(id,user_id,company_id,role) values(gen_random_uuid()::text,p_user,cid,'admin');
 insert into categories(id,company_id,name) values(gen_random_uuid()::text,cid,'Technology'),(gen_random_uuid()::text,cid,'Operations'),(gen_random_uuid()::text,cid,'Logistics');
 insert into audit_logs(id,company_id,user_id,action,entity_type,entity_id,metadata) values(gen_random_uuid()::text,cid,p_user::text,'COMPANY_CREATED','company',cid,'{}');
 return cid;
end $$;
revoke all on function public.finance_onboard(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.finance_onboard(uuid,text,text,text) to service_role;

create or replace function public.finance_snapshot(p_company text) returns jsonb language sql stable security definer set search_path=public as $$ select jsonb_build_object('alerts',coalesce((select jsonb_agg(to_jsonb(x)) from alerts x where x.company_id=c.id),'[]'::jsonb),'company',to_jsonb(c),'revision',c.revision,'vendors',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from vendors x where x.company_id=c.id),'[]'::jsonb),'categories',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from categories x where x.company_id=c.id),'[]'::jsonb),'invoices',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from invoices x where x.company_id=c.id),'[]'::jsonb),'payments',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from payments x where x.company_id=c.id),'[]'::jsonb),'receivables',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from receivables x where x.company_id=c.id),'[]'::jsonb),'receipts',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from receipts x where x.company_id=c.id),'[]'::jsonb),'budgets',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from budgets x where x.company_id=c.id),'[]'::jsonb),'audit_logs',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from audit_logs x where x.company_id=c.id),'[]'::jsonb),'recommendations',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from recommendations x where x.company_id=c.id),'[]'::jsonb),'imports',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from imports x where x.company_id=c.id),'[]'::jsonb)) from companies c where c.id=p_company $$;
revoke all on function public.finance_snapshot(text) from public,anon,authenticated;
grant execute on function public.finance_snapshot(text) to service_role;
grant all on all tables in schema public to service_role;
