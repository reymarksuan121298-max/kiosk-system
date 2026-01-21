import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createAuditLog } from '../utils/alarm.js';

const router = express.Router();

// Get all alarms
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            type,
            severity,
            isResolved,
            startDate,
            endDate
        } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('alarms')
            .select(`
        *,
        employees(id, name, employee_id),
        kiosks(id, name, address)
      `, { count: 'exact' });

        if (type) query = query.eq('type', type);
        if (severity) query = query.eq('severity', severity);
        if (isResolved !== undefined) query = query.eq('is_resolved', isResolved === 'true');
        if (startDate) query = query.gte('triggered_at', startDate);
        if (endDate) query = query.lte('triggered_at', endDate);

        const { data, error, count } = await query
            .order('triggered_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            alarms: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get alarms error:', error);
        res.status(500).json({ error: 'Failed to fetch alarms' });
    }
});

// Get unresolved alarms count (for notifications)
router.get('/unresolved/count', authenticateToken, async (req, res) => {
    try {
        const { data, error, count } = await supabase
            .from('alarms')
            .select('id', { count: 'exact' })
            .eq('is_resolved', false);

        if (error) throw error;

        // Get breakdown by severity
        const { data: severityData } = await supabase
            .from('alarms')
            .select('severity')
            .eq('is_resolved', false);

        const severityCounts = {
            critical: severityData?.filter(a => a.severity === 'critical').length || 0,
            high: severityData?.filter(a => a.severity === 'high').length || 0,
            medium: severityData?.filter(a => a.severity === 'medium').length || 0,
            low: severityData?.filter(a => a.severity === 'low').length || 0
        };

        res.json({
            total: count || 0,
            bySeverity: severityCounts
        });
    } catch (error) {
        console.error('Get unresolved count error:', error);
        res.status(500).json({ error: 'Failed to fetch alarm count' });
    }
});

// Get recent unresolved alarms (for dashboard)
router.get('/recent', authenticateToken, async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const { data, error } = await supabase
            .from('alarms')
            .select(`
        *,
        employees(id, name, employee_id),
        kiosks(id, name)
      `)
            .eq('is_resolved', false)
            .order('triggered_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        res.json({ alarms: data });
    } catch (error) {
        console.error('Get recent alarms error:', error);
        res.status(500).json({ error: 'Failed to fetch recent alarms' });
    }
});

// Get single alarm
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('alarms')
            .select(`
        *,
        employees(id, name, employee_id, contact_number),
        kiosks(id, name, address, lat, lng)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Alarm not found' });
        }

        res.json({ alarm: data });
    } catch (error) {
        console.error('Get alarm error:', error);
        res.status(500).json({ error: 'Failed to fetch alarm' });
    }
});

// Resolve alarm
router.put('/:id/resolve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, notes } = req.body;

        const { data, error } = await supabase
            .from('alarms')
            .update({
                is_resolved: true,
                resolved_at: new Date().toISOString(),
                resolved_by: req.user.id,
                resolution: resolution || 'Resolved by admin',
                resolution_notes: notes || null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'ALARM_RESOLVED',
            entityType: 'alarm',
            entityId: id,
            userId: req.user.id,
            details: { resolution, notes }
        });

        res.json({
            message: 'Alarm resolved successfully',
            alarm: data
        });
    } catch (error) {
        console.error('Resolve alarm error:', error);
        res.status(500).json({ error: 'Failed to resolve alarm' });
    }
});

// Bulk resolve alarms
router.put('/resolve/bulk', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { alarmIds, resolution } = req.body;

        if (!Array.isArray(alarmIds) || alarmIds.length === 0) {
            return res.status(400).json({ error: 'Alarm IDs array is required' });
        }

        const { data, error } = await supabase
            .from('alarms')
            .update({
                is_resolved: true,
                resolved_at: new Date().toISOString(),
                resolved_by: req.user.id,
                resolution: resolution || 'Bulk resolved by admin'
            })
            .in('id', alarmIds)
            .select();

        if (error) throw error;

        await createAuditLog({
            action: 'ALARMS_BULK_RESOLVED',
            entityType: 'alarm',
            entityId: null,
            userId: req.user.id,
            details: { alarmIds, count: data.length }
        });

        res.json({
            message: `${data.length} alarms resolved successfully`,
            resolvedCount: data.length
        });
    } catch (error) {
        console.error('Bulk resolve error:', error);
        res.status(500).json({ error: 'Failed to bulk resolve alarms' });
    }
});

// Get alarm statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const today = new Date();
        const start = startDate || new Date(today.setDate(today.getDate() - 30)).toISOString();
        const end = endDate || new Date().toISOString();

        const { data, error } = await supabase
            .from('alarms')
            .select('type, severity, is_resolved')
            .gte('triggered_at', start)
            .lte('triggered_at', end);

        if (error) throw error;

        const stats = {
            total: data?.length || 0,
            resolved: data?.filter(a => a.is_resolved).length || 0,
            unresolved: data?.filter(a => !a.is_resolved).length || 0,
            byType: {},
            bySeverity: {
                critical: data?.filter(a => a.severity === 'critical').length || 0,
                high: data?.filter(a => a.severity === 'high').length || 0,
                medium: data?.filter(a => a.severity === 'medium').length || 0,
                low: data?.filter(a => a.severity === 'low').length || 0
            }
        };

        // Count by type
        data?.forEach(alarm => {
            stats.byType[alarm.type] = (stats.byType[alarm.type] || 0) + 1;
        });

        res.json({ stats });
    } catch (error) {
        console.error('Get alarm stats error:', error);
        res.status(500).json({ error: 'Failed to fetch alarm statistics' });
    }
});

export default router;
