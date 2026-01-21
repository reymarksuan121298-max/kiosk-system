import { supabase } from '../config/supabase.js';

// Alarm types
export const ALARM_TYPES = {
    INVALID_QR: 'INVALID_QR',
    REVOKED_QR: 'REVOKED_QR',
    OUTSIDE_GEOFENCE: 'OUTSIDE_GEOFENCE',
    MULTIPLE_SCANS: 'MULTIPLE_SCANS',
    GPS_SPOOFING: 'GPS_SPOOFING',
    DEVICE_TAMPERING: 'DEVICE_TAMPERING',
    UNKNOWN_DEVICE: 'UNKNOWN_DEVICE'
};

// Severity levels
export const SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Create and trigger an alarm
 * @param {Object} alarmData - Alarm details
 * @returns {Promise<Object>} - Created alarm record
 */
export const triggerAlarm = async (alarmData) => {
    const alarm = {
        type: alarmData.type,
        severity: alarmData.severity || SEVERITY.MEDIUM,
        message: alarmData.message,
        employee_id: alarmData.employeeId || null,
        kiosk_id: alarmData.kioskId || null,
        device_id: alarmData.deviceId || null,
        location_lat: alarmData.lat || null,
        location_lng: alarmData.lng || null,
        metadata: alarmData.metadata || {},
        is_resolved: false,
        triggered_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('alarms')
            .insert([alarm])
            .select()
            .single();

        if (error) throw error;

        // Log to audit trail
        await createAuditLog({
            action: 'ALARM_TRIGGERED',
            entityType: 'alarm',
            entityId: data.id,
            details: alarm
        });

        return data;
    } catch (error) {
        console.error('Failed to trigger alarm:', error);
        throw error;
    }
};

/**
 * Check for multiple scans within a time window
 * @param {string} employeeId - Employee ID
 * @param {number} windowMinutes - Time window in minutes
 * @param {number} maxScans - Maximum allowed scans
 * @returns {Promise<Object>} - Check result
 */
export const checkMultipleScans = async (employeeId, windowMinutes = 5, maxScans = 2) => {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('scanned_at', windowStart)
        .order('scanned_at', { ascending: false });

    if (error) throw error;

    const scanCount = data?.length || 0;
    const isViolation = scanCount >= maxScans;

    return {
        isViolation,
        scanCount,
        windowMinutes,
        maxScans,
        recentScans: data || []
    };
};

/**
 * Create audit log entry
 * @param {Object} logData - Audit log details
 * @returns {Promise<Object>} - Created log entry
 */
export const createAuditLog = async (logData) => {
    const log = {
        action: logData.action,
        entity_type: logData.entityType,
        entity_id: logData.entityId,
        user_id: logData.userId || null,
        details: logData.details || {},
        ip_address: logData.ipAddress || null,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .insert([log])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging should not break main flow
        return null;
    }
};

/**
 * Get alarm severity based on type
 * @param {string} alarmType - Type of alarm
 * @returns {string} - Severity level
 */
export const getAlarmSeverity = (alarmType) => {
    const severityMap = {
        [ALARM_TYPES.INVALID_QR]: SEVERITY.MEDIUM,
        [ALARM_TYPES.REVOKED_QR]: SEVERITY.HIGH,
        [ALARM_TYPES.OUTSIDE_GEOFENCE]: SEVERITY.MEDIUM,
        [ALARM_TYPES.MULTIPLE_SCANS]: SEVERITY.MEDIUM,
        [ALARM_TYPES.GPS_SPOOFING]: SEVERITY.CRITICAL,
        [ALARM_TYPES.DEVICE_TAMPERING]: SEVERITY.CRITICAL,
        [ALARM_TYPES.UNKNOWN_DEVICE]: SEVERITY.LOW
    };

    return severityMap[alarmType] || SEVERITY.MEDIUM;
};

/**
 * Format alarm message
 * @param {string} type - Alarm type
 * @param {Object} context - Additional context
 * @returns {string} - Formatted message
 */
export const formatAlarmMessage = (type, context = {}) => {
    const templates = {
        [ALARM_TYPES.INVALID_QR]: `Invalid QR code scanned at kiosk ${context.kioskId || 'unknown'}`,
        [ALARM_TYPES.REVOKED_QR]: `Revoked QR code used by employee ${context.employeeName || context.employeeId || 'unknown'}`,
        [ALARM_TYPES.OUTSIDE_GEOFENCE]: `Employee ${context.employeeName || 'unknown'} scanned ${context.distance || '?'}m outside geofence`,
        [ALARM_TYPES.MULTIPLE_SCANS]: `Employee ${context.employeeName || 'unknown'} has ${context.scanCount || '?'} scans within ${context.windowMinutes || '?'} minutes`,
        [ALARM_TYPES.GPS_SPOOFING]: `Potential GPS spoofing detected: ${context.reason || 'Unknown reason'}`,
        [ALARM_TYPES.DEVICE_TAMPERING]: `Device tampering detected at kiosk ${context.kioskId || 'unknown'}`,
        [ALARM_TYPES.UNKNOWN_DEVICE]: `Unknown device attempted scan at kiosk ${context.kioskId || 'unknown'}`
    };

    return templates[type] || `Unknown alarm type: ${type}`;
};
