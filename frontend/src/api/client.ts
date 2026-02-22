import type {
  CardVariant,
  WatchlistItem,
  NotificationRecord,
  PriceSnapshot,
  Product,
  MultiSearchCardRequest,
  MultiSearchResult,
} from "../types";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const resp = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (resp.status === 401) {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || resp.statusText);
  }
  return resp.json();
}

// Card search
export async function searchCards(name: string) {
  return request<{ data: CardVariant[]; total: number }>(
    `/cards/search?name=${encodeURIComponent(name)}`
  );
}

export async function getProducts(params: {
  cardKey: string;
  rare: string;
  packId?: string;
  packCardId?: string;
}) {
  const qs = new URLSearchParams({
    cardKey: params.cardKey,
    rare: params.rare,
  });
  if (params.packId) qs.set("packId", params.packId);
  if (params.packCardId) qs.set("packCardId", params.packCardId);

  return request<{
    data: {
      products: Product[];
      total: number;
      buyable_count: number;
      lowest_price: number | null;
      avg_price: number | null;
    };
  }>(`/cards/products?${qs.toString()}`);
}

// Watchlist
export async function getWatchlist() {
  return request<{ data: WatchlistItem[] }>("/watchlist");
}

export async function addToWatchlist(
  items: Array<{
    card_key: string;
    card_name: string;
    pack_id?: string;
    pack_name?: string;
    pack_card_id?: string;
    rare: string;
    target_price: number;
  }>
) {
  return request<{ data: WatchlistItem[]; message: string }>("/watchlist", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function updateWatchlistItem(
  id: number,
  updates: { target_price?: number; is_active?: boolean }
) {
  return request<{ data: WatchlistItem }>(`/watchlist/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteWatchlistItem(id: number) {
  return request<{ message: string }>(`/watchlist/${id}`, {
    method: "DELETE",
  });
}

export async function checkWatchlistItem(id: number) {
  return request<{ data: WatchlistItem; snapshot: PriceSnapshot }>(
    `/watchlist/${id}/check`,
    { method: "POST" }
  );
}

// Multi-card search
export async function multiCardSearch(cards: MultiSearchCardRequest[]) {
  return request<{ data: MultiSearchResult }>("/cards/multi-search", {
    method: "POST",
    body: JSON.stringify({ cards }),
  });
}

// Notifications
export async function getNotifications(limit = 50) {
  return request<{ data: NotificationRecord[] }>(
    `/notifications?limit=${limit}`
  );
}
