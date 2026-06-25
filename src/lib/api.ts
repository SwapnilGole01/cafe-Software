import { Table, MenuItem, Order, Feedback, OrderHistoryRecord, Owner } from "../types.ts";

let authToken: string | null = localStorage.getItem("cafe_admin_token");

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem("cafe_admin_token", token);
  } else {
    localStorage.removeItem("cafe_admin_token");
  }
};

export const getAuthToken = () => authToken;

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Owner Authentication
  async login(email: string, password: string): Promise<{ owner: Owner; token: string }> {
    const data = await apiFetch<{ owner: Owner; token: string }>("/api/auth/login-owner", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async register(email: string, password: string): Promise<{ owner: Owner; token: string }> {
    const data = await apiFetch<{ owner: Owner; token: string }>("/api/auth/register-owner", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(console.error);
    setAuthToken(null);
  },

  async checkMe(): Promise<{ user: Owner }> {
    return apiFetch<{ user: Owner }>("/api/auth/me");
  },

  // Public Customer Operations
  async getPublicMenu(): Promise<MenuItem[]> {
    const data = await apiFetch<any>("/api/menu");
    if (Array.isArray(data)) {
      return data;
    }
    return Object.values(data).flat() as MenuItem[];
  },

  async getTableStatus(tableId: number): Promise<{ table: Table; activeOrder: Order | null }> {
    return apiFetch<{ table: Table; activeOrder: Order | null }>(`/api/table/${tableId}`);
  },

  async placeOrder(tableId: number, items: { menuItemId: number; quantity: number; notes: string }[]): Promise<{ orderId: number; totalPrice: number }> {
    return apiFetch<{ orderId: number; totalPrice: number }>(`/api/table/${tableId}/order`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  async postOrder(tableId: number, items: { menuItemId: number; quantity: number; notes: string }[]): Promise<Order> {
    return apiFetch<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ tableId, items }),
    });
  },

  async submitFeedback(orderId: number, rating: number, comment: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ orderId, rating, comment }),
    });
  },

  // Secure Admin Operations
  async getAdminTables(): Promise<Table[]> {
    return apiFetch<Table[]>("/api/admin/tables");
  },

  async createTable(label: string, capacity: number): Promise<Table> {
    return apiFetch<Table>("/api/admin/tables", {
      method: "POST",
      body: JSON.stringify({ label, capacity }),
    });
  },

  async updateTable(id: number, updates: Partial<Table>): Promise<Table> {
    return apiFetch<Table>(`/api/admin/tables/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async getAdminMenu(): Promise<MenuItem[]> {
    return apiFetch<MenuItem[]>("/api/admin/menu");
  },

  async addMenuItem(item: Omit<MenuItem, "id" | "createdAt">): Promise<MenuItem> {
    return apiFetch<MenuItem>("/api/admin/menu", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem> {
    return apiFetch<MenuItem>(`/api/admin/menu/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async putMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem> {
    return apiFetch<MenuItem>(`/api/admin/menu/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async deleteMenuItem(id: number): Promise<{ message: string; item: MenuItem }> {
    return apiFetch<{ message: string; item: MenuItem }>(`/api/admin/menu/${id}`, {
      method: "DELETE",
    });
  },

  async getAdminOrders(): Promise<Order[]> {
    return apiFetch<Order[]>("/api/admin/orders");
  },

  async updateOrderStatus(id: number, status: Order["status"], paymentMethod?: "cash" | "online"): Promise<Order> {
    return apiFetch<Order>(`/api/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, paymentMethod }),
    });
  },

  async patchOrderStatus(id: number, status: Order["status"], paymentMethod?: "cash" | "online"): Promise<Order> {
    return apiFetch<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, paymentMethod }),
    });
  },

  async patchOrderItems(id: number, items: { menuItemId: number; quantity: number; notes: string }[]): Promise<Order> {
    return apiFetch<Order>(`/api/orders/${id}/items`, {
      method: "PATCH",
      body: JSON.stringify({ items }),
    });
  },

  async requestBill(id: number): Promise<Order> {
    return apiFetch<Order>(`/api/orders/${id}/request-bill`, {
      method: "PATCH",
    });
  },

  async getReports(from: string, to: string): Promise<any> {
    return apiFetch<any>(`/api/admin/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  },

  async getAdminFeedback(): Promise<Feedback[]> {
    return apiFetch<Feedback[]>("/api/admin/feedback");
  },

  async getAdminHistory(): Promise<OrderHistoryRecord[]> {
    return apiFetch<OrderHistoryRecord[]>("/api/admin/history");
  },
};
