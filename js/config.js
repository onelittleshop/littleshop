
// ==================== [模塊：Config & Globals] ====================
const SUPABASE_URL = 'https://bauxsxftvkdqstjzfpvv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdXN4ZnR2a2Rxc3RqemZwdnYiLCJyb2xlIjoiYW5vbiIsImlhd2F0ZSI6KzE3NzA5NzAxMzgsImV4cCI6MjA4NjU0NjEzOH0.HhX7g6H0Hx7g6H0Hx7g6H0Hx7g6H0Hx7g6H0Hx7g6H0'; // Will be replaced/configured by user

let sb = null;
try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error('Supabase 初始化失敗:', e);
}

let currentUser = null;
let auctions = [];
let currentView = 'all';
let currentCategory = 'all';
let currentLayout = 'grid';
let userMessages = [];
let tempAvatarBase64 = '';
