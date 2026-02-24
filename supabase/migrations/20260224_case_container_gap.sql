ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS container_gap integer DEFAULT 0;
COMMENT ON COLUMN public.cases.container_gap IS 'Gap entre containers em pixels';
