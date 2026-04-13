-- Populate age and age_mode on signup from auth user metadata (set by the app during signUp).
-- Keeps profiles complete when email confirmation is enabled (no client session yet).

create or replace function public.handle_new_sb_user()
returns trigger as $$
declare
  v_age integer;
  v_mode text;
  raw_age text;
begin
  raw_age := nullif(trim(new.raw_user_meta_data->>'age'), '');
  if raw_age is not null and raw_age ~ '^[0-9]+$' then
    v_age := raw_age::integer;
    if v_age < 1 or v_age > 120 then
      v_age := null;
    end if;
  else
    v_age := null;
  end if;

  if v_age is not null then
    if v_age <= 10 then
      v_mode := 'young_reader';
    elsif v_age <= 17 then
      v_mode := 'teen';
    else
      v_mode := 'adult';
    end if;
  else
    v_mode := null;
  end if;

  insert into public.sb_profiles (id, display_name, age, age_mode)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    v_age,
    v_mode
  );
  return new;
end;
$$ language plpgsql security definer;
