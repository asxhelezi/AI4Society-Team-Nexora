-- The public map shows only reports that are in progress or resolved: the citizen stages
-- "Në proces" (assigned, in_progress, blocked) and "Përfunduar" (resolved, published).
-- Accepted reports that nobody is working on yet stay off the map. The photo policy uses
-- the same function, so photos follow the same rule.
create or replace function public.is_public_status(p_status text) returns boolean
language sql immutable as $$
  select p_status in ('assigned', 'in_progress', 'blocked', 'resolved', 'published')
$$;
