import { useEffect, useMemo, useState } from "react";
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

type CartItem = Product & {
  quantity: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Cardapio() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery"
  );
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingOrder, setSendingOrder] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("id", { ascending: true });

      if (error) {
        alert("Erro ao carregar produtos.");
        console.error(error);
        setLoading(false);
        return;
      }

      setProducts(data || []);
      setLoading(false);
    }

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const unique = products.map((product) => product.category);
    return ["Todos", ...Array.from(new Set(unique))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCategory =
        selectedCategory === "Todos" || product.category === selectedCategory;

      const matchSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const subtotal = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0
  );

  const deliveryFee = deliveryType === "delivery" && subtotal > 0 ? 6 : 0;

  const discount =
    coupon.trim().toUpperCase() === "ADEGA10" ? subtotal * 0.1 : 0;

  const total = subtotal + deliveryFee - discount;

  function addToCart(product: Product | CartItem) {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.stock),
              }
            : item
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  }

  function decreaseItem(id: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(id: number) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  }

  function createWhatsappMessage() {
    const productsText = cart
      .map(
        (item) =>
          `${item.quantity}x ${item.name} - ${formatCurrency(
            Number(item.price) * item.quantity
          )}`
      )
      .join("\n");

    return encodeURIComponent(
      `Olá! Fiz um pedido pelo cardápio digital.

Nome: ${customerName}
Tipo: ${deliveryType === "delivery" ? "Entrega" : "Retirada"}
Endereço: ${deliveryType === "delivery" ? address : "Retirada no local"}

Produtos:
${productsText}

Subtotal: ${formatCurrency(subtotal)}
Entrega: ${formatCurrency(deliveryFee)}
Desconto: ${formatCurrency(discount)}
Total: ${formatCurrency(total)}`
    );
  }

  async function finishOrder() {
    if (cart.length === 0) {
      alert("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    if (!customerName.trim()) {
      alert("Informe seu nome.");
      return;
    }

    if (deliveryType === "delivery" && !address.trim()) {
      alert("Informe o endereço de entrega.");
      return;
    }

    setSendingOrder(true);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName,
        address: deliveryType === "delivery" ? address : null,
        delivery_type: deliveryType === "delivery" ? "Entrega" : "Retirada",
        payment_method: "Pix",
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        status: "pendente",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error(orderError);
      alert("Erro ao salvar o pedido no banco.");
      setSendingOrder(false);
      return;
    }

    const orderItems = cart.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: Number(item.price),
      total_price: Number(item.price) * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error(itemsError);
      alert("Pedido criado, mas houve erro ao salvar os itens.");
      setSendingOrder(false);
      return;
    }

    const whatsappMessage = createWhatsappMessage();

    setCart([]);
    setCustomerName("");
    setAddress("");
    setCoupon("");
    setSendingOrder(false);

    alert("Pedido salvo no banco com sucesso!");

    window.open(
      `https://wa.me/5500000000000?text=${whatsappMessage}`,
      "_blank"
    );
  }

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
                Adega VG
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
                Bebidas para entrega e retirada
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
                Escolha seus produtos, monte o pedido e finalize pelo WhatsApp.
                O estoque e os pedidos são atualizados pelo sistema.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-300">
              <p className="font-semibold text-zinc-100">Atendimento online</p>
              <p className="mt-1">Entrega no bairro ou retirada no balcão.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome do produto"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400"
              />

              <div className="flex gap-2 overflow-x-auto pb-1 md:max-w-xl">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      selectedCategory === category
                        ? "bg-amber-400 text-zinc-950"
                        : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#181818] p-6 text-zinc-400">
              Carregando produtos...
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#181818] transition hover:-translate-y-1 hover:border-amber-500/50"
                >
                  <div className="relative h-44 bg-zinc-900">
                    <img
                      src={
                        product.image_url ||
                        "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=800&auto=format&fit=crop"
                      }
                      alt={product.name}
                      className="h-full w-full object-cover opacity-90"
                    />

                    {product.highlight && (
                      <span className="absolute left-3 top-3 rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-950">
                        Destaque
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-400">
                          {product.category}
                        </p>

                        <h2 className="mt-2 text-xl font-semibold leading-tight text-zinc-50">
                          {product.name}
                        </h2>
                      </div>
                    </div>

                    <p className="mt-3 min-h-10 text-sm leading-relaxed text-zinc-400">
                      {product.description || "Produto disponível no cardápio."}
                    </p>

                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold text-amber-300">
                          {formatCurrency(Number(product.price))}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            product.stock <= 5
                              ? "text-red-300"
                              : "text-zinc-500"
                          }`}
                        >
                          {product.stock > 0
                            ? `${product.stock} unidades disponíveis`
                            : "Indisponível no momento"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      Adicionar ao pedido
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-zinc-800 bg-[#181818] p-5 lg:sticky lg:top-5">
          <div className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Seu pedido</h2>

              <span className="rounded-lg bg-zinc-900 px-3 py-1 text-sm text-zinc-300">
                {cart.length} itens
              </span>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              Revise os produtos antes de finalizar.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-center text-sm text-zinc-500">
                Nenhum produto selecionado.
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="rounded-xl bg-zinc-950 p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-100">{item.name}</p>
                      <p className="mt-1 text-sm text-amber-300">
                        {formatCurrency(Number(item.price))}
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-sm text-red-300 hover:text-red-200"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => decreaseItem(item.id)}
                      className="h-8 w-8 rounded-lg bg-zinc-800 font-bold hover:bg-zinc-700"
                    >
                      -
                    </button>

                    <span className="min-w-6 text-center font-semibold">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => addToCart(item)}
                      className="h-8 w-8 rounded-lg bg-zinc-800 font-bold hover:bg-zinc-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-zinc-950 p-2">
            <button
              onClick={() => setDeliveryType("delivery")}
              className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
                deliveryType === "delivery"
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              Entrega
            </button>

            <button
              onClick={() => setDeliveryType("pickup")}
              className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
                deliveryType === "pickup"
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              Retirada
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Nome para o pedido"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-amber-400"
            />

            {deliveryType === "delivery" && (
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Endereço de entrega"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-amber-400"
              />
            )}

            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="Cupom de desconto"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>

          <div className="mt-5 space-y-2 rounded-xl bg-zinc-950 p-4 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between text-zinc-400">
              <span>Entrega</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>

            <div className="flex justify-between text-zinc-400">
              <span>Desconto</span>
              <span>- {formatCurrency(discount)}</span>
            </div>

            <div className="mt-3 border-t border-zinc-800 pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-amber-300">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={finishOrder}
            disabled={cart.length === 0 || sendingOrder}
            className="mt-5 w-full rounded-xl bg-green-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {sendingOrder ? "Enviando pedido..." : "Finalizar pelo WhatsApp"}
          </button>

          <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
            O pedido será registrado no sistema e aberto no WhatsApp para
            confirmação.
          </p>
        </aside>
      </section>
    </main>
  );
}