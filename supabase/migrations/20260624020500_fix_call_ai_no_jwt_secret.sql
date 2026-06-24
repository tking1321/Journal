-- Replace call_ai with a version that does NOT need app.settings.jwt_secret.
-- Instead of minting a JWT, we pass the verified user_id from auth.uid() in the
-- request body alongside the project anon key as the bearer token.
-- The edge function detects this internal path by checking that the bearer token
-- decodes to role=anon (the project anon key) and _user_id is present.

CREATE OR REPLACE FUNCTION public.call_ai(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_resp    record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- POST to the edge function server-side (no browser, no CORS).
  -- We pass the anon key as the bearer so the edge function can validate the
  -- call originates from this project, and _user_id so it knows whose context to use.
  SELECT status, content
  INTO   v_resp
  FROM   extensions.http(
    ROW(
      'POST',
      'https://soefnjuxsupprkafmpyl.supabase.co/functions/v1/generate-ai',
      ARRAY[
        extensions.http_header(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvZWZuanV4c3VwcHJrYWZtcHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzY1MTUsImV4cCI6MjA5NzY1MjUxNX0.O8w5mFid3F_8y7iAoziGVjm8WBPZjFMKrI8bQftx4mQ'
        ),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      (payload || jsonb_build_object('_user_id', v_user_id))::text
    )::extensions.http_request
  );

  RETURN v_resp.content::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.call_ai(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.call_ai(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.call_ai(jsonb) TO   authenticated;
