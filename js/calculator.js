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
  {
    id: "handmade", name: "Handmade physical",
    benchLo: 0.25, benchHi: 0.35,
    hasMaterials: true, hasPackaging: true, hasLabor: true, hasEquipment: false,
    hasShippingCharged: true, hasShippingCost: true,
    hint: "Candles, jewelry, soap, ceramics — things you make by hand.",
    materialsLabel: "Materials ($)",
    materialsHint: "Wax, fabric, ink, beads — the stuff the product is made of.",
    packagingHint: "Box, mailer, label, tissue, thank-you card.",
    laborHint: "Your time has a cost. 15 min × $15 = $3.75.",
    watchOut: "Batch production is the usual fix. Making 10 at once cuts labor per unit significantly.",
    biggestDriverLabel: "materials",
  },
  {
    id: "inhouse", name: "I print / press it myself",
    benchLo: 0.30, benchHi: 0.45,
    hasMaterials: true, hasPackaging: true, hasLabor: true, hasEquipment: true,
    hasShippingCharged: true, hasShippingCost: true,
    hint: "Sublimation, DTF, HTV, Cricut — you own the equipment.",
    materialsLabel: "Blanks ($)",
    materialsHint: "T-shirts, mugs, tumblers — the blank you print on.",
    packagingHint: "Poly bag, box, mailer, label.",
    laborHint: "Setup + pressing + QC. 20 min × $15 = $5.00.",
    equipmentLabel: "Equipment recovery ($)",
    equipmentHint: "Press/printer cost ÷ expected lifetime sales. $1,500 press ÷ 1,000 sales = $1.50/unit.",
    watchOut: "Equipment recovery is the cost nobody prices in. If you skip this field, your Cricut is quietly eating profit.",
    biggestDriverLabel: "blanks",
  },
  {
    id: "digital", name: "Digital download",
    benchLo: 0.70, benchHi: 0.90,
    hasMaterials: true, hasPackaging: false, hasLabor: false, hasEquipment: false,
    hasShippingCharged: false, hasShippingCost: false,
    hint: "Printables, templates, SVGs — no physical cost per sale.",
    materialsLabel: "Design cost per sale ($)",
    materialsHint: "Font licenses, stock images, software — divided by expected sales. $50 license ÷ 100 sales = $0.50.",
    watchOut: "Etsy fees hit hardest on low-price digitals. A $5 download can lose 30%+ to fees alone.",
    biggestDriverLabel: "Etsy fees",
  },
  {
    id: "pod", name: "Print-on-demand",
    benchLo: 0.15, benchHi: 0.25,
    hasMaterials: true, hasPackaging: false, hasLabor: false, hasEquipment: false,
    hasShippingCharged: true, hasShippingCost: false,
    hint: "Printify / Printful — provider makes and ships.",
    materialsLabel: "Provider base cost ($)",
    materialsHint: "What Printify/Printful charges per unit — includes product, printing, and their shipping.",
    watchOut: "POD margins are thin by design. Scale on volume and variants, not on price increases.",
    biggestDriverLabel: "provider base cost",
  },
  {
    id: "vintage", name: "Vintage (20+ yrs)",
    benchLo: 0.40, benchHi: 0.60,
    hasMaterials: true, hasPackaging: true, hasLabor: false, hasEquipment: false,
    hasShippingCharged: true, hasShippingCost: true,
    hint: "Resold items 20+ years old — no manufacturing cost.",
    materialsLabel: "Cost you paid ($)",
    materialsHint: "What you paid at the estate sale / thrift / flip.",
    packagingHint: "Bubble wrap, sturdy box — vintage needs careful packing.",
    watchOut: "Shipping breakage is real. Price insurance into your shipping charge or eat the replacement cost.",
    biggestDriverLabel: "cost",
  },
  {
    id: "supplies", name: "Craft supplies",
    benchLo: 0.20, benchHi: 0.40,
    hasMaterials: true, hasPackaging: true, hasLabor: true, hasEquipment: false,
    hasShippingCharged: true, hasShippingCost: true,
    hint: "Beads, yarn, fabric, kits — bought wholesale, resold.",
    materialsLabel: "Cost you paid ($)",
    materialsHint: "Beads, yarn, fabric, kits — wholesale or retail cost.",
    packagingHint: "Poly bags, small boxes, stickers.",
    laborHint: "Kit assembly, labeling, measuring. 5 min × $15 = $1.25.",
    watchOut: "Ad costs (8–15%) can flip supplies from profitable to loss fast. Price with ads in mind.",
    biggestDriverLabel: "cost",
  },
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
  materialsLabel: $("materialsLabel"),
  materialsHint: $("materialsHint"),
  packaging: $("packaging"),
  packagingHint: $("packagingHint"),
  laborHours: $("laborHours"),
  laborRate: $("laborRate"),
  laborHint: $("laborHint"),
  equipment: $("equipment"),
  equipmentLabel: $("equipmentLabel"),
  equipmentHint: $("equipmentHint"),
  costSubtotal: $("costSubtotal"),
  shippingCost: $("shippingCost"),
  country: $("country"),
  etsyAds: $("etsyAds"),
  offsiteAds: $("offsiteAds"),
  // Rows (to toggle visibility by category)
  rowShippingCharged: $("rowShippingCharged"),
  rowMaterials: $("rowMaterials"),
  rowPackaging: $("rowPackaging"),
  rowLabor: $("rowLabor"),
  rowEquipment: $("rowEquipment"),
  rowShippingCost: $("rowShippingCost"),
  // Breakdown
  breakdownMaterialsLabel: $("breakdownMaterialsLabel"),
  breakdownMaterialsRow: $("breakdownMaterialsRow"),
  breakdownPackagingRow: $("breakdownPackagingRow"),
  breakdownEquipmentRow: $("breakdownEquipmentRow"),
  breakdownEquipment: $("breakdownEquipment"),
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

  // Category change updates visibility + benchmark, reset stale values
  els.category.addEventListener("change", () => {
    resetCostDefaults();
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
    els.equipment, els.country, els.etsyAds, els.offsiteAds, els.goalInput,
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

// Reset cost defaults sensibly when switching categories
function resetCostDefaults() {
  const cat = currentCategory();
  const defaults = {
    handmade: { materials: 6.50, packaging: 1.70, laborHours: 0.25, laborRate: 15, equipment: 0, shippingCharged: 4.75, shippingCost: 4.75 },
    inhouse:  { materials: 4.50, packaging: 1.00, laborHours: 0.33, laborRate: 15, equipment: 1.50, shippingCharged: 5.00, shippingCost: 5.00 },
    digital:  { materials: 0.00, packaging: 0.00, laborHours: 0,    laborRate: 0,  equipment: 0, shippingCharged: 0, shippingCost: 0 },
    pod:      { materials: 8.00, packaging: 0.00, laborHours: 0,    laborRate: 0,  equipment: 0, shippingCharged: 4.99, shippingCost: 0 },
    vintage:  { materials: 4.00, packaging: 2.00, laborHours: 0,    laborRate: 0,  equipment: 0, shippingCharged: 6.00, shippingCost: 6.00 },
    supplies: { materials: 3.00, packaging: 0.80, laborHours: 0.10, laborRate: 15, equipment: 0, shippingCharged: 4.00, shippingCost: 4.00 },
  };
  const d = defaults[cat.id] || defaults.handmade;
  els.materials.value = d.materials;
  els.packaging.value = d.packaging;
  els.laborHours.value = d.laborHours;
  els.laborRate.value = d.laborRate;
  els.equipment.value = d.equipment;
  els.shippingCharged.value = d.shippingCharged;
  els.shippingCost.value = d.shippingCost;
  shippingCostEdited = false; // re-enable auto-sync after category switch
}

function applyCategory() {
  const cat = currentCategory();
  els.categoryHint.textContent = cat.hint;

  // Field visibility
  els.rowMaterials.hidden = !cat.hasMaterials;
  els.rowPackaging.hidden = !cat.hasPackaging;
  els.rowLabor.hidden = !cat.hasLabor;
  els.rowEquipment.hidden = !cat.hasEquipment;
  els.rowShippingCharged.hidden = !cat.hasShippingCharged;
  els.rowShippingCost.hidden = !cat.hasShippingCost;

  // Dynamic labels + hints
  if (cat.hasMaterials) {
    els.materialsLabel.textContent = cat.materialsLabel || "Materials ($)";
    els.materialsHint.textContent = cat.materialsHint || "";
    // Update breakdown row label to match input label (strip $ part)
    const shortLabel = (cat.materialsLabel || "Materials").replace(/\s*\(\$\)\s*/, "");
    if (els.breakdownMaterialsLabel) els.breakdownMaterialsLabel.textContent = shortLabel;
  }
  if (cat.hasPackaging && els.packagingHint) {
    els.packagingHint.textContent = cat.packagingHint || "";
  }
  if (cat.hasLabor && els.laborHint) {
    els.laborHint.textContent = cat.laborHint || "";
  }
  if (cat.hasEquipment) {
    if (els.equipmentLabel) els.equipmentLabel.textContent = cat.equipmentLabel || "Equipment recovery ($)";
    if (els.equipmentHint) els.equipmentHint.textContent = cat.equipmentHint || "";
  }

  // Breakdown row visibility
  els.breakdownMaterialsRow.hidden = !cat.hasMaterials;
  els.breakdownPackagingRow.hidden = !cat.hasPackaging;
  els.breakdownLaborRow.hidden = !cat.hasLabor;
  els.breakdownEquipmentRow.hidden = !cat.hasEquipment;
  els.breakdownShippingRow.hidden = !cat.hasShippingCost;
}

// ---------- Core calc ----------
function readInputs() {
  const cat = currentCategory();
  const salePrice = parseFloat(els.salePrice.value) || 0;
  const shippingCharged = cat.hasShippingCharged ? (parseFloat(els.shippingCharged.value) || 0) : 0;
  const materials = cat.hasMaterials ? (parseFloat(els.materials.value) || 0) : 0;
  const packaging = cat.hasPackaging ? (parseFloat(els.packaging.value) || 0) : 0;
  const laborHours = cat.hasLabor ? (parseFloat(els.laborHours.value) || 0) : 0;
  const laborRate = cat.hasLabor ? (parseFloat(els.laborRate.value) || 0) : 0;
  const equipment = cat.hasEquipment ? (parseFloat(els.equipment.value) || 0) : 0;
  const shippingCost = cat.hasShippingCost ? (parseFloat(els.shippingCost.value) || 0) : 0;
  const laborCost = laborHours * laborRate;
  const itemCost = materials + packaging + laborCost + equipment;
  const totalCosts = itemCost + shippingCost;
  return {
    cat, salePrice, shippingCharged,
    materials, packaging, laborHours, laborRate, laborCost, equipment,
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
  const marginPct = (margin * 100).toFixed(1);
  const driver = biggestCostDriver(inp, cat);

  if (netProfit < 0) {
    toneClass = "red";
    title = "You're losing money on this product.";
    text = `${driver.label} is eating your margin. Three ways out: raise to ${targetText} for a 30% margin, ${driver.trim}, or rethink whether this product earns its place. ${cat.watchOut} Check competitor prices before raising — you know your market better than we do.`;
  } else if (margin < cat.benchLo) {
    toneClass = "amber";
    // Category-specific root-cause phrasing
    if (cat.id === "digital") {
      title = `You're below the digital download range.`;
      text = `Your ${marginPct}% margin is thin for digital. Etsy fees take a big bite on low-price downloads — raising to ${targetText} gets you to 30%, but digital sellers usually target 70%+. Consider repricing higher or bundling. ${cat.watchOut}`;
    } else if (cat.id === "pod") {
      title = `You're below the POD range, but POD is inherently thin.`;
      text = `Your ${marginPct}% margin is under the 15–25% baseline. Either raise to ${targetText} (customers will compare against similar POD sellers), or scale volume and variants. ${cat.watchOut}`;
    } else {
      title = `You're below the ${cat.name.toLowerCase()} range, mostly because of ${driver.label.toLowerCase()}.`;
      text = `Three ways out: raise to ${targetText} for a 30% margin, ${driver.trim}, or batch to cut cost per unit. ${cat.watchOut} Check competitor prices before raising — you know your market better than we do.`;
    }
  } else if (margin < cat.benchHi) {
    toneClass = "";
    title = `You're inside the healthy range for ${cat.name.toLowerCase()}.`;
    text = `Your ${marginPct}% margin is working. To push higher, ${targetText} gets you to 30%. ${cat.watchOut}`;
  } else {
    toneClass = "green";
    title = `Strong margin for ${cat.name.toLowerCase()} — room to scale.`;
    text = `At ${marginPct}% you can afford Etsy Ads, discounts, or offsite ads if you cross $10k. ${cat.watchOut}`;
  }

  els.recoCard.classList.remove("red", "amber", "green");
  if (toneClass) els.recoCard.classList.add(toneClass);
  els.recoTitle.textContent = title;
  els.recoText.textContent = text;
}

function biggestCostDriver(inp, cat) {
  const matName = (cat && cat.biggestDriverLabel) || "Materials";
  const items = [];
  if (cat.hasMaterials) items.push({ label: capitalize(matName), value: inp.materials, trim: `trim ${matName.toLowerCase()} (bulk supplier or alternative source)` });
  if (cat.hasPackaging) items.push({ label: "Packaging", value: inp.packaging, trim: "simplify packaging (cheaper mailer)" });
  if (cat.hasLabor) items.push({ label: "Labor", value: inp.laborCost, trim: "batch production to cut time per unit" });
  if (cat.hasEquipment) items.push({ label: "Equipment", value: inp.equipment, trim: "spread equipment cost over more sales (run more units)" });
  if (cat.hasShippingCost) {
    const gap = Math.max(0, inp.shippingCost - inp.shippingCharged);
    items.push({ label: "Shipping gap", value: gap, trim: "charge higher shipping to close the gap" });
  }
  items.sort((a, b) => b.value - a.value);
  return items[0] || { label: "Etsy fees", value: 0, trim: "raise price to cover fees" };
}

function renderBreakdown({ inp, totalEtsyFees }) {
  const cat = inp.cat;
  if (cat.hasMaterials) els.breakdownMaterials.textContent = fmt(inp.materials);
  if (cat.hasPackaging) els.breakdownPackaging.textContent = fmt(inp.packaging);
  if (cat.hasLabor) els.breakdownLabor.textContent = fmt(inp.laborCost);
  if (cat.hasEquipment) els.breakdownEquipment.textContent = fmt(inp.equipment);
  els.breakdownFees.textContent = fmt(totalEtsyFees);
  if (cat.hasShippingCost) {
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
  const biggest = biggestCostDriver(inp, cat);
  const matKey = capitalize((cat.biggestDriverLabel || "materials"));
  const map = {
    [matKey]: els.breakdownMaterials,
    "Packaging": els.breakdownPackaging,
    "Labor": els.breakdownLabor,
    "Equipment": els.breakdownEquipment,
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
