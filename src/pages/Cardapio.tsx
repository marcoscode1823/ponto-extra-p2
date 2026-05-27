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
Endereço: ${
        deliveryType === "delivery" ? address : "Retirada no local"
      }

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
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950 px-5 py-10">
        <div className="mx-auto max-w-7xl">
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
            Cardápio digital da adega
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-black md:text-6xl">
            Adega VG
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-300">
            Escolha os produtos, monte seu carrinho e finalize pelo WhatsApp. O
            pedido também é salvo no banco de dados.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2">
              Entrega no bairro
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              Retirada no local
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              Cupom: ADEGA10
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="sticky top-0 z-10 rounded-3xl border border-white/10 bg-zinc-950/90 p-4 backdrop-blur">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-400"
            />

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold ${
                    selectedCategory === category
                      ? "bg-amber-400 text-zinc-950"
                      : "bg-white/5 text-zinc-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="mt-8 text-zinc-400">Carregando produtos...</p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl"
                >
                  <div className="relative h-44">
                    <img
                      src={
                        product.image_url ||
                        "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=800&auto=format&fit=crop"
                      }
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />

                    {product.highlight && (
                      <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-zinc-950">
                        Mais pedido
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-sm font-bold text-amber-300">
                      {product.category}
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      {product.name}
                    </h2>

                    <p className="mt-2 min-h-10 text-sm text-zinc-400">
                      {product.description}
                    </p>

                    <p className="mt-4 text-2xl font-black text-amber-300">
                      {formatCurrency(Number(product.price))}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      Estoque: {product.stock}
                    </p>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className="mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-zinc-950 hover:bg-amber-300 disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Adicionar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Carrinho 🛒</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
              {cart.length} itens
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-400">
                Seu carrinho está vazio.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white/5 p-3"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-amber-300">
                        {formatCurrency(Number(item.price))}
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-300"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => decreaseItem(item.id)}
                      className="h-8 w-8 rounded-lg bg-white/10 font-bold"
                    >
                      -
                    </button>

                    <span className="font-bold">{item.quantity}</span>

                    <button
                      onClick={() => addToCart(item)}
                      className="h-8 w-8 rounded-lg bg-white/10 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-2">
            <button
              onClick={() => setDeliveryType("delivery")}
              className={`rounded-xl px-3 py-3 text-sm font-bold ${
                deliveryType === "delivery"
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-300"
              }`}
            >
              Entrega
            </button>

            <button
              onClick={() => setDeliveryType("pickup")}
              className={`rounded-xl px-3 py-3 text-sm font-bold ${
                deliveryType === "pickup"
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-300"
              }`}
            >
              Retirada
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />

            {deliveryType === "delivery" && (
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Endereço de entrega"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
              />
            )}

            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="Cupom de desconto"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="mt-5 space-y-2 rounded-2xl bg-zinc-950/70 p-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span>Entrega</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>

            <div className="flex justify-between">
              <span>Desconto</span>
              <span>- {formatCurrency(discount)}</span>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex justify-between text-lg font-black">
                <span>Total</span>
                <span className="text-amber-300">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={finishOrder}
            disabled={cart.length === 0 || sendingOrder}
            className="mt-5 w-full rounded-2xl bg-green-500 px-5 py-4 font-black text-white hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {sendingOrder ? "Salvando pedido..." : "Finalizar pelo WhatsApp"}
          </button>

          <p className="mt-3 text-center text-xs text-zinc-500">
            O pedido será salvo no Supabase e aberto no WhatsApp.
          </p>
        </aside>
      </section>
    </main>
  );
}