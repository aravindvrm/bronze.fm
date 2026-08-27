-- The Atonomos reader interface, and the pin that points at it.
--
-- 20260821040000 tried to pin the paper but could only no-op: the `content`
-- row it needed did not exist yet, because the previous migration created the
-- project shell alone. This adds the interface row so `/@dean/atonomos/read`
-- resolves and the pin has a target.
--
-- The row is the INTERFACE, not the paper. Its body is still absent and is
-- ingested out of band — this repository is public and the whitepaper is
-- unpublished, so its prose is never committed, the same posture `Bronze/`
-- has for the masters.

insert into content (owner_creator_id, project_id, type, title, published, sort_order)
select c.id, p.id, 'ereader', 'Autonomous: The Agentic Enterprise', true, 0
from creators c
join projects p on p.owner_creator_id = c.id and p.slug = 'atonomos'
where c.slug = 'dean'
on conflict (project_id, type) do nothing;

-- Attribution, so the reader can name the author rather than showing a
-- headline with nobody attached.
insert into content_creators (content_id, creator_id, role, sort_order)
select ct.id, c.id, 'writer', 0
from creators c
join projects p on p.owner_creator_id = c.id and p.slug = 'atonomos'
join content ct on ct.project_id = p.id and ct.type = 'ereader'
where c.slug = 'dean'
on conflict do nothing;

-- The pin 20260821040000 could not create.
insert into creator_pins (creator_id, content_id, sort_order)
select c.id, ct.id, 2
from creators c
join projects p on p.owner_creator_id = c.id and p.slug = 'atonomos'
join content ct on ct.project_id = p.id and ct.type = 'ereader'
where c.slug = 'dean'
  and not exists (select 1 from creator_pins cp where cp.content_id = ct.id);
