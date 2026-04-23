/* Etsy Profit Calculator — Everbee-simple */

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

const DEFAULT_COUNTRY = "United Arab Emirates";

// ---------- State ----------
let shippingCostEdited = false;
let activeTab = "standard";
let isPro = false;
let wageMode = "volume"; // "volume" or "hourly"

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const els = {
  salePrice: $("salePrice"),
  shippingCharged: $("shippingCharged"),
  costOfItem: $("costOfItem"),
  shippingCost: $("shippingCost"),
  country: $("country"),
  advertising: $("advertising"),
  netProfit: $("netProfit"),
  marginBadge: $("marginBadge"),
  totalFees: $("totalFees"),
  totalCosts: $("totalCosts"),
  revenue: $("revenue"),
  donutSegs: {
    profit: document.querySelector(".seg-profit"),
    fees: document.querySelector(".seg-fees"),
    costs: document.querySelector(".seg-costs"),
  },
  donutSegsAdv: {
    profit: document.querySelector(".seg-profit-adv"),
    fees: document.querySelector(".seg-fees-adv"),
    costs: document.querySelector(".seg-costs-adv"),
  },
  verdictCard: null,
  verdictTitle: null,
  verdictReason: null,
  resultsStandard: $("resultsStandard"),
  resultsAdvisor: $("resultsAdvisor"),
  advisorStack: $("advisorStack"),
  paywall: $("paywall"),
  advShipping: $("advShipping"),
  advShippingText: $("advShippingText"),
  advMargin: $("advMargin"),
  advMarginText: $("advMarginText"),
  // Summary row
  advNetProfit: $("advNetProfit"),
  advRevenue: $("advRevenue"),
  advFees: $("advFees"),
  advCosts: $("advCosts"),
  advMarginStat: $("advMarginStat"),
  // Verdict hero
  advVerdict: $("advVerdict"),
  advVerdictWord: $("advVerdictWord"),
  advVerdictText: $("advVerdictText"),
  advVerdictTarget: $("advVerdictTarget"),
  // Cards
  advPrices: $("advPrices"),
  priceBreakEven: $("priceBreakEven"),
  price30: $("price30"),
  price40: $("price40"),
  advMargin: $("advMargin"),
  advMarginText: $("advMarginText"),
  advMarginSub: $("advMarginSub"),
  advMarginBar: $("advMarginBar"),
  advWage: $("advWage"),
  advWageText: $("advWageText"),
  advWageLabel: $("advWageLabel"),
  laborMinutes: $("laborMinutes"),
  wageValue: $("wageValue"),
  volumeValue: $("volumeValue"),
  wageVolumeMode: $("wageVolumeMode"),
  wageHourlyMode: $("wageHourlyMode"),
  toHourly: $("toHourly"),
  toVolume: $("toVolume"),
  advAds: $("advAds"),
  advAdsText: $("advAdsText"),
  advAdsSub: $("advAdsSub"),
  tabs: document.querySelectorAll(".tab"),
};

// ---------- Init ----------
function init() {
  // Populate country dropdown
  COUNTRIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    if (c.name === DEFAULT_COUNTRY) opt.selected = true;
    els.country.appendChild(opt);
  });

  // Pro flag via URL (dev/testing only)
  const params = new URLSearchParams(window.location.search);
  if (params.get("pro") === "1") isPro = true;
  updatePaywall();

  // Paywall CTAs — open auth modal
  const paywallCta = document.getElementById("paywallCta");
  if (paywallCta) {
    paywallCta.addEventListener("click", () => {
      if (typeof openAuthModal === "function") openAuthModal("signup");
    });
  }
  const paywallLogin = document.getElementById("paywallLogin");
  if (paywallLogin) {
    paywallLogin.addEventListener("click", () => {
      if (typeof openAuthModal === "function") openAuthModal("login");
    });
  }

  // Tab switching
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      els.tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      if (activeTab === "advisor") {
        els.resultsStandard.hidden = true;
        els.resultsAdvisor.hidden = false;
      } else {
        els.resultsStandard.hidden = false;
        els.resultsAdvisor.hidden = true;
      }
    });
  });

  // Shipping auto-sync
  els.shippingCharged.addEventListener("input", () => {
    if (!shippingCostEdited) {
      els.shippingCost.value = els.shippingCharged.value;
    }
    calculate();
  });

  els.shippingCost.addEventListener("input", () => {
    shippingCostEdited = true;
    calculate();
  });

  // Other inputs
  [els.salePrice, els.costOfItem, els.country, els.advertising].forEach((el) => {
    el.addEventListener("input", calculate);
    el.addEventListener("change", calculate);
  });

  // Labor minutes input (advisor-only)
  if (els.laborMinutes) {
    els.laborMinutes.addEventListener("input", calculate);
  }


  // Wage card mode toggle
  if (els.toHourly) {
    els.toHourly.addEventListener("click", (e) => {
      e.preventDefault();
      wageMode = "hourly";
      applyWageMode();
      calculate();
      setTimeout(() => els.laborMinutes && els.laborMinutes.focus(), 50);
    });
  }
  if (els.toVolume) {
    els.toVolume.addEventListener("click", (e) => {
      e.preventDefault();
      wageMode = "volume";
      applyWageMode();
      calculate();
    });
  }
  applyWageMode();

  calculate();
}

function applyWageMode() {
  if (wageMode === "hourly") {
    els.wageVolumeMode.hidden = true;
    els.wageHourlyMode.hidden = false;
    els.advWageLabel.textContent = "Your Hourly Wage";
  } else {
    els.wageVolumeMode.hidden = false;
    els.wageHourlyMode.hidden = true;
    els.advWageLabel.textContent = "Monthly Goal";
  }
}

// ---------- Core calculation ----------
function calculate() {
  const salePrice = parseFloat(els.salePrice.value);
  const shippingCharged = parseFloat(els.shippingCharged.value);
  const costOfItem = parseFloat(els.costOfItem.value);
  const shippingCost = parseFloat(els.shippingCost.value);
  const countryName = els.country.value;
  const advertising = els.advertising.value;

  const valid =
    !isNaN(salePrice) &&
    !isNaN(shippingCharged) &&
    !isNaN(costOfItem) &&
    !isNaN(shippingCost);

  if (!valid) {
    renderEmpty();
    return;
  }

  const country = COUNTRIES.find((c) => c.name === countryName) || COUNTRIES[0];

  const revenue = salePrice + shippingCharged;
  const listingPlusRenew = 0.40;
  const transaction = 0.065 * revenue;
  const processing = revenue * country.procRate + country.procFixed;
  const regFee = revenue * country.regFee;
  const adsRate =
    advertising === "offsite15" ? 0.15 : advertising === "offsite12" ? 0.12 : 0;
  const ads = revenue * adsRate;

  const feesSubtotal = listingPlusRenew + transaction + processing + regFee + ads;
  const vat = feesSubtotal * (country.vat / 100);
  const totalEtsyFees = feesSubtotal + vat;

  const totalCosts = costOfItem + shippingCost;
  const netProfit = revenue - totalEtsyFees - totalCosts;
  const margin = revenue > 0 ? netProfit / revenue : 0;

  renderStandard({
    revenue,
    totalEtsyFees,
    totalCosts,
    netProfit,
    margin,
  });

  renderAdvisor({
    salePrice,
    shippingCharged,
    shippingCost,
    revenue,
    totalEtsyFees,
    totalCosts,
    netProfit,
    margin,
    costOfItem,
  });
}

// ---------- Render ----------
function fmt(n) {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toFixed(2);
}

function renderEmpty() {
  els.netProfit.textContent = "—";
  els.marginBadge.textContent = "—";
  els.totalFees.textContent = "—";
  els.totalCosts.textContent = "—";
  els.revenue.textContent = "—";
  setDonut(0, 0, 0);
  setDonutAdv(0, 0, 0);
}

function renderStandard({ revenue, totalEtsyFees, totalCosts, netProfit, margin }) {
  els.netProfit.textContent = fmt(netProfit);
  els.netProfit.classList.toggle("negative", netProfit < 0);

  const marginPct = (margin * 100).toFixed(1) + "%";
  els.marginBadge.textContent = marginPct;
  els.marginBadge.classList.remove("amber", "red");
  if (margin < 0.20) els.marginBadge.classList.add("red");
  else if (margin < 0.35) els.marginBadge.classList.add("amber");

  els.totalFees.textContent = fmt(totalEtsyFees);
  els.totalCosts.textContent = fmt(totalCosts);
  els.revenue.textContent = fmt(revenue);

  const profitSlice = Math.max(0, netProfit);
  const total = Math.max(0.01, profitSlice + totalEtsyFees + totalCosts);
  const pProfit = (profitSlice / total) * 100;
  const pFees = (totalEtsyFees / total) * 100;
  const pCosts = (totalCosts / total) * 100;
  setDonut(pProfit, pFees, pCosts);
  setDonutAdv(pProfit, pFees, pCosts);

}

function setDonut(profitPct, feesPct, costsPct) {
  applyDonut(els.donutSegs, profitPct, feesPct, costsPct);
}

function setDonutAdv(profitPct, feesPct, costsPct) {
  applyDonut(els.donutSegsAdv, profitPct, feesPct, costsPct);
}

function applyDonut(segs, profitPct, feesPct, costsPct) {
  if (!segs || !segs.profit) return;
  segs.profit.setAttribute("stroke-dasharray", `${profitPct} ${100 - profitPct}`);
  segs.profit.setAttribute("stroke-dashoffset", "25");
  segs.fees.setAttribute("stroke-dasharray", `${feesPct} ${100 - feesPct}`);
  segs.fees.setAttribute("stroke-dashoffset", `${25 - profitPct}`);
  segs.costs.setAttribute("stroke-dasharray", `${costsPct} ${100 - costsPct}`);
  segs.costs.setAttribute("stroke-dashoffset", `${25 - profitPct - feesPct}`);
}

function verdictFor(netProfit, margin) {
  if (netProfit < 0) {
    return {
      title: "KILL",
      reason: `You lose ${fmt(Math.abs(netProfit))} on every sale.`,
      color: "red",
    };
  }
  if (margin < 0.15) {
    return {
      title: "REPRICE",
      reason: "Margin too thin. Raise price for safety.",
      color: "red",
    };
  }
  if (margin < 0.25) {
    return {
      title: "REPRICE",
      reason: "Healthy enough but limited room for ads.",
      color: "amber",
    };
  }
  if (margin < 0.35) {
    return {
      title: "KEEP",
      reason: "Solid margin. Monitor for ad costs.",
      color: "green",
    };
  }
  return {
    title: "SCALE",
    reason: "Strong margin. Push inventory and ads.",
    color: "green",
  };
}

// ---------- Advisor (redesigned layout) ----------
function renderAdvisor({
  shippingCharged,
  shippingCost,
  revenue,
  totalEtsyFees,
  totalCosts,
  netProfit,
  margin,
  costOfItem,
}) {
  const marginPct = (margin * 100).toFixed(1);

  // Summary row
  els.advNetProfit.textContent = fmt(netProfit);
  els.advNetProfit.classList.toggle("negative", netProfit < 0);
  els.advRevenue.textContent = fmt(revenue);
  els.advFees.textContent = fmt(totalEtsyFees);
  els.advCosts.textContent = fmt(totalCosts);
  els.advMarginStat.textContent = marginPct + "%";
  els.advMarginStat.classList.remove("amber", "red");
  if (margin < 0.20) els.advMarginStat.classList.add("red");
  else if (margin < 0.35) els.advMarginStat.classList.add("amber");

  // Target prices (used in multiple places)
  const breakEven = solveBreakEven({ shippingCharged, shippingCost, costOfItem });
  const p30 = solveForMargin(0.30, { shippingCharged, shippingCost, costOfItem });
  const p40 = solveForMargin(0.40, { shippingCharged, shippingCost, costOfItem });
  els.priceBreakEven.textContent = fmt(breakEven);
  els.price30.textContent = fmt(p30);
  els.price40.textContent = fmt(p40);

  // --- Verdict hero ---
  const v = verdictFor(netProfit, margin);
  els.advVerdictWord.textContent = capitalize(v.title);
  els.advVerdict.classList.remove("green", "amber", "red");
  if (v.color) els.advVerdict.classList.add(v.color);

  // Reason text with shipping context
  let reason = v.reason;
  if (shippingCost > shippingCharged) {
    reason += ` You also lose ${fmt(shippingCost - shippingCharged)} on shipping.`;
  } else if (netProfit > 0 && margin >= 0.25) {
    // augment positive verdict with ship context if notable
    if (shippingCharged > shippingCost * 1.5 && shippingCost > 0) {
      reason += ` Shipping earns you extra.`;
    }
  }
  els.advVerdictText.textContent = reason;

  // Verdict target (30% margin price)
  els.advVerdictTarget.textContent = fmt(p30);

  // --- Margin card ---
  let marginMain, marginSub, marginClass, barWidth, barClass;
  if (netProfit < 0) {
    marginMain = `${marginPct}% — losing money`;
    marginSub = `Break-even at ${fmt(breakEven)}`;
    marginClass = "red";
    barWidth = 0;
    barClass = "red";
  } else if (margin < 0.15) {
    marginMain = `${marginPct}% — too thin`;
    marginSub = `Need ${fmt(p30)} to hit 30%`;
    marginClass = "red";
    barWidth = (margin / 0.50) * 100;
    barClass = "red";
  } else if (margin < 0.25) {
    marginMain = `${marginPct}% — thin`;
    marginSub = `Target ${fmt(p30)} for 30%`;
    marginClass = "amber";
    barWidth = (margin / 0.50) * 100;
    barClass = "";
  } else if (margin >= 0.35) {
    marginMain = `${marginPct}% — strong`;
    marginSub = "Room for ads and discounts";
    marginClass = "green";
    barWidth = Math.min((margin / 0.50) * 100, 100);
    barClass = "green";
  } else {
    marginMain = `${marginPct}% — healthy`;
    marginSub = "Monitor for ad impact";
    marginClass = "";
    barWidth = (margin / 0.50) * 100;
    barClass = "";
  }
  els.advMarginText.textContent = marginMain;
  els.advMarginText.className = "card-main " + marginClass;
  els.advMarginSub.textContent = marginSub;
  els.advMarginBar.style.width = Math.max(0, Math.min(barWidth, 100)) + "%";
  els.advMarginBar.className = "margin-bar-fill " + barClass;

  // --- Monthly Goal / Hourly Wage ---
  renderWage({ netProfit });

  // --- Offsite Ads Risk ---
  renderAdsRisk({ shippingCharged, shippingCost, costOfItem, netProfit, revenue });
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function renderWage({ netProfit }) {
  if (wageMode === "hourly") {
    const mins = parseFloat(els.laborMinutes.value);
    if (!mins || mins <= 0 || !isFinite(netProfit)) {
      els.wageValue.textContent = "—";
      els.wageValue.className = "card-main";
      els.advWageText.textContent = "Enter minutes per item.";
      return;
    }
    const wage = netProfit / (mins / 60);
    els.wageValue.textContent = fmt(wage) + "/hr";
    if (wage < 7.25) {
      els.wageValue.className = "card-main red";
      els.advWageText.textContent = "Below US minimum wage.";
    } else if (wage < 15) {
      els.wageValue.className = "card-main amber";
      els.advWageText.textContent = "Worse than freelancing.";
    } else if (wage < 30) {
      els.wageValue.className = "card-main green";
      els.advWageText.textContent = "Solid. Skilled contractor rate.";
    } else {
      els.wageValue.className = "card-main green";
      els.advWageText.textContent = "Your time is well-valued.";
    }
  } else {
    if (!isFinite(netProfit) || netProfit <= 0) {
      els.volumeValue.textContent = "—";
      els.volumeValue.className = "card-main red";
      return;
    }
    const salesNeeded = Math.ceil(500 / netProfit);
    els.volumeValue.textContent = `${salesNeeded} sales → $500/mo`;
    if (salesNeeded > 150) {
      els.volumeValue.className = "card-main red";
    } else if (salesNeeded > 50) {
      els.volumeValue.className = "card-main amber";
    } else {
      els.volumeValue.className = "card-main";
    }
  }
}

function renderAdsRisk({ shippingCharged, shippingCost, costOfItem, netProfit, revenue }) {
  // Simulate 15% offsite ads: recompute with adsRate = 0.15
  const country = COUNTRIES.find((c) => c.name === els.country.value) || COUNTRIES[0];
  const simAds = revenue * 0.15;
  const feesWithAds =
    0.40 +
    0.065 * revenue +
    revenue * country.procRate +
    country.procFixed +
    revenue * country.regFee +
    simAds;
  const totalFeesWithAds = feesWithAds * (1 + country.vat / 100);
  const profitWithAds = revenue - totalFeesWithAds - (costOfItem + shippingCost);
  const marginWithAds = revenue > 0 ? profitWithAds / revenue : 0;
  const marginWithAdsPct = (marginWithAds * 100).toFixed(1);

  if (profitWithAds < 0) {
    els.advAdsText.textContent = `Lose ${fmt(Math.abs(profitWithAds))}/order`;
    els.advAdsText.className = "card-main red";
    els.advAdsSub.textContent = "Raise price before enabling ads.";
  } else if (marginWithAds < 0.10) {
    els.advAdsText.textContent = `Margin drops to ${marginWithAdsPct}%`;
    els.advAdsText.className = "card-main amber";
    els.advAdsSub.textContent = "Razor thin with ads enabled.";
  } else {
    els.advAdsText.textContent = `Safe — ${marginWithAdsPct}% with ads`;
    els.advAdsText.className = "card-main green";
    els.advAdsSub.textContent = "Margin stays healthy.";
  }
}

function setCard(card, textEl, text, color) {
  card.classList.remove("green", "amber", "red");
  if (color) card.classList.add(color);
  if (textEl && text !== null && text !== undefined) {
    textEl.textContent = text;
  }
}

// Given shipping + costs, find sale price where profit = 0 (using current country + ads)
function solveBreakEven(inputs) {
  return solveForMargin(0, inputs);
}

// Binary search: find salePrice such that margin >= target
function solveForMargin(targetMargin, { shippingCharged, shippingCost, costOfItem }) {
  const country = COUNTRIES.find((c) => c.name === els.country.value) || COUNTRIES[0];
  const advertising = els.advertising.value;
  const adsRate =
    advertising === "offsite15" ? 0.15 : advertising === "offsite12" ? 0.12 : 0;

  const profitAt = (salePrice) => {
    const revenue = salePrice + shippingCharged;
    const fees =
      0.40 +
      0.065 * revenue +
      revenue * country.procRate +
      country.procFixed +
      revenue * country.regFee +
      revenue * adsRate;
    const totalFees = fees * (1 + country.vat / 100);
    const net = revenue - totalFees - (costOfItem + shippingCost);
    return { net, revenue };
  };

  let lo = 0.01;
  let hi = 10000;
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
}

// ---------- Go ----------
document.addEventListener("DOMContentLoaded", init);
