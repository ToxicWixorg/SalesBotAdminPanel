import { useAuth } from "./useAuth";

export function useHasAccess(section: string) {
  const { admin } = useAuth();
  if (!admin) return false;
  if (admin.isSuperAdmin) return true;
  if (admin.allowedSections === null) return true; // null = همه بخش‌ها
  return admin.allowedSections.includes(section);
}
