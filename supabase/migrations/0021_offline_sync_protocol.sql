-- Offline-first synchronization protocol.
-- Durable idempotency, revision metadata and server-side authorization.

CREATE TABLE IF NOT EXISTS offline_mutation_receipts (
  mutation_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create','update','delete')),
  client_version BIGINT NOT NULL DEFAULT 0,
  base_version BIGINT,
  device_id TEXT NOT NULL,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_receipts_user_created
  ON offline_mutation_receipts(user_id, created_at DESC);

ALTER TABLE offline_mutation_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own offline mutation receipts" ON offline_mutation_receipts;
CREATE POLICY "Users read own offline mutation receipts"
  ON offline_mutation_receipts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages offline mutation receipts" ON offline_mutation_receipts;
CREATE POLICY "Service role manages offline mutation receipts"
  ON offline_mutation_receipts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION apply_offline_mutation(
  p_mutation_id TEXT,
  p_user_id UUID,
  p_entity TEXT,
  p_entity_id TEXT,
  p_operation TEXT,
  p_device_id TEXT,
  p_client_version BIGINT,
  p_base_version BIGINT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing JSONB;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'offline mutation user mismatch';
  END IF;

  SELECT response INTO v_existing
    FROM offline_mutation_receipts
   WHERE mutation_id = p_mutation_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing || jsonb_build_object('duplicate', true);
  END IF;

  -- This function is deliberately a protocol gate, not a generic table writer.
  -- Entity adapters should call it only after validating their entity-specific
  -- authorization and merge rules. Unknown entities are rejected here.
  IF p_entity NOT IN ('tasks','subjects','learn_lessons','projects','project_evidence','project_milestones') THEN
    RAISE EXCEPTION 'unsupported offline entity: %', p_entity;
  END IF;

  v_result := jsonb_build_object(
    'accepted', true,
    'duplicate', false,
    'mutationId', p_mutation_id,
    'entity', p_entity,
    'entityId', p_entity_id,
    'operation', p_operation,
    'clientVersion', p_client_version,
    'baseVersion', p_base_version,
    'deviceId', p_device_id
  );

  INSERT INTO offline_mutation_receipts (
    mutation_id,user_id,entity,entity_id,operation,client_version,base_version,device_id,response
  ) VALUES (
    p_mutation_id,p_user_id,p_entity,p_entity_id,p_operation,p_client_version,p_base_version,p_device_id,v_result
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION apply_offline_mutation(TEXT,UUID,TEXT,TEXT,TEXT,TEXT,BIGINT,BIGINT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_offline_mutation(TEXT,UUID,TEXT,TEXT,TEXT,TEXT,BIGINT,BIGINT,JSONB) TO authenticated;
