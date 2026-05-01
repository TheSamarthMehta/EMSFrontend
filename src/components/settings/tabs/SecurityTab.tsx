import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import {
  deleteOtherSessions,
  deleteSession,
  getSecuritySettings,
  getSessions,
  patchSecuritySettings,
  post2faDisable,
  post2faSetup,
  post2faVerify,
  postChangePassword,
  type SessionRow,
} from "@/api/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsCard } from "@/components/settings/shared/SettingsCard";
import { ConfirmDialog } from "@/components/settings/shared/ConfirmDialog";
import { ToggleRow } from "@/components/settings/shared/ToggleRow";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

type PasswordVisibilityMap = {
  current: boolean;
  next: boolean;
  confirm: boolean;
};

function SessionRowItem({
  session,
  onRevoke,
}: {
  session: SessionRow;
  onRevoke: (session: SessionRow) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/70 px-3 py-3">
      <div className="min-w-0">
        <p className="font-medium">{session.deviceName}</p>
        <p className="text-muted-foreground text-sm">
          {session.ipAddress} · {session.location || "Unknown"} · {new Date(session.lastActive).toLocaleString()}
        </p>
      </div>
      {session.isCurrent ? (
        <Badge variant="secondary" className="bg-[hsl(280_80%_65%)]/20 text-purple-100">
          Current
        </Badge>
      ) : (
        <Button type="button" variant="ghost" className="text-destructive" onClick={() => onRevoke(session)}>
          Revoke
        </Button>
      )}
    </div>
  );
}

export function SecurityTab() {
  const qc = useQueryClient();
  const { security, hydrateSecurity, updateSecurity } = useSettingsStore();

  const [twoFaDialogOpen, setTwoFaDialogOpen] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<1 | 2 | 3>(1);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaDisableDialog, setTwoFaDisableDialog] = useState(false);
  const [twoFaDisableCode, setTwoFaDisableCode] = useState("");
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revokeOne, setRevokeOne] = useState<SessionRow | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibilityMap>({
    current: false,
    next: false,
    confirm: false,
  });

  const [setupSecret, setSetupSecret] = useState("");
  const [setupQr, setSetupQr] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const securityQ = useQuery({
    queryKey: ["securitySettings"],
    queryFn: getSecuritySettings,
  });
  const sessionsQ = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await getSessions()).sessions,
  });

  useEffect(() => {
    if (securityQ.data) {
      hydrateSecurity(securityQ.data);
    }
  }, [hydrateSecurity, securityQ.data]);

  const saveSecurityMut = useMutation({
    mutationFn: () =>
      patchSecuritySettings({
        sessionTimeoutMinutes: security.sessionTimeoutMinutes,
        loginNotifications: security.loginNotifications,
      }),
    onSuccess: (data) => {
      hydrateSecurity(data);
      toast.success("Security settings saved");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to save security settings."));
    },
  });

  const setup2faMut = useMutation({
    mutationFn: post2faSetup,
    onSuccess: (data) => {
      setSetupSecret(data.secret);
      setSetupQr(data.qrCodeUrl);
      setTwoFaStep(2);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to start 2FA setup."));
    },
  });

  const verify2faMut = useMutation({
    mutationFn: post2faVerify,
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes ?? []);
      setTwoFaStep(3);
      void qc.invalidateQueries({ queryKey: ["securitySettings"] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Invalid verification code."));
    },
  });

  const disable2faMut = useMutation({
    mutationFn: post2faDisable,
    onSuccess: () => {
      setTwoFaDisableDialog(false);
      setTwoFaDisableCode("");
      toast.success("2FA disabled");
      void qc.invalidateQueries({ queryKey: ["securitySettings"] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to disable 2FA."));
    },
  });

  const revokeSessionMut = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      toast.success("Session revoked");
      setRevokeOne(null);
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to revoke session."));
    },
  });

  const revokeAllMut = useMutation({
    mutationFn: deleteOtherSessions,
    onSuccess: () => {
      toast.success("All other sessions revoked");
      setRevokeAllOpen(false);
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to revoke sessions."));
    },
  });

  const changePasswordMut = useMutation({
    mutationFn: () => postChangePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to update password."));
    },
  });

  const strength = usePasswordStrength(newPassword);
  const passwordValid =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length >= 8 &&
    newPassword !== currentPassword &&
    confirmPassword === newPassword;

  return (
    <div className="space-y-6">
      <SettingsCard title="Two-factor authentication" description="Add extra security to your account sign-ins.">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={
              securityQ.data?.twoFactorEnabled
                ? "border-emerald-500/40 text-emerald-300"
                : "border-amber-500/40 text-amber-300"
            }
          >
            {securityQ.data?.twoFactorEnabled ? "Enabled" : "Not enabled"}
          </Badge>
          {securityQ.data?.twoFactorEnabled ? (
            <Button type="button" variant="destructive" onClick={() => setTwoFaDisableDialog(true)}>
              Disable 2FA
            </Button>
          ) : (
            <Button type="button" onClick={() => setTwoFaDialogOpen(true)}>
              Enable 2FA
            </Button>
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Session settings" description="Control timeout and alerts for account activity.">
        <div>
          <Label className="mb-1.5 block text-sm font-medium">Session timeout</Label>
          <Select
            value={String(security.sessionTimeoutMinutes)}
            onValueChange={(value) => updateSecurity({ sessionTimeoutMinutes: Number(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="240">4 hours</SelectItem>
              <SelectItem value="1440">1 day</SelectItem>
              <SelectItem value="0">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToggleRow
          id="loginNotifications"
          label="Login notifications"
          description="Send an email when a new device signs in."
          checked={security.loginNotifications}
          onCheckedChange={(checked) => updateSecurity({ loginNotifications: checked })}
        />
        <Button type="button" onClick={() => saveSecurityMut.mutate()} disabled={saveSecurityMut.isPending}>
          {saveSecurityMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save session settings
        </Button>
      </SettingsCard>

      <SettingsCard title="Active sessions" description="Review and revoke authenticated sessions.">
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setRevokeAllOpen(true)}>
            Revoke all other
          </Button>
        </div>
        <div className="space-y-2">
          {(sessionsQ.data ?? []).map((session) => (
            <SessionRowItem key={session.id} session={session} onRevoke={(row) => setRevokeOne(row)} />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Change password" description="Update your account password securely.">
        <div className="space-y-3">
          {(
            [
              { key: "current", label: "Current password", value: currentPassword, setValue: setCurrentPassword },
              { key: "next", label: "New password", value: newPassword, setValue: setNewPassword },
              { key: "confirm", label: "Confirm password", value: confirmPassword, setValue: setConfirmPassword },
            ] as const
          ).map((field) => (
            <div key={field.key}>
              <Label className="mb-1.5 block text-sm font-medium">{field.label}</Label>
              <div className="relative">
                <Input
                  type={passwordVisibility[field.key] ? "text" : "password"}
                  className="w-full pr-10"
                  value={field.value}
                  onChange={(e) => field.setValue(e.target.value)}
                />
                <button
                  type="button"
                  className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() =>
                    setPasswordVisibility((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                  }
                >
                  {passwordVisibility[field.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Password strength</span>
            <span>{strength.label}</span>
          </div>
          <Progress value={strength.progress} className={strength.colorClass} />
        </div>
        {newPassword === currentPassword && newPassword.length > 0 ? (
          <p className="text-destructive text-sm">New password must be different from current password.</p>
        ) : null}
        {confirmPassword.length > 0 && confirmPassword !== newPassword ? (
          <p className="text-destructive text-sm">Confirm password must match new password.</p>
        ) : null}
        <Button
          type="button"
          disabled={!passwordValid || changePasswordMut.isPending}
          onClick={() => changePasswordMut.mutate()}
        >
          {changePasswordMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </SettingsCard>

      <Dialog open={twoFaDialogOpen} onOpenChange={setTwoFaDialogOpen}>
        <DialogContent className="max-w-md border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]">
          <DialogHeader>
            <DialogTitle>Enable 2FA</DialogTitle>
            <DialogDescription>Scan the QR code using an authenticator app.</DialogDescription>
          </DialogHeader>
          {twoFaStep === 1 ? (
            <Button type="button" onClick={() => setup2faMut.mutate()} disabled={setup2faMut.isPending}>
              {setup2faMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate QR
            </Button>
          ) : null}
          {twoFaStep === 2 ? (
            <div className="space-y-3">
              <img src={setupQr} alt="2FA QR code" className="mx-auto max-h-48 rounded-md bg-white p-2" />
              <p className="text-muted-foreground text-xs">Secret: {setupSecret}</p>
              <Input
                placeholder="Enter 6-digit code"
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button type="button" onClick={() => verify2faMut.mutate(twoFaCode)} disabled={twoFaCode.length < 6}>
                Verify
              </Button>
            </div>
          ) : null}
          {twoFaStep === 3 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Backup codes</p>
              <ul className="text-muted-foreground list-inside list-disc text-xs">
                {backupCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTwoFaDialogOpen(false);
                setTwoFaStep(1);
                setTwoFaCode("");
                setBackupCodes([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={twoFaDisableDialog}
        onOpenChange={setTwoFaDisableDialog}
        title="Disable 2FA"
        description="Enter your current authenticator code to disable two-factor authentication."
        confirmText="Disable 2FA"
        confirmDisabled={twoFaDisableCode.length < 6 || disable2faMut.isPending}
        onConfirm={() => disable2faMut.mutate(twoFaDisableCode)}
      >
        <Input
          placeholder="6-digit code"
          value={twoFaDisableCode}
          onChange={(e) => setTwoFaDisableCode(e.target.value.replace(/\D/g, ""))}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        title="Revoke all other sessions?"
        description="This will sign out every other device except this one."
        onConfirm={() => revokeAllMut.mutate()}
      />

      <ConfirmDialog
        open={Boolean(revokeOne)}
        onOpenChange={(open) => {
          if (!open) setRevokeOne(null);
        }}
        title="Revoke session?"
        description="This device will be signed out immediately."
        onConfirm={() => {
          if (revokeOne) revokeSessionMut.mutate(revokeOne.id);
        }}
      />
    </div>
  );
}
