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

function getStatusLabel(status: string) {
  if (status === "a caminho") return "A caminho";
  if (status === "entregue") return "Entregue";
  return "Pendente";
}

export default function Motoboy() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  async function loadOrders() {
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
    <main
      className="min-h-screen bg-[#111111] text-zinc-100"
      style={{
        fontFamily:
          '"Trebuchet MS", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <header className="border-b border-zinc-800 bg-[#151515]">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
                Área de entrega
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                Painel do motoboy
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
                Acompanhe os pedidos de entrega por ordem de chegada, abra a
                rota no Google Maps e atualize o andamento da entrega.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                <p className="text-zinc-500">Pendentes</p>
                <p className="mt-1 text-3xl font-semibold text-amber-300">
                  {pendingOrders.length}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                <p className="text-zinc-500">Entregues</p>
                <p className="mt-1 text-3xl font-semibold text-green-400">
                  {deliveredOrders.length}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadOrders}
            className="mt-6 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
          >
            Atualizar entregas
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-6 text-zinc-400">
            Carregando pedidos de entrega...
          </div>
        ) : (
          <>
            <section>
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Fila de entregas</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Ordem baseada no horário em que o pedido foi realizado.
                  </p>
                </div>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-6 text-zinc-400">
                  Nenhuma entrega pendente no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders.map((order, index) => (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-zinc-800 bg-[#181818] p-5 transition hover:border-amber-500/50"
                    >
                      <div className="flex flex-col justify-between gap-5 md:flex-row">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-950">
                              {index + 1}º da fila
                            </span>

                            <span
                              className={`rounded-lg px-3 py-1 text-xs font-bold ${
                                order.status === "a caminho"
                                  ? "bg-blue-500/15 text-blue-300"
                                  : "bg-zinc-900 text-zinc-300"
                              }`}
                            >
                              {getStatusLabel(order.status)}
                            </span>
                          </div>

                          <h3 className="mt-4 text-2xl font-semibold text-zinc-50">
                            Pedido #{order.id}
                          </h3>

                          <p className="mt-1 text-zinc-300">
                            {order.customer_name}
                          </p>

                          <p className="mt-2 text-sm text-zinc-500">
                            Realizado em {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="md:text-right">
                          <p className="text-sm text-zinc-500">Valor</p>
                          <p className="mt-1 text-2xl font-semibold text-green-400">
                            {formatCurrency(Number(order.total))}
                          </p>

                          <p className="mt-2 text-sm text-zinc-500">
                            Pagamento: {order.payment_method}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-400">
                          Endereço de entrega
                        </p>

                        <p className="mt-2 font-semibold text-zinc-100">
                          {order.address || "Endereço não informado"}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <a
                          href={createMapsLink(order.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-green-500"
                        >
                          Abrir rota
                        </a>

                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "a caminho")
                          }
                          disabled={updatingOrderId === order.id}
                          className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                          Marcar a caminho
                        </button>

                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "entregue")
                          }
                          disabled={updatingOrderId === order.id}
                          className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
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
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">
                  Entregas concluídas
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Pedidos que já foram finalizados pelo entregador.
                </p>
              </div>

              {deliveredOrders.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-6 text-zinc-400">
                  Nenhuma entrega concluída ainda.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {deliveredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-zinc-800 bg-[#181818] p-5 opacity-90"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm uppercase tracking-[0.18em] text-green-400">
                            Entregue
                          </p>

                          <h3 className="mt-2 text-xl font-semibold text-zinc-50">
                            Pedido #{order.id}
                          </h3>

                          <p className="mt-1 text-zinc-300">
                            {order.customer_name}
                          </p>

                          <p className="mt-2 text-sm text-zinc-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <p className="text-right text-lg font-semibold text-green-400">
                          {formatCurrency(Number(order.total))}
                        </p>
                      </div>

                      <div className="mt-4 rounded-xl bg-zinc-950 p-4">
                        <p className="text-sm text-zinc-400">
                          {order.address || "Endereço não informado"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}