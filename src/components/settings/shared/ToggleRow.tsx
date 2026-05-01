import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/60 px-3 py-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
        </Label>
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
