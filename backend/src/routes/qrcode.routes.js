import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { generateQRData, generateQRImage } from '../utils/qrcode.js';
import { createAuditLog } from '../utils/alarm.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Generate QR code for a kiosk (Admin only)
router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { kioskId, employeeId } = req.body;

        if (!kioskId || !employeeId) {
            return res.status(400).json({ error: 'Kiosk ID and employee ID are required' });
        }

        // Verify kiosk exists
        const { data: kiosk, error: kioskError } = await supabase
            .from('kiosks')
            .select('*')
            .eq('id', kioskId)
            .single();

        if (kioskError || !kiosk) {
            return res.status(404).json({ error: 'Kiosk not found' });
        }

        // Verify employee exists
        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Generate QR data
        const qrData = generateQRData({
            kioskId,
            employeeId,
            adminId: req.user.id
        });

        // Generate QR image
        const qrImage = await generateQRImage(qrData.encrypted, {
            width: 400,
            margin: 2,
            color: {
                dark: '#0369a1', // Professional blue for universal code
                light: '#FFFFFF'
            }
        });

        // Save QR code record to database
        const qrInsertData = {
            code_id: qrData.raw.id,
            kiosk_id: kioskId,
            type: 'attendance',
            encrypted_data: qrData.encrypted,
            created_by: req.user.id,
            signature: qrData.raw.signature,
            is_revoked: false
        };

        let { data: qrRecord, error: qrError } = await supabase
            .from('qr_codes')
            .insert([qrInsertData])
            .select()
            .single();

        // Fallback for older schema constraints
        if (qrError && qrError.code === '23514') { // Check constraint violation
            console.log('Fallback: Schema does not support "attendance" type. Using "checkin" instead.');
            qrInsertData.type = 'checkin';
            const retry = await supabase
                .from('qr_codes')
                .insert([qrInsertData])
                .select()
                .single();
            qrRecord = retry.data;
            qrError = retry.error;
        }

        if (qrError) throw qrError;

        await createAuditLog({
            action: 'QR_CODE_GENERATED',
            entityType: 'qr_code',
            entityId: qrRecord.id,
            userId: req.user.id,
            details: { kioskId, type: 'attendance', kioskName: kiosk.name, employeeId }
        });

        res.status(201).json({
            message: 'QR code generated successfully',
            qrCode: {
                id: qrRecord.id,
                type: 'attendance',
                kioskId,
                kioskName: kiosk.name,
                employeeId,
                image: qrImage,
                createdAt: qrRecord.created_at
            }
        });
    } catch (error) {
        console.error('Generate QR error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Generate QR code with custom image overlay (Admin only)
router.post('/generate-with-image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { kioskId, employeeId } = req.body;
        const imageFile = req.file;

        if (!kioskId || !employeeId) {
            return res.status(400).json({ error: 'Kiosk ID and employee ID are required' });
        }

        // Verify kiosk exists
        const { data: kiosk, error: kioskError } = await supabase
            .from('kiosks')
            .select('*')
            .eq('id', kioskId)
            .single();

        if (kioskError || !kiosk) {
            return res.status(404).json({ error: 'Kiosk not found' });
        }

        // Verify employee exists
        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Generate QR data
        const qrData = generateQRData({
            kioskId,
            employeeId,
            adminId: req.user.id
        });

        // Generate QR image
        const qrImage = await generateQRImage(qrData.encrypted, {
            width: 400,
            margin: 2,
            color: {
                dark: '#0369a1',
                light: '#FFFFFF'
            }
        });

        // Save uploaded image if provided
        let uploadedImageUrl = null;
        if (imageFile) {
            const fileName = `qr-backgrounds/${Date.now()}-${imageFile.originalname}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('qr-images')
                .upload(fileName, imageFile.buffer, {
                    contentType: imageFile.mimetype
                });

            if (!uploadError && uploadData) {
                const { data: publicUrl } = supabase.storage
                    .from('qr-images')
                    .getPublicUrl(fileName);
                uploadedImageUrl = publicUrl.publicUrl;
            }
        }

        // Save QR code record
        const qrInsertData = {
            code_id: qrData.raw.id,
            kiosk_id: kioskId,
            type: 'attendance',
            encrypted_data: qrData.encrypted,
            created_by: req.user.id,
            signature: qrData.raw.signature,
            background_image_url: uploadedImageUrl,
            is_revoked: false
        };

        let { data: qrRecord, error: qrError } = await supabase
            .from('qr_codes')
            .insert([qrInsertData])
            .select()
            .single();

        // Fallback for older schema constraints
        if (qrError && qrError.code === '23514') {
            console.log('Fallback: Schema does not support "attendance" type. Using "checkin" instead.');
            qrInsertData.type = 'checkin';
            const retry = await supabase
                .from('qr_codes')
                .insert([qrInsertData])
                .select()
                .single();
            qrRecord = retry.data;
            qrError = retry.error;
        }

        if (qrError) throw qrError;

        await createAuditLog({
            action: 'QR_CODE_GENERATED_WITH_IMAGE',
            entityType: 'qr_code',
            entityId: qrRecord.id,
            userId: req.user.id,
            details: { kioskId, type: 'attendance', hasCustomImage: !!uploadedImageUrl }
        });

        res.status(201).json({
            message: 'QR code generated with image successfully',
            qrCode: {
                id: qrRecord.id,
                type: 'attendance',
                kioskId,
                kioskName: kiosk.name,
                image: qrImage,
                backgroundImage: uploadedImageUrl,
                createdAt: qrRecord.created_at
            }
        });
    } catch (error) {
        console.error('Generate QR with image error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Get all QR codes
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { kioskId, type, isRevoked, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('qr_codes')
            .select(`
        *,
        kiosks(id, name, address),
        users:created_by(id, name, email)
      `, { count: 'exact' });

        if (kioskId) query = query.eq('kiosk_id', kioskId);
        if (type) query = query.eq('type', type);
        if (isRevoked !== undefined) query = query.eq('is_revoked', isRevoked === 'true');

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            qrCodes: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get QR codes error:', error);
        res.status(500).json({ error: 'Failed to fetch QR codes' });
    }
});

// Get single QR code with regenerated image
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: qrRecord, error } = await supabase
            .from('qr_codes')
            .select(`
        *,
        kiosks(id, name, address)
      `)
            .eq('id', id)
            .single();

        if (error || !qrRecord) {
            return res.status(404).json({ error: 'QR code not found' });
        }

        // Regenerate QR image from stored data
        const qrImage = await generateQRImage(qrRecord.encrypted_data, {
            width: 400,
            margin: 2,
            color: {
                dark: qrRecord.type === 'checkin' ? '#059669' : (qrRecord.type === 'checkout' ? '#dc2626' : '#0369a1'),
                light: '#FFFFFF'
            }
        });

        res.json({
            qrCode: {
                ...qrRecord,
                image: qrImage
            }
        });
    } catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({ error: 'Failed to fetch QR code' });
    }
});

// Revoke QR code (Admin only)
router.put('/:id/revoke', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data, error } = await supabase
            .from('qr_codes')
            .update({
                is_revoked: true,
                revoked_at: new Date().toISOString(),
                revocation_reason: reason || 'Revoked by admin'
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'QR_CODE_REVOKED',
            entityType: 'qr_code',
            entityId: id,
            userId: req.user.id,
            details: { reason }
        });

        res.json({
            message: 'QR code revoked successfully',
            qrCode: data
        });
    } catch (error) {
        console.error('Revoke QR error:', error);
        res.status(500).json({ error: 'Failed to revoke QR code' });
    }
});

// Restore revoked QR code (Admin only)
router.put('/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('qr_codes')
            .update({
                is_revoked: false,
                revoked_at: null,
                revocation_reason: null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            action: 'QR_CODE_RESTORED',
            entityType: 'qr_code',
            entityId: id,
            userId: req.user.id
        });

        res.json({
            message: 'QR code restored successfully',
            qrCode: data
        });
    } catch (error) {
        console.error('Restore QR error:', error);
        res.status(500).json({ error: 'Failed to restore QR code' });
    }
});

// Delete QR code permanently (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('qr_codes')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await createAuditLog({
            action: 'QR_CODE_DELETED',
            entityType: 'qr_code',
            entityId: id,
            userId: req.user.id
        });

        res.json({ message: 'QR code deleted successfully' });
    } catch (error) {
        console.error('Delete QR error:', error);
        res.status(500).json({ error: 'Failed to delete QR code' });
    }
});

export default router;
