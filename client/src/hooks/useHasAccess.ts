import { useAuth } from "./useAuth";

export function useHasAccess(section: string) {
  const { admin } = useAuth();
  if (!admin) return false;
  if (admin.isSuperAdmin) return true;
  return admin.allowedSections?.includes(section) ?? false;
}
