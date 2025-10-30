// Trainer Portal Utility functions

// ============================================================================
// R2 STORAGE UTILITIES
// ============================================================================

export async function uploadToR2(r2Bucket, filename, file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    await r2Bucket.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream'
      }
    });
    
    // Return public URL (adjust based on your R2 public domain setup)
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file');
  }
}

export async function deleteFromR2(r2Bucket, filename) {
  try {
    await r2Bucket.delete(filename);
    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw new Error('Failed to delete file');
  }
}

export async function getFromR2(r2Bucket, filename) {
  try {
    const object = await r2Bucket.get(filename);
    if (!object) {
      return null;
    }
    return object;
  } catch (error) {
    console.error('Error getting from R2:', error);
    return null;
  }
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

export async function queryD1(db, query, bindings = []) {
  try {
    const stmt = db.prepare(query);
    if (bindings.length > 0) {
      stmt.bind(...bindings);
    }
    const { results } = await stmt.all();
    return results || [];
  } catch (error) {
    console.error('Error querying D1:', error);
    throw new Error('Database query failed');
  }
}

export async function insertD1(db, table, data) {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const stmt = db.prepare(query).bind(...values);
    const result = await stmt.run();
    
    return result.meta.last_row_id;
  } catch (error) {
    console.error('Error inserting into D1:', error);
    throw new Error('Database insert failed');
  }
}

export async function updateD1(db, table, data, whereClause, whereBindings = []) {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const stmt = db.prepare(query).bind(...values, ...whereBindings);
    const result = await stmt.run();
    
    return result.meta.changes;
  } catch (error) {
    console.error('Error updating D1:', error);
    throw new Error('Database update failed');
  }
}

export async function deleteD1(db, table, whereClause, whereBindings = []) {
  try {
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const stmt = db.prepare(query).bind(...whereBindings);
    const result = await stmt.run();
    
    return result.meta.changes;
  } catch (error) {
    console.error('Error deleting from D1:', error);
    throw new Error('Database delete failed');
  }
}

// ============================================================================
// KV UTILITIES
// ============================================================================

export async function getKV(kv, key) {
  try {
    const value = await kv.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error('Error getting from KV:', error);
    return null;
  }
}

export async function setKV(kv, key, value, expirationTtl = null) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const options = expirationTtl ? { expirationTtl } : {};
    await kv.put(key, stringValue, options);
    return true;
  } catch (error) {
    console.error('Error setting KV:', error);
    return false;
  }
}

export async function deleteKV(kv, key) {
  try {
    await kv.delete(key);
    return true;
  } catch (error) {
    console.error('Error deleting from KV:', error);
    return false;
  }
}

export async function listKV(kv, prefix = '') {
  try {
    const list = await kv.list({ prefix });
    return list.keys.map(k => k.name);
  } catch (error) {
    console.error('Error listing KV keys:', error);
    return [];
  }
}

// ============================================================================
// EMAIL UTILITIES
// ============================================================================

export async function sendEmailWithResend(apiKey, from, to, subject, html, text) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || text,
        text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email with Resend:', error);
    throw error;
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone) {
  // Basic validation - adjust regex for your needs
  const re = /^\+?[\d\s\-\(\)]+$/;
  return re.test(phone);
}

export function validatePassword(password, minLength = 8) {
  return password && password.length >= minLength;
}

export function sanitizeString(str, maxLength = 1000) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLength);
}

export function sanitizeNumber(num, min = null, max = null) {
  const parsed = parseFloat(num);
  if (isNaN(parsed)) return null;
  if (min !== null && parsed < min) return min;
  if (max !== null && parsed > max) return max;
  return parsed;
}

// ============================================================================
// CONVERSION UTILITIES (Imperial <-> Metric)
// ============================================================================

export function lbsToKg(lbs) {
  return lbs / 2.20462;
}

export function kgToLbs(kg) {
  return kg * 2.20462;
}

export function inToCm(inches) {
  return inches * 2.54;
}

export function cmToIn(cm) {
  return cm / 2.54;
}

export function feetInchesToCm(feet, inches) {
  const totalInches = (feet * 12) + inches;
  return inToCm(totalInches);
}

export function cmToFeetInches(cm) {
  const totalInches = cmToIn(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

export function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

export function getDaysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

export function calculateProgressPercentage(current, target) {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function calculateAverageWeightLoss(measurements) {
  if (!measurements || measurements.length < 2) return 0;
  
  const sorted = measurements.sort((a, b) => new Date(a.measurement_date) - new Date(b.measurement_date));
  const first = sorted[0].weight_kg;
  const last = sorted[sorted.length - 1].weight_kg;
  
  if (!first || !last) return 0;
  return kgToLbs(first - last);
}

export function calculateBodyFatChange(measurements) {
  if (!measurements || measurements.length < 2) return 0;
  
  const sorted = measurements.sort((a, b) => new Date(a.measurement_date) - new Date(b.measurement_date));
  const first = sorted[0].body_fat_percentage;
  const last = sorted[sorted.length - 1].body_fat_percentage;
  
  if (first === null || last === null) return 0;
  return last - first;
}

export function calculateStreak(workoutLogs) {
  if (!workoutLogs || workoutLogs.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let checkDate = new Date(today);
  
  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(checkDate);
    const hasWorkout = workoutLogs.some(log => formatDate(log.workout_date) === dateStr);
    
    if (hasWorkout) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// ============================================================================
// CRYPTO/HASH UTILITIES
// ============================================================================

export async function hashPassword(password) {
  // Simplified SHA-256 hash - use bcrypt or argon2 in production
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  // Simplified verification - use bcrypt.compare in production
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function generateUUID() {
  return crypto.randomUUID();
}

// ============================================================================
// RESPONSE UTILITIES
// ============================================================================

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers
    }
  });
}

export function htmlResponse(html, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      ...headers
    }
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function successResponse(data = {}, message = 'Success') {
  return jsonResponse({ success: true, message, ...data });
}

// ============================================================================
// CORS UTILITIES
// ============================================================================

export function handleCORS(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  return null;
}
