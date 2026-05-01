import Papa from "papaparse";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api } from "@/api/client";
import { getExpenses } from "@/api/expenses";
import {
  getBackups,
  getDataSettings,
  getStorageUsage,
  patchDataSettings,
  postBackupNow,
  postImportCsvConfirm,
  postImportCsvPreview,
  type BackupListItem,
} from "@/api/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsCard } from "@/components/settings/shared/SettingsCard";
import { ToggleRow } from "@/components/settings/shared/ToggleRow";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import type { ExpenseRow } from "@/types/expense";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

interface CsvPreviewState {
  fileName: string;
  file: File;
  rows: Array<Record<string, string>>;
  headers: string[];
}

const requiredHeaders = ["date", "type", "category", "amount", "note"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toCsv(rows: ExpenseRow[]): string {
  const head = ["date", "title", "category", "amount", "type", "description"];
  const escaped = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
  const lines = rows.map((row) =>
    [
      escaped(new Date(row.date).toISOString().slice(0, 10)),
      escaped(row.title),
      escaped(row.category),
      escaped(row.amount),
      escaped(row.type),
      escaped(row.description),
    ].join(",")
  );
  return `${head.join(",")}\n${lines.join("\n")}`;
}

async function downloadBackupFile(backupId: string): Promise<void> {
  const res = await api.get<Blob>(`/auth/me/backups/${encodeURIComponent(backupId)}/download`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_${backupId.slice(0, 8)}.zip`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function DataExportTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, hydrateData, updateData } = useSettingsStore();
  const [csvPreview, setCsvPreview] = useState<CsvPreviewState | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localBackups, setLocalBackups] = useState<BackupListItem[]>([]);

  const dataSettingsQ = useQuery({
    queryKey: ["dataSettings"],
    queryFn: getDataSettings,
  });
  const backupsQ = useQuery({
    queryKey: ["backups"],
    queryFn: async () => (await getBackups()).backups,
  });
  const storageQ = useQuery({
    queryKey: ["storageUsage"],
    queryFn: getStorageUsage,
  });

  useEffect(() => {
    if (dataSettingsQ.data) hydrateData(dataSettingsQ.data);
  }, [dataSettingsQ.data, hydrateData]);
  useEffect(() => {
    if (backupsQ.data) setLocalBackups(backupsQ.data);
  }, [backupsQ.data]);

  const saveDataMut = useMutation({
    mutationFn: () =>
      patchDataSettings({
        autoBackup: data.autoBackup,
        backupFrequency: data.backupFrequency,
      }),
    onSuccess: (saved) => {
      hydrateData(saved);
      toast.success("Data settings saved");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to save data settings."));
    },
  });

  const backupNowMut = useMutation({
    mutationFn: postBackupNow,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["backups"] });
      await qc.invalidateQueries({ queryKey: ["dataSettings"] });
      toast.success("Backup created successfully");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Backup failed."));
    },
  });

  const importConfirmMut = useMutation({
    mutationFn: postImportCsvConfirm,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["expenses"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      setCsvPreview(null);
      toast.success("CSV imported successfully");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Import failed."));
    },
  });

  const parseCsvFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = (result.meta.fields ?? []).map((field) => field.trim().toLowerCase());
        const missing = requiredHeaders.filter((header) => !headers.includes(header));
        if (missing.length > 0) {
          toast.error(`Missing required headers: ${missing.join(", ")}`);
          return;
        }
        setCsvPreview({
          fileName: file.name,
          file,
          headers,
          rows: result.data.slice(0, 500),
        });
      },
      error: (error) => {
        toast.error(error.message || "Unable to parse CSV");
      },
    });
  };

  const exportTransactions = async () => {
    const toastId = toast.loading("Preparing CSV export...");
    try {
      const rows: ExpenseRow[] = [];
      let page = 1;
      let pages = 1;
      do {
        // eslint-disable-next-line no-await-in-loop
        const response = await getExpenses({ page, limit: 200, sort: "date", order: "desc" });
        rows.push(...response.data);
        pages = response.pagination.pages;
        page += 1;
      } while (page <= pages);
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("CSV export ready", { id: toastId });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to export CSV"), { id: toastId });
    }
  };

  const dropZoneClass = dragActive
    ? "border-primary bg-primary/10"
    : "border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/60";

  const totalQuota = 50 * 1024 * 1024;
  const usedBytes = storageQ.data?.totalBytes ?? 0;
  const usagePercent = Math.min(100, Math.round((usedBytes / totalQuota) * 100));

  return (
    <div className="space-y-6">
      <SettingsCard title="Data & export" description="Export, import, and backup your financial data.">
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void exportTransactions()}>
            Export transactions (CSV)
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/reports")}>
            Open reports for PDF / filters
          </Button>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Import CSV</Label>
          <label
            className={`block w-full cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center transition ${dropZoneClass}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) parseCsvFile(file);
            }}
          >
            <UploadCloud className="mx-auto mb-2 size-5" />
            <p className="text-sm">Drag a CSV file here, or click to upload</p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseCsvFile(file);
              }}
            />
          </label>
          {csvPreview ? (
            <div className="mt-3 rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/60 p-3">
              <p className="text-sm font-medium">
                {csvPreview.fileName} · {csvPreview.rows.length} row(s) parsed
              </p>
              <p className="text-muted-foreground text-xs">Headers: {csvPreview.headers.join(", ")}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!csvPreview) return;
                      const preview = await postImportCsvPreview(csvPreview.file);
                      importConfirmMut.mutate({
                        stagingId: preview.stagingId,
                        mapping: {
                          date: "date",
                          type: "type",
                          category: "category",
                          amount: "amount",
                          note: "note",
                        },
                      });
                    } catch (error: unknown) {
                      toast.error(getApiErrorMessage(error, "Import failed"));
                    }
                  }}
                  disabled={importConfirmMut.isPending}
                >
                  {importConfirmMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm import
                </Button>
                <Button type="button" variant="outline" onClick={() => setCsvPreview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <ToggleRow
          id="autoBackup"
          label="Auto backup"
          description={`Last backup: ${data.lastBackupAt ? new Date(data.lastBackupAt).toLocaleString() : "Never"}`}
          checked={data.autoBackup}
          onCheckedChange={(checked) => updateData({ autoBackup: checked })}
        />

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Backup frequency</Label>
          <Select value={data.backupFrequency} onValueChange={(value) => updateData({ backupFrequency: value as "daily" | "weekly" | "monthly" })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => saveDataMut.mutate()} disabled={saveDataMut.isPending}>
            {saveDataMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save backup settings
          </Button>
          <Button type="button" variant="outline" onClick={() => backupNowMut.mutate()} disabled={backupNowMut.isPending}>
            {backupNowMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Backup now
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Backups" description="Download and manage backup snapshots.">
        {localBackups.length === 0 ? (
          <p className="text-muted-foreground text-sm">No backups yet.</p>
        ) : (
          <div className="space-y-2">
            {localBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{new Date(backup.createdAt).toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatBytes(backup.sizeBytes)} · {backup.transactionCount} transactions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void downloadBackupFile(backup.id)}>
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocalBackups((prev) => prev.filter((item) => item.id !== backup.id));
                      toast.message("Backup removed from local list.");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      <SettingsCard title="Storage usage" description="Track current account storage consumption.">
        <div className="space-y-2 text-sm">
          <p>
            Transactions: {storageQ.data?.transactions.count ?? 0} (~
            {formatBytes(storageQ.data?.transactions.estimatedBytes ?? 0)})
          </p>
          <p>
            Attachments: {storageQ.data?.attachments.count ?? 0} (
            {formatBytes(storageQ.data?.attachments.totalBytes ?? 0)})
          </p>
          <p className="font-medium">Total used: {formatBytes(storageQ.data?.totalBytes ?? 0)}</p>
        </div>
        <Progress value={usagePercent} />
      </SettingsCard>
    </div>
  );
}
