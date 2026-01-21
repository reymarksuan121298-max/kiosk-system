import CryptoJS from 'crypto-js';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'default-32-char-encryption-key!!';
console.log('QR Encryption Key status:', ENCRYPTION_KEY.startsWith('8ef') ? 'PRODUCTION_KEY_LOADED' : 'WARNING_KEY_MISMATCH_OR_DEFAULT');
console.log('Key length:', ENCRYPTION_KEY.length);

/**
 * Generate encrypted QR code data
 * @param {Object} data - Data to encode in QR code
 * @returns {Object} - Encrypted payload and raw data
 */
export const generateQRData = (data) => {
    const payload = {
        id: uuidv4(),
        kioskId: data.kioskId,
        employeeId: data.employeeId,
        type: 'attendance', // Universal type
        createdAt: new Date().toISOString(),
        createdBy: data.adminId,
        signature: uuidv4()
    };

    // Encrypt the payload
    const encryptedPayload = CryptoJS.AES.encrypt(
        JSON.stringify(payload),
        ENCRYPTION_KEY
    ).toString();

    return {
        encrypted: encryptedPayload,
        raw: payload
    };
};

/**
 * Decrypt QR code data
 * @param {string} encryptedData - Encrypted QR code data
 * @returns {Object|null} - Decrypted payload or null if invalid
 */
export const decryptQRData = (encryptedData) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
            return null;
        }

        return JSON.parse(decryptedString);
    } catch (error) {
        console.error('QR Decryption error:', error);
        return null;
    }
};

/**
 * Generate QR code image as data URL
 * @param {string} data - Data to encode
 * @param {Object} options - QR code options
 * @returns {Promise<string>} - QR code as data URL
 */
export const generateQRImage = async (data, options = {}) => {
    const defaultOptions = {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H',
        ...options
    };

    try {
        const qrDataUrl = await QRCode.toDataURL(data, defaultOptions);
        return qrDataUrl;
    } catch (error) {
        console.error('QR Generation error:', error);
        throw new Error('Failed to generate QR code');
    }
};

/**
 * Generate QR code as buffer for file saving
 * @param {string} data - Data to encode
 * @returns {Promise<Buffer>} - QR code as buffer
 */
export const generateQRBuffer = async (data) => {
    try {
        const buffer = await QRCode.toBuffer(data, {
            width: 400,
            margin: 2,
            errorCorrectionLevel: 'H'
        });
        return buffer;
    } catch (error) {
        console.error('QR Buffer generation error:', error);
        throw new Error('Failed to generate QR code buffer');
    }
};

/**
 * Validate QR code structure
 * @param {Object} data - Decrypted QR data
 * @returns {boolean} - Whether the QR data is valid
 */
export const validateQRStructure = (data) => {
    if (!data) return false;

    const requiredFields = ['id', 'kioskId', 'employeeId', 'createdAt', 'signature'];
    const missingFields = requiredFields.filter(field => !data.hasOwnProperty(field));

    if (missingFields.length > 0) {
        console.warn('QR Validation Failed. Missing fields:', missingFields);
        return false;
    }

    return true;
};
