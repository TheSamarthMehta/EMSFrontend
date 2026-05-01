import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GroupsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  onSortChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status: "all" | "active" | "inactive" | "archived";
  onStatusChange: (value: "all" | "active" | "inactive" | "archived") => void;
  sortBy: "recent" | "spent" | "members" | "name";
  onSortChange: (value: "recent" | "spent" | "members" | "name") => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search groups"
          className="pl-9"
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => {
          if (!value) return;
          onStatusChange(value);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={sortBy}
        onValueChange={(value) => {
          if (!value) return;
          onSortChange(value);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Recent activity</SelectItem>
          <SelectItem value="spent">Amount spent</SelectItem>
          <SelectItem value="members">Members</SelectItem>
          <SelectItem value="name">Name</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
