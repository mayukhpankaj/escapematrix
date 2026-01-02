-- Create user_pro_status table
CREATE TABLE IF NOT EXISTS public.user_pro_status (
  id serial not null,
  user_id character varying(255) not null,
  is_pro boolean null default false,
  payment_id character varying(255) null,
  user_name character varying(255) null,
  user_email character varying(255) null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint user_pro_status_pkey primary key (id),
  constraint user_pro_status_user_id_key unique (user_id)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_pro_status_user_id ON public.user_pro_status USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_user_pro_status_payment_id ON public.user_pro_status USING btree (payment_id) TABLESPACE pg_default;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_pro_status_updated_at ON public.user_pro_status;

CREATE TRIGGER update_user_pro_status_updated_at 
    BEFORE UPDATE ON public.user_pro_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.user_pro_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own pro status" ON public.user_pro_status;
DROP POLICY IF EXISTS "Users can insert their own pro status" ON public.user_pro_status;
DROP POLICY IF EXISTS "Users can update their own pro status" ON public.user_pro_status;

-- Create RLS policies
CREATE POLICY "Users can view their own pro status" ON public.user_pro_status
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own pro status" ON public.user_pro_status
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own pro status" ON public.user_pro_status
    FOR UPDATE USING (auth.uid()::text = user_id);
