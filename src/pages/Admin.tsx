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
    if (!supabase) {
      alert("Supabase não configurado.");
      return;
    }

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
    if (!supabase) {
      alert("Supabase não configurado.");
      return;
    }

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

  async function updateStock(productId: number, currentStock: number, amount: number) {
    if (!supabase) {
      alert("Supabase não configurado.");
      return;
    }

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
    if (!supabase) {
      alert("Supabase não configurado.");
      return;
    }

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

  return (
    <main className="min-h-screen bg-zinc-100 p-5 text-zinc-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl bg-zinc-950 p-6 text-white">
          <h1 className="text-4xl font-black">Painel Admin 📦</h1>

          <p className="mt-2 text-zinc-300">
            Controle de pedidos, vendas, cadastro de produtos e estoque da adega.
          </p>

          <button
            onClick={loadData}
            className="mt-5 rounded-2xl bg-amber-400 px-5 py-3 font-bold text-zinc-950 hover:bg-amber-300"
          >
            Atualizar dados
          </button>
        </header>

        {loading ? (
          <p>Carregando dados do banco...</p>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-white p-5 shadow">
                <p className="text-sm text-zinc-500">Total vendido</p>
                <p className="mt-2 text-3xl font-black text-green-700">
                  {formatCurrency(totalVendido)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow">
                <p className="text-sm text-zinc-500">Pedidos</p>
                <p className="mt-2 text-3xl font-black">{orders.length}</p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow">
                <p className="text-sm text-zinc-500">Entregas</p>
                <p className="mt-2 text-3xl font-black">{pedidosEntrega}</p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow">
                <p className="text-sm text-zinc-500">Retiradas</p>
                <p className="mt-2 text-3xl font-black">{pedidosRetirada}</p>
              </div>
            </section>

            <section className="mt-8 rounded-3xl bg-white p-5 shadow">
              <h2 className="text-2xl font-black">Cadastrar novo produto</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <input
                  value={newProduct.name}
                  onChange={(event) =>
                    setNewProduct({ ...newProduct, name: event.target.value })
                  }
                  placeholder="Nome do produto"
                  className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500"
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
                  className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500"
                />

                <input
                  value={newProduct.price}
                  onChange={(event) =>
                    setNewProduct({ ...newProduct, price: event.target.value })
                  }
                  placeholder="Preço"
                  type="number"
                  step="0.01"
                  className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500"
                />

                <input
                  value={newProduct.stock}
                  onChange={(event) =>
                    setNewProduct({ ...newProduct, stock: event.target.value })
                  }
                  placeholder="Estoque inicial"
                  type="number"
                  className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500"
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
                  className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500"
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
                  className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={createProduct}
                disabled={savingProduct}
                className="mt-5 rounded-2xl bg-zinc-950 px-5 py-3 font-bold text-white hover:bg-zinc-800 disabled:bg-zinc-400"
              >
                {savingProduct ? "Cadastrando..." : "Cadastrar produto"}
              </button>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl bg-white p-5 shadow">
                <h2 className="text-2xl font-black">Pedidos recentes</h2>

                <div className="mt-5 space-y-4">
                  {orders.length === 0 ? (
                    <p className="text-zinc-500">Nenhum pedido encontrado.</p>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-zinc-200 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 md:flex-row">
                          <div>
                            <p className="text-lg font-black">
                              Pedido #{order.id} — {order.customer_name}
                            </p>

                            <p className="text-sm text-zinc-500">
                              {formatDate(order.created_at)}
                            </p>
                          </div>

                          <div className="text-left md:text-right">
                            <p className="text-xl font-black text-green-700">
                              {formatCurrency(Number(order.total))}
                            </p>

                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-zinc-600 md:grid-cols-2">
                          <p>
                            <strong>Tipo:</strong> {order.delivery_type}
                          </p>

                          <p>
                            <strong>Pagamento:</strong> {order.payment_method}
                          </p>

                          <p>
                            <strong>Endereço:</strong>{" "}
                            {order.address || "Retirada no local"}
                          </p>

                          <p>
                            <strong>Desconto:</strong>{" "}
                            {formatCurrency(Number(order.discount))}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow">
                <h2 className="text-2xl font-black">Controle de estoque</h2>

                <div className="mt-5 space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-zinc-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{product.name}</p>

                          <p className="text-sm text-zinc-500">
                            {product.category}
                          </p>

                          <p className="mt-1 text-sm">
                            {formatCurrency(Number(product.price))}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.active
                              ? "bg-green-100 text-green-700"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {product.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-100 p-3">
                        <span className="font-bold">
                          Estoque: {product.stock}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.stock <= 5
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
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
                          className="rounded-xl bg-red-100 py-2 text-sm font-bold text-red-700 hover:bg-red-200"
                        >
                          -10
                        </button>

                        <button
                          onClick={() =>
                            updateStock(product.id, product.stock, -1)
                          }
                          className="rounded-xl bg-red-100 py-2 text-sm font-bold text-red-700 hover:bg-red-200"
                        >
                          -1
                        </button>

                        <button
                          onClick={() =>
                            updateStock(product.id, product.stock, 1)
                          }
                          className="rounded-xl bg-green-100 py-2 text-sm font-bold text-green-700 hover:bg-green-200"
                        >
                          +1
                        </button>

                        <button
                          onClick={() =>
                            updateStock(product.id, product.stock, 10)
                          }
                          className="rounded-xl bg-green-100 py-2 text-sm font-bold text-green-700 hover:bg-green-200"
                        >
                          +10
                        </button>
                      </div>

                      <button
                        onClick={() =>
                          toggleProductActive(product.id, product.active)
                        }
                        className={`mt-3 w-full rounded-xl px-4 py-2 text-sm font-bold ${
                          product.active
                            ? "bg-zinc-950 text-white hover:bg-zinc-800"
                            : "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                        }`}
                      >
                        {product.active
                          ? "Desativar no cardápio"
                          : "Ativar no cardápio"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}