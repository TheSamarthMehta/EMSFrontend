import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  deleteAccount,
  deleteAllTransactions,
  deleteTransactionsThisMonth,
} from "@/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/settings/shared/ConfirmDialog";
import { SettingsCard } from "@/components/settings/shared/SettingsCard";
import { clearTourStorage } from "@/context/TooltipContext";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

type DangerAction = "clear-month" | "clear-all" | "delete-account" | "reset-tour" | null;

export function DangerZoneTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [action, setAction] = useState<DangerAction>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  const clearMonthMut = useMutation({
    mutationFn: deleteTransactionsThisMonth,
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("This month's transactions cleared.");
      setAction(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to clear current month transactions."));
    },
  });

  const clearAllMut = useMutation({
    mutationFn: deleteAllTransactions,
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("All data cleared.");
      setAction(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to clear all data."));
    },
  });

  const deleteAccountMut = useMutation({
    mutationFn: () => deleteAccount("DELETE"),
    onSuccess: () => {
      toast.success("Account deleted");
      navigate("/", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to delete account."));
    },
  });

  const resetTour = () => {
    clearTourStorage();
    localStorage.removeItem("emt_hasSeenOnboarding");
    localStorage.removeItem("emt_seenPages");
    toast.success("Tour state reset.");
    setAction(null);
  };

  return (
    <>
      <SettingsCard
        title="Danger zone"
        description="Irreversible actions. Confirm carefully."
        className="border-destructive/40 bg-destructive/5"
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          <p className="font-medium">Danger zone</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="destructive"
            className="w-full justify-start text-left whitespace-normal"
            onClick={() => setAction("clear-month")}
          >
            Clear this month's transactions
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full justify-start text-left whitespace-normal"
            onClick={() => setAction("clear-all")}
          >
            Clear all data
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full justify-start text-left whitespace-normal"
            onClick={() => setAction("delete-account")}
          >
            Delete account
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left whitespace-normal"
            onClick={() => setAction("reset-tour")}
          >
            Reset tour (dev helper)
          </Button>
        </div>
      </SettingsCard>

      <ConfirmDialog
        open={action === "clear-month"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title="Clear this month's transactions"
        description="This will permanently delete all transactions from this month. This cannot be undone."
        onConfirm={() => clearMonthMut.mutate()}
        confirmDisabled={clearMonthMut.isPending}
      >
        {clearMonthMut.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "clear-all"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title="Clear all data"
        description="This will permanently delete ALL your transactions, categories, and budgets. This cannot be undone."
        onConfirm={() => clearAllMut.mutate()}
        confirmDisabled={clearAllMut.isPending}
      >
        {clearAllMut.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "delete-account"}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setConfirmDeleteText("");
          }
        }}
        title="Delete account"
        description="Your account and all data will be permanently deleted. Type DELETE to continue."
        confirmText="Yes, I'm sure"
        confirmDisabled={confirmDeleteText !== "DELETE" || deleteAccountMut.isPending}
        onConfirm={() => deleteAccountMut.mutate()}
      >
        <div className="space-y-2">
          <Label htmlFor="deleteConfirm" className="mb-1.5 block text-sm font-medium">
            Type DELETE to confirm
          </Label>
          <Input
            id="deleteConfirm"
            className="w-full"
            value={confirmDeleteText}
            onChange={(e) => setConfirmDeleteText(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "reset-tour"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title="Reset tour"
        description="This will reset onboarding and page-help tour flags."
        onConfirm={resetTour}
      />
    </>
  );
}
