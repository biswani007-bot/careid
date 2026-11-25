/**
 * CareID Global Branding Context
 *
 * Provides a single centralized source of truth for all brand assets
 * (Main Logo, Browser Favicon, Official Brand Colors, Footer Text)
 * across the entire CareID Admin Web application.
 *
 * Ensures:
 * 1. Consistent branding across Sidebar, Header, Login, and all admin pages.
 * 2. Instant dynamic update of the browser tab favicon without manual cache refresh.
 * 3. Graceful fallback to verified bundled assets if remote assets fail to load.
 * 4. Multi-tab persistence via localStorage and backend database synchronization.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  resolveBrandAssetUrl,
  testImageLoad,
  getAuthoritativeBrandLogo,
  getAuthoritativeFavicon,
  updateDocumentFavicon,
  type AssetSourceType,
  type AssetStatusType
} from '../utils/brandAssetUtils';
import {
  getPrimaryOrganization,
  getSystemSettings,
  type OrganizationProfile
} from '../services/systemSettingsService';

export interface BrandingState {
  logoUrl: string;
  logoSource: AssetSourceType;
  logoStatus: AssetStatusType;
  faviconUrl: string;
  faviconStatus: AssetStatusType;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  portalFooterText: string;
  organization: OrganizationProfile | null;
  isLoading: boolean;
}

export interface BrandingContextValue extends BrandingState {
  refreshBranding: () => Promise<void>;
  updateGlobalBranding: (updates: Partial<BrandingState>) => void;
}

const BRANDING_STORAGE_KEY = 'careid_global_branding';

const DEFAULT_BRANDING_STATE: BrandingState = {
  logoUrl: getAuthoritativeBrandLogo(),
  logoSource: 'bundled',
  logoStatus: 'ready',
  faviconUrl: getAuthoritativeFavicon(),
  faviconStatus: 'ready',
  primaryColor: '#3F1D8B',
  secondaryColor: '#00E5FF',
  accentColor: '#7C4DFF',
  portalFooterText:
    '© 2026 Care ID Health Systems. All rights reserved. Secure Encrypted Health Record Vault.',
  organization: null,
  isLoading: true
};

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

function loadCachedBranding(): Partial<BrandingState> | null {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[BrandingContext] Failed to read cached branding from localStorage:', err);
  }
  return null;
}

function saveCachedBranding(state: BrandingState) {
  try {
    const serialized = JSON.stringify({
      logoUrl: state.logoUrl,
      logoSource: state.logoSource,
      logoStatus: state.logoStatus,
      faviconUrl: state.faviconUrl,
      faviconStatus: state.faviconStatus,
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
      accentColor: state.accentColor,
      portalFooterText: state.portalFooterText
    });
    localStorage.setItem(BRANDING_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[BrandingContext] Failed to cache branding to localStorage:', err);
  }
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BrandingState>(() => {
    const cached = loadCachedBranding();
    if (cached) {
      return {
        ...DEFAULT_BRANDING_STATE,
        ...cached,
        isLoading: true
      };
    }
    return DEFAULT_BRANDING_STATE;
  });

  const fetchAndApplyBranding = useCallback(async () => {
    let resolvedLogo = getAuthoritativeBrandLogo();
    let logoSource: AssetSourceType = 'bundled';
    let logoStatus: AssetStatusType = 'ready';

    let resolvedFavicon = getAuthoritativeFavicon();
    let faviconStatus: AssetStatusType = 'ready';

    let primaryColor = state.primaryColor;
    let secondaryColor = state.secondaryColor;
    let accentColor = state.accentColor;
    let portalFooterText = state.portalFooterText;
    let orgProfile: OrganizationProfile | null = null;

    try {
      const [org, settings] = await Promise.all([
        getPrimaryOrganization().catch(() => null),
        getSystemSettings('BRANDING').catch(() => [])
      ]);

      if (org) {
        orgProfile = org;
        if (org.primaryColor) primaryColor = org.primaryColor;
        if (org.secondaryColor) secondaryColor = org.secondaryColor;

        if (org.logoUrl) {
          const resolved = resolveBrandAssetUrl(org.logoUrl);
          if (resolved) {
            const canLoad = await testImageLoad(resolved, 2500);
            if (canLoad) {
              resolvedLogo = resolved;
              logoSource = 'backend';
              logoStatus = 'ready';
            } else {
              console.warn(
                `[BrandingContext] Remote logoUrl "${resolved}" is inaccessible. Retaining master asset.`
              );
              logoStatus = 'fallback';
            }
          }
        }
      }

      if (Array.isArray(settings)) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((s) => {
          if (s.key && s.value) settingsMap[s.key] = s.value;
        });

        if (settingsMap['PRIMARY_COLOR']) primaryColor = settingsMap['PRIMARY_COLOR'];
        if (settingsMap['SECONDARY_COLOR']) secondaryColor = settingsMap['SECONDARY_COLOR'];
        if (settingsMap['ACCENT_COLOR']) accentColor = settingsMap['ACCENT_COLOR'];
        if (settingsMap['PORTAL_FOOTER_TEXT']) portalFooterText = settingsMap['PORTAL_FOOTER_TEXT'];

        const rawFavicon = settingsMap['BROWSER_FAVICON_URL'] || settingsMap['FAVICON_URL'];
        if (rawFavicon) {
          const resolvedFav = resolveBrandAssetUrl(rawFavicon);
          if (resolvedFav) {
            const canLoadFav = await testImageLoad(resolvedFav, 2000);
            if (canLoadFav) {
              resolvedFavicon = resolvedFav;
              faviconStatus = 'ready';
            } else {
              console.warn(
                `[BrandingContext] Remote favicon "${resolvedFav}" is inaccessible. Using fallback favicon.`
              );
              faviconStatus = 'fallback';
            }
          }
        }
      }

      const newState: BrandingState = {
        logoUrl: resolvedLogo,
        logoSource,
        logoStatus,
        faviconUrl: resolvedFavicon,
        faviconStatus,
        primaryColor,
        secondaryColor,
        accentColor,
        portalFooterText,
        organization: orgProfile,
        isLoading: false
      };

      setState(newState);
      saveCachedBranding(newState);
      updateDocumentFavicon(resolvedFavicon);
    } catch (err) {
      console.error('[BrandingContext] Error fetching live branding:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.primaryColor, state.secondaryColor, state.accentColor, state.portalFooterText]);

  useEffect(() => {
    // Initial fetch from live backend
    fetchAndApplyBranding();
  }, [fetchAndApplyBranding]);

  // Synchronize document favicon whenever state.faviconUrl changes
  useEffect(() => {
    if (state.faviconUrl) {
      updateDocumentFavicon(state.faviconUrl);
    }
  }, [state.faviconUrl]);

  // Manual update function for immediate optimistic application from settings
  const updateGlobalBranding = useCallback((updates: Partial<BrandingState>) => {
    setState((prev) => {
      const merged: BrandingState = {
        ...prev,
        ...updates
      };
      saveCachedBranding(merged);
      if (updates.faviconUrl) {
        updateDocumentFavicon(updates.faviconUrl);
      }
      return merged;
    });
  }, []);

  const value: BrandingContextValue = {
    ...state,
    refreshBranding: fetchAndApplyBranding,
    updateGlobalBranding
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = (): BrandingContextValue => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export default BrandingContext;

