import { useAuth } from "@/lib/auth";

// The authenticated user's project id. The server derives the real project
// from the session token on every /api call, but the client uses this for
// query keys and request params so the UI is bound to the logged-in project
// rather than a hardcoded default.
export function useProjectId(): number {
  const { user } = useAuth();
  return user?.projectId ?? 1;
}
