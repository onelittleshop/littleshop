// ==================== [模塊：Analytics] ====================
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

async function logActivity(target, auctionId = null) {
  if (!sb) return;
  const device = getDeviceType();
  try {
    const { error } = await sb.rpc('log_activity', {
      p_user_id: currentUser?.id || null,
      p_device_type: device,
      p_target: target,
      p_auction_id: auctionId
    });
    if (error) {
      await sb.from('activity_logs').insert([{
        user_id: currentUser?.id || null,
        device_type: device,
        target: target,
        auction_id: auctionId
      }]);
    }
  } catch (err) {
    console.warn('記錄流量異常:', err);
  }
}

async function updateAdminStatsUI() {
  if (!currentUser?.isAdmin || !sb) return;
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });

    const { data: visitData } = await sb
      .from('daily_visits')
      .select('visit_count')
      .eq('visit_date', todayStr)
      .maybeSingle();

    const visitEl = document.getElementById('adminVisitCount');
    if (visitEl) {
      visitEl.textContent = visitData ? visitData.visit_count : 0;
    }

    const { data: devData } = await sb
      .from('homepage_device_stats')
      .select('*')
      .eq('stat_date', todayStr)
      .maybeSingle();

    const devEl = document.getElementById('adminDeviceStats');
    if (devEl) {
      if (devData) {
        devEl.textContent = `今日設備分佈 ➔ 手機: ${devData.mobile_count || 0} ｜ 平板: ${devData.tablet_count || 0} ｜ 電腦: ${devData.desktop_count || 0}`;
      } else {
        const { data: logs } = await sb.from('activity_logs').select('device_type').eq('target', 'home');
        if (logs && logs.length > 0) {
          const counts = { mobile: 0, tablet: 0, desktop: 0 };
          logs.forEach(l => { if (counts[l.device_type] !== undefined) counts[l.device_type]++; });
          devEl.textContent = `累計設備分佈 ➔ 手機: ${counts.mobile} ｜ 平板: ${counts.tablet} ｜ 電腦: ${counts.desktop}`;
        } else {
          devEl.textContent = '設備分佈統計 ➔ 尚無今日數據';
        }
      }
    }
  } catch (err) {
    console.warn('更新管理員統計失敗:', err);
  }
}

async function openStatsModal() {
  if (!currentUser?.isAdmin || !sb) return;
  document.getElementById('statsModal').classList.remove('hidden');
  const container = document.getElementById('statsListContainer');
  container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">數據載入中...</div>';

  try {
    const { data: statsData, error: statsErr } = await sb
      .from('homepage_device_stats')
      .select('*')
      .order('stat_date', { ascending: false })
      .limit(30);

    if (!statsErr && statsData && statsData.length > 0) {
      container.innerHTML = statsData.map(row => {
        const total = (row.mobile_count || 0) + (row.tablet_count || 0) + (row.desktop_count || 0);
        return `
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <span class="font-bold text-slate-800">${row.stat_date}</span>
              <span class="text-[11px] text-slate-500 block mt-0.5">
                📱手機: ${row.mobile_count || 0} ｜ 📲平板: ${row.tablet_count || 0} ｜ 💻電腦: ${row.desktop_count || 0}
              </span>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">總計 ${total} 次</span>
          </div>
        `;
      }).join('');
      return;
    }

    const { data: logData, error: logErr } = await sb
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (logErr) throw logErr;

    if (!logData || logData.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">暫無流量紀錄</div>';
      return;
    }

    container.innerHTML = logData.map(log => `
      <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
        <div>
          <span class="font-bold text-slate-800">${log.target || '瀏覽'}</span>
          <span class="text-[10px] text-slate-400 block">${new Date(log.created_at).toLocaleString()}</span>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">${log.device_type || 'desktop'}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Stats load error:', err);
    container.innerHTML = '<div class="text-center py-4 text-rose-500 text-xs">載入失敗：' + (err.message || '權限或查詢錯誤') + '</div>';
  }
}
