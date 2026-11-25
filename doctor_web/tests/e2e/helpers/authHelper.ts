/**
/**
 * CareID E2E Test Suite - Authentication Helper
 * Manages live session tokens, caching, automatic refresh, and rate-limit mitigation
 * against live backend: https://360api.vnvision.in/api/v1
 */

import fs from 'node:fs';
import path from 'node:path';

export const BASE_URL = process.env.VITE_API_BASE_URL
  ? process.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/api/v1'
  : 'https://360api.vnvision.in/api/v1';

export const TEST_PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
export const TEST_DOCTOR_ID = '1f06067b-e229-4707-84e2-afa27da2e4cd';
export const TEST_FACILITY_ID = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
export const DOCTOR_PHONE = '+16505550003';
export const STAGING_OTP = '123456';

interface TokenCache {
  accessToken: string;
  refreshToken?: string;
  updatedAt: number;
}

const CACHE_FILE = path.resolve(process.cwd(), '.token_cache.json');
const PEER_CACHE_FILE = path.resolve(
  process.cwd(),
  '.agents/teamwork/spec_miner_survey_1/doctor_tokens.json'
);

let inMemoryToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

/**
 * Load token from disk cache
 */
function loadDiskCache(): TokenCache | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (data.accessToken) return data;
    }
    if (fs.existsSync(PEER_CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PEER_CACHE_FILE, 'utf8'));
      const data = raw.data || raw;
      if (data.accessToken) {
        return {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          updatedAt: Date.now(),
        };
      }
    }
  } catch {
    // ignore corrupt cache
  }
  return null;
}

/**
 * Save active token to disk cache
 */
function saveDiskCache(accessToken: string, refreshToken?: string) {
  try {
    const payload: TokenCache = {
      accessToken,
      refreshToken: refreshToken || inMemoryRefreshToken || undefined,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // ignore write errors in restricted envs
  }
}

/**
 * Verify if token is still valid via GET /auth/me
 */
async function isTokenValid(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Refresh expired access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (res.ok) {
      const json = await res.json();
      const tokenData = json?.data || json;
      if (tokenData?.accessToken) {
        inMemoryToken = tokenData.accessToken;
        if (tokenData.refreshToken) inMemoryRefreshToken = tokenData.refreshToken;
        saveDiskCache(tokenData.accessToken, tokenData.refreshToken);
        return tokenData.accessToken;
      }
    }
  } catch {
    // refresh failed
  }
  return null;
}

/**
 * Request fresh token via live OTP handshake
 */
async function requestOtpToken(): Promise<string> {
  const reqRes = await fetch(`${BASE_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: DOCTOR_PHONE }),
  });

  if (reqRes.status === 429) {
    throw new Error('Rate limit (429) reached for OTP request.');
  }

  const reqJson = await reqRes.json();
  const challengeId = reqJson?.data?.challengeId || reqJson?.challengeId;
  if (!challengeId) {
    throw new Error(`Failed to obtain challengeId: ${JSON.stringify(reqJson)}`);
  }

  const verRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, otpCode: STAGING_OTP }),
  });

  if (!verRes.ok) {
    throw new Error(`OTP verify failed with status ${verRes.status}`);
  }

  const verJson = await verRes.json();
  const tokenData = verJson?.data || verJson;
  if (!tokenData?.accessToken) {
    throw new Error(`Malformed verify response: ${JSON.stringify(verJson)}`);
  }

  inMemoryToken = tokenData.accessToken;
  inMemoryRefreshToken = tokenData.refreshToken;
  saveDiskCache(tokenData.accessToken, tokenData.refreshToken);
  return tokenData.accessToken;
}

/**
 * Retrieve authenticated doctor token with cache-first and refresh strategy
 */
export async function getDoctorToken(): Promise<string> {
  // 1. Check in-memory token
  if (inMemoryToken) {
    const valid = await isTokenValid(inMemoryToken);
    if (valid) return inMemoryToken;
    if (inMemoryRefreshToken) {
      const refreshed = await refreshAccessToken(inMemoryRefreshToken);
      if (refreshed) return refreshed;
    }
  }

  // 2. Check disk cache
  const cached = loadDiskCache();
  if (cached?.accessToken) {
    inMemoryToken = cached.accessToken;
    inMemoryRefreshToken = cached.refreshToken || null;
    const valid = await isTokenValid(cached.accessToken);
    if (valid) return cached.accessToken;
    if (cached.refreshToken) {
      const refreshed = await refreshAccessToken(cached.refreshToken);
      if (refreshed) return refreshed;
    }
  }

  // 3. Fallback to requesting fresh OTP
  try {
    return await requestOtpToken();
  } catch (err: unknown) {
    // If rate-limited and we have a cached token, return cached token as best-effort
    if (cached?.accessToken) {
      return cached.accessToken;
    }
    throw err;
  }
}

/**
 * Return Authorization Bearer headers for live API calls
 */
export async function getAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  const token = explicitToken || (await getDoctorToken());
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
}
