// ===== Etsy Calculator — Auth (shared Supabase project with PlainFinancials) =====

const SUPABASE_URL = 'https://yshqwuxfcxirqaolnfve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaHF3dXhmY3hpcnFhb2xuZnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTI3MTMsImV4cCI6MjA4MDQ4ODcxM30.psrwfVzTtx5VTANYrTlyt7CUW87MEqccHx3HAh6vpu4';

const ADMIN_EMAILS = ['tayseermbabiker@gmail.com', 'zahraamohd1@yahoo.com'];

let sbClient = null;
function sb() {
  if (!sbClient && typeof supabase !== 'undefined') {
    sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sbClient;
}

// ===== State =====
let authUser = null;

async function loadSession() {
  const client = sb();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  authUser = session?.user || null;
  return authUser;
}

// During beta: any logged-in user gets Pro.
// Admins always Pro. Later: check profiles.etsy_plan.
function userHasPro(user) {
  if (!user) return false;
  return true; // beta mode — everyone who signs up gets Advisor
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
    ? 'Unlock the Advisor — $3.99/mo or $36/yr'
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
  closeAuthModal();
  onAuthChanged();
}

// ===== Header auth UI =====
function renderAuthUI() {
  const slot = document.getElementById('authSlot');
  if (!slot) return;

  if (authUser) {
    const email = authUser.email || '';
    slot.innerHTML = `
      <span class="auth-email" title="${email}">${email}</span>
      <button class="auth-link" id="logoutBtn">Log out</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await signOutUser();
      onAuthChanged();
    });
  } else {
    slot.innerHTML = `
      <button class="auth-link" id="loginBtn">Log in</button>
    `;
    document.getElementById('loginBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

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
    client.auth.onAuthStateChange((_event, session) => {
      authUser = session?.user || null;
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
