-- Service-only membership management. Apply after 001_schema.sql.
create or replace function public.finance_add_member(p_actor uuid,p_company text,p_email text,p_role text)
returns void language plpgsql security definer set search_path=public as $$
declare target uuid; target_name text;
begin
 perform 1 from companies where id=p_company for update;
 if not exists(select 1 from user_roles where company_id=p_company and user_id=p_actor and role='admin') then raise exception 'Administrator required'; end if;
 if p_role not in ('admin','finance','viewer') then raise exception 'Invalid role'; end if;
 select id,coalesce(raw_user_meta_data->>'full_name',email) into target,target_name from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if target is null then raise exception 'A verified account with this email is required'; end if;
 if exists(select 1 from user_roles where company_id=p_company and user_id=target) then raise exception 'Account is already a company member'; end if;
 insert into profiles(id,user_id,company_id,full_name,email) values(gen_random_uuid()::text,target,p_company,target_name,lower(trim(p_email)));
 insert into user_roles(id,user_id,company_id,role) values(gen_random_uuid()::text,target,p_company,p_role);
 insert into audit_logs(id,company_id,user_id,action,entity_type,entity_id,previous_state,new_state,metadata) values(gen_random_uuid()::text,p_company,p_actor::text,'CREATE','user_roles',target::text,null,jsonb_build_object('role',p_role),jsonb_build_object('reason','Administrator added a verified account'));
 update companies set revision=revision+1 where id=p_company;
end $$;
revoke all on function public.finance_add_member(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.finance_add_member(uuid,text,text,text) to service_role;
