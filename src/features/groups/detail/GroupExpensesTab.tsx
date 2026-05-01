import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatCurrency";
import type { GroupExpense } from "@/types/group";

export function GroupExpensesTab({
  expenses,
  currency,
}: {
  expenses: GroupExpense[];
  currency: string;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Expenses</CardTitle>
        <CardDescription>Track all group expenses and split decisions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead>Split Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    No expenses yet
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell className="text-sm">{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {typeof expense.paidBy === "string" ? "Unknown" : expense.paidBy.displayName}
                    </TableCell>
                    <TableCell className="uppercase">{expense.splitType}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(expense.amount, expense.currency || currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
