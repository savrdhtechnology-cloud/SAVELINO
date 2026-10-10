-- Privacy: permanently erases every customer photo and preview for a session on request.
-- Image data is overwritten with a 1x1 blank pixel, outputs are cleared and the session
-- is marked removed so it no longer appears anywhere.
-- NOTE: apply from the Supabase SQL editor if the MCP apply is not approved.
create or replace function public.tryon_erase(p_session uuid, p_guest uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not private.tryon_can_access(p_session, p_guest) then raise exception 'not_found'; end if;
  update public.virtual_try_on_inputs
    set image_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        image_width = 1, image_height = 1
    where session_id = p_session;
  update public.virtual_try_on_outputs set image_url = null, provider_response_meta = jsonb_build_object('erased', true)
    where session_id = p_session;
  update public.virtual_try_on_sessions set status = 'deleted', updated_at = now() where id = p_session;
  insert into public.virtual_try_on_events (session_id, event_type) values (p_session, 'images_erased');
end;
$$;
revoke all on function public.tryon_erase(uuid, uuid) from public;
grant execute on function public.tryon_erase(uuid, uuid) to anon, authenticated;
