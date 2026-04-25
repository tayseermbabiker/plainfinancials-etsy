// ===== Etsy Calculator — Auth (shared Supabase project with PlainFinancials) =====

const SUPABASE_URL = 'https://yshqwuxfcxirqaolnfve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaHF3dXhmY3hpcnFhb2xuZnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTI3MTMsImV4cCI6MjA4MDQ4ODcxM30.psrwfVzTtx5VTANYrTlyt7CUW87MEqccHx3HAh6vpu4';

const ADMIN_EMAILS = ['tayseermbabiker@gmail.com', 'zahraamohd1@yahoo.com', 'totta1785@gmail.com'];

let sbClient = null;
function sb() {
  if (!sbClient && typeof supabase !== 'undefined') {
    sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sbClient;
}

// ===== State =====
let authUser = null;
let authProfile = null; // { etsy_plan, etsy_expires_at, ... }

async function loadSession() {
  const client = sb();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  authUser = session?.user || null;
  authProfile = null;
  if (authUser) {
    await loadProfile();
  }
  return authUser;
}

async function loadProfile() {
  const client = sb();
  if (!client || !authUser) { authProfile = null; return; }
  const { data, error } = await client
    .from("profiles")
    .select("etsy_plan, etsy_expires_at, email")
    .eq("id", authUser.id)
    .single();
  if (error) {
    console.warn("loadProfile error:", error.message);
    authProfile = null;
    return;
  }
  authProfile = data;
}

// True if user has an active paid Advisor plan (or is admin).
function userHasPro(user) {
  if (!user) return false;
  if (ADMIN_EMAILS.includes((user.email || "").toLowerCase())) return true;
  if (!authProfile) return false;
  if (authProfile.etsy_plan !== "pro") return false;
  // If expiry is set and in the past, they're no longer Pro
  if (authProfile.etsy_expires_at) {
    const exp = new Date(authProfile.etsy_expires_at).getTime();
    if (exp < Date.now()) return false;
  }
  return true;
}

async function signUpUser(email, password, fullName) {
  const client = sb();
  if (!client) return { error: { message: 'Auth unavailable' } };

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } },
    });

    if (!error && data.user) {
      // Create/update profile row (matches PlainFinancials schema)
      try {
        await client.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName || '',
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (pe) {
        console.warn('profile upsert failed (non-fatal):', pe);
      }
    }

    return { data, error };
  } catch (e) {
    console.error('signUp threw:', e);
    return { error: { message: (e && e.message) || 'Network error. Check your connection or ad blocker.' } };
  }
}

async function signInUser(email, password) {
  const client = sb();
  if (!client) return { error: { message: 'Auth unavailable' } };
  try {
    return await client.auth.signInWithPassword({ email, password });
  } catch (e) {
    console.error('signIn threw:', e);
    return { error: { message: (e && e.message) || 'Network error. Check your connection or ad blocker.' } };
  }
}

async function signOutUser() {
  const client = sb();
  if (!client) return;
  await client.auth.signOut();
  authUser = null;
}

// ===== Modal UI =====

function openAuthModal(mode = 'signup') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  setAuthMode(mode);
  document.getElementById('authError').textContent = '';
  modal.hidden = false;
  setTimeout(() => {
    const first = modal.querySelector('input');
    if (first) first.focus();
  }, 50);
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.hidden = true;
}

function setAuthMode(mode) {
  const isSignup = mode === 'signup';
  document.getElementById('authTitle').textContent = isSignup ? 'Create your account' : 'Log in';
  document.getElementById('authSub').textContent = isSignup
    ? 'Unlock the Advisor — $3.99/mo or $29/yr'
    : 'Welcome back';
  document.getElementById('authSubmit').textContent = isSignup ? 'Create account' : 'Log in';
  document.getElementById('nameField').hidden = !isSignup;
  document.getElementById('authToggleText').textContent = isSignup
    ? 'Already have an account?'
    : "Don't have an account?";
  document.getElementById('authToggleBtn').textContent = isSignup ? 'Log in' : 'Sign up';
  document.getElementById('authModal').dataset.mode = mode;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('authModal').dataset.mode;
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();
  const errEl = document.getElementById('authError');
  const btn = document.getElementById('authSubmit');

  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Please wait…';

  let result;
  if (mode === 'signup') {
    result = await signUpUser(email, password, name);
  } else {
    result = await signInUser(email, password);
  }

  btn.disabled = false;
  btn.textContent = mode === 'signup' ? 'Create account' : 'Log in';

  if (result.error) {
    errEl.textContent = result.error.message || 'Something went wrong.';
    return;
  }

  authUser = result.data?.user || null;
  if (authUser) await loadProfile();
  closeAuthModal();
  onAuthChanged();
}

// ===== Header auth UI =====
const LS_BILLING_PORTAL = 'https://plainfinancials.lemonsqueezy.com/billing';

function renderAuthUI() {
  const slot = document.getElementById('authSlot');
  if (!slot) return;

  if (authUser) {
    const email = authUser.email || '';
    // Only show "Manage" for real subscribers (admins with auto-pro via ADMIN_EMAILS won't have a subscription to manage)
    const hasSubscription = authProfile && authProfile.etsy_plan === 'pro' && !ADMIN_EMAILS.includes(email.toLowerCase());
    slot.innerHTML = `
      <span class="auth-email" title="${email}">${email}</span>
      ${hasSubscription ? `<a class="auth-link" href="${LS_BILLING_PORTAL}" target="_blank" rel="noopener">Manage</a>` : ''}
      <button class="auth-link" id="logoutBtn" type="button">Log out</button>
    `;
  } else {
    slot.innerHTML = `
      <button class="auth-link" id="loginBtn" type="button">Log in</button>
    `;
  }
}

// Delegated click handling — works regardless of re-renders, and survives
// tracking-prevention quirks (Edge/Brave) that can break direct listeners.
document.addEventListener('click', async (e) => {
  const target = e.target;
  if (!target) return;
  if (target.closest && target.closest('#logoutBtn')) {
    e.preventDefault();
    try { await signOutUser(); } catch (err) { console.error('signOut error:', err); }
    // Force a clean state even if Supabase storage access was blocked
    authUser = null;
    authProfile = null;
    // Clear any residual Supabase localStorage keys so a refresh doesn't restore the session
    try {
      Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); });
    } catch (err) { /* ignore — tracking-prevention blocks this in some browsers */ }
    window.location.reload();
  } else if (target.closest && target.closest('#loginBtn')) {
    e.preventDefault();
    if (typeof openAuthModal === 'function') openAuthModal('login');
  }
});

// Called on initial load + after auth changes
function onAuthChanged() {
  renderAuthUI();
  if (typeof updatePaywall === 'function') updatePaywall();
}

async function initAuth() {
  await loadSession();
  renderAuthUI();

  // Listen for auth state changes (e.g. other tabs)
  const client = sb();
  if (client) {
    client.auth.onAuthStateChange(async (_event, session) => {
      authUser = session?.user || null;
      authProfile = null;
      if (authUser) await loadProfile();
      onAuthChanged();
    });
  }

  // Wire modal events
  const form = document.getElementById('authForm');
  if (form) form.addEventListener('submit', handleAuthSubmit);

  const closeBtn = document.getElementById('authClose');
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);

  const toggleBtn = document.getElementById('authToggleBtn');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const current = document.getElementById('authModal').dataset.mode;
    setAuthMode(current === 'signup' ? 'login' : 'signup');
    document.getElementById('authError').textContent = '';
  });

  // Close on backdrop click
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAuthModal();
    });
  }
}

document.addEventListener('DOMContentLoaded', initAuth);
