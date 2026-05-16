export type BackupSettings = {
  id: number;
  isEnabled: boolean;
  telegramChannelId: string | null;
  cronSchedule: string;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  lastBackupSize: number | null;
  updatedAt: string | null;
};
