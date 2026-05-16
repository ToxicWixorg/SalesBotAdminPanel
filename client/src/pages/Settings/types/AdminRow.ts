export type AdminRow = {
  admin: {
    id: number;
    userId: number;
    displayName: string | null;
    role: string;
    isActive: boolean;
    isSuperAdmin: boolean;
    allowedSections: string[] | null;
    permissions: Record<string, boolean>;
    lastLoginAt: string | null;
    lastActivityAt: string | null;
    loginCount: number;
    notes: string | null;
    createdAt: string;
  };
  user: { id: number; username: string; firstName: string } | null;
};
