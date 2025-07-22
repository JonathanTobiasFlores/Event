-- Add color column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS color text;

-- Update the trigger function to insert a default color for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, color)
  values (new.id, new.email, '#000000');
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
