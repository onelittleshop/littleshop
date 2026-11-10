// ==================== [模組：Config & State] ====================
const SUPABASE_URL = 'https://bauxsxftvkdqstjzfpvv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6OSI70WFyr6v9wFV9FM4Kw_G_4I8rt8';

const isConfigured = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;
const sb = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;
let auctions = [];
let userMessages = [];
let siteCategories = []; 
let currentView = 'all';
let currentCategory = '全部';
let currentSort = 'latest'; 
let currentLayout = 'grid'; 
let activeDetailAuctionId = null;
let selectedFilesArray = []; 
let tempAvatarBase64 = '';

function getGuestSession() {
  let sessionId = localStorage.getItem('guest_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('guest_session_id', sessionId);
  }
  return sessionId;
}


// ==================== [初始化入口] ==================== 
async function initApp() {
  if (!isConfigured) return;
  
  await logActivity('home');
  await fetchCategories(); 

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await loadUserProfile(session.user);
      await fetchUserMessages();
    } else {
      currentUser = null;
      userMessages = [];
      updateAuthUI();
    }
    await fetchAuctions();
  });

  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await loadUserProfile(session.user);
    await fetchUserMessages();
  }
  await fetchAuctions();
}
