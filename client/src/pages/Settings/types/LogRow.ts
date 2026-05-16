export type LogRow = {
  log: {
    id: number;
    adminId: number;
    action: string;
    entityType: string;
    entityId: string | null;
    description: string | null;
    severity: string;
    isSuccess: boolean;
    createdAt: string;
  };
  admin: { id: number; displayName: string | null; role: string } | null;
};
