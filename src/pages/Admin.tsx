import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
  description: string | null;
  highlight: boolean;
  active: boolean;
};

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

type NewProduct = {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
  image_url: string;
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

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);

  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    image_url: "",
  });

  async function loadData() {
    setLoading(true);

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsError) {
      console.error(productsError);
      alert("Erro ao carregar produtos.");
    }

    if (ordersError) {
      console.error(ordersError);
      alert("Erro ao carregar pedidos.");
    }

    setProducts(productsData || []);
    setOrders(ordersData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createProduct() {
    if (!newProduct.name.trim()) {
      alert("Informe o nome do produto.");
      return;
    }

    if (!newProduct.category.trim()) {
      alert("Informe a categoria do produto.");
      return;
    }

    if (!newProduct.price || Number(newProduct.price) <= 0) {
      alert("Informe um preço válido.");
      return;
    }

    if (!newProduct.stock || Number(newProduct.stock) < 0) {
      alert("Informe um estoque válido.");
      return;
    }

    setSavingProduct(true);

    const { error } = await supabase.from("products").insert({
      name: newProduct.name,
      category: newProduct.category,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      description: newProduct.description || null,
      image_url: newProduct.image_url || null,
      highlight: false,
      active: true,
    });

    if (error) {
      console.error(error);
      alert("Erro ao cadastrar produto.");
      setSavingProduct(false);
      return;
    }

    alert("Produto cadastrado com sucesso!");

    setNewProduct({
      name: "",
      category: "",
      price: "",
      stock: "",
      description: "",
      image_url: "",
    });

    setSavingProduct(false);
    loadData();
  }

  async function updateStock(
    productId: number,
    currentStock: number,
    amount: number
  ) {
    const newStock = Math.max(currentStock + amount, 0);

    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId);

    if (error) {
      console.error(error);
      alert("Erro ao atualizar estoque.");
      return;
    }

    loadData();
  }

  async function toggleProductActive(productId: number, currentActive: boolean) {
    const { error } = await supabase
      .from("products")
      .update({ active: !currentActive })
      .eq("id", productId);

    if (error) {
      console.error(error);
      alert("Erro ao alterar disponibilidade do produto.");
      return;
    }

    loadData();
  }

  const totalVendido = orders.reduce(
    (total, order) => total + Number(order.total),
    0
  );

  const pedidosEntrega = orders.filter(
    (order) => order.delivery_type === "Entrega"
  ).length;

  const pedidosRetirada = orders.filter(
    (order) => order.delivery_type === "Retirada"
  ).length;

  const produtosAtivos = products.filter((product) => product.active).length;

  return (
    <main
      className="min-h-screen bg-[#111111] text-zinc-100"
      style={{
        fontFamily:
          '"Trebuchet MS", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <header className="border-b border-zinc-800 bg-[#151515]">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
                Administração
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                Painel da adega
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
                Acompanhe os pedidos, cadastre produtos e controle o estoque
                que aparece no cardápio digital.
              </p>
            </div>

            <button
              onClick={loadData}
              className="w-fit rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
            >
              Atualizar dados
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-7">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-6 text-zinc-400">
            Carregando dados do sistema...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-5">
                <p className="text-sm text-zinc-500">Total vendido</p>
                <p className="mt-2 text-3xl font-semibold text-green-400">
                  {formatCurrency(totalVendido)}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-5">
                <p className="text-sm text-zinc-500">Pedidos</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-100">
                  {orders.length}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-5">
                <p className="text-sm text-zinc-500">Entregas</p>
                <p className="mt-2 text-3xl font-semibold text-amber-300">
                  {pedidosEntrega}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-5">
                <p className="text-sm text-zinc-500">Produtos ativos</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-100">
                  {produtosAtivos}
                </p>
              </div>
            </section>

            <section className="mt-7 rounded-2xl border border-zinc-800 bg-[#181818] p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Cadastrar produto
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Os produtos ativos aparecem automaticamente no cardápio.
                  </p>
                </div>

                <span className="rounded-lg bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                  Banco: products
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <input
                  value={newProduct.name}
                  onChange={(event) =>
                    setNewProduct({ ...newProduct, name: event.target.value })
                  }
                  placeholder="Nome do produto"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400"
                />

                <input
                  value={newProduct.category}
                  onChange={(event) =>
                    setNewProduct({
                      ...newProduct,
                      category: event.target.value,
                    })
                  }
                  placeholder="Categoria"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400"
                />

                <input
                  value={newProduct.price}
                  onChange={(event) =>
                    setNewProduct({ ...newProduct, price: event.target.value })
                  }
                  placeholder="Preço"
                  type="number"
                  step="0.01"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400"
                />

                <input
                  value={newProduct.stock}
                  onChange={(event) =>
                    setNewProduct({ ...newProduct, stock: event.target.value })
                  }
                  placeholder="Estoque inicial"
                  type="number"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400"
                />

                <input
                  value={newProduct.image_url}
                  onChange={(event) =>
                    setNewProduct({
                      ...newProduct,
                      image_url: event.target.value,
                    })
                  }
                  placeholder="URL da imagem"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400"
                />

                <input
                  value={newProduct.description}
                  onChange={(event) =>
                    setNewProduct({
                      ...newProduct,
                      description: event.target.value,
                    })
                  }
                  placeholder="Descrição"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400"
                />
              </div>

              <button
                onClick={createProduct}
                disabled={savingProduct}
                className="mt-5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {savingProduct ? "Cadastrando..." : "Cadastrar produto"}
              </button>
            </section>

            <section className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      Pedidos recentes
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Histórico dos pedidos recebidos pelo cardápio.
                    </p>
                  </div>

                  <span className="rounded-lg bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                    Retiradas: {pedidosRetirada}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {orders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-center text-sm text-zinc-500">
                      Nenhum pedido encontrado.
                    </div>
                  ) : (
                    orders.map((order) => (
                      <article
                        key={order.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex flex-col justify-between gap-3 md:flex-row">
                          <div>
                            <p className="text-lg font-semibold text-zinc-50">
                              Pedido #{order.id}
                            </p>

                            <p className="mt-1 text-zinc-300">
                              {order.customer_name}
                            </p>

                            <p className="mt-2 text-sm text-zinc-500">
                              {formatDate(order.created_at)}
                            </p>
                          </div>

                          <div className="md:text-right">
                            <p className="text-xl font-semibold text-green-400">
                              {formatCurrency(Number(order.total))}
                            </p>

                            <span className="mt-2 inline-block rounded-lg bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
                          <p>
                            <strong className="text-zinc-200">Tipo:</strong>{" "}
                            {order.delivery_type}
                          </p>

                          <p>
                            <strong className="text-zinc-200">
                              Pagamento:
                            </strong>{" "}
                            {order.payment_method}
                          </p>

                          <p>
                            <strong className="text-zinc-200">
                              Endereço:
                            </strong>{" "}
                            {order.address || "Retirada no local"}
                          </p>

                          <p>
                            <strong className="text-zinc-200">
                              Desconto:
                            </strong>{" "}
                            {formatCurrency(Number(order.discount))}
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-5">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Controle de estoque
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Ajuste a quantidade e a visibilidade dos produtos.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-zinc-50">
                            {product.name}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {product.category}
                          </p>

                          <p className="mt-2 text-sm text-amber-300">
                            {formatCurrency(Number(product.price))}
                          </p>
                        </div>

                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            product.active
                              ? "bg-green-500/15 text-green-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {product.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-800 bg-[#181818] p-3">
                        <span className="font-semibold">
                          Estoque: {product.stock}
                        </span>

                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            product.stock <= 5
                              ? "bg-red-500/15 text-red-300"
                              : "bg-green-500/15 text-green-300"
                          }`}
                        >
                          {product.stock <= 5 ? "Baixo estoque" : "OK"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <button
                          onClick={() =>
                            updateStock(product.id, product.stock, -10)
                          }
                          className="rounded-lg bg-red-500/10 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
                        >
                          -10
                        </button>

                        <button
                          onClick={() =>
                            updateStock(product.id, product.stock, -1)
                          }
                          className="rounded-lg bg-red-500/10 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
                        >
                          -1
                        </button>

                        <button
                          onClick={() =>
                            updateStock(product.id, product.stock, 1)
                          }
                          className="rounded-lg bg-green-500/10 py-2 text-sm font-bold text-green-300 transition hover:bg-green-500/20"
                        >
                          +1
                        </button>

                        <button
                          onClick={() =>
                            updateStock(product.id, product.stock, 10)
                          }
                          className="rounded-lg bg-green-500/10 py-2 text-sm font-bold text-green-300 transition hover:bg-green-500/20"
                        >
                          +10
                        </button>
                      </div>

                      <button
                        onClick={() =>
                          toggleProductActive(product.id, product.active)
                        }
                        className={`mt-3 w-full rounded-lg px-4 py-3 text-sm font-bold transition ${
                          product.active
                            ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                            : "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                        }`}
                      >
                        {product.active
                          ? "Desativar no cardápio"
                          : "Ativar no cardápio"}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}