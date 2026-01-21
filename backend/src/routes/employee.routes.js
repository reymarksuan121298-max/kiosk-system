import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createAuditLog } from '../utils/alarm.js';

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('employees')
            .select('*, kiosks(id, name, address)', { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%,contact_number.ilike.%${search}%`);
        }

        if (status) {
            query = query.eq('is_active', status === 'active');
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            employees: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get single employee
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('employees')
            .select('*, kiosks(id, name, address, lat, lng)')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ employee: data });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// Create employee
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, employeeId, contactNumber, email, kioskId } = req.body;

        if (!name || !employeeId) {
            return res.status(400).json({ error: 'Name and employee ID are required' });
        }

        // Check for duplicate employee ID
        const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('employee_id', employeeId)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'Employee ID already exists' });
        }

        const { data, error } = await supabase
            .from('employees')
            .insert([{
                name,
                employee_id: employeeId,
                contact_number: contactNumber || null,
                email: email || null,
                assigned_kiosk_id: kioskId || null,
                is_active: true
            }])
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'EMPLOYEE_CREATED',
            entityType: 'employee',
            entityId: data.id,
            userId: req.user.id,
            details: { name, employeeId }
        });

        res.status(201).json({
            message: 'Employee created successfully',
            employee: data
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// Update employee
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactNumber, email, kioskId, isActive } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (contactNumber !== undefined) updates.contact_number = contactNumber;
        if (email !== undefined) updates.email = email;
        if (kioskId !== undefined) updates.assigned_kiosk_id = kioskId;
        if (isActive !== undefined) updates.is_active = isActive;

        const { data, error } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'EMPLOYEE_UPDATED',
            entityType: 'employee',
            entityId: id,
            userId: req.user.id,
            details: updates
        });

        res.json({
            message: 'Employee updated successfully',
            employee: data
        });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// Delete employee (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('employees')
            .update({ is_active: false, deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        await createAuditLog({
            action: 'EMPLOYEE_DELETED',
            entityType: 'employee',
            entityId: id,
            userId: req.user.id
        });

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// Get employee attendance history
router.get('/:id/attendance', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('attendance_logs')
            .select('*, kiosks(id, name, address)', { count: 'exact' })
            .eq('employee_id', id);

        if (startDate) {
            query = query.gte('scanned_at', startDate);
        }
        if (endDate) {
            query = query.lte('scanned_at', endDate);
        }

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
        console.error('Get employee attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});

export default router;
