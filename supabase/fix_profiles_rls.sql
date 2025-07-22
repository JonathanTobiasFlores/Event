-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own profile
CREATE POLICY IF NOT EXISTS "Users can select their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- (Optional) Create a trigger to auto-create profile rows on signup
create or replace function public.handle_new_user()
returns trigger as 31948
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
31948 language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

