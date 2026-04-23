/* Etsy Profit Calculator — category-aware, advisor-tone */

const COUNTRIES = [
  { name: "United States", procRate: 0.030, procFixed: 0.25, regFee: 0.0000, vat: 0 },
  { name: "Canada", procRate: 0.030, procFixed: 0.25, regFee: 0.0115, vat: 0 },
  { name: "United Kingdom", procRate: 0.040, procFixed: 0.20, regFee: 0.0032, vat: 20 },
  { name: "Germany", procRate: 0.040, procFixed: 0.30, regFee: 0.0000, vat: 19 },
  { name: "France", procRate: 0.040, procFixed: 0.30, regFee: 0.0047, vat: 20 },
  { name: "Italy", procRate: 0.040, procFixed: 0.30, regFee: 0.0032, vat: 22 },
  { name: "Spain", procRate: 0.040, procFixed: 0.30, regFee: 0.0072, vat: 21 },
  { name: "Netherlands", procRate: 0.040, procFixed: 0.30, regFee: 0.0000, vat: 21 },
  { name: "Ireland", procRate: 0.040, procFixed: 0.30, regFee: 0.0000, vat: 23 },
  { name: "Australia", procRate: 0.030, procFixed: 0.25, regFee: 0.0000, vat: 10 },
  { name: "New Zealand", procRate: 0.040, procFixed: 0.30, regFee: 0.0000, vat: 15 },
  { name: "United Arab Emirates", procRate: 0.065, procFixed: 0.30, regFee: 0.0000, vat: 5 },
  { name: "India", procRate: 0.040, procFixed: 0.30, regFee: 0.0029, vat: 18 },
  { name: "Turkey", procRate: 0.040, procFixed: 0.30, regFee: 0.0227, vat: 20 },
  { name: "Vietnam", procRate: 0.040, procFixed: 0.30, regFee: 0.0124, vat: 10 },
  { name: "Other (non-US)", procRate: 0.065, procFixed: 0.30, regFee: 0.0000, vat: 0 },
];

const CATEGORIES = [
  { id: "handmade", name: "Handmade physical", benchLo: 0.25, benchHi: 0.35, hasLabor: true,  hasShipping: true,  hint: "Candles, jewelry, soap, ceramics — things you make by hand." },
  { id: "digital",  name: "Digital download",  benchLo: 0.70, benchHi: 0.90, hasLabor: false, hasShipping: false, hint: "Printables, templates, SVGs — no physical cost per sale." },
  { id: "pod",      name: "Print-on-demand",   benchLo: 0.15, benchHi: 0.25, hasLabor: false, hasShipping: true,  hint: "Printify / Printful — provider makes and ships." },
  { id: "vintage",  name: "Vintage (20+ yrs)", benchLo: 0.40, benchHi: 0.60, hasLabor: false, hasShipping: true,  hint: "Resold items 20+ years old — no manufacturing cost." },
  { id: "supplies", name: "Craft supplies",    benchLo: 0.20, benchHi: 0.40, hasLabor: true,  hasShipping: true,  hint: "Beads, yarn, fabric, kits — bought wholesale, resold." },
];

const DEFAULT_COUNTRY = "United Arab Emirates";
const DEFAULT_CATEGORY = "handmade";

// ---------- State ----------
let shippingCostEdited = false;
let activeTab = "standard";
let isPro = false;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const els = {
  // Inputs
  category: $("category"),
  categoryHint: $("categoryHint"),
  salePrice: $("salePrice"),
  shippingCharged: $("shippingCharged"),
  materials: $("materials"),
  packaging: $("packaging"),
  laborHours: $("laborHours"),
  laborRate: $("laborRate"),
  costSubtotal: $("costSubtotal"),
  shippingCost: $("shippingCost"),
  country: $("country"),
  etsyAds: $("etsyAds"),
  offsiteAds: $("offsiteAds"),
  // Rows (to toggle visibility by category)
  rowShippingCharged: $("rowShippingCharged"),
  rowLabor: $("rowLabor"),
  rowShippingCost: $("rowShippingCost"),
  // Standard right
  netProfit: $("netProfit"),
  marginBadge: $("marginBadge"),
  totalFees: $("totalFees"),
  totalCosts: $("totalCosts"),
  revenue: $("revenue"),
  // Advisor right
  resultsStandard: $("resultsStandard"),
  resultsAdvisor: $("resultsAdvisor"),
  advisorStack: $("advisorStack"),
  paywall: $("paywall"),
  advNetProfit: $("advNetProfit"),
  advRevenue: $("advRevenue"),
  advFees: $("advFees"),
  advCosts: $("advCosts"),
  advMarginStat: $("advMarginStat"),
  recoTitle: $("recoTitle"),
  recoText: $("recoText"),
  recoBenchmark: $("recoBenchmark"),
  recoCard: $("recoCard"),
  priceBreakEven: $("priceBreakEven"),
  price20: $("price20"),
  price30: $("price30"),
  price40: $("price40"),
  breakdownMaterials: $("breakdownMaterials"),
  breakdownPackaging: $("breakdownPackaging"),
  breakdownLabor: $("breakdownLabor"),
  breakdownLaborRow: $("breakdownLaborRow"),
  breakdownFees: $("breakdownFees"),
  breakdownShipping: $("breakdownShipping"),
  breakdownShippingRow: $("breakdownShippingRow"),
  goalInput: $("goalInput"),
  goalResult: $("goalResult"),
  adsImpactMain: $("adsImpactMain"),
  adsImpactSub: $("adsImpactSub"),
  tabs: document.querySelectorAll(".tab"),
};

// ---------- Init ----------
function init() {
  // Populate countries
  COUNTRIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    if (c.name === DEFAULT_COUNTRY) opt.selected = true;
    els.country.appendChild(opt);
  });

  // Populate categories
  CATEGORIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === DEFAULT_CATEGORY) opt.selected = true;
    els.category.appendChild(opt);
  });

  // Pro flag via URL (dev/testing)
  const params = new URLSearchParams(window.location.search);
  if (params.get("pro") === "1") isPro = true;
  updatePaywall();

  // Paywall CTAs
  const paywallCta = $("paywallCta");
  if (paywallCta) paywallCta.addEventListener("click", () => {
    if (typeof openAuthModal === "function") openAuthModal("signup");
  });
  const paywallLogin = $("paywallLogin");
  if (paywallLogin) paywallLogin.addEventListener("click", () => {
    if (typeof openAuthModal === "function") openAuthModal("login");
  });

  // Tab switching
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      els.tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      els.resultsStandard.hidden = activeTab !== "standard";
      els.resultsAdvisor.hidden = activeTab !== "advisor";
      updateAuthSlotVisibility();
    });
  });
  updateAuthSlotVisibility();

  // Category change updates visibility + benchmark
  els.category.addEventListener("change", () => {
    applyCategory();
    calculate();
  });
  applyCategory();

  // Shipping auto-sync
  els.shippingCharged.addEventListener("input", () => {
    if (!shippingCostEdited) els.shippingCost.value = els.shippingCharged.value;
    calculate();
  });
  els.shippingCost.addEventListener("input", () => {
    shippingCostEdited = true;
    calculate();
  });

  // All other input listeners
  [
    els.salePrice, els.materials, els.packaging, els.laborHours, els.laborRate,
    els.country, els.etsyAds, els.offsiteAds, els.goalInput,
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", calculate);
    el.addEventListener("change", calculate);
  });

  calculate();
}

function currentCategory() {
  return CATEGORIES.find((c) => c.id === els.category.value) || CATEGORIES[0];
}

function applyCategory() {
  const cat = currentCategory();
  els.categoryHint.textContent = cat.hint;
  els.rowShippingCharged.hidden = !cat.hasShipping;
  els.rowShippingCost.hidden = !cat.hasShipping;
  els.rowLabor.hidden = !cat.hasLabor;
  els.breakdownLaborRow.hidden = !cat.hasLabor;
  els.breakdownShippingRow.hidden = !cat.hasShipping;
}

// ---------- Core calc ----------
function readInputs() {
  const cat = currentCategory();
  const salePrice = parseFloat(els.salePrice.value) || 0;
  const shippingCharged = cat.hasShipping ? (parseFloat(els.shippingCharged.value) || 0) : 0;
  const materials = parseFloat(els.materials.value) || 0;
  const packaging = parseFloat(els.packaging.value) || 0;
  const laborHours = cat.hasLabor ? (parseFloat(els.laborHours.value) || 0) : 0;
  const laborRate = cat.hasLabor ? (parseFloat(els.laborRate.value) || 0) : 0;
  const shippingCost = cat.hasShipping ? (parseFloat(els.shippingCost.value) || 0) : 0;
  const laborCost = laborHours * laborRate;
  const itemCost = materials + packaging + laborCost;
  const totalCosts = itemCost + shippingCost;
  return {
    cat, salePrice, shippingCharged,
    materials, packaging, laborHours, laborRate, laborCost,
    itemCost, shippingCost, totalCosts,
  };
}

function feesFor({ revenue, country, etsyAdsRate, offsiteRate }) {
  const listingPlusRenew = 0.40;
  const transaction = 0.065 * revenue;
  const processing = revenue * country.procRate + country.procFixed;
  const regFee = revenue * country.regFee;
  const ads = revenue * (etsyAdsRate + offsiteRate);
  const feesSubtotal = listingPlusRenew + transaction + processing + regFee + ads;
  const vat = feesSubtotal * (country.vat / 100);
  return feesSubtotal + vat;
}

function calculate() {
  const inp = readInputs();
  const country = COUNTRIES.find((c) => c.name === els.country.value) || COUNTRIES[0];
  const etsyAdsRate = els.etsyAds.checked ? 0.08 : 0;   // typical Etsy Ads ~8% of revenue
  const offsiteRate = els.offsiteAds.checked ? 0.15 : 0;
  const revenue = inp.salePrice + inp.shippingCharged;
  const totalEtsyFees = feesFor({ revenue, country, etsyAdsRate, offsiteRate });
  const netProfit = revenue - totalEtsyFees - inp.totalCosts;
  const margin = revenue > 0 ? netProfit / revenue : 0;

  // Update cost subtotal in input panel
  els.costSubtotal.textContent = fmt(inp.itemCost);

  renderStandard({ revenue, totalEtsyFees, totalCosts: inp.totalCosts, netProfit, margin });
  renderAdvisor({ inp, country, etsyAdsRate, offsiteRate, revenue, totalEtsyFees, netProfit, margin });
}

// ---------- Render ----------
function fmt(n) {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toFixed(2);
}

function renderStandard({ revenue, totalEtsyFees, totalCosts, netProfit, margin }) {
  const cat = currentCategory();
  els.netProfit.textContent = fmt(netProfit);
  els.netProfit.classList.toggle("negative", netProfit < 0);

  const marginPct = (margin * 100).toFixed(1) + "%";
  els.marginBadge.textContent = marginPct;
  els.marginBadge.classList.remove("amber", "red", "green");
  applyMarginClass(els.marginBadge, margin, cat);

  els.totalFees.textContent = fmt(totalEtsyFees);
  els.totalCosts.textContent = fmt(totalCosts);
  els.revenue.textContent = fmt(revenue);
}

function applyMarginClass(el, margin, cat) {
  if (margin < cat.benchLo * 0.6) el.classList.add("red");
  else if (margin < cat.benchLo) el.classList.add("amber");
  else el.classList.add("green");
}

// ---------- Advisor ----------
function renderAdvisor({ inp, country, etsyAdsRate, offsiteRate, revenue, totalEtsyFees, netProfit, margin }) {
  const cat = inp.cat;
  const marginPct = (margin * 100).toFixed(1);

  // Summary strip
  els.advNetProfit.textContent = fmt(netProfit);
  els.advNetProfit.classList.toggle("negative", netProfit < 0);
  els.advRevenue.textContent = fmt(revenue);
  els.advFees.textContent = fmt(totalEtsyFees);
  els.advCosts.textContent = fmt(inp.totalCosts);
  els.advMarginStat.textContent = marginPct + "%";
  els.advMarginStat.classList.remove("red", "amber", "green");
  applyMarginClass(els.advMarginStat, margin, cat);

  // Benchmark text
  const benchLabel = `${(cat.benchLo * 100).toFixed(0)}–${(cat.benchHi * 100).toFixed(0)}%`;
  els.recoBenchmark.textContent = `${cat.name} benchmark: ${benchLabel}`;

  // Recommendation
  renderRecommendation({ inp, netProfit, margin, cat, p30: null });

  // Target prices
  const targets = { shippingCharged: inp.shippingCharged, shippingCost: inp.shippingCost, itemCost: inp.itemCost, country, etsyAdsRate, offsiteRate };
  const breakEven = solveForMargin(0, targets);
  const p20 = solveForMargin(0.20, targets);
  const p30 = solveForMargin(0.30, targets);
  const p40 = solveForMargin(0.40, targets);
  els.priceBreakEven.textContent = fmt(breakEven);
  els.price20.textContent = fmt(p20);
  els.price30.textContent = fmt(p30);
  els.price40.textContent = fmt(p40);

  // Re-render recommendation with correct p30
  renderRecommendation({ inp, netProfit, margin, cat, p30 });

  // Where your margin goes
  renderBreakdown({ inp, totalEtsyFees });

  // Monthly goal
  renderGoal({ netProfit });

  // Offsite ads impact
  renderAdsImpact({ inp, country, revenue, netProfit });
}

function renderRecommendation({ inp, netProfit, margin, cat, p30 }) {
  let toneClass, title, text;
  const targetText = p30 ? fmt(p30) : "—";

  if (netProfit < 0) {
    toneClass = "red";
    title = "You're losing money on this product.";
    const biggest = biggestCostDriver(inp);
    text = `${biggest.label} is eating your margin. Three ways out: raise to ${targetText} for a 30% margin, trim ${biggest.trim}, or rethink whether this product earns its place. Check competitor prices before raising — you know your market better than we do.`;
  } else if (margin < cat.benchLo) {
    toneClass = "amber";
    title = `You're below the ${cat.name.toLowerCase()} range, mostly because of ${biggestCostDriver(inp).label.toLowerCase()}.`;
    const biggest = biggestCostDriver(inp);
    text = `Three ways out: raise to ${targetText} for a 30% margin, trim ${biggest.trim}, or batch to cut ${biggest.label.toLowerCase()} per unit. Check competitor prices before raising — you know your market better than we do.`;
  } else if (margin < cat.benchHi) {
    toneClass = "";
    title = `You're inside the healthy range for ${cat.name.toLowerCase()}.`;
    text = `Your ${(margin * 100).toFixed(1)}% margin is working. To push higher, ${targetText} gets you to 30%. Watch for ad costs — they can eat 8–15% quickly.`;
  } else {
    toneClass = "green";
    title = `Strong margin for ${cat.name.toLowerCase()} — room to scale.`;
    text = `At ${(margin * 100).toFixed(1)}% you can afford Etsy Ads, discounts, or offsite ads if you cross $10k. Consider this a product worth pushing volume on.`;
  }

  els.recoCard.classList.remove("red", "amber", "green");
  if (toneClass) els.recoCard.classList.add(toneClass);
  els.recoTitle.textContent = title;
  els.recoText.textContent = text;
}

function biggestCostDriver(inp) {
  const items = [
    { label: "Labor", value: inp.laborCost, trim: "time per unit (batch work)" },
    { label: "Materials", value: inp.materials, trim: "material costs (bulk supplier?)" },
    { label: "Packaging", value: inp.packaging, trim: "packaging (simpler mailer?)" },
    { label: "Shipping gap", value: Math.max(0, inp.shippingCost - inp.shippingCharged), trim: "shipping loss (charge more?)" },
  ].sort((a, b) => b.value - a.value);
  return items[0];
}

function renderBreakdown({ inp, totalEtsyFees }) {
  els.breakdownMaterials.textContent = fmt(inp.materials);
  els.breakdownPackaging.textContent = fmt(inp.packaging);
  if (inp.cat.hasLabor) els.breakdownLabor.textContent = fmt(inp.laborCost);
  els.breakdownFees.textContent = fmt(totalEtsyFees);
  if (inp.cat.hasShipping) {
    const gap = inp.shippingCost - inp.shippingCharged;
    if (gap > 0) {
      els.breakdownShipping.textContent = `-${fmt(gap)}`;
      els.breakdownShipping.classList.add("red");
    } else {
      els.breakdownShipping.textContent = fmt(0);
      els.breakdownShipping.classList.remove("red");
    }
  }

  // Highlight biggest driver with amber
  document.querySelectorAll(".breakdown-value").forEach(el => el.classList.remove("amber"));
  const biggest = biggestCostDriver(inp);
  const map = {
    "Labor": els.breakdownLabor,
    "Materials": els.breakdownMaterials,
    "Packaging": els.breakdownPackaging,
    "Shipping gap": els.breakdownShipping,
  };
  if (map[biggest.label] && biggest.value > 0) map[biggest.label].classList.add("amber");
}

function renderGoal({ netProfit }) {
  const goal = parseFloat(els.goalInput.value) || 500;
  if (!isFinite(netProfit) || netProfit <= 0) {
    els.goalResult.textContent = "Need a positive net profit first.";
    return;
  }
  const sales = Math.ceil(goal / netProfit);
  els.goalResult.innerHTML = `At ${fmt(netProfit)}/order, that's <strong>${sales} sales/month</strong>.`;
}

function renderAdsImpact({ inp, country, revenue, netProfit }) {
  // What happens if 15% offsite applies to this order?
  const withOffsite = feesFor({
    revenue,
    country,
    etsyAdsRate: els.etsyAds.checked ? 0.08 : 0,
    offsiteRate: 0.15,
  });
  const profitWithOffsite = revenue - withOffsite - inp.totalCosts;
  const delta = profitWithOffsite - netProfit;

  if (els.offsiteAds.checked) {
    els.adsImpactMain.textContent = "Offsite ads already applied above.";
    els.adsImpactSub.textContent = "15% fee is mandatory once your shop crosses $10k/year.";
  } else if (profitWithOffsite < 0) {
    els.adsImpactMain.textContent = `You'd lose ${fmt(Math.abs(profitWithOffsite))}/order.`;
    els.adsImpactSub.textContent = "Raise price before you cross $10k — 15% offsite is mandatory after that.";
  } else {
    els.adsImpactMain.textContent = `${fmt(Math.abs(delta))} less per order at 15% offsite.`;
    els.adsImpactSub.textContent = "Mandatory once shop crosses $10k/year. Price for it now.";
  }
}

// Binary search: find salePrice such that margin >= target
function solveForMargin(targetMargin, { shippingCharged, shippingCost, itemCost, country, etsyAdsRate, offsiteRate }) {
  const profitAt = (salePrice) => {
    const revenue = salePrice + shippingCharged;
    const totalFees = feesFor({ revenue, country, etsyAdsRate, offsiteRate });
    const net = revenue - totalFees - (itemCost + shippingCost);
    return { net, revenue };
  };
  let lo = 0.01, hi = 10000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { net, revenue } = profitAt(mid);
    const m = revenue > 0 ? net / revenue : -1;
    if (m < targetMargin) lo = mid;
    else hi = mid;
  }
  return Math.ceil(hi * 100) / 100;
}

// ---------- Paywall ----------
function updatePaywall() {
  const authed = typeof authUser !== "undefined" && authUser !== null;
  const unlocked = isPro || (authed && typeof userHasPro === "function" && userHasPro(authUser));
  if (unlocked) {
    els.paywall.classList.add("hidden");
    els.advisorStack.classList.remove("blurred");
  } else {
    els.paywall.classList.remove("hidden");
    els.advisorStack.classList.add("blurred");
  }
  updateAuthSlotVisibility();
}

function updateAuthSlotVisibility() {
  const slot = document.getElementById("authSlot");
  if (!slot) return;
  const authed = typeof authUser !== "undefined" && authUser !== null;
  slot.hidden = (activeTab === "standard" && !authed);
}

// ---------- Go ----------
document.addEventListener("DOMContentLoaded", init);
