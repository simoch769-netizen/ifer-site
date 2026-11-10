/* === IFER config === */
/* WhatsApp number in wa.me format: country code + number, no + and no spaces. */
const WHATSAPP_NUMBER = "212680759912";

const CART_KEY = "ifer-cart";
const DELIVERY_FEE = 30;
const FREE_DELIVERY_FROM = 300;

(function () {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");
  const year = document.querySelector("#year");
  const form = document.querySelector("#contact-form");
  const success = document.querySelector("#form-success");

  if (year) year.textContent = new Date().getFullYear();

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const closeNav = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Ouvrir le menu");
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Ouvrir le menu" : "Fermer le menu");
      nav.classList.toggle("is-open", !open);
      document.body.classList.toggle("nav-open", !open);
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 900) closeNav();
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const nom = String(fd.get("nom") || "").trim();
      const email = String(fd.get("email") || "").trim();
      const msg = String(fd.get("message") || "").trim();
      const text = "Salam IFER 👋\n" + (nom ? "Nom: " + nom + "\n" : "") + (email ? "Email: " + email + "\n" : "") + (msg ? "\n" + msg : "");
      window.location.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
    });
  }

  /* ----- Contact WhatsApp button uses the same number ----- */
  const wa = document.querySelector(".social-btn.wa");
  if (wa) {
    if (WHATSAPP_NUMBER) {
      wa.href = "https://wa.me/" + WHATSAPP_NUMBER;
      wa.removeAttribute("aria-disabled");
      wa.setAttribute("target", "_blank");
      wa.setAttribute("rel", "noopener noreferrer");
    } else {
      wa.addEventListener("click", (e) => e.preventDefault());
    }
  }

  /* ----- Cart ----- */
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  function cartCount(items) {
    return items.reduce((n, it) => n + (Number(it.qty) || 0), 0);
  }

  function subtotal(items) {
    return items.reduce((n, it) => n + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  }

  function deliveryFor(sum) {
    return sum >= FREE_DELIVERY_FROM || sum === 0 ? 0 : DELIVERY_FEE;
  }

  function money(n) {
    return String(n) + " DH";
  }

  function isValidPhone(raw) {
    const s = String(raw || "").trim().replace(/[\s.\-()]/g, "");
    if (/^0[567]\d{8}$/.test(s)) return true;
    if (/^\+?212[567]\d{8}$/.test(s)) return true;
    if (/^00212[567]\d{8}$/.test(s)) return true;
    return false;
  }

  function readCustomer(form) {
    const fd = new FormData(form);
    return {
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      city: String(fd.get("city") || "").trim(),
      address: String(fd.get("address") || "").trim(),
      notes: String(fd.get("notes") || "").trim()
    };
  }

  function validateCustomer(customer, errorEl, phoneInput) {
    if (!customer.name || !customer.phone || !customer.city || !customer.address) {
      errorEl.hidden = false;
      errorEl.textContent = "المرجو تعمير الاسم، الهاتف، المدينة والعنوان.";
      return false;
    }
    if (!isValidPhone(customer.phone)) {
      errorEl.hidden = false;
      errorEl.textContent = "رقم الهاتف غير صحيح. استعمل 06/07/05 أو +212.";
      if (phoneInput) phoneInput.focus();
      return false;
    }
    errorEl.hidden = true;
    return true;
  }

  function productFromCard(card) {
    return {
      id: card.dataset.id,
      name: card.dataset.name,
      nameAr: card.dataset.nameAr,
      price: Number(card.dataset.price),
      size: card.dataset.size,
      img: card.dataset.img
    };
  }

  function productImgSrc(img) {
    return String(img || "").replace(/\.webp(?=($|\?))/i, ".jpg");
  }

  function sendWhatsAppOrder(items, customer) {
    const message = buildOrderMessage(items, customer);
    window.__IFER_LAST_ORDER__ = message;
    if (WHATSAPP_NUMBER) {
      const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
      window.location.href = url;
    } else {
      showOrderModal(message);
    }
  }

  const ui = injectCartUI();
  const buy = injectBuyNowUI();
  let cart = loadCart();
  renderCart();

  let buyNowItem = null;
  let buyNowQty = 1;
  let buyNowTrigger = null;

  document.querySelectorAll("[data-id]").forEach((card) => {
    const openFrom = (el) => {
      openBuyNow(productFromCard(card), el);
    };
    card.querySelectorAll(".feature-visual, .product-photo, h3, .ar-name, .btn-buy").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openFrom(el);
      });
    });
    const plus = card.querySelector(".btn-plus");
    if (plus) {
      plus.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const item = productFromCard(card);
        item.qty = 1;
        addItem(item);
        plus.classList.add("is-added");
        const prev = plus.textContent;
        plus.textContent = "✓";
        setTimeout(() => {
          plus.classList.remove("is-added");
          plus.textContent = prev || "+";
        }, 1200);
      });
    }
  });

  function addItem(item) {
    const existing = cart.find((it) => it.id === item.id);
    if (existing) existing.qty = Math.min(20, existing.qty + item.qty);
    else cart.push(item);
    saveCart(cart);
    renderCart();
    pulseFab();
  }

  function setQty(id, qty) {
    const it = cart.find((x) => x.id === id);
    if (!it) return;
    it.qty = Math.max(1, Math.min(20, qty));
    saveCart(cart);
    renderCart();
  }

  function removeItem(id) {
    cart = cart.filter((x) => x.id !== id);
    saveCart(cart);
    renderCart();
  }

  function pulseFab() {
    ui.fab.classList.add("is-pulse");
    setTimeout(() => ui.fab.classList.remove("is-pulse"), 450);
  }

  function openCart() {
    if (document.body.classList.contains("buynow-open")) closeBuyNow();
    ui.drawer.classList.add("is-open");
    ui.overlay.classList.add("is-open");
    ui.fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("cart-open");
    ui.drawer.focus();
  }

  function closeCart() {
    ui.drawer.classList.remove("is-open");
    ui.overlay.classList.remove("is-open");
    ui.fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("cart-open");
    closeModal();
  }

  function openBuyNow(item, trigger) {
    if (!item || !item.id) return;
    closeCart();
    buyNowItem = item;
    buyNowQty = 1;
    buyNowTrigger = trigger || document.activeElement;
    buy.form.reset();
    buy.formError.hidden = true;
    renderBuyNow();
    buy.overlay.hidden = false;
    buy.dialog.hidden = false;
    document.body.classList.add("buynow-open");
    requestAnimationFrame(() => {
      buy.overlay.classList.add("is-open");
      buy.dialog.classList.add("is-open");
      const focusEl = buy.nameInput || buy.closeBtn;
      if (focusEl) focusEl.focus();
    });
  }

  function closeBuyNow() {
    buy.overlay.classList.remove("is-open");
    buy.dialog.classList.remove("is-open");
    document.body.classList.remove("buynow-open");
    buy.overlay.hidden = true;
    buy.dialog.hidden = true;
    buyNowItem = null;
    buyNowQty = 1;
    const trigger = buyNowTrigger;
    buyNowTrigger = null;
    if (trigger && typeof trigger.focus === "function") {
      try { trigger.focus(); } catch (e) { /* ignore */ }
    }
  }

  function renderBuyNow() {
    if (!buyNowItem) return;
    const img = productImgSrc(buyNowItem.img);
    buy.img.src = img;
    buy.img.alt = buyNowItem.name || "";
    buy.name.textContent = buyNowItem.name || "";
    buy.nameAr.textContent = buyNowItem.nameAr || "";
    buy.size.textContent = buyNowItem.size || "";
    buy.unit.textContent = money(buyNowItem.price);
    buy.qty.textContent = String(buyNowQty);
    const items = [{ ...buyNowItem, qty: buyNowQty }];
    const sum = subtotal(items);
    const ship = deliveryFor(sum);
    const total = sum + ship;
    buy.subtotal.textContent = money(sum);
    buy.shipping.textContent = ship === 0 && sum > 0 ? "Offerte / مجاناً" : money(ship);
    buy.total.textContent = money(total);
  }

  function focusables(root) {
    return Array.prototype.slice.call(
      root.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hidden && el.offsetParent !== null);
  }

  ui.fab.addEventListener("click", () => {
    if (ui.drawer.classList.contains("is-open")) closeCart();
    else openCart();
  });
  ui.overlay.addEventListener("click", closeCart);
  ui.closeBtn.addEventListener("click", closeCart);

  buy.overlay.addEventListener("click", closeBuyNow);
  buy.closeBtn.addEventListener("click", closeBuyNow);
  buy.dec.addEventListener("click", () => {
    buyNowQty = Math.max(1, buyNowQty - 1);
    renderBuyNow();
  });
  buy.inc.addEventListener("click", () => {
    buyNowQty = Math.min(20, buyNowQty + 1);
    renderBuyNow();
  });
  buy.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!buyNowItem) return;
    const customer = readCustomer(buy.form);
    if (!validateCustomer(customer, buy.formError, buy.phoneInput)) return;
    sendWhatsAppOrder([{ ...buyNowItem, qty: buyNowQty }], customer);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.body.classList.contains("buynow-open")) {
        e.preventDefault();
        closeBuyNow();
        return;
      }
      if (ui.drawer.classList.contains("is-open") || (ui.modal && !ui.modal.hidden)) {
        closeCart();
      }
      return;
    }
    if (e.key === "Tab" && document.body.classList.contains("buynow-open")) {
      const nodes = focusables(buy.dialog);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  ui.checkout.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!cart.length) return;
    const customer = readCustomer(ui.checkout);
    if (!validateCustomer(customer, ui.formError, ui.checkout.querySelector('[name="phone"]'))) return;
    sendWhatsAppOrder(cart, customer);
  });

  ui.copyBtn.addEventListener("click", async () => {
    const text = ui.modalBody.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      ui.copyBtn.textContent = "تم النسخ / Copié";
      setTimeout(() => { ui.copyBtn.textContent = "نسخ الرسالة / Copier"; }, 1500);
    } catch (err) {
      ui.modalBody.select?.();
    }
  });
  ui.modalClose.addEventListener("click", closeModal);

  function closeModal() {
    ui.modal.hidden = true;
  }

  function showOrderModal(message) {
    ui.modalBody.textContent = message;
    ui.modal.hidden = false;
  }

  function renderCart() {
    const count = cartCount(cart);
    ui.badge.textContent = String(count);
    ui.badge.hidden = count === 0;
    ui.fab.setAttribute("aria-label", "السلة / Panier (" + count + ")");
    ui.fab.classList.toggle("has-items", count > 0);

    if (!cart.length) {
      ui.list.innerHTML = '<p class="cart-empty">السلة فارغة · Votre panier est vide</p>';
    } else {
      ui.list.innerHTML = cart.map((it) => {
        const line = (Number(it.price) || 0) * (Number(it.qty) || 0);
        return (
          '<li class="cart-item" data-cart-id="' + escapeHtml(it.id) + '">' +
            '<img src="' + escapeHtml(productImgSrc(it.img || "")) + '" alt="">' +
            '<div class="cart-item-info">' +
              '<p class="cart-item-name">' + escapeHtml(it.name) + '</p>' +
              '<p class="cart-item-meta"><span lang="ar" dir="rtl">' + escapeHtml(it.nameAr || "") + '</span> · <span dir="ltr">' + escapeHtml(it.size || "") + " · " + money(it.price) + "</span></p>" +
              '<div class="cart-item-row">' +
                '<button type="button" class="qty-btn" data-act="dec" aria-label="Moins">−</button>' +
                '<span class="cart-qty">' + it.qty + "</span>" +
                '<button type="button" class="qty-btn" data-act="inc" aria-label="Plus">+</button>' +
                '<button type="button" class="cart-remove" data-act="rm">حذف</button>' +
                '<span class="cart-line">' + money(line) + "</span>" +
              "</div>" +
            "</div>" +
          "</li>"
        );
      }).join("");
      ui.list.querySelectorAll(".cart-item").forEach((el) => {
        const id = el.getAttribute("data-cart-id");
        el.querySelector('[data-act="dec"]').addEventListener("click", () => {
          const it = cart.find((x) => x.id === id);
          if (it && it.qty <= 1) removeItem(id);
          else setQty(id, (it ? it.qty : 1) - 1);
        });
        el.querySelector('[data-act="inc"]').addEventListener("click", () => {
          const it = cart.find((x) => x.id === id);
          setQty(id, (it ? it.qty : 1) + 1);
        });
        el.querySelector('[data-act="rm"]').addEventListener("click", () => removeItem(id));
      });
    }

    const sum = subtotal(cart);
    const ship = deliveryFor(sum);
    const total = sum + ship;
    ui.subtotal.textContent = money(sum);
    ui.shipping.textContent = ship === 0 && sum > 0 ? "Offerte / مجاناً" : money(ship);
    ui.total.textContent = money(total);
    ui.checkout.hidden = cart.length === 0;
    ui.totals.hidden = cart.length === 0;
  }

  function buildOrderMessage(items, customer) {
    const sum = subtotal(items);
    const ship = deliveryFor(sum);
    const total = sum + ship;
    const lines = [];
    lines.push("طلب جديد — IFER");
    lines.push("Nouvelle commande — IFER natural living");
    lines.push("");
    items.forEach((it) => {
      const line = (Number(it.price) || 0) * (Number(it.qty) || 0);
      lines.push(
        "• " + it.name + " (" + (it.nameAr || "") + ") — " +
        (it.size || "") + " × " + it.qty + " = " + money(line)
      );
    });
    lines.push("");
    lines.push("Sous-total / المجموع الجزئي: " + money(sum));
    if (ship === 0) {
      lines.push("Livraison: offerte (commande ≥ " + FREE_DELIVERY_FROM + " DH)");
    } else {
      lines.push("Livraison: " + money(DELIVERY_FEE));
    }
    lines.push("Total: " + money(total));
    lines.push("");
    lines.push("الدفع عند الاستلام / Paiement à la livraison (cash on delivery)");
    lines.push("");
    lines.push("Nom / الاسم: " + customer.name);
    lines.push("Téléphone / الهاتف: " + customer.phone);
    lines.push("Ville / المدينة: " + customer.city);
    lines.push("Adresse / العنوان: " + customer.address);
    if (customer.notes) lines.push("Notes / ملاحظات: " + customer.notes);
    lines.push("");
    lines.push("أثمنة تجريبية · Prix d’essai");
    return lines.join("\n");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function injectCartUI() {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <button type="button" class="cart-fab" id="cart-fab" aria-expanded="false" aria-controls="cart-drawer" aria-label="السلة / Panier">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 7h15l-1.5 9h-12L5 4H2"/>
          <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/>
          <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none"/>
        </svg>
        <span class="cart-badge" hidden>0</span>
      </button>
      <div class="cart-overlay" id="cart-overlay" hidden></div>
      <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-labelledby="cart-title" tabindex="-1">
        <header class="cart-head">
          <h2 id="cart-title">السلة <span>Panier</span></h2>
          <button type="button" class="cart-close" aria-label="Fermer">&times;</button>
        </header>
        <ul class="cart-list"></ul>
        <div class="cart-totals">
          <p><span>المجموع الجزئي / Sous-total</span> <strong class="js-subtotal">0 DH</strong></p>
          <p><span>التوصيل / Livraison</span> <strong class="js-shipping">30 DH</strong></p>
          <p class="cart-free-hint">Livraison 30 DH · offerte dès 300 DH</p>
          <p class="cart-total"><span>المجموع / Total</span> <strong class="js-total">0 DH</strong></p>
        </div>
        <form class="checkout-form" id="checkout-form">
          <h3>إتمام الطلب / Commander</h3>
          <p class="pay-note">الدفع عند الاستلام · Cash on delivery</p>
          <div class="field">
            <label for="co-name">Nom complet <span lang="ar">الاسم الكامل</span></label>
            <input id="co-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="co-phone">Téléphone <span lang="ar">الهاتف</span></label>
            <input id="co-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required>
          </div>
          <div class="field">
            <label for="co-city">Ville <span lang="ar">المدينة</span></label>
            <input id="co-city" name="city" type="text" autocomplete="address-level2" required>
          </div>
          <div class="field">
            <label for="co-address">Adresse <span lang="ar">العنوان</span></label>
            <textarea id="co-address" name="address" rows="2" autocomplete="street-address" required></textarea>
          </div>
          <div class="field">
            <label for="co-notes">Notes <span lang="ar">ملاحظات</span></label>
            <textarea id="co-notes" name="notes" rows="2" placeholder="اختياري"></textarea>
          </div>
          <p class="form-error" hidden>المرجو تعمير الاسم، الهاتف، المدينة والعنوان.</p>
          <button type="submit" class="btn btn-green btn-block">إرسال عبر واتساب / Commander sur WhatsApp</button>
        </form>
      </aside>
      <div class="order-modal" id="order-modal" hidden role="dialog" aria-labelledby="order-modal-title">
        <div class="order-modal-card">
          <h2 id="order-modal-title">ملخص الطلب / Récapitulatif</h2>
          <p class="order-modal-note">رقم واتساب غير مضبوط بعد. انسخ الرسالة أو أضف الرقم في script.js (WHATSAPP_NUMBER).</p>
          <pre class="order-modal-body"></pre>
          <div class="order-modal-actions">
            <button type="button" class="btn btn-green js-copy">نسخ الرسالة / Copier</button>
            <button type="button" class="btn btn-outline js-modal-close">إغلاق / Fermer</button>
          </div>
        </div>
      </div>
    `;
    // overlay starts without hidden attr conflict — we toggle class
    document.body.appendChild(wrap);
    const overlay = wrap.querySelector("#cart-overlay");
    overlay.hidden = false;
    return {
      fab: wrap.querySelector("#cart-fab"),
      badge: wrap.querySelector(".cart-badge"),
      overlay: overlay,
      drawer: wrap.querySelector("#cart-drawer"),
      closeBtn: wrap.querySelector(".cart-close"),
      list: wrap.querySelector(".cart-list"),
      totals: wrap.querySelector(".cart-totals"),
      subtotal: wrap.querySelector(".js-subtotal"),
      shipping: wrap.querySelector(".js-shipping"),
      total: wrap.querySelector(".js-total"),
      checkout: wrap.querySelector("#checkout-form"),
      formError: wrap.querySelector(".form-error"),
      modal: wrap.querySelector("#order-modal"),
      modalBody: wrap.querySelector(".order-modal-body"),
      copyBtn: wrap.querySelector(".js-copy"),
      modalClose: wrap.querySelector(".js-modal-close")
    };
  }

  function injectBuyNowUI() {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="buynow-overlay" id="buynow-overlay" hidden></div>
      <div class="buynow-dialog" id="buynow-dialog" role="dialog" aria-modal="true" aria-labelledby="buynow-title" tabindex="-1" hidden>
        <header class="buynow-head">
          <h2 id="buynow-title">اشري دابا <span>Commander</span></h2>
          <button type="button" class="cart-close buynow-close" aria-label="Fermer">&times;</button>
        </header>
        <div class="buynow-product">
          <img class="js-bn-img" src="" alt="">
          <div>
            <p class="buynow-name js-bn-name"></p>
            <p class="buynow-meta"><span class="js-bn-name-ar" lang="ar" dir="rtl"></span> · <span class="js-bn-size" dir="ltr"></span></p>
            <p class="buynow-unit">الثمن / Prix : <strong class="js-bn-unit"></strong></p>
          </div>
        </div>
        <div class="buynow-qty" role="group" aria-label="Quantité">
          <span>كمية / Qté</span>
          <button type="button" class="qty-btn js-bn-dec" aria-label="Moins">−</button>
          <span class="cart-qty js-bn-qty" aria-live="polite">1</span>
          <button type="button" class="qty-btn js-bn-inc" aria-label="Plus">+</button>
        </div>
        <div class="cart-totals buynow-totals">
          <p><span>المجموع الجزئي / Sous-total</span> <strong class="js-bn-subtotal">0 DH</strong></p>
          <p><span>التوصيل / Livraison</span> <strong class="js-bn-shipping">30 DH</strong></p>
          <p class="cart-free-hint">Livraison 30 DH · offerte dès 300 DH</p>
          <p class="cart-total"><span>المجموع / Total</span> <strong class="js-bn-total">0 DH</strong></p>
        </div>
        <form class="checkout-form" id="buynow-form">
          <h3>إتمام الطلب / Commander</h3>
          <p class="pay-note">الدفع عند الاستلام · Cash on delivery</p>
          <div class="field">
            <label for="bn-name">Nom complet <span lang="ar">الاسم الكامل</span></label>
            <input id="bn-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="bn-phone">Téléphone <span lang="ar">الهاتف</span></label>
            <input id="bn-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required>
          </div>
          <div class="field">
            <label for="bn-city">Ville <span lang="ar">المدينة</span></label>
            <input id="bn-city" name="city" type="text" autocomplete="address-level2" required>
          </div>
          <div class="field">
            <label for="bn-address">Adresse <span lang="ar">العنوان</span></label>
            <textarea id="bn-address" name="address" rows="2" autocomplete="street-address" required></textarea>
          </div>
          <div class="field">
            <label for="bn-notes">Notes <span lang="ar">ملاحظات</span></label>
            <textarea id="bn-notes" name="notes" rows="2" placeholder="اختياري"></textarea>
          </div>
          <p class="form-error" hidden>المرجو تعمير الاسم، الهاتف، المدينة والعنوان.</p>
          <button type="submit" class="btn btn-green btn-block">إرسال عبر واتساب / Commander sur WhatsApp</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);
    const dialog = wrap.querySelector("#buynow-dialog");
    const formEl = wrap.querySelector("#buynow-form");
    return {
      overlay: wrap.querySelector("#buynow-overlay"),
      dialog: dialog,
      closeBtn: wrap.querySelector(".buynow-close"),
      img: wrap.querySelector(".js-bn-img"),
      name: wrap.querySelector(".js-bn-name"),
      nameAr: wrap.querySelector(".js-bn-name-ar"),
      size: wrap.querySelector(".js-bn-size"),
      unit: wrap.querySelector(".js-bn-unit"),
      qty: wrap.querySelector(".js-bn-qty"),
      dec: wrap.querySelector(".js-bn-dec"),
      inc: wrap.querySelector(".js-bn-inc"),
      subtotal: wrap.querySelector(".js-bn-subtotal"),
      shipping: wrap.querySelector(".js-bn-shipping"),
      total: wrap.querySelector(".js-bn-total"),
      form: formEl,
      formError: formEl.querySelector(".form-error"),
      nameInput: wrap.querySelector("#bn-name"),
      phoneInput: wrap.querySelector("#bn-phone")
    };
  }
})();
