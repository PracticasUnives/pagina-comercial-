const products = [
  { id: "guacamole", name: "Guacamole de la casa", description: "Aguacate, limón, cilantro y totopos crujientes.", price: 165, category: "para-compartir", tag: "Para abrir el apetito", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80", alt: "Guacamole fresco para compartir" },
  { id: "quesadillas", name: "Quesadillas de flor", description: "Flor de calabaza, quesillo y salsa tatemada.", price: 185, category: "para-compartir", tag: "Del comal", image: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&w=900&q=80", alt: "Quesadillas doradas recién hechas" },
  { id: "enchiladas", name: "Enchiladas de mole", description: "Mole de la casa, pollo, crema y ajonjolí.", price: 245, category: "platos", tag: "Favorito de casa", image: "https://images.unsplash.com/photo-1534352956036-cd81e27dd615?auto=format&fit=crop&w=900&q=80", alt: "Enchiladas servidas con salsa de mole" },
  { id: "tacos", name: "Tacos de setas", description: "Setas al pastor, piña asada y salsa verde.", price: 210, category: "platos", tag: "Hechos al momento", image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=900&q=80", alt: "Tacos mexicanos con salsa y cilantro" },
  { id: "agua", name: "Agua de jamaica", description: "Jamaica infusionada con un toque de canela.", price: 65, category: "bebidas", tag: "De la temporada", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80", alt: "Bebida fresca servida con hielo" },
  { id: "tres-leches", name: "Pastel de tres leches", description: "Vainilla, leche fresca y canela recién molida.", price: 115, category: "postres", tag: "Un final feliz", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80", alt: "Rebanada de pastel de tres leches" },
];

const config = window.STORE_CONFIG || {};
const currency = config.currency || "MXN";
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 });
const grid = document.querySelector("#product-grid");
const cartPanel = document.querySelector("#cart-panel");
const backdrop = document.querySelector("#cart-backdrop");
const cartItemsNode = document.querySelector("#cart-items");
const countNode = document.querySelector("#cart-count");
const subtotalNode = document.querySelector("#cart-subtotal");
const checkoutButton = document.querySelector("#checkout-button");
const feedbackNode = document.querySelector("#cart-feedback");
const applePayButton = document.querySelector("#apple-pay-button");
const toast = document.querySelector("#toast");
let cart = readCart();
let fulfillment = "pickup";
let payClient;
let paymentPending = false;
let toastTimer;

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem("casa-maiz-cart") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return Object.create(null);
    const normalized = Object.create(null);
    for (const [id, quantity] of Object.entries(parsed)) {
      if (products.some((product) => product.id === id) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99) normalized[id] = quantity;
    }
    return normalized;
  } catch {
    return Object.create(null);
  }
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function cartQuantity() { return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0); }
function cartTotal() { return Object.entries(cart).reduce((sum, [id, quantity]) => sum + (products.find((item) => item.id === id)?.price || 0) * quantity, 0); }
function cartLines() { return Object.entries(cart).map(([id, quantity]) => ({ id, quantity })); }

function renderProducts(category = "todos") {
  const filtered = category === "todos" ? products : products.filter((item) => item.category === category);
  const fragment = document.createDocumentFragment();
  for (const item of filtered) {
    const article = node("article", "product");
    const imageButton = node("button", "product-image-button");
    imageButton.type = "button";
    imageButton.dataset.add = item.id;
    imageButton.setAttribute("aria-label", `Agregar ${item.name} al pedido`);
    const image = node("img");
    image.src = item.image;
    image.alt = item.alt;
    image.loading = "lazy";
    const tag = node("span", "product-tag", item.tag);
    const quickAdd = node("span", "quick-add", "+");
    quickAdd.setAttribute("aria-hidden", "true");
    imageButton.append(image, tag, quickAdd);

    const info = node("div", "product-info");
    const detail = node("div");
    detail.append(node("h3", "", item.name), node("p", "", item.description));
    info.append(detail, node("strong", "", money.format(item.price)));
    const addButton = node("button", "add-button");
    addButton.type = "button";
    addButton.dataset.add = item.id;
    addButton.append(document.createTextNode("Agregar "));
    const plus = node("span", "", "+");
    plus.setAttribute("aria-hidden", "true");
    addButton.append(plus);
    article.append(imageButton, info, addButton);
    fragment.append(article);
  }
  grid.replaceChildren(fragment);
}

function saveCart() {
  try { localStorage.setItem("casa-maiz-cart", JSON.stringify(cart)); } catch { /* Cart still works for this page view. */ }
  countNode.textContent = String(cartQuantity());
  countNode.classList.toggle("has-items", cartQuantity() > 0);
  renderCart();
}

function renderCart() {
  const entries = Object.entries(cart).filter(([, quantity]) => quantity > 0);
  if (!entries.length) {
    cartItemsNode.replaceChildren(document.querySelector("#empty-cart-template").content.cloneNode(true));
  } else {
    const fragment = document.createDocumentFragment();
    for (const [id, quantity] of entries) {
      const item = products.find((product) => product.id === id);
      if (!item) continue;
      const article = node("article", "cart-item");
      const image = node("img");
      image.src = item.image;
      image.alt = "";
      const main = node("div", "cart-item-main");
      main.append(node("h3", "", item.name), node("strong", "", money.format(item.price * quantity)));
      const control = node("div", "quantity-control");
      for (const [delta, label, symbol] of [[-1, `Quitar una porción de ${item.name}`, "−"], [1, `Agregar una porción de ${item.name}`, "+"]]) {
        const button = node("button", "", symbol);
        button.type = "button";
        button.dataset.quantity = item.id;
        button.dataset.delta = String(delta);
        button.setAttribute("aria-label", label);
        if (delta === -1) control.append(button, node("span", "", String(quantity)));
        else control.append(button);
      }
      main.append(control);
      article.append(image, main);
      fragment.append(article);
    }
    cartItemsNode.replaceChildren(fragment);
  }
  subtotalNode.textContent = money.format(cartTotal());
  checkoutButton.disabled = paymentPending || cartQuantity() === 0;
  applePayButton.disabled = paymentPending || cartQuantity() === 0;
}

function addItem(id) {
  if (!products.some((product) => product.id === id)) return;
  if ((cart[id] || 0) >= 99) {
    feedbackNode.textContent = "Puedes agregar hasta 99 porciones de cada platillo.";
    return;
  }
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  const item = products.find((product) => product.id === id);
  toast.textContent = `${item.name} se agregó a tu pedido`;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

function openCart() {
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.classList.add("cart-open");
  document.querySelector("#close-cart").focus();
}
function closeCart() {
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  document.body.classList.remove("cart-open");
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const add = target.closest("[data-add]");
  if (add) { addItem(add.dataset.add); return; }
  const quantity = target.closest("[data-quantity]");
  if (quantity) {
    const id = quantity.dataset.quantity;
    const next = (cart[id] || 0) + Number(quantity.dataset.delta);
    if (!Number.isSafeInteger(next) || next > 99) return;
    if (next <= 0) delete cart[id];
    else if (products.some((product) => product.id === id)) cart[id] = next;
    saveCart();
    return;
  }
  if (target.closest("[data-close-cart]")) closeCart();
});

document.querySelectorAll(".category").forEach((button) => button.addEventListener("click", () => {
  document.querySelector(".category.active")?.classList.remove("active");
  button.classList.add("active");
  renderProducts(button.dataset.category);
}));
document.querySelector("#open-cart").addEventListener("click", openCart);
document.querySelector("#menu-cart").addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);
document.querySelectorAll(".fulfillment-option").forEach((button) => button.addEventListener("click", () => {
  fulfillment = button.dataset.mode === "delivery" ? "delivery" : "pickup";
  document.querySelector(".fulfillment-option.selected")?.classList.remove("selected");
  button.classList.add("selected");
}));

function paymentRequest() {
  return {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [{
      type: "CARD",
      parameters: { allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"] },
      tokenizationSpecification: { type: "PAYMENT_GATEWAY", parameters: { gateway: config.googlePayGateway || "example", gatewayMerchantId: config.googlePayGatewayMerchantId || "exampleGatewayMerchantId" } },
    }],
    merchantInfo: {
      merchantName: "Casa Maíz",
      ...(config.googlePayMerchantId ? { merchantId: config.googlePayMerchantId } : {}),
    },
    transactionInfo: { totalPriceStatus: "FINAL", totalPrice: cartTotal().toFixed(2), currencyCode: currency, countryCode: config.countryCode || "MX" },
  };
}

function sameOriginEndpoint(path) {
  if (!path) throw new Error("Falta configurar el endpoint de pagos del backend.");
  const url = new URL(path, window.location.origin);
  const localDev = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.origin !== window.location.origin || (url.protocol !== "https:" && !localDev)) {
    throw new Error("El endpoint de pagos debe usar el mismo origen seguro de la tienda.");
  }
  return url.href;
}

async function postPayment(path, payload, idempotencyKey) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  const headers = { "Accept": "application/json", "Content-Type": "application/json", "Idempotency-Key": idempotencyKey };
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(sameOriginEndpoint(path), {
    method: "POST",
    mode: "same-origin",
    credentials: "same-origin",
    redirect: "error",
    headers,
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("No pudimos confirmar el pago. Tu pedido sigue guardado para intentarlo de nuevo.");
  return result;
}

function walletOrder(wallet, token) {
  return { wallet, token, items: cartLines(), currency, fulfillment };
}

async function initGooglePay() {
  if (!window.google?.payments?.api?.PaymentsClient) return;
  try {
    payClient = new google.payments.api.PaymentsClient({ environment: config.googlePayEnvironment || "TEST" });
    const ready = await payClient.isReadyToPay({ apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: paymentRequest().allowedPaymentMethods });
    if (ready.result) {
      const button = payClient.createButton({ onClick: requestGooglePay, buttonType: "checkout", buttonColor: "black" });
      document.querySelector("#google-pay-container").replaceChildren(button);
      document.querySelector("#google-pay-container").classList.add("available");
      checkoutButton.hidden = true;
    }
  } catch {
    feedbackNode.textContent = "Google Pay no está disponible en este navegador.";
  }
}

async function requestGooglePay() {
  if (!cartQuantity() || !payClient || paymentPending) return;
  paymentPending = true;
  feedbackNode.textContent = "Abriendo Google Pay…";
  renderCart();
  try {
    // Call directly from the Google Pay button activation; do not await before this request.
    const paymentData = await payClient.loadPaymentData(paymentRequest());
    if (!config.paymentEndpoint) {
      feedbackNode.textContent = "Pago de prueba recibido. Falta conectar la pasarela y el backend; no se realizó ningún cargo.";
      return;
    }
    const token = paymentData.paymentMethodData?.tokenizationData?.token;
    if (!token) throw new Error("Google Pay no devolvió un token de pago válido.");
    const order = await postPayment(config.paymentEndpoint, walletOrder("google_pay", token), crypto.randomUUID());
    if (order.status !== "paid") throw new Error("La pasarela no confirmó el pago.");
    feedbackNode.textContent = order.message || `¡Listo! Tu pedido ${order.orderNumber ? `#${order.orderNumber} ` : ""}está confirmado.`;
    cart = Object.create(null);
    saveCart();
  } catch (error) {
    if (error.statusCode === "CANCELED") feedbackNode.textContent = "El pago se canceló. Tu pedido sigue aquí cuando quieras retomarlo.";
    else feedbackNode.textContent = error.message || "No pudimos completar el pago. Inténtalo de nuevo.";
  } finally {
    paymentPending = false;
    renderCart();
  }
}

function applePaymentRequest() {
  return {
    countryCode: config.countryCode || "MX",
    currencyCode: currency,
    supportedNetworks: ["visa", "masterCard", "amex"],
    merchantCapabilities: ["supports3DS"],
    total: { label: "Casa Maíz", amount: cartTotal().toFixed(2), type: "final" },
  };
}

async function initApplePay() {
  if (!window.ApplePaySession || !config.applePayMerchantIdentifier || !config.applePayValidationEndpoint || !config.paymentEndpoint) return;
  try {
    if (!ApplePaySession.supportsVersion(3)) return;
    if (typeof ApplePaySession.applePayCapabilities === "function") {
      const capabilities = await ApplePaySession.applePayCapabilities(config.applePayMerchantIdentifier);
      applePayButton.hidden = capabilities.paymentCredentialStatus === "applePayUnsupported";
    } else {
      applePayButton.hidden = !ApplePaySession.canMakePayments();
    }
  } catch {
    applePayButton.hidden = true;
  }
}

function requestApplePay() {
  if (!cartQuantity() || paymentPending || !window.ApplePaySession) return;
  let session;
  try {
    session = new ApplePaySession(3, applePaymentRequest());
  } catch {
    feedbackNode.textContent = "Apple Pay no está disponible para este pedido o dominio.";
    return;
  }
  paymentPending = true;
  renderCart();
  feedbackNode.textContent = "Abriendo Apple Pay…";
  session.onvalidatemerchant = async (event) => {
    try {
      const result = await postPayment(config.applePayValidationEndpoint, { validationURL: event.validationURL }, crypto.randomUUID());
      if (!result.merchantSession) throw new Error("El backend no devolvió una sesión válida de Apple Pay.");
      session.completeMerchantValidation(result.merchantSession);
    } catch (error) {
      feedbackNode.textContent = error.message || "No pudimos validar el comercio con Apple Pay.";
      session.abort();
      paymentPending = false;
      renderCart();
    }
  };
  session.onpaymentauthorized = async (event) => {
    try {
      const result = await postPayment(config.paymentEndpoint, walletOrder("apple_pay", event.payment.token), crypto.randomUUID());
      const paid = result.status === "paid";
      session.completePayment({ status: paid ? ApplePaySession.STATUS_SUCCESS : ApplePaySession.STATUS_FAILURE });
      if (!paid) {
        feedbackNode.textContent = "La pasarela no confirmó el pago.";
        return;
      }
      feedbackNode.textContent = result.message || `¡Listo! Tu pedido ${result.orderNumber ? `#${result.orderNumber} ` : ""}está confirmado.`;
      cart = Object.create(null);
      saveCart();
    } catch (error) {
      try { session.completePayment({ status: ApplePaySession.STATUS_FAILURE }); } catch { /* Session may already be completed. */ }
      feedbackNode.textContent = error.message || "No pudimos completar el pago. Inténtalo de nuevo.";
    } finally {
      paymentPending = false;
      renderCart();
    }
  };
  session.oncancel = () => {
    paymentPending = false;
    feedbackNode.textContent = "El pago se canceló. Tu pedido sigue aquí cuando quieras retomarlo.";
    renderCart();
  };
  session.begin();
}

checkoutButton.addEventListener("click", () => {
  feedbackNode.textContent = "Google Pay aparecerá en un navegador compatible y en un origen seguro (localhost o HTTPS).";
});
applePayButton.addEventListener("click", requestApplePay);
renderProducts();
saveCart();
document.querySelector("#payment-caption").textContent = config.googlePayEnvironment === "PRODUCTION"
  ? "Pago seguro · Procesamiento según tu pasarela"
  : "Pagos de prueba · Sin cargos reales";
if (window.google?.payments?.api?.PaymentsClient) initGooglePay();
else document.querySelector('script[src^="https://pay.google.com/gp/p/js/pay.js"]')?.addEventListener("load", initGooglePay, { once: true });
window.addEventListener("load", initApplePay, { once: true });
