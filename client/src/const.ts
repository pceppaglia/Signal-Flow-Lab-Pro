export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

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