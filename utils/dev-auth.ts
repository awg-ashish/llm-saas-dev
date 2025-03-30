// In a new file: utils/dev-auth.ts
export const DEV_USER = {
  id: "dev-user-id",
  email: "dev@example.com",
  user_metadata: {
    name: "Dev User",
  },
};

export function isDevMode() {
  return process.env.NODE_ENV === "development";
}
