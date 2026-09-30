insert into rooms (id, name) values
  ('94e3e051-613f-427c-bbb3-2e99322a144e', 'Logan''s bedroom')
 on conflict (name) do nothing;

insert into sensors (id, room_id, name, device_key_hash)
select 'f6af7002-7100-4b13-b04b-1ca1245d746b', id, name || ' sensor', 'local-' || lower(replace(name, ' ', '-'))
from rooms
where name = 'Logan''s bedroom'
on conflict (device_key_hash) do nothing;
