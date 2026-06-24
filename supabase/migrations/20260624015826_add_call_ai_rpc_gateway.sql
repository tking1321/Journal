-- Install extensions needed for server-side HTTP and JWT signing
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Gateway function: proxies AI requests through the DB layer so the
-- browser never has to reach the edge function directly (avoids CORS
-- restrictions in sandboxed preview environments).
CREATE OR REPLACE FUNCTION public.call_ai(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_token   text;
  v_resp    record;
BEGIN
  -- Require an authenticated caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Mint a short-lived user JWT so the edge function can validate the caller
  v_token := extensions.sign(
    json_build_object(
      'sub',  v_user_id::text,
      'role', 'authenticated',
      'iss',  'supabase',
      'iat',  extract(epoch from now())::integer,
      'exp',  extract(epoch from now())::integer + 120
    )::json,
    current_setting('app.settings.jwt_secret')
  );

  -- POST to the edge function server-side (no browser, no CORS)
  SELECT status, content
  INTO   v_resp
  FROM   extensions.http(
    ROW(
      'POST',
      'https://soefnjuxsupprkafmpyl.supabase.co/functions/v1/generate-ai',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || v_token),
        extensions.http_header('Content-Type',  'application/json')
      ],
      'application/json',
      payload::text
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
