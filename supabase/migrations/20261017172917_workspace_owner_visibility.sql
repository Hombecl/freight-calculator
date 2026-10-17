-- RETURNING checks the newly inserted row before a stable lookup can see it.
alter policy dp_workspace_read on public.dp_workspaces using(owner_id=(select auth.uid()) or dp_private.workspace_role(id) is not null);
