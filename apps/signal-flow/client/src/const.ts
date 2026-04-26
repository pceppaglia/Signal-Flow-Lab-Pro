export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Official horizontal lockup (`packages/branding/logos/SVG/RecordingStudio_horiz.svg`). */
export const BRANDING_HORIZ_LOGO_URL = "/branding/RecordingStudio_horiz.svg";

export const VU_AMBER = "#E8A020";
export const VU_AMBER_HOVER = "#F5B844";
export const SIGNAL_RED_CTA = "#E11D48";

export const getGhlWaitlistUrl = () => {
  const raw = import.meta.env.VITE_GHL_WAITLIST_URL as string | undefined;
  if (raw && /^https?:\/\//i.test(raw.trim())) return raw.trim();
  if (import.meta.env.DEV) {
    console.warn(
      "[config] VITE_GHL_WAITLIST_URL is unset; using recordingstudio.com for GET FULL ACCESS",
    );
  }
  return "https://www.recordingstudio.com";
};

/** Vocal Chain Matchmaker CTA — external URL only (never same-page / oauth loop). */
export const getMatchmakerLaunchUrl = () => {
  const raw = import.meta.env.VITE_MATCHMAKER_URL as string | undefined;
  if (raw && /^https?:\/\//i.test(raw.trim())) return raw.trim();
  return getGhlWaitlistUrl();
};

export const getLoginUrl = () => {
  // Use a fallback URL if the environment variable is missing to prevent the "Invalid URL" crash
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || window.location.origin;
  const appId = import.meta.env.VITE_APP_ID || "default-app-id";
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    // We ensure the URL is absolute by providing window.location.origin as a base
    const url = new URL(`${oauthPortalUrl}/app-auth`, window.location.origin);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (e) {
    console.error("Critical Error: Could not construct Login URL", e);
    return "/login-error"; // Fallback path instead of crashing the whole app
  }
};