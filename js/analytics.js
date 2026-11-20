// ==================== [模塊：Analytics Pro & 營運數據中心] ====================
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/ipad|tablet|playbook|silk/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getGuestSession() {
  let session = localStorage.getItem('guest_session');
  if (!session) {
    session = 'gs_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guest_session', session);
  }
  return session;
}

function getTrafficSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromParam = (params.get('from') || params.get('utm_source') || '').trim().toLowerCase();
    if (fromParam) {
      sessionStorage.setItem('traffic_source', fromParam);
      return fromParam;
    }
    const saved = sessionStorage.getItem('traffic_source');
    if (saved) return saved;

    const ref = (document.referrer || '').toLowerCase();
    let detected = 'direct';
    if (ref.includes('instagram.com') || ref.includes('l.instagram.com')) detected = 'ig';
    else if (ref.includes('threads.net') || ref.includes('threads.com')) detected = 'threads';
    else if (ref.includes('carousell')) detected = 'carousell';
    else if (ref.includes('facebook.com') || ref.includes('fb.com')) detected = 'fb';
    else if (ref.includes('whatsapp')) detected = 'whatsapp';
    else if (ref.includes('google.')) detected = 'google';
    else if (ref && !ref.includes(window.location.hostname)) {
      try { detected = new URL(ref).hostname.replace('www.', ''); } catch (e) { detected = 'other'; }
    }
    sessionStorage.setItem('traffic_source', detected);
    return detected;
  } catch (e) {
    return 'direct';
  }
}

async function logActivity(pageType, targetId = null) {
  if (!sb) return;
  const device = getDeviceType();
  const session = getGuestSession();
  const source = getTrafficSource();
  const userId = currentUser ? currentUser.id : null;
  const userEmail = currentUser ? (currentUser.email || null) : null;
  const userName = currentUser ? (currentUser.fullName || currentUser.nickname || null) : null;
  const isAdmin = currentUser ? Boolean(currentUser.isAdmin) : false;
  
  let itemTitle = null;
  if (targetId && auctions) {
    const item = auctions.find(a => a.id === targetId);
    if (item) itemTitle = item.title;
  }

  try {
    const payload = {
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      is_admin: isAdmin,
      guest_session: session,
      device_type: device,
      page_type: pageType,
      target_id: targetId,
      title: itemTitle,
      referrer: source
    };
    const { error } = await sb.from('activity_logs').insert([payload]);
    if (error) {
      console.warn('activity_logs 寫入提醒:', error.message);
    }
  } catch (err) {
    console.warn('Analytics log error:', err);
  }
}

function getVisitorKey(log) {
  return log.user_id ? ('u_' + log.user_id) : ('g_' + (log.guest_session || log.id));
}

function getHKDateString(isoStr) {
  try {
    return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
  } catch (e) {
    return '';
  }
}

async function updateAdminStatsUI() {
  if (!currentUser?.isAdmin || !sb) return;
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
    const startOfDayHK = `${todayStr}T00:00:00+08:00`;

    const { data: todayLogs, error } = await sb
      .from('activity_logs')
      .select('user_id, guest_session, device_type, page_type, is_admin')
      .gte('created_at', startOfDayHK);

    const visitEl = document.getElementById('adminVisitCount');
    const devEl = document.getElementById('adminDeviceStats');

    if (!error && todayLogs) {
      // 預設過濾管理員自己
      const realLogs = todayLogs.filter(l => !l.is_admin);
      const uniqueVisitors = new Map();
      realLogs.forEach(l => {
        const key = getVisitorKey(l);
        if (!uniqueVisitors.has(key)) {
          uniqueVisitors.set(key, (l.device_type || 'desktop').toLowerCase());
        }
      });

      const uv = uniqueVisitors.size;
      const pv = realLogs.length;

      if (visitEl) {
        visitEl.textContent = `${uv} 人 (${pv} 次)`;
      }

      if (devEl) {
        let mobile = 0, tablet = 0, desktop = 0;
        uniqueVisitors.forEach(dt => {
          if (dt === 'mobile') mobile++;
          else if (dt === 'tablet') tablet++;
          else desktop++;
        });
        devEl.textContent = `今日獨立訪客設備分佈 ➔ 手機: ${mobile} ｜ 平板: ${tablet} ｜ 電腦: ${desktop}`;
      }
    }
  } catch (err) {
    console.warn('更新管理員統計失敗:', err);
  }
}

// ==================== [數據中心 Modal 狀態與渲染] ====================
let cachedAnalyticsLogs = [];
let currentStatsTab = 'logs';

async function openStatsModal() {
  if (!currentUser?.isAdmin || !sb) return;
  document.getElementById('statsModal').classList.remove('hidden');
  const container = document.getElementById('statsListContainer');
  container.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i>正在載入歷年營運數據...</div>';

  const { data, error } = await sb
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error || !data) {
    container.innerHTML = '<div class="text-center py-8 text-rose-500 text-xs">載入失敗：' + (error?.message || '') + '</div>';
    return;
  }

  cachedAnalyticsLogs = data;
  switchStatsTab(currentStatsTab);
}

function switchStatsTab(tab) {
  currentStatsTab = tab;
  const activeCls = 'px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-white shadow-sm transition';
  const inactiveCls = 'px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';

  document.getElementById('statsTabLogs').className = tab === 'logs' ? activeCls : inactiveCls;
  document.getElementById('statsTabItems').className = tab === 'items' ? activeCls : inactiveCls;
  document.getElementById('statsTabDaily').className = tab === 'daily' ? activeCls : inactiveCls;
  document.getElementById('statsTabSources').className = tab === 'sources' ? activeCls : inactiveCls;

  const filterBar = document.getElementById('statsLogsFilterBar');
  if (filterBar) {
    if (tab === 'logs') filterBar.classList.remove('hidden');
    else filterBar.classList.add('hidden');
  }

  renderStatsDashboard();
}

function renderStatsDashboard() {
  const hideAdmin = document.getElementById('statsHideAdminChk')?.checked ?? true;
  const baseLogs = hideAdmin ? cachedAnalyticsLogs.filter(l => !l.is_admin) : cachedAnalyticsLogs;

  // 計算整體 KPI
  const uvSet = new Set();
  const loggedInSet = new Set();
  let bidCount = 0;
  baseLogs.forEach(l => {
    uvSet.add(getVisitorKey(l));
    if (l.user_id) loggedInSet.add(l.user_id);
    if (l.page_type === 'place_bid') bidCount++;
  });

  const subtitle = document.getElementById('statsSummarySubtitle');
  if (subtitle) {
    subtitle.textContent = `共載入 ${baseLogs.length} 筆紀錄${hideAdmin ? '（已自動排除管理員）' : '（含管理員）'}`;
  }

  const kpiBar = document.getElementById('statsKpiBar');
  if (kpiBar) {
    kpiBar.innerHTML = `
      <div class="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
        <div class="text-[10px] font-bold text-amber-800">獨立訪客 (UV)</div>
        <div class="text-lg font-extrabold text-amber-600">${uvSet.size}</div>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
        <div class="text-[10px] font-bold text-slate-600">總瀏覽行為 (PV)</div>
        <div class="text-lg font-extrabold text-slate-800">${baseLogs.length}</div>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
        <div class="text-[10px] font-bold text-emerald-800">已登入買家數</div>
        <div class="text-lg font-extrabold text-emerald-600">${loggedInSet.size}</div>
      </div>
      <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-center">
        <div class="text-[10px] font-bold text-indigo-800">紀錄出價次數</div>
        <div class="text-lg font-extrabold text-indigo-600">${bidCount}</div>
      </div>
    `;
  }

  const container = document.getElementById('statsListContainer');
  if (!container) return;

  if (currentStatsTab === 'logs') renderStatsLogsTab(container, baseLogs);
  else if (currentStatsTab === 'items') renderStatsItemsTab(container, baseLogs);
  else if (currentStatsTab === 'daily') renderStatsDailyTab(container, baseLogs);
  else if (currentStatsTab === 'sources') renderStatsSourcesTab(container, baseLogs);
}

function getPageTypeBadge(pageType) {
  const map = {
    'home': ['主頁', 'bg-slate-200 text-slate-700'],
    'auction_detail': ['看商品', 'bg-amber-100 text-amber-800'],
    'place_bid': ['出價', 'bg-emerald-100 text-emerald-800'],
    'messages_view': ['開訊息', 'bg-indigo-100 text-indigo-800']
  };
  const [label, cls] = map[pageType] || [pageType || '瀏覽', 'bg-slate-100 text-slate-600'];
  return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}">${label}</span>`;
}

function renderStatsLogsTab(container, baseLogs) {
  const dateFilter = document.getElementById('statsDateFilter')?.value || 'all';
  const typeFilter = document.getElementById('statsTypeFilter')?.value || 'all';
  const keyword = (document.getElementById('statsSearchInput')?.value || '').trim().toLowerCase();

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
  const sevenDaysAgoMs = Date.now() - 7 * 86400000;

  const filtered = baseLogs.filter(l => {
    if (dateFilter === 'today' && getHKDateString(l.created_at) !== todayStr) return false;
    if (dateFilter === '7d' && new Date(l.created_at).getTime() < sevenDaysAgoMs) return false;

    if (typeFilter === 'logged_in' && !l.user_id) return false;
    if (typeFilter === 'auction_detail' && l.page_type !== 'auction_detail') return false;
    if (typeFilter === 'place_bid' && l.page_type !== 'place_bid') return false;

    if (keyword) {
      const hay = `${l.user_name || ''} ${l.user_email || ''} ${l.title || ''} ${l.referrer || ''}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">沒有符合條件的瀏覽紀錄</div>';
    return;
  }

  const displayList = filtered.slice(0, 200);
  container.innerHTML = displayList.map(log => {
    const isLoggedIn = Boolean(log.user_id);
    const userDisplay = isLoggedIn
      ? `<span class="font-bold text-emerald-700"><i class="fa-solid fa-user-check mr-1"></i>${log.user_name || '已登入用戶'}</span>${log.user_email ? ` <span class="text-slate-500 font-mono text-[10px]">(${log.user_email})</span>` : ''}`
      : `<span class="text-slate-500"><i class="fa-regular fa-user mr-1"></i>訪客 <span class="font-mono text-[10px]">${(log.guest_session || '').slice(-6)}</span></span>`;

    const adminTag = log.is_admin ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold">管理員</span>` : '';
    const sourceTag = log.referrer && log.referrer !== 'direct'
      ? `<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">來源: ${log.referrer}</span>`
      : '';

    return `
      <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            ${getPageTypeBadge(log.page_type)}
            ${log.title ? `<span class="font-bold text-slate-900 truncate max-w-[260px]">${log.title}</span>` : ''}
            ${sourceTag}
          </div>
          <div class="mt-1 truncate">${userDisplay}${adminTag}</div>
        </div>
        <div class="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">${log.device_type || 'desktop'}</span>
          <span class="text-[10px] text-slate-400">${new Date(log.created_at).toLocaleString('zh-HK', { hour12: false })}</span>
        </div>
      </div>
    `;
  }).join('') + (filtered.length > 200 ? `<div class="text-center py-2 text-[11px] text-slate-400">僅顯示最新 200 筆（共 ${filtered.length} 筆）</div>` : '');
}

function renderStatsItemsTab(container, baseLogs) {
  const itemStats = {};
  baseLogs.forEach(l => {
    if (l.page_type !== 'auction_detail' || !l.target_id) return;
    if (!itemStats[l.target_id]) {
      itemStats[l.target_id] = { id: l.target_id, title: l.title || '未知商品', pv: 0, uvSet: new Set() };
    }
    itemStats[l.target_id].pv++;
    itemStats[l.target_id].uvSet.add(getVisitorKey(l));
  });

  const ranked = Object.values(itemStats).map(st => {
    const auc = auctions.find(a => a.id === st.id);
    return {
      id: st.id,
      title: auc?.title || st.title,
      img: auc?.images?.[0] || './logo.png',
      pv: st.pv,
      uv: st.uvSet.size,
      bidCount: auc?.bids?.length || 0,
      price: auc ? (auc.bids.length > 0 ? auc.currentPrice : auc.startPrice) : 0,
      exists: Boolean(auc)
    };
  }).sort((a, b) => b.uv - a.uv || b.pv - a.pv);

  if (ranked.length === 0) {
    container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">暫無商品瀏覽數據</div>';
    return;
  }

  container.innerHTML = ranked.map((item, idx) => {
    const isZeroBidAlert = item.uv >= 3 && item.bidCount === 0;
    return `
      <div ${item.exists ? `onclick="document.getElementById('statsModal').classList.add('hidden'); openDetailModal('${item.id}')"` : ''} class="bg-white border ${isZeroBidAlert ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-xl p-3 flex items-center justify-between gap-3 text-xs ${item.exists ? 'cursor-pointer hover:shadow-sm transition' : ''}">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-6 h-6 rounded-full ${idx < 3 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'} font-bold text-[11px] flex items-center justify-center shrink-0">${idx + 1}</span>
          <img src="${item.img}" onerror="this.src='./logo.png'" class="w-11 h-11 rounded-lg object-contain bg-slate-100 shrink-0 border border-slate-100">
          <div class="min-w-0">
            <div class="font-bold text-slate-900 truncate">${item.title}</div>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="text-slate-500">出價：<strong>${item.bidCount}</strong> 口 ($${item.price})</span>
              ${isZeroBidAlert ? '<span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">⚠️ 高瀏覽零出價</span>' : ''}
            </div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-sm font-extrabold text-amber-600">${item.uv} 人看過</div>
          <div class="text-[10px] text-slate-400">共 ${item.pv} 次點擊</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStatsDailyTab(container, baseLogs) {
  const daily = {};
  baseLogs.forEach(l => {
    const d = getHKDateString(l.created_at);
    if (!d) return;
    if (!daily[d]) daily[d] = { date: d, uvSet: new Set(), loggedInSet: new Set(), pv: 0, bids: 0 };
    daily[d].pv++;
    daily[d].uvSet.add(getVisitorKey(l));
    if (l.user_id) daily[d].loggedInSet.add(l.user_id);
    if (l.page_type === 'place_bid') daily[d].bids++;
  });

  const rows = Object.values(daily).sort((a, b) => b.date.localeCompare(a.date));
  if (rows.length === 0) {
    container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">暫無每日趨勢數據</div>';
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="bg-slate-100 text-slate-600 border-b border-slate-200">
            <th class="py-2 px-3 rounded-tl-lg">日期 (HKT)</th>
            <th class="py-2 px-3 text-right">獨立訪客 (UV)</th>
            <th class="py-2 px-3 text-right">已登入人數</th>
            <th class="py-2 px-3 text-right">總瀏覽 (PV)</th>
            <th class="py-2 px-3 text-right rounded-tr-lg">出價次數</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map(r => `
            <tr class="hover:bg-slate-50">
              <td class="py-2.5 px-3 font-bold text-slate-800 font-mono">${r.date}</td>
              <td class="py-2.5 px-3 text-right font-extrabold text-amber-600">${r.uvSet.size}</td>
              <td class="py-2.5 px-3 text-right font-bold text-emerald-600">${r.loggedInSet.size}</td>
              <td class="py-2.5 px-3 text-right text-slate-700">${r.pv}</td>
              <td class="py-2.5 px-3 text-right font-bold text-indigo-600">${r.bids}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderStatsSourcesTab(container, baseLogs) {
  const sources = {};
  baseLogs.forEach(l => {
    const src = (l.referrer || 'direct').toLowerCase();
    if (!sources[src]) sources[src] = { source: src, uvSet: new Set(), loggedInSet: new Set(), pv: 0, bids: 0 };
    sources[src].pv++;
    sources[src].uvSet.add(getVisitorKey(l));
    if (l.user_id) sources[src].loggedInSet.add(l.user_id);
    if (l.page_type === 'place_bid') sources[src].bids++;
  });

  const rows = Object.values(sources).sort((a, b) => b.uvSet.size - a.uvSet.size);
  const baseUrl = window.location.origin + window.location.pathname;

  container.innerHTML = `
    <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-3 mb-3 text-[11px] text-amber-900">
      <div class="font-bold mb-1"><i class="fa-solid fa-bullhorn mr-1"></i>推廣追蹤專屬連結用法：</div>
      <div class="space-y-0.5 font-mono text-[10px] text-amber-800 break-all">
        <div>• IG 宣傳：${baseUrl}?from=ig</div>
        <div>• Threads 宣傳：${baseUrl}?from=threads</div>
        <div>• Carousell 宣傳：${baseUrl}?from=carousell</div>
      </div>
    </div>
    ${rows.length === 0 ? '<div class="text-center py-6 text-slate-400 text-xs">暫無來源數據</div>' : `
      <div class="space-y-2">
        ${rows.map(r => `
          <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold uppercase">${r.source}</span>
              <span class="text-slate-500">已登入 <strong>${r.loggedInSet.size}</strong> 人 ｜ 出價 <strong>${r.bids}</strong> 次</span>
            </div>
            <div class="text-right">
              <span class="font-extrabold text-amber-600 text-sm">${r.uvSet.size} 訪客</span>
              <span class="text-[10px] text-slate-400 block">${r.pv} 次瀏覽</span>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
