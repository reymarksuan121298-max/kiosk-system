import express from 'express';
import ExcelJS from 'exceljs';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard overview stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's attendance
        const { data: todayAttendance } = await supabase
            .from('attendance_logs')
            .select('type')
            .gte('scanned_at', today.toISOString())
            .lt('scanned_at', tomorrow.toISOString());

        // Get total employees
        const { count: employeeCount } = await supabase
            .from('employees')
            .select('id', { count: 'exact' })
            .eq('is_active', true);

        // Get total kiosks
        const { count: kioskCount } = await supabase
            .from('kiosks')
            .select('id', { count: 'exact' })
            .eq('is_active', true);

        // Get unresolved alarms
        const { count: unresolvedAlarms } = await supabase
            .from('alarms')
            .select('id', { count: 'exact' })
            .eq('is_resolved', false);

        // Get critical alarms
        const { count: criticalAlarms } = await supabase
            .from('alarms')
            .select('id', { count: 'exact' })
            .eq('is_resolved', false)
            .eq('severity', 'critical');

        res.json({
            todayStats: {
                totalScans: todayAttendance?.length || 0,
                checkIns: todayAttendance?.filter(a => a.type === 'checkin').length || 0,
                checkOuts: todayAttendance?.filter(a => a.type === 'checkout').length || 0
            },
            totalEmployees: employeeCount || 0,
            totalKiosks: kioskCount || 0,
            unresolvedAlarms: unresolvedAlarms || 0,
            criticalAlarms: criticalAlarms || 0
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get attendance trends (last 7 days)
router.get('/trends', authenticateToken, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const trends = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const { data } = await supabase
                .from('attendance_logs')
                .select('type')
                .gte('scanned_at', date.toISOString())
                .lt('scanned_at', nextDate.toISOString());

            trends.push({
                date: date.toISOString().split('T')[0],
                checkIns: data?.filter(a => a.type === 'checkin').length || 0,
                checkOuts: data?.filter(a => a.type === 'checkout').length || 0,
                total: data?.length || 0
            });
        }

        res.json({ trends });
    } catch (error) {
        console.error('Get trends error:', error);
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
});

// Get all kiosk locations for map
router.get('/map/kiosks', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('kiosks')
            .select('id, name, address, lat, lng, geofence_radius, is_active')
            .eq('is_active', true);

        if (error) throw error;

        res.json({ kiosks: data });
    } catch (error) {
        console.error('Get map kiosks error:', error);
        res.status(500).json({ error: 'Failed to fetch kiosk locations' });
    }
});

// Get recent attendance with locations for map
router.get('/map/attendance', authenticateToken, async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('attendance_logs')
            .select(`
        id, type, scanned_at, lat, lng, is_valid,
        employees(id, name, employee_id),
        kiosks(id, name)
      `)
            .gte('scanned_at', since)
            .order('scanned_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        res.json({ attendance: data });
    } catch (error) {
        console.error('Get map attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance locations' });
    }
});

// Get audit logs
router.get('/audit-logs', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50, action, entityType, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('audit_logs')
            .select('*, users:user_id(id, name, email)', { count: 'exact' });

        if (action) query = query.eq('action', action);
        if (entityType) query = query.eq('entity_type', entityType);
        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate);

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            logs: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// Export attendance data
router.get('/export/attendance', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, kioskId, format = 'json' } = req.query;

        let query = supabase
            .from('attendance_logs')
            .select(`
        id,
        type,
        scanned_at,
        lat,
        lng,
        is_valid,
        employees(name, employee_id, contact_number),
        kiosks(name, address)
      `);

        if (startDate) query = query.gte('scanned_at', startDate);
        if (endDate) query = query.lte('scanned_at', endDate);
        if (kioskId) query = query.eq('kiosk_id', kioskId);

        const { data, error } = await query.order('scanned_at', { ascending: false });

        if (error) throw error;

        if (format === 'csv') {
            // Generate Excel file with bold headers
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Attendance Log');

            // Define columns with headers
            worksheet.columns = [
                { header: 'Date/Time', key: 'datetime', width: 22 },
                { header: 'Type', key: 'type', width: 12 },
                { header: 'Employee Name', key: 'name', width: 25 },
                { header: 'Employee ID', key: 'employee_id', width: 15 },
                { header: 'Contact Number', key: 'contact', width: 18 },
                { header: 'Kiosk Name', key: 'kiosk', width: 20 },
                { header: 'Kiosk Address', key: 'address', width: 35 },
                { header: 'Latitude', key: 'lat', width: 12 },
                { header: 'Longitude', key: 'lng', width: 12 },
                { header: 'Valid', key: 'valid', width: 8 },
            ];

            // Style the header row - BOLD
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, size: 11 };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Add data rows
            data.forEach((row, index) => {
                const dataRow = worksheet.addRow({
                    datetime: formatDateTime(row.scanned_at),
                    type: row.type === 'checkin' ? 'Check-in' : 'Check-out',
                    name: row.employees?.name || '',
                    employee_id: row.employees?.employee_id || '',
                    contact: row.employees?.contact_number || '',
                    kiosk: row.kiosks?.name || '',
                    address: row.kiosks?.address || '',
                    lat: row.lat || '',
                    lng: row.lng || '',
                    valid: row.is_valid ? 'Yes' : 'No'
                });

                // Alternating row colors
                if (index % 2 === 0) {
                    dataRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF2F2F2' }
                    };
                }

                // Add borders to data cells
                dataRow.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                    };
                });
            });

            // Generate buffer and send
            const buffer = await workbook.xlsx.writeBuffer();

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.xlsx');
            return res.send(buffer);
        }

        res.json({ data });
    } catch (error) {
        console.error('Export attendance error:', error);
        res.status(500).json({ error: 'Failed to export attendance' });
    }
});

// Helper function to format date as "9:29 AM 1/21/2026"
function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);

    // Format time as "9:29 AM"
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const time = `${hours}:${minutes} ${ampm}`;

    // Format date as "1/21/2026"
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const dateStr = `${month}/${day}/${year}`;

    return `${time} ${dateStr}`;
}

// Helper function to convert to CSV
function convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = [
        'Date/Time',
        'Type',
        'Employee Name',
        'Employee ID',
        'Contact Number',
        'Kiosk Name',
        'Kiosk Address',
        'Latitude',
        'Longitude',
        'Valid'
    ];

    const rows = data.map(row => [
        formatDateTime(row.scanned_at),
        row.type === 'checkin' ? 'Check-in' : 'Check-out',
        row.employees?.name || '',
        row.employees?.employee_id || '',
        row.employees?.contact_number || '',
        row.kiosks?.name || '',
        row.kiosks?.address || '',
        row.lat || '',
        row.lng || '',
        row.is_valid ? 'Yes' : 'No'
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
}

export default router;

