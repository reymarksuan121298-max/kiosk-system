-- Kiosk Attendance System Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication and admin management)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Storing plain text password (NOT for production)
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'teller' CHECK (role IN ('admin', 'teller', 'security')),
    contact_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kiosks table
CREATE TABLE IF NOT EXISTS kiosks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geofence_radius INTEGER DEFAULT 30, -- in meters
    device_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    contact_number VARCHAR(50),
    assigned_kiosk_id UUID REFERENCES kiosks(id),
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Codes table
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID UNIQUE NOT NULL, -- The ID embedded in the QR code
    kiosk_id UUID REFERENCES kiosks(id) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('checkin', 'checkout', 'attendance')),
    encrypted_data TEXT NOT NULL,
    signature UUID NOT NULL, -- Unique signature to prevent duplication
    background_image_url TEXT,
    created_by UUID REFERENCES users(id),
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    kiosk_id UUID REFERENCES kiosks(id) NOT NULL,
    qr_code_id UUID REFERENCES qr_codes(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('checkin', 'checkout', 'attendance')),
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    device_id VARCHAR(255),
    device_info JSONB,
    is_valid BOOLEAN DEFAULT TRUE,
    invalidation_reason TEXT,
    geofence_distance INTEGER, -- Distance from kiosk center in meters
    is_offline_sync BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alarms table
CREATE TABLE IF NOT EXISTS alarms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    employee_id UUID REFERENCES employees(id),
    kiosk_id UUID REFERENCES kiosks(id),
    device_id VARCHAR(255),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution TEXT,
    resolution_notes TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    user_id UUID REFERENCES users(id),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_kiosk ON attendance_logs(kiosk_id);
CREATE INDEX IF NOT EXISTS idx_attendance_scanned_at ON attendance_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance_logs(type);

CREATE INDEX IF NOT EXISTS idx_alarms_type ON alarms(type);
CREATE INDEX IF NOT EXISTS idx_alarms_severity ON alarms(severity);
CREATE INDEX IF NOT EXISTS idx_alarms_is_resolved ON alarms(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alarms_triggered_at ON alarms(triggered_at);

CREATE INDEX IF NOT EXISTS idx_qr_codes_kiosk ON qr_codes(kiosk_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code_id ON qr_codes(code_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kiosks_updated_at BEFORE UPDATE ON kiosks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (basic read access)
CREATE POLICY "Users can read their own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR TRUE); -- Simplified for API access

CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (TRUE);

CREATE POLICY "Service role has full access to kiosks" ON kiosks
    FOR ALL USING (TRUE);

CREATE POLICY "Service role has full access to employees" ON employees
    FOR ALL USING (TRUE);

CREATE POLICY "Service role has full access to qr_codes" ON qr_codes
    FOR ALL USING (TRUE);

CREATE POLICY "Service role has full access to attendance_logs" ON attendance_logs
    FOR ALL USING (TRUE);

CREATE POLICY "Service role has full access to alarms" ON alarms
    FOR ALL USING (TRUE);

CREATE POLICY "Service role has full access to audit_logs" ON audit_logs
    FOR ALL USING (TRUE);

-- Insert default admin user (password: admin123)
-- Using plain text password for development
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
('admin@kioskattendance.com', 'admin123', 'System Admin', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Storage bucket for QR code images (run in Supabase dashboard)
-- CREATE POLICY "Public can read qr-images" ON storage.objects FOR SELECT USING (bucket_id = 'qr-images');
-- CREATE POLICY "Authenticated users can upload qr-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-images');
