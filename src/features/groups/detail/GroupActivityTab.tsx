import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupActivity } from "@/types/group";

function actorName(activity: GroupActivity): string {
  if (typeof activity.actorId === "string") return "Unknown";
  return activity.actorId.displayName;
}

export function GroupActivityTab({ items }: { items: GroupActivity[] }) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Activity timeline</CardTitle>
        <CardDescription>Expenses, member updates, and settlements.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          items.map((item) => (
            <div key={item._id} className="border-border rounded-lg border px-3 py-2">
              <p className="text-sm font-medium">
                {item.type.replaceAll(".", " ")} by {actorName(item)}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
