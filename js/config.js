// ==================== [模塊：Config & Globals] ====================
const SUPABASE_URL = 'https://bauxsxftvkdqstjzfpvv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6OSI70WFyr6v9wFV9FM4Kw_G_4I8rt8';

let sb = null;
try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error('Supabase 初始化失敗:', e);
}

let currentUser = null;
let auctions = [];
let categoriesData = [];
let currentView = 'all';
let currentCategory = 'all';
let currentSubCategory = 'all';
let currentLayout = 'grid';
let userMessages = [];
let tempAvatarBase64 = '';
