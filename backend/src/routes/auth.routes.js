import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../utils/alarm.js';

const router = express.Router();

// Register new user (Admin only in production)
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role, contactNumber } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Create user (store password as plain text)
        const { data: user, error } = await supabase
            .from('users')
            .insert([{
                email,
                password_hash: password,
                name,
                role: role || 'teller',
                contact_number: contactNumber || null,
                is_active: true
            }])
            .select('id, email, name, role, contact_number, created_at')
            .single();

        if (error) throw error;

        // Create audit log
        await createAuditLog({
            action: 'USER_REGISTERED',
            entityType: 'user',
            entityId: user.id,
            details: { email, name, role: role || 'teller' }
        });

        res.status(201).json({
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Normalize email to lowercase for case-insensitive matching
        const normalizedEmail = email.toLowerCase().trim();
        console.log(`Login attempt for: ${normalizedEmail}`);

        // Find user (using admin client to bypass RLS)
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .ilike('email', normalizedEmail)
            .single();

        if (error) {
            console.log('Database error:', error.message);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user) {
            console.log('User not found for email:', normalizedEmail);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('User found:', user.email, '| Role:', user.role, '| Active:', user.is_active);

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Verify password (plain text comparison)
        const passwordMatch = password === user.password_hash;
        console.log('Password match:', passwordMatch);

        if (!passwordMatch) {
            console.log('Password mismatch - Input length:', password.length, '| Stored length:', user.password_hash?.length);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Create audit log
        await createAuditLog({
            action: 'USER_LOGIN',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
            details: { email }
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                contactNumber: user.contact_number
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const { password_hash, ...userWithoutPassword } = req.user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        // Verify current password (plain text comparison)
        if (currentPassword !== req.user.password_hash) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password (store as plain text)
        const { error } = await supabase
            .from('users')
            .update({ password_hash: newPassword })
            .eq('id', req.user.id);

        if (error) throw error;

        await createAuditLog({
            action: 'PASSWORD_CHANGED',
            entityType: 'user',
            entityId: req.user.id,
            userId: req.user.id
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Logout (client-side token removal, server-side audit)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await createAuditLog({
            action: 'USER_LOGOUT',
            entityType: 'user',
            entityId: req.user.id,
            userId: req.user.id
        });

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to logout' });
    }
});

export default router;
