-- ===========================================
-- A.R.C SENTINEL - Supabase Database Schema
-- ===========================================
-- Run this SQL in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- USERS TABLE
-- ===========================================
-- Note: Supabase Auth handles the main auth.users table
-- This is for additional user metadata

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'viewer')),
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ===========================================
-- EVENTS TABLE
-- ===========================================
-- Stores all security telemetry events

CREATE TABLE IF NOT EXISTS public.events (
    id VARCHAR(32) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source_ip VARCHAR(45),
    details JSONB DEFAULT '{}',
    anomaly_score FLOAT DEFAULT 0.0,
    ml_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON public.events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_events_severity ON public.events(severity);
CREATE INDEX IF NOT EXISTS idx_events_ml_flagged ON public.events(ml_flagged) WHERE ml_flagged = true;
CREATE INDEX IF NOT EXISTS idx_events_source_ip ON public.events(source_ip);

-- ===========================================
-- INCIDENTS TABLE
-- ===========================================
-- Stores security incidents created from detected threats

CREATE TABLE IF NOT EXISTS public.incidents (
    id VARCHAR(32) PRIMARY KEY,
    threat_type VARCHAR(100),
    type VARCHAR(100), -- Alias for frontend compatibility
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'closed')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    event_id VARCHAR(32) REFERENCES public.events(id) ON DELETE SET NULL,
    anomaly_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW(), -- Alias for frontend compatibility
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_threat_type ON public.incidents(threat_type);

-- ===========================================
-- FORENSIC REPORTS TABLE
-- ===========================================
-- Stores forensic snapshots for incidents

CREATE TABLE IF NOT EXISTS public.forensic_reports (
    id VARCHAR(32) PRIMARY KEY DEFAULT substring(md5(random()::text), 1, 16),
    incident_id VARCHAR(32) REFERENCES public.incidents(id) ON DELETE CASCADE,
    processes JSONB DEFAULT '[]',
    connections JSONB DEFAULT '[]',
    packet_data JSONB DEFAULT '[]',
    forensic_data JSONB DEFAULT '{}',
    gemini_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW() -- Alias for compatibility
);

-- Create index for incident lookups
CREATE INDEX IF NOT EXISTS idx_forensic_reports_incident_id ON public.forensic_reports(incident_id);

-- ===========================================
-- ML MODEL TABLE
-- ===========================================
-- Stores serialized ML model

CREATE TABLE IF NOT EXISTS public.ml_model (
    id INTEGER PRIMARY KEY DEFAULT 1,
    model_data TEXT, -- Base64 encoded pickled model
    trained_at TIMESTAMPTZ DEFAULT NOW(),
    training_samples INTEGER DEFAULT 0,
    model_version VARCHAR(50) DEFAULT '1.0',
    contamination FLOAT DEFAULT 0.1,
    threshold FLOAT DEFAULT 0.75
);

-- Ensure only one model row exists
INSERT INTO public.ml_model (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- ML SCORES TABLE (Optional - for tracking)
-- ===========================================
-- Stores individual ML scores for events

CREATE TABLE IF NOT EXISTS public.ml_scores (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(32) REFERENCES public.events(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    is_anomaly BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ml_scores_event_id ON public.ml_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_ml_scores_is_anomaly ON public.ml_scores(is_anomaly) WHERE is_anomaly = true;

-- ===========================================
-- AUDIT LOG TABLE (Optional)
-- ===========================================
-- Tracks user actions for compliance

CREATE TABLE IF NOT EXISTS public.audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user action lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================
-- Enable RLS on all tables

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forensic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (allow all for now)
-- In production, you'd want more granular policies

CREATE POLICY "Allow authenticated read on users" ON public.users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on events" ON public.events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all on events" ON public.events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on incidents" ON public.incidents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all on incidents" ON public.incidents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on forensic_reports" ON public.forensic_reports
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all on forensic_reports" ON public.forensic_reports
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated all on ml_model" ON public.ml_model
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated all on ml_scores" ON public.ml_scores
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on audit_log" ON public.audit_log
    FOR SELECT TO authenticated USING (true);

-- Allow service role full access (for backend API)
CREATE POLICY "Allow service role full access on users" ON public.users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on events" ON public.events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on incidents" ON public.incidents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on forensic_reports" ON public.forensic_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on ml_model" ON public.ml_model
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on ml_scores" ON public.ml_scores
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on audit_log" ON public.audit_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow anonymous access for API key authentication
CREATE POLICY "Allow anon read on events" ON public.events
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on events" ON public.events
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon all on events" ON public.events
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read on incidents" ON public.incidents
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon all on incidents" ON public.incidents
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read on forensic_reports" ON public.forensic_reports
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon all on forensic_reports" ON public.forensic_reports
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon all on ml_model" ON public.ml_model
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon all on ml_scores" ON public.ml_scores
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read on users" ON public.users
    FOR SELECT TO anon USING (true);

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SEED DATA (Optional)
-- ===========================================

-- Insert default admin user
INSERT INTO public.users (email, role, full_name)
VALUES ('admin@arc.com', 'admin', 'System Administrator')
ON CONFLICT (email) DO NOTHING;

-- ===========================================
-- VIEWS FOR DASHBOARD STATISTICS
-- ===========================================

-- View for dashboard stats
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM public.events) as total_events,
    (SELECT COUNT(*) FROM public.incidents) as total_incidents,
    (SELECT COUNT(*) FROM public.incidents WHERE status = 'active') as active_incidents,
    (SELECT COUNT(*) FROM public.events WHERE ml_flagged = true) as ml_flagged;

-- View for recent events
CREATE OR REPLACE VIEW public.recent_events AS
SELECT *
FROM public.events
ORDER BY timestamp DESC
LIMIT 100;

-- View for active incidents with reports
CREATE OR REPLACE VIEW public.active_incidents_with_reports AS
SELECT 
    i.*,
    fr.gemini_summary,
    fr.created_at as report_created_at
FROM public.incidents i
LEFT JOIN public.forensic_reports fr ON i.id = fr.incident_id
WHERE i.status = 'active'
ORDER BY i.created_at DESC;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ===========================================
-- COMPLETED
-- ===========================================
-- Your A.R.C SENTINEL database is now set up!
-- 
-- Tables created:
-- - users
-- - events
-- - incidents
-- - forensic_reports
-- - ml_model
-- - ml_scores
-- - audit_log
--
-- Views created:
-- - dashboard_stats
-- - recent_events
-- - active_incidents_with_reports
-- ===========================================
