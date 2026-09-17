GRANT INSERT ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "allowed admin emails can claim admin role" ON public.user_roles;

CREATE POLICY "allowed admin emails can claim admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'::public.app_role
  AND lower(coalesce(auth.jwt() ->> 'email', '')) IN ('bagula2nogp111@gmail.com', 'nitush6488@gmail.com')
);