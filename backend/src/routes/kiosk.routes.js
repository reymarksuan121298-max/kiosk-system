import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createAuditLog } from '../utils/alarm.js';
import { validateCoordinates, createGeofencePolygon } from '../utils/geofence.js';

const router = express.Router();

// Get all kiosks
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('kiosks')
            .select('*', { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        if (status) {
            query = query.eq('is_active', status === 'active');
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            kiosks: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get kiosks error:', error);
        res.status(500).json({ error: 'Failed to fetch kiosks' });
    }
});

// Get single kiosk with geofence
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('kiosks')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Kiosk not found' });
        }

        // Generate geofence polygon for map display
        const geofencePolygon = createGeofencePolygon(
            { lat: data.lat, lng: data.lng },
            data.geofence_radius
        );

        res.json({
            kiosk: data,
            geofencePolygon
        });
    } catch (error) {
        console.error('Get kiosk error:', error);
        res.status(500).json({ error: 'Failed to fetch kiosk' });
    }
});

// Create kiosk
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, address, lat, lng, geofenceRadius, deviceId } = req.body;

        if (!name || !address || lat === undefined || lng === undefined) {
            return res.status(400).json({ error: 'Name, address, latitude, and longitude are required' });
        }

        if (!validateCoordinates(lat, lng)) {
            return res.status(400).json({ error: 'Invalid GPS coordinates' });
        }

        const { data, error } = await supabase
            .from('kiosks')
            .insert([{
                name,
                address,
                lat,
                lng,
                geofence_radius: geofenceRadius || parseInt(process.env.DEFAULT_GEOFENCE_RADIUS) || 30,
                device_id: deviceId || null,
                is_active: true
            }])
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'KIOSK_CREATED',
            entityType: 'kiosk',
            entityId: data.id,
            userId: req.user.id,
            details: { name, address, lat, lng }
        });

        res.status(201).json({
            message: 'Kiosk created successfully',
            kiosk: data
        });
    } catch (error) {
        console.error('Create kiosk error:', error);
        res.status(500).json({ error: 'Failed to create kiosk' });
    }
});

// Update kiosk
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, lat, lng, geofenceRadius, deviceId, isActive } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (address !== undefined) updates.address = address;
        if (lat !== undefined) updates.lat = lat;
        if (lng !== undefined) updates.lng = lng;
        if (geofenceRadius !== undefined) updates.geofence_radius = geofenceRadius;
        if (deviceId !== undefined) updates.device_id = deviceId;
        if (isActive !== undefined) updates.is_active = isActive;

        if (updates.lat !== undefined || updates.lng !== undefined) {
            const latitude = updates.lat !== undefined ? updates.lat : null;
            const longitude = updates.lng !== undefined ? updates.lng : null;

            if (latitude !== null && longitude !== null && !validateCoordinates(latitude, longitude)) {
                return res.status(400).json({ error: 'Invalid GPS coordinates' });
            }
        }

        const { data, error } = await supabase
            .from('kiosks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'KIOSK_UPDATED',
            entityType: 'kiosk',
            entityId: id,
            userId: req.user.id,
            details: updates
        });

        res.json({
            message: 'Kiosk updated successfully',
            kiosk: data
        });
    } catch (error) {
        console.error('Update kiosk error:', error);
        res.status(500).json({ error: 'Failed to update kiosk' });
    }
});

// Delete kiosk (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('kiosks')
            .update({ is_active: false, deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        await createAuditLog({
            action: 'KIOSK_DELETED',
            entityType: 'kiosk',
            entityId: id,
            userId: req.user.id
        });

        res.json({ message: 'Kiosk deleted successfully' });
    } catch (error) {
        console.error('Delete kiosk error:', error);
        res.status(500).json({ error: 'Failed to delete kiosk' });
    }
});

// Get kiosk attendance stats
router.get('/:id/stats', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const today = new Date();
        const start = startDate || new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const end = endDate || new Date().toISOString();

        const { data, error } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('kiosk_id', id)
            .gte('scanned_at', start)
            .lte('scanned_at', end);

        if (error) throw error;

        const stats = {
            totalScans: data?.length || 0,
            checkIns: data?.filter(a => a.type === 'checkin').length || 0,
            checkOuts: data?.filter(a => a.type === 'checkout').length || 0,
            uniqueEmployees: [...new Set(data?.map(a => a.employee_id))].length
        };

        res.json({ stats });
    } catch (error) {
        console.error('Get kiosk stats error:', error);
        res.status(500).json({ error: 'Failed to fetch kiosk stats' });
    }
});

export default router;
