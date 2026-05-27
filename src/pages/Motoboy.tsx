import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

type Order = {
  id: number;
  customer_name: string;
  address: string | null;
  delivery_type: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: string;
  created_at: string;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function createMapsLink(address: string | null) {
  if (!address) return "#";

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address
  )}`;
}

export default function Motoboy() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  async function loadOrders() {
    if (!supabase) {
      alert("Supabase não configurado.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("delivery_type", "Entrega")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erro ao carregar pedidos de entrega.");
      setLoading(false);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateOrderStatus(orderId: number, newStatus: string) {
    if (!supabase) {
      alert("Supabase não configurado.");
      return;
    }

    setUpdatingOrderId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Erro ao atualizar status do pedido.");
      setUpdatingOrderId(null);
      return;
    }

    setUpdatingOrderId(null);
    loadOrders();
  }

  const pendingOrders = orders.filter((order) => order.status !== "entregue");
  const deliveredOrders = orders.filter((order) => order.status === "entregue");

  return (
    <main className="min-h-screen bg-zinc-950 p-5 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-amber-950/60 p-6">
          <h1 className="text-4xl font-black">Painel do Motoboy 🛵</h1>

          <p className="mt-2 text-zinc-300">
            Pedidos de entrega em ordem de chegada, com rota pelo Google Maps.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm text-zinc-400">Entregas pendentes</p>
              <p className="text-2xl font-black text-amber-300">
                {pendingOrders.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm text-zinc-400">Entregues</p>
              <p className="text-2xl font-black text-green-400">
                {deliveredOrders.length}
              </p>
            </div>
          </div>

          <button
            onClick={loadOrders}
            className="mt-5 rounded-2xl bg-amber-400 px-5 py-3 font-bold text-zinc-950 hover:bg-amber-300"
          >
            Atualizar entregas
          </button>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
            Carregando pedidos de entrega...
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-4 text-2xl font-black">
                Fila de entregas
              </h2>

              {pendingOrders.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-400">
                  Nenhuma entrega pendente no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders.map((order, index) => (
                    <article
                      key={order.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row">
                        <div>
                          <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-black text-zinc-950">
                            #{index + 1} na fila
                          </span>

                          <h3 className="mt-4 text-2xl font-black">
                            Pedido #{order.id} — {order.customer_name}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-400">
                            Feito em: {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="md:text-right">
                          <p className="text-2xl font-black text-green-400">
                            {formatCurrency(Number(order.total))}
                          </p>

                          <span
                            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                              order.status === "a caminho"
                                ? "bg-blue-400/20 text-blue-300"
                                : "bg-amber-400/20 text-amber-300"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl bg-zinc-950/70 p-4">
                        <p className="text-sm text-zinc-400">Endereço</p>
                        <p className="mt-1 font-bold">
                          {order.address || "Endereço não informado"}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <a
                          href={createMapsLink(order.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl bg-green-500 px-4 py-3 text-center font-black text-white hover:bg-green-400"
                        >
                          Abrir rota
                        </a>

                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "a caminho")
                          }
                          disabled={updatingOrderId === order.id}
                          className="rounded-2xl bg-blue-500 px-4 py-3 font-black text-white hover:bg-blue-400 disabled:bg-zinc-700"
                        >
                          Marcar a caminho
                        </button>

                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "entregue")
                          }
                          disabled={updatingOrderId === order.id}
                          className="rounded-2xl bg-amber-400 px-4 py-3 font-black text-zinc-950 hover:bg-amber-300 disabled:bg-zinc-700 disabled:text-zinc-400"
                        >
                          Marcar entregue
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-10">
              <h2 className="mb-4 text-2xl font-black">
                Entregas concluídas
              </h2>

              {deliveredOrders.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-400">
                  Nenhuma entrega concluída ainda.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {deliveredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 opacity-80"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black">
                            Pedido #{order.id}
                          </h3>

                          <p className="mt-1 text-zinc-300">
                            {order.customer_name}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <span className="rounded-full bg-green-400/20 px-3 py-1 text-xs font-bold text-green-300">
                          entregue
                        </span>
                      </div>

                      <p className="mt-4 text-sm text-zinc-400">
                        {order.address || "Endereço não informado"}
                      </p>

                      <p className="mt-3 text-lg font-black text-green-400">
                        {formatCurrency(Number(order.total))}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}