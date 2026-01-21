import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { decryptQRData, validateQRStructure } from '../utils/qrcode.js';
import { isWithinGeofence, detectGPSSpoofing, validateCoordinates } from '../utils/geofence.js';
import {
    triggerAlarm,
    checkMultipleScans,
    createAuditLog,
    ALARM_TYPES,
    getAlarmSeverity,
    formatAlarmMessage
} from '../utils/alarm.js';

const router = express.Router();

// Record attendance (main scan endpoint)
router.post('/scan', async (req, res) => {
    try {
        const {
            qrData,
            employeeId: providedEmployeeId,
            lat,
            lng,
            deviceId,
            deviceInfo
        } = req.body;

        // Validate required fields
        if (!qrData || lat === undefined || lng === undefined) {
            return res.status(400).json({
                error: 'QR data and GPS coordinates are required'
            });
        }

        // Validate coordinates
        if (!validateCoordinates(lat, lng)) {
            await triggerAlarm({
                type: ALARM_TYPES.GPS_SPOOFING,
                severity: 'high',
                message: formatAlarmMessage(ALARM_TYPES.GPS_SPOOFING, { reason: 'Invalid coordinates' }),
                deviceId,
                lat,
                lng,
                metadata: { reason: 'Invalid GPS coordinates format' }
            });
            return res.status(400).json({ error: 'Invalid GPS coordinates' });
        }

        // Decrypt and validate QR code
        const qrPayload = decryptQRData(qrData);
        const isValidStructure = validateQRStructure(qrPayload);

        console.log('Scanned QR data:', qrData);
        console.log('Decrypted QR payload:', qrPayload);
        console.log('Is valid structure:', isValidStructure);

        if (!qrPayload || !isValidStructure) {
            await triggerAlarm({
                type: ALARM_TYPES.INVALID_QR,
                severity: getAlarmSeverity(ALARM_TYPES.INVALID_QR),
                message: formatAlarmMessage(ALARM_TYPES.INVALID_QR, { employeeId: providedEmployeeId || 'unknown' }),
                deviceId,
                lat,
                lng
            });
            return res.status(400).json({
                error: 'Invalid QR code',
                alarmTriggered: true
            });
        }

        // Extract employee ID from QR payload (QR code contains employee info)
        const employeeIdString = qrPayload.employeeId || providedEmployeeId;

        if (!employeeIdString) {
            return res.status(400).json({
                error: 'Employee ID not found in QR code'
            });
        }

        // Get employee info early to have the UUID for alarms and logs
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('employee_id', employeeIdString)
            .single();

        const employeeUUID = employee?.id || null;

        // Check if QR code is active
        const { data: qrRecord, error: qrError } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('code_id', qrPayload.id)
            .single();

        if (qrError || !qrRecord) {
            await triggerAlarm({
                type: ALARM_TYPES.INVALID_QR,
                severity: getAlarmSeverity(ALARM_TYPES.INVALID_QR),
                message: 'QR code not found in system',
                employeeId: employeeUUID,
                kioskId: qrPayload.kioskId,
                deviceId,
                lat,
                lng,
                metadata: { employeeIdString }
            });
            return res.status(400).json({
                error: 'QR code not recognized',
                alarmTriggered: true
            });
        }

        if (qrRecord.is_revoked) {
            await triggerAlarm({
                type: ALARM_TYPES.REVOKED_QR,
                severity: getAlarmSeverity(ALARM_TYPES.REVOKED_QR),
                message: formatAlarmMessage(ALARM_TYPES.REVOKED_QR, { employeeId: employeeIdString }),
                employeeId: employeeUUID,
                kioskId: qrPayload.kioskId,
                deviceId,
                lat,
                lng,
                metadata: { employeeIdString }
            });
            return res.status(403).json({
                error: 'QR code has been revoked',
                alarmTriggered: true
            });
        }

        // Get kiosk information
        const { data: kiosk, error: kioskError } = await supabase
            .from('kiosks')
            .select('*')
            .eq('id', qrPayload.kioskId)
            .single();

        if (kioskError || !kiosk) {
            return res.status(404).json({ error: 'Kiosk not found' });
        }

        // Validate geofence
        const geofenceResult = isWithinGeofence(
            { lat, lng },
            { lat: kiosk.lat, lng: kiosk.lng },
            kiosk.geofence_radius
        );

        if (!geofenceResult.isWithin) {
            await triggerAlarm({
                type: ALARM_TYPES.OUTSIDE_GEOFENCE,
                severity: getAlarmSeverity(ALARM_TYPES.OUTSIDE_GEOFENCE),
                message: formatAlarmMessage(ALARM_TYPES.OUTSIDE_GEOFENCE, {
                    employeeName: employeeIdString,
                    distance: geofenceResult.exceededBy
                }),
                employeeId: employeeUUID,
                kioskId: kiosk.id,
                deviceId,
                lat,
                lng,
                metadata: { ...geofenceResult, employeeIdString }
            });
            return res.status(403).json({
                error: 'You are outside the allowed area',
                distance: geofenceResult.distance,
                allowedRadius: geofenceResult.radius,
                alarmTriggered: true
            });
        }

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Check for multiple scans
        const multiScanCheck = await checkMultipleScans(employee.id);
        if (multiScanCheck.isViolation) {
            await triggerAlarm({
                type: ALARM_TYPES.MULTIPLE_SCANS,
                severity: getAlarmSeverity(ALARM_TYPES.MULTIPLE_SCANS),
                message: formatAlarmMessage(ALARM_TYPES.MULTIPLE_SCANS, {
                    employeeName: employee.name,
                    scanCount: multiScanCheck.scanCount,
                    windowMinutes: multiScanCheck.windowMinutes
                }),
                employeeId: employee.id,
                kioskId: kiosk.id,
                deviceId,
                lat,
                lng,
                metadata: multiScanCheck
            });
            return res.status(429).json({
                error: 'Too many scans in a short period',
                alarmTriggered: true
            });
        }

        // Check for GPS spoofing (if previous scan exists)
        const { data: lastScan } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('employee_id', employee.id)
            .order('scanned_at', { ascending: false })
            .limit(1)
            .single();

        if (lastScan && lastScan.lat && lastScan.lng) {
            const spoofingCheck = detectGPSSpoofing(
                { lat: lastScan.lat, lng: lastScan.lng, timestamp: lastScan.scanned_at },
                { lat, lng, timestamp: new Date().toISOString() }
            );

            if (spoofingCheck.isSuspicious) {
                await triggerAlarm({
                    type: ALARM_TYPES.GPS_SPOOFING,
                    severity: getAlarmSeverity(ALARM_TYPES.GPS_SPOOFING),
                    message: formatAlarmMessage(ALARM_TYPES.GPS_SPOOFING, spoofingCheck),
                    employeeId: employee.id,
                    kioskId: kiosk.id,
                    deviceId,
                    lat,
                    lng,
                    metadata: spoofingCheck
                });
                // Don't block, but flag the scan
            }
        }

        // Determine attendance type based on time
        // 6:00 AM - 8:59 AM -> checkin
        // 8:45 PM - 9:10 PM -> checkout
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        let determinedType = null;

        if (hour >= 6 && hour < 9) {
            determinedType = 'checkin';
        } else if ((hour === 20 && minutes >= 45) || (hour === 21 && minutes <= 10)) {
            // 8:45 PM (20:45) to 9:10 PM (21:10)
            determinedType = 'checkout';
        }

        if (!determinedType) {
            return res.status(403).json({
                error: 'Attendance scanning is only allowed between 6:00-9:00 AM (Check-in) and 8:45-9:10 PM (Check-out).'
            });
        }

        // Record attendance
        const attendanceRecord = {
            employee_id: employee.id,
            kiosk_id: kiosk.id,
            qr_code_id: qrRecord.id,
            type: determinedType,
            scanned_at: now.toISOString(),
            lat,
            lng,
            device_id: deviceId || null,
            device_info: deviceInfo || null,
            is_valid: true,
            geofence_distance: geofenceResult.distance
        };

        const { data: attendance, error: attendanceError } = await supabase
            .from('attendance_logs')
            .insert([attendanceRecord])
            .select('*, employees(name, employee_id), kiosks(name, address)')
            .single();

        if (attendanceError) throw attendanceError;

        // Create audit log (only if user is authenticated, e.g., during admin setup)
        // For public kiosk scans, we skip this since req.user doesn't exist
        if (req.user) {
            await createAuditLog({
                action: 'ATTENDANCE_RECORDED',
                entityType: 'attendance',
                entityId: attendance.id,
                userId: req.user.id,
                details: {
                    type: determinedType,
                    employeeId: employee.employee_id,
                    kioskName: kiosk.name
                }
            });
        }

        res.status(201).json({
            message: `${determinedType === 'checkin' ? 'Check-in' : 'Check-out'} successful`,
            attendance: {
                id: attendance.id,
                type: attendance.type,
                scannedAt: attendance.scanned_at,
                employee: attendance.employees,
                kiosk: attendance.kiosks,
                location: { lat, lng },
                geofenceDistance: geofenceResult.distance
            }
        });
    } catch (error) {
        console.error('Attendance scan error:', error);
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});

// Get attendance logs
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            employeeId,
            kioskId,
            type,
            startDate,
            endDate,
            isValid
        } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('attendance_logs')
            .select(`
        *,
        employees(id, name, employee_id, contact_number),
        kiosks(id, name, address)
      `, { count: 'exact' });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (kioskId) query = query.eq('kiosk_id', kioskId);
        if (type) query = query.eq('type', type);
        if (startDate) query = query.gte('scanned_at', startDate);
        if (endDate) query = query.lte('scanned_at', endDate);
        if (isValid !== undefined) query = query.eq('is_valid', isValid === 'true');

        const { data, error, count } = await query
            .order('scanned_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            attendance: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance logs' });
    }
});

// Get today's attendance summary
router.get('/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data, error } = await supabase
            .from('attendance_logs')
            .select(`
        *,
        employees(id, name, employee_id),
        kiosks(id, name)
      `)
            .gte('scanned_at', today.toISOString())
            .lt('scanned_at', tomorrow.toISOString())
            .order('scanned_at', { ascending: false });

        if (error) throw error;

        const summary = {
            totalScans: data?.length || 0,
            checkIns: data?.filter(a => a.type === 'checkin').length || 0,
            checkOuts: data?.filter(a => a.type === 'checkout').length || 0,
            uniqueEmployees: [...new Set(data?.map(a => a.employee_id))].length,
            invalidScans: data?.filter(a => !a.is_valid).length || 0,
            records: data
        };

        res.json(summary);
    } catch (error) {
        console.error('Get today attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
    }
});

// Manually invalidate an attendance record (admin only)
router.put('/:id/invalidate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data, error } = await supabase
            .from('attendance_logs')
            .update({
                is_valid: false,
                invalidation_reason: reason || 'Manually invalidated by admin'
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'ATTENDANCE_INVALIDATED',
            entityType: 'attendance',
            entityId: id,
            userId: req.user.id,
            details: { reason }
        });

        res.json({
            message: 'Attendance record invalidated',
            attendance: data
        });
    } catch (error) {
        console.error('Invalidate attendance error:', error);
        res.status(500).json({ error: 'Failed to invalidate attendance' });
    }
});

// Offline sync endpoint
router.post('/sync', authenticateToken, async (req, res) => {
    try {
        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: 'No records to sync' });
        }

        const results = {
            synced: [],
            failed: []
        };

        for (const record of records) {
            try {
                // Process each offline record similarly to /scan
                // Simplified version for offline sync
                const { data: employee } = await supabase
                    .from('employees')
                    .select('id')
                    .eq('employee_id', record.employeeId)
                    .single();

                if (!employee) {
                    results.failed.push({ record, error: 'Employee not found' });
                    continue;
                }

                const qrPayload = decryptQRData(record.qrData);
                if (!qrPayload) {
                    results.failed.push({ record, error: 'Invalid QR data' });
                    continue;
                }

                const attendanceRecord = {
                    employee_id: employee.id,
                    kiosk_id: qrPayload.kioskId,
                    type: qrPayload.type,
                    scanned_at: record.scannedAt || new Date().toISOString(),
                    lat: record.lat,
                    lng: record.lng,
                    device_id: record.deviceId,
                    is_valid: true,
                    synced_at: new Date().toISOString(),
                    is_offline_sync: true
                };

                const { data, error } = await supabase
                    .from('attendance_logs')
                    .insert([attendanceRecord])
                    .select()
                    .single();

                if (error) {
                    results.failed.push({ record, error: error.message });
                } else {
                    results.synced.push(data);
                }
            } catch (err) {
                results.failed.push({ record, error: err.message });
            }
        }

        res.json({
            message: `Synced ${results.synced.length} records, ${results.failed.length} failed`,
            results
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Failed to sync offline records' });
    }
});

export default router;
