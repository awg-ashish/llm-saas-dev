// utils/dev-auth.ts
export const DEV_USER = {
  id: "dev-user-id",
  email: "dev@example.com",
  user_metadata: {
    name: "Dev User",
  },
};

export function isDevMode(): boolean {
  return process.env.NODE_ENV === "development";
}

// Authentication method tracking for development mode
export const AUTH_METHOD = {
  SKIPPED: "skipped",
  AUTHENTICATED: "authenticated",
} as const;

// Type for auth methods
type AuthMethod = typeof AUTH_METHOD[keyof typeof AUTH_METHOD];

// Store the authentication method in localStorage (client-side only)
export function setDevAuthMethod(method: AuthMethod): void {
  if (typeof window !== "undefined" && isDevMode()) {
    localStorage.setItem("dev_auth_method", method);
  }
}

// Get the stored authentication method
export function getDevAuthMethod(): AuthMethod {
  if (typeof window !== "undefined" && isDevMode()) {
    return (localStorage.getItem("dev_auth_method") as AuthMethod) || AUTH_METHOD.SKIPPED;
  }
  return AUTH_METHOD.AUTHENTICATED; // Default to authenticated in production
}