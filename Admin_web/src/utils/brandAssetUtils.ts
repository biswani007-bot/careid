/**
 * CareID Brand Asset Resolution & Verification Utilities
 *
 * Provides safe resolution and pre-load validation for branding assets (logos, favicons).
 * Ensures that broken remote URLs or invalid endpoints never overwrite authoritative
 * client brand assets or cause broken-image icons in the administrative interface.
 */

import defaultCareIdLogo from '../assets/CareIDlogo.png';

export type AssetSourceType = 'bundled' | 'backend' | 'uploaded';
export type AssetStatusType = 'loading' | 'ready' | 'fallback' | 'error';

/** Default browser favicon path */
export const DEFAULT_FAVICON_PATH = '/favicon.svg';

/**
 * Returns the default authoritative fallback browser favicon path.
 */
export function getAuthoritativeFavicon(): string {
  return DEFAULT_FAVICON_PATH;
}

/**
 * Resolves raw backend asset URLs into valid browser-accessible URI strings.
 *
 * Handles:
 * - null / undefined / empty string -> null
 * - Data URLs (data:image/...) -> returned as-is
 * - Blob URLs (blob:...) -> returned as-is
 * - Absolute HTTP/S URLs -> returned trimmed
 * - Relative API paths (/api/v1/attachments/file/...) -> prepends API base URL
 */
export function resolveBrandAssetUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  // Self-contained data or blob URIs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Absolute HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Relative API paths (e.g. /api/v1/attachments/file/..., /uploads/...)
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'https://360api.vnvision.in';
    return `${apiBase.replace(/\/+$/, '')}${trimmed}`;
  }

  // Root-relative static web assets (e.g. /favicon.svg, /assets/...)
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Pre-verifies whether an image URL can be loaded successfully by the browser.
 * Resolves to true only when the image fires 'onload' with naturalWidth > 0.
 * Automatically times out after timeoutMs to avoid blocking on hung network connections.
 */
export function testImageLoad(url: string, timeoutMs: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      resolve(false);
      return;
    }

    // Data and Blob URLs are local memory objects and do not require network round-trips
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      resolve(true);
      return;
    }

    let finished = false;
    const img = new Image();

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        img.src = '';
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve(img.naturalWidth > 0);
      }
    };

    img.onerror = () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}

/**
 * Returns the authoritative bundled fallback CareID logo.
 */
export function getAuthoritativeBrandLogo(): string {
  return defaultCareIdLogo;
}

/**
 * Dynamically updates the browser tab favicon link element in document.head.
 * Creates or updates <link rel="icon" ...> to ensure instant visual reflection.
 */
export function updateDocumentFavicon(faviconUrl: string): void {
  if (typeof document === 'undefined' || !faviconUrl) return;

  try {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    if (faviconUrl.startsWith('data:image/svg') || faviconUrl.endsWith('.svg')) {
      link.type = 'image/svg+xml';
    } else if (faviconUrl.startsWith('data:image/x-icon') || faviconUrl.endsWith('.ico')) {
      link.type = 'image/x-icon';
    } else if (faviconUrl.startsWith('data:image/png') || faviconUrl.endsWith('.png')) {
      link.type = 'image/png';
    }

    link.href = faviconUrl;
  } catch (err) {
    console.warn('[Branding] Failed to update document favicon:', err);
  }
}
