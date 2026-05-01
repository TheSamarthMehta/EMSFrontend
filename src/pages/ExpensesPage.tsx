import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useI18n } from "@/context/LanguageContext";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "sonner";

type Category =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "health"
  | "utilities"
  | "rent"
  | "other";

type PaymentMethod = "cash" | "upi" | "credit_card" | "debit_card" | "net_banking";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: Category;
  date: string;
  paymentMethod: PaymentMethod;
  notes: string;
  recurring: boolean;
}

type SortField = "date" | "amount" | "title";
type SortDirection = "asc" | "desc";

interface ExpenseDraft {
  title: string;
  amount: string;
  category: Category;
  date: string;
  paymentMethod: PaymentMethod;
  notes: string;
  recurring: boolean;
}

const STORAGE_KEY = "ems.expense-manager.v1";
const PAGE_SIZE = 10;

const CATEGORY_OPTIONS: ReadonlyArray<{ value: Category; label: string; color: string }> = [
  { value: "food", label: "Food", color: "#f59e0b" },
  { value: "transport", label: "Transport", color: "#22c55e" },
  { value: "shopping", label: "Shopping", color: "#8b5cf6" },
  { value: "entertainment", label: "Entertainment", color: "#ec4899" },
  { value: "health", label: "Health", color: "#06b6d4" },
  { value: "utilities", label: "Utilities", color: "#eab308" },
  { value: "rent", label: "Rent", color: "#ef4444" },
  { value: "other", label: "Other", color: "#64748b" },
];

const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "net_banking", label: "Net Banking" },
];

const SAMPLE_SEED: ReadonlyArray<Expense> = [
  {
    id: "s1",
    title: "BigBasket groceries",
    amount: 2380,
    category: "food",
    date: "2026-04-04",
    paymentMethod: "upi",
    notes: "Weekly groceries",
    recurring: true,
  },
  {
    id: "s2",
    title: "Office cab rides",
    amount: 890,
    category: "transport",
    date: "2026-04-06",
    paymentMethod: "upi",
    notes: "Commute week 1",
    recurring: true,
  },
  {
    id: "s3",
    title: "Airtel broadband",
    amount: 1299,
    category: "utilities",
    date: "2026-04-07",
    paymentMethod: "net_banking",
    notes: "Monthly bill",
    recurring: true,
  },
  {
    id: "s4",
    title: "Weekend movie tickets",
    amount: 740,
    category: "entertainment",
    date: "2026-04-10",
    paymentMethod: "credit_card",
    notes: "2 tickets",
    recurring: false,
  },
  {
    id: "s5",
    title: "Nike running shoes",
    amount: 4999,
    category: "shopping",
    date: "2026-04-12",
    paymentMethod: "credit_card",
    notes: "Sports purchase",
    recurring: false,
  },
  {
    id: "s6",
    title: "Monthly rent",
    amount: 18500,
    category: "rent",
    date: "2026-04-01",
    paymentMethod: "net_banking",
    notes: "Apartment rent",
    recurring: true,
  },
  {
    id: "s7",
    title: "Apollo pharmacy",
    amount: 650,
    category: "health",
    date: "2026-03-27",
    paymentMethod: "cash",
    notes: "Vitamins",
    recurring: false,
  },
  {
    id: "s8",
    title: "Swiggy dinner",
    amount: 420,
    category: "food",
    date: "2026-03-22",
    paymentMethod: "upi",
    notes: "Late dinner",
    recurring: false,
  },
  {
    id: "s9",
    title: "Amazon household items",
    amount: 1890,
    category: "shopping",
    date: "2026-03-19",
    paymentMethod: "debit_card",
    notes: "Cleaning supplies",
    recurring: false,
  },
  {
    id: "s10",
    title: "Electricity bill",
    amount: 2450,
    category: "utilities",
    date: "2026-03-15",
    paymentMethod: "upi",
    notes: "March bill",
    recurring: true,
  },
  {
    id: "s11",
    title: "Metro card recharge",
    amount: 1000,
    category: "transport",
    date: "2026-03-10",
    paymentMethod: "cash",
    notes: "",
    recurring: true,
  },
  {
    id: "s12",
    title: "Dentist consultation",
    amount: 2500,
    category: "health",
    date: "2026-02-25",
    paymentMethod: "credit_card",
    notes: "Routine checkup",
    recurring: false,
  },
  {
    id: "s13",
    title: "IPL match streaming",
    amount: 399,
    category: "entertainment",
    date: "2026-02-20",
    paymentMethod: "upi",
    notes: "Subscription",
    recurring: true,
  },
  {
    id: "s14",
    title: "Co-working day pass",
    amount: 1200,
    category: "other",
    date: "2026-02-12",
    paymentMethod: "debit_card",
    notes: "Client workshop",
    recurring: false,
  },
  {
    id: "s15",
    title: "Furniture EMI",
    amount: 8300,
    category: "rent",
    date: "2026-02-05",
    paymentMethod: "net_banking",
    notes: "Monthly EMI",
    recurring: true,
  },
];

function categoryLabel(category: Category): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? "Other";
}

function categoryColor(category: Category): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.color ?? "#64748b";
}

function paymentLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_OPTIONS.find((p) => p.value === method)?.label ?? "Cash";
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function monthKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(isoMonthKey: string): string {
  const [year, month] = isoMonthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultDraft(): ExpenseDraft {
  return {
    title: "",
    amount: "",
    category: "food",
    date: todayIso(),
    paymentMethod: "upi",
    notes: "",
    recurring: false,
  };
}

export default function ExpenseManager() {
  const { t } = useI18n();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExpenseDraft>(defaultDraft());

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);

  const modalFirstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setExpenses([...SAMPLE_SEED]);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_SEED));
      } else {
        const parsed = JSON.parse(raw) as Expense[];
        if (Array.isArray(parsed)) {
          setExpenses(parsed);
        } else {
          setExpenses([...SAMPLE_SEED]);
        }
      }
    } catch {
      setExpenses([...SAMPLE_SEED]);
    } finally {
      window.setTimeout(() => setLoading(false), 450);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses, loading]);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const isTypingElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);
      if (isTypingElement) return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setEditingId(null);
        setDraft(defaultDraft());
        setModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    window.setTimeout(() => modalFirstInputRef.current?.focus(), 40);
  }, [modalOpen]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;

    const result = expenses.filter((exp) => {
      const titleMatches = exp.title.toLowerCase().includes(q);
      const categoryMatches = categoryLabel(exp.category).toLowerCase().includes(q);
      const searchMatches = q.length === 0 || titleMatches || categoryMatches;

      const categoryFilterMatches =
        selectedCategories.length === 0 || selectedCategories.includes(exp.category);
      const paymentMatches = selectedPayment === "all" || exp.paymentMethod === selectedPayment;
      const fromMatches = !fromDate || exp.date >= fromDate;
      const toMatches = !toDate || exp.date <= toDate;
      const minMatches = min == null || exp.amount >= min;
      const maxMatches = max == null || exp.amount <= max;

      return (
        searchMatches &&
        categoryFilterMatches &&
        paymentMatches &&
        fromMatches &&
        toMatches &&
        minMatches &&
        maxMatches
      );
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = a.date.localeCompare(b.date);
      if (sortField === "amount") cmp = a.amount - b.amount;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    expenses,
    search,
    selectedCategories,
    selectedPayment,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, page]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategories, selectedPayment, fromDate, toDate, minAmount, maxAmount, sortField, sortDirection]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentMonthSummary = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const total = thisMonth.reduce((sum, e) => sum + e.amount, 0);
    const highest = thisMonth.reduce((max, e) => Math.max(max, e.amount), 0);
    const avg = thisMonth.length > 0 ? total / thisMonth.length : 0;
    return {
      total,
      count: thisMonth.length,
      highest,
      avg,
    };
  }, [expenses]);

  const donutDataRaw = useMemo(() => {
    const grouped = new Map<Category, number>();
    for (const row of filteredAndSorted) {
      grouped.set(row.category, (grouped.get(row.category) ?? 0) + row.amount);
    }
    return Array.from(grouped.entries()).map(([category, amount]) => ({
      category,
      label: categoryLabel(category),
      amount,
      color: categoryColor(category),
    }));
  }, [filteredAndSorted]);

  /** Top 6 + "Other" so the donut never shows >7 slices. */
  const donutData = useMemo(() => {
    if (donutDataRaw.length === 0) return { rows: [] as typeof donutDataRaw, total: 0, hidden: 0 };
    const sorted = [...donutDataRaw].sort((a, b) => b.amount - a.amount);
    const total = sorted.reduce((s, r) => s + r.amount, 0);
    if (sorted.length <= 6) return { rows: sorted, total, hidden: 0 };
    const head = sorted.slice(0, 5);
    const tail = sorted.slice(5);
    const otherAmount = tail.reduce((s, r) => s + r.amount, 0);
    return {
      rows: [
        ...head,
        {
          category: "__other__" as Category,
          label: `Other (${tail.length})`,
          amount: otherAmount,
          color: "#64748b",
        },
      ],
      total,
      hidden: tail.length,
    };
  }, [donutDataRaw]);

  const monthlyTrendData = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of filteredAndSorted) {
      const key = monthKey(row.date);
      grouped.set(key, (grouped.get(key) ?? 0) + row.amount);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => ({
        month: key,
        label: monthLabel(key),
        amount,
      }));
  }, [filteredAndSorted]);

  const isAllVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id));

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setDraft(defaultDraft());
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: Expense) => {
    setEditingId(row.id);
    setDraft({
      title: row.title,
      amount: String(row.amount),
      category: row.category,
      date: row.date,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      recurring: row.recurring,
    });
    setModalOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedPayment("all");
    setFromDate("");
    setToDate("");
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    toast.success("All filters cleared");
  }, []);

  const handleSortToggle = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection(field === "title" ? "asc" : "desc");
      }
    },
    [sortField]
  );

  const handleDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = event.target;
      if (name === "recurring") {
        const checked = (event.target as HTMLInputElement).checked;
        setDraft((prev) => ({ ...prev, recurring: checked }));
        return;
      }
      if (name === "category") {
        setDraft((prev) => ({ ...prev, category: value as Category }));
        return;
      }
      if (name === "paymentMethod") {
        setDraft((prev) => ({ ...prev, paymentMethod: value as PaymentMethod }));
        return;
      }
      setDraft((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmitExpense = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const amount = Number(draft.amount);
      if (!draft.title.trim()) {
        toast.error("Title is required");
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Enter a valid amount");
        return;
      }
      if (!draft.date) {
        toast.error("Date is required");
        return;
      }

      if (editingId) {
        setExpenses((prev) =>
          prev.map((row) =>
            row.id === editingId
              ? {
                  ...row,
                  title: draft.title.trim(),
                  amount,
                  category: draft.category,
                  date: draft.date,
                  paymentMethod: draft.paymentMethod,
                  notes: draft.notes.trim(),
                  recurring: draft.recurring,
                }
              : row
          )
        );
        toast.success("Expense updated");
      } else {
        const next: Expense = {
          id: randomId(),
          title: draft.title.trim(),
          amount,
          category: draft.category,
          date: draft.date,
          paymentMethod: draft.paymentMethod,
          notes: draft.notes.trim(),
          recurring: draft.recurring,
        };
        setExpenses((prev) => [next, ...prev]);
        toast.success("Expense added");
      }

      setModalOpen(false);
      setEditingId(null);
      setDraft(defaultDraft());
    },
    [draft, editingId]
  );

  const requestDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setDeleteTargetIds(ids);
    setDeleteOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    const ids = new Set(deleteTargetIds);
    setExpenses((prev) => prev.filter((row) => !ids.has(row.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.has(id)));
    toast.success(deleteTargetIds.length > 1 ? "Selected expenses deleted" : "Expense deleted");
    setDeleteOpen(false);
    setDeleteTargetIds([]);
  }, [deleteTargetIds]);

  const exportCsv = useCallback(() => {
    if (filteredAndSorted.length === 0) {
      toast.error("No data to export");
      return;
    }
    const header = [
      "Date",
      "Title",
      "Category",
      "Amount",
      "Payment Method",
      "Notes",
      "Recurring",
    ];
    const rows = filteredAndSorted.map((row) => [
      row.date,
      row.title,
      categoryLabel(row.category),
      String(row.amount),
      paymentLabel(row.paymentMethod),
      row.notes.replaceAll('"', '""'),
      row.recurring ? "Yes" : "No",
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [filteredAndSorted]);

  return (
    <div className="min-h-full w-full min-w-0 overflow-x-hidden text-slate-100">
      <div className="w-full min-w-0 space-y-4" style={{ fontFamily: "'DM Sans', 'Sora', Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700&display=swap');`}</style>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("page.expenses.title")}</h1>
          <p className="text-xs text-slate-400">
            {t("page.expenses.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-800/70 px-3 text-xs font-medium transition-all duration-200 hover:border-slate-500 hover:bg-slate-700/80"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-indigo-500 px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-400"
          >
            <Plus className="size-3.5" />
            Add Expense
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700/70 bg-white/[0.03] p-3 sm:p-4 backdrop-blur-md transition-all duration-200 hover:border-indigo-400/40 hover:shadow-[0_8px_24px_rgba(14,20,34,0.35)]">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Expenses (this month)</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatINR(currentMonthSummary.total)}</p>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-white/[0.03] p-3 sm:p-4 backdrop-blur-md transition-all duration-200 hover:border-indigo-400/40 hover:shadow-[0_8px_24px_rgba(14,20,34,0.35)]">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Transactions</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{currentMonthSummary.count}</p>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-white/[0.03] p-3 sm:p-4 backdrop-blur-md transition-all duration-200 hover:border-indigo-400/40 hover:shadow-[0_8px_24px_rgba(14,20,34,0.35)]">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Highest Single Expense</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatINR(currentMonthSummary.highest)}</p>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-white/[0.03] p-3 sm:p-4 backdrop-blur-md transition-all duration-200 hover:border-indigo-400/40 hover:shadow-[0_8px_24px_rgba(14,20,34,0.35)]">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Average Expense</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatINR(currentMonthSummary.avg)}</p>
        </div>
      </section>

      <section className="filter-panel rounded-xl border border-slate-700/70 bg-white/[0.03] p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or category..."
              className="search-bar h-8 w-full rounded-md border border-slate-700/80 bg-[#101522] px-9 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700/80 bg-[#101522] px-2.5 text-xs transition-all duration-200 hover:border-slate-500"
            >
              <Filter className="size-4" />
              Filters
              {filterOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            <Select
              value={`${sortField}:${sortDirection}`}
              onValueChange={(value) => {
                if (!value) return;
                const [field, direction] = value.split(":");
                setSortField(field as SortField);
                setSortDirection(direction as SortDirection);
              }}
            >
              <SelectTrigger className="sort-controls h-8 rounded-md border border-slate-700/80 bg-[#101522] px-2.5 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date:desc">Date (Newest)</SelectItem>
                <SelectItem value="date:asc">Date (Oldest)</SelectItem>
                <SelectItem value="amount:desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount:asc">Amount (Low to High)</SelectItem>
                <SelectItem value="title:asc">Title (A-Z)</SelectItem>
                <SelectItem value="title:desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filterOpen ? (
          <div className="mt-4 grid gap-3 rounded-lg border border-slate-700/70 bg-[#0f1420]/80 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">
                Category
              </p>
              <div className="space-y-1">
                {CATEGORY_OPTIONS.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-2 text-sm text-slate-300">
                    <Checkbox
                      checked={selectedCategories.includes(cat.value)}
                      onCheckedChange={(checked) =>
                        setSelectedCategories((prev) =>
                          checked === true
                            ? [...prev, cat.value]
                            : prev.filter((v) => v !== cat.value)
                        )
                      }
                      className="border-slate-500 data-checked:border-indigo-500 data-checked:bg-indigo-500 data-checked:text-white"
                    />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">
                Date Range
              </p>
              <div className="space-y-2">
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="From date"
                  triggerClassName="h-8 rounded-md border border-slate-700/80 bg-[#101522] px-2.5 text-xs text-slate-200 shadow-none hover:bg-[#141a28] focus-visible:border-indigo-400 focus-visible:ring-[3px] focus-visible:ring-indigo-500/30"
                  align="start"
                />
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  placeholder="To date"
                  triggerClassName="h-8 rounded-md border border-slate-700/80 bg-[#101522] px-2.5 text-xs text-slate-200 shadow-none hover:bg-[#141a28] focus-visible:border-indigo-400 focus-visible:ring-[3px] focus-visible:ring-indigo-500/30"
                  align="start"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">
                Payment Method
              </p>
              <Select
                value={selectedPayment}
                onValueChange={(value) => setSelectedPayment(value as PaymentMethod | "all")}
              >
                <SelectTrigger className="h-8 w-full rounded-md border border-slate-700/80 bg-[#101522] px-2.5 text-xs text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">
                Amount Range
              </p>
              <div className="space-y-2">
                <NumberInput
                  min={0}
                  placeholder="Min"
                  value={minAmount}
                  onValueChange={setMinAmount}
                  className="h-8 border-slate-700/80 bg-[#101522] text-xs focus-within:border-indigo-400 focus-within:ring-[3px] focus-within:ring-indigo-500/30"
                />
                <NumberInput
                  min={0}
                  placeholder="Max"
                  value={maxAmount}
                  onValueChange={setMaxAmount}
                  className="h-8 border-slate-700/80 bg-[#101522] text-xs focus-within:border-indigo-400 focus-within:ring-[3px] focus-within:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 text-xs text-rose-200 transition-all duration-200 hover:bg-rose-500/20"
              >
                <X className="size-4" />
                Clear All Filters
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/70 bg-white/[0.03] p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Category Breakdown</h2>
            <span className="text-[11px] text-slate-400">Top 5 + Other</span>
          </div>
          {donutData.rows.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-400">No chart data available</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData.rows}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={1.5}
                      stroke="transparent"
                      animationDuration={600}
                    >
                      {donutData.rows.map((item) => (
                        <Cell key={item.category} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      formatter={(value: unknown, _name, meta) => [
                        formatINR(Number(value ?? 0)),
                        String((meta as { payload?: { label?: string } })?.payload?.label ?? "Category"),
                      ]}
                      contentStyle={{
                        background: "#111827",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Total</span>
                  <span className="text-sm font-semibold tabular-nums text-slate-100">
                    {formatINR(Math.round(donutData.total))}
                  </span>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5">
                {donutData.rows.map((row) => {
                  const pct =
                    donutData.total > 0
                      ? Math.round((row.amount / donutData.total) * 1000) / 10
                      : 0;
                  return (
                    <li
                      key={row.category}
                      className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-[11px]"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="truncate text-slate-200">{row.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-400">
                        {pct}% · {formatINR(Math.round(row.amount))}
                      </span>
                    </li>
                  );
                })}
                {donutData.hidden > 0 ? (
                  <li className="mt-1 text-[10px] text-slate-500">
                    {donutData.hidden} smaller categor{donutData.hidden === 1 ? "y" : "ies"} grouped under Other.
                  </li>
                ) : null}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-white/[0.03] p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Monthly Trend</h2>
            <span className="text-sm text-slate-400">Bar + line</span>
          </div>
          {monthlyTrendData.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-400">No trend data available</p>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: unknown) => [formatINR(Number(value ?? 0)), "Expenses"]}
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: 10,
                    }}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} animationDuration={650} />
                  <Line type="monotone" dataKey="amount" stroke="#93c5fd" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/70 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Expense Table</h2>
            <span className="text-sm text-slate-400">10 per page</span>
          </div>
          {selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => requestDelete(selectedIds)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 text-xs text-rose-200 transition-all duration-200 hover:bg-rose-500/20"
            >
              <Trash2 className="size-4" />
              Delete Selected ({selectedIds.length})
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-md bg-slate-800/70"
              />
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-600/60 bg-[#0b1020]/60 p-10 text-center">
            <Wallet className="mx-auto size-12 text-indigo-300/80" />
            <p className="mt-3 text-lg font-semibold">No expenses found</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
              Try adjusting filters or add your first expense. Your records are stored locally and
              stay available on reload.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-500 px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-400"
            >
              <Plus className="size-4" />
              Add first expense
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {pagedRows.map((row) => (
                <article key={row.id} className="expense-row rounded-lg border border-slate-700/70 bg-[#0f1422] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(row.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums">{formatINR(row.amount)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-sm font-medium text-white"
                      style={{ backgroundColor: categoryColor(row.category) }}
                    >
                      {categoryLabel(row.category)}
                    </span>
                    <span className="text-xs text-slate-400">{paymentLabel(row.paymentMethod)}</span>
                    {row.recurring ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                        Recurring
                      </span>
                    ) : null}
                  </div>
                  {row.notes ? <p className="mt-2 text-sm text-slate-300">{row.notes}</p> : null}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(row)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-600/80 bg-slate-800/80 px-3 text-sm transition-all duration-200 hover:border-indigo-400"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete([row.id])}
                      className="inline-flex min-h-11 items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 text-sm text-rose-200 transition-all duration-200 hover:bg-rose-500/20"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border border-slate-700/70 md:block">
              <table className="w-full text-xs">
                <thead className="bg-[#111727] text-slate-300">
                  <tr>
                    <th className="px-2.5 py-2 text-left">
                      <Checkbox
                        checked={isAllVisibleSelected}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...pagedRows.map((r) => r.id)])));
                          } else {
                            const pageIds = new Set(pagedRows.map((r) => r.id));
                            setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
                          }
                        }}
                        className="border-slate-500 data-checked:border-indigo-500 data-checked:bg-indigo-500 data-checked:text-white"
                      />
                    </th>
                    <th
                      className="cursor-pointer px-2.5 py-2 text-left font-semibold"
                      onClick={() => handleSortToggle("date")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Date
                        {sortField === "date" ? (
                          sortDirection === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : null}
                      </span>
                    </th>
                    <th
                      className="cursor-pointer px-2.5 py-2 text-left font-semibold"
                      onClick={() => handleSortToggle("title")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Title
                        {sortField === "title" ? (
                          sortDirection === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : null}
                      </span>
                    </th>
                    <th className="px-2.5 py-2 text-left font-semibold">Category</th>
                    <th
                      className="cursor-pointer px-3 py-3 text-right font-semibold"
                      onClick={() => handleSortToggle("amount")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Amount
                        {sortField === "amount" ? (
                          sortDirection === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : null}
                      </span>
                    </th>
                    <th className="px-2.5 py-2 text-left font-semibold">Payment Method</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Notes</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Recurring</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="expense-row border-t border-slate-700/60 transition-colors duration-200 hover:bg-indigo-500/10"
                    >
                      <td className="px-2.5 py-1.5">
                        <Checkbox
                          className="bulk-select-checkbox border-slate-500 data-checked:border-indigo-500 data-checked:bg-indigo-500 data-checked:text-white"
                          checked={selectedIds.includes(row.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((prev) =>
                              checked === true
                                ? [...prev, row.id]
                                : prev.filter((id) => id !== row.id)
                            )
                          }
                        />
                      </td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-2.5 py-1.5 font-medium">{row.title}</td>
                      <td className="px-2.5 py-1.5">
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-sm font-medium text-white"
                          style={{ backgroundColor: categoryColor(row.category) }}
                        >
                          {categoryLabel(row.category)}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums">
                        {formatINR(row.amount)}
                      </td>
                      <td className="px-2.5 py-1.5">{paymentLabel(row.paymentMethod)}</td>
                      <td className="max-w-[220px] truncate px-2.5 py-1.5 text-slate-300">
                        {row.notes || "—"}
                      </td>
                      <td className="px-2.5 py-1.5">{row.recurring ? "Yes" : "No"}</td>
                      <td className="px-2.5 py-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-600/80 bg-slate-800/80 px-2 text-sm transition-all duration-200 hover:border-indigo-400"
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete([row.id])}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 text-sm text-rose-200 transition-all duration-200 hover:bg-rose-500/20"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
              <span>
                Page {page} of {totalPages} · {filteredAndSorted.length} filtered records
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 rounded-md border border-slate-700/80 bg-[#101522] px-2.5 text-xs disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 rounded-md border border-slate-700/80 bg-[#101522] px-2.5 text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {(modalOpen || deleteOpen) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          {modalOpen ? (
            <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl border border-slate-700/80 bg-[#111727] p-5 text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-200 sm:max-w-2xl sm:rounded-xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">
                    {editingId ? "Edit Expense" : "Add Expense"}
                  </h3>
                  <p className="text-base text-slate-400">
                    Press <kbd className="rounded bg-slate-800 px-1">N</kbd> to open quickly
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-md border border-slate-700/80 bg-slate-800/80 transition-all duration-200 hover:border-slate-500"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitExpense} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Title
                  </label>
                  <input
                    ref={modalFirstInputRef}
                    name="title"
                    value={draft.title}
                    onChange={handleDraftChange}
                    className="h-9 w-full rounded-md border border-slate-700/80 bg-[#0f1420] px-3 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-500/30"
                    placeholder="Expense title"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ₹
                    </span>
                    <NumberInput
                      id="amount-field"
                      name="amount"
                      min={0}
                      step={0.01}
                      value={draft.amount}
                      onValueChange={(value) => setDraft((prev) => ({ ...prev, amount: value }))}
                      className="h-9 border-slate-700/80 bg-[#0f1420] pl-7 text-sm focus-within:border-indigo-400 focus-within:ring-[3px] focus-within:ring-indigo-500/30"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Category
                  </label>
                  <Select
                    value={draft.category}
                    onValueChange={(value) =>
                      setDraft((prev) => ({ ...prev, category: value as Category }))
                    }
                  >
                    <SelectTrigger id="category-select" className="h-9 w-full rounded-md border border-slate-700/80 bg-[#0f1420] px-3 text-sm text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="exp-draft-date">
                    Date
                  </label>
                  <DatePicker
                    id="date-picker"
                    value={draft.date}
                    onChange={(v) => setDraft((prev) => ({ ...prev, date: v }))}
                    placeholder="Pick date"
                    triggerClassName="h-9 rounded-md border border-slate-700/80 bg-[#0f1420] px-3 text-sm text-slate-200 shadow-none hover:bg-[#121826] focus-visible:border-indigo-400 focus-visible:ring-[3px] focus-visible:ring-indigo-500/30"
                    align="start"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Payment Method
                  </label>
                  <Select
                    value={draft.paymentMethod}
                    onValueChange={(value) =>
                      setDraft((prev) => ({ ...prev, paymentMethod: value as PaymentMethod }))
                    }
                  >
                    <SelectTrigger className="h-9 w-full rounded-md border border-slate-700/80 bg-[#0f1420] px-3 text-sm text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Notes (optional)
                  </label>
                  <textarea
                    id="note-field"
                    name="notes"
                    value={draft.notes}
                    onChange={handleDraftChange}
                    rows={3}
                    className="w-full rounded-md border border-slate-700/80 bg-[#0f1420] px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-500/30"
                    placeholder="Any additional context"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <Checkbox
                      className="bulk-select-checkbox border-slate-500 data-checked:border-indigo-500 data-checked:bg-indigo-500 data-checked:text-white"
                      name="recurring"
                      checked={draft.recurring}
                      onCheckedChange={(checked) =>
                        setDraft((prev) => ({ ...prev, recurring: checked === true }))
                      }
                    />
                    Recurring expense
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="receipt-upload">
                    Receipt upload (optional)
                  </label>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*,.pdf"
                    className="h-9 w-full rounded-md border border-slate-700/80 bg-[#0f1420] px-3 py-1 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-9 rounded-md border border-slate-700/80 bg-slate-800/80 px-3 text-sm transition-all duration-200 hover:border-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-expense-btn"
                    type="submit"
                    className="h-9 rounded-md bg-indigo-500 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-400"
                  >
                    {editingId ? "Save Changes" : "Add Expense"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {deleteOpen ? (
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-slate-700/80 bg-[#111727] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-200 sm:rounded-xl">
              <h3 className="text-lg font-semibold">Delete Confirmation</h3>
              <p className="mt-1 text-sm text-slate-400">
                Are you sure you want to delete{" "}
                {deleteTargetIds.length > 1
                  ? `${deleteTargetIds.length} selected expenses`
                  : "this expense"}
                ?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteTargetIds([]);
                  }}
                  className="h-8 rounded-md border border-slate-700/80 bg-slate-800/80 px-2.5 text-xs transition-all duration-200 hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="h-8 rounded-md bg-rose-500 px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-rose-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
      </div>
    </div>
  );
}
