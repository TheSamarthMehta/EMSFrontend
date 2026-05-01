export interface ExpenseRow {
  _id: string;
  userId: string;
  title: string;
  amount: number;
  type: string;
  date: string;
  category: string;
  description: string;
  scope: string;
  groupId: string | null;
  paymentApp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseListResponse {
  data: ExpenseRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
