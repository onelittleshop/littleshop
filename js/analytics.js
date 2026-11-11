// ==================== [模塊：Analytics] ====================
async function logActivity(actionType) {
  if (!sb) return;
  try {
    const ua = navigator.userAgent;
    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/ipad|tablet/i.test(ua)) device = 'Tablet';

    const userId = currentUser ? currentUser.id : null;
    await sb.from('activity_logs').insert([{
      user_id: userId,
      action_type: actionType,
      device_type: device,
      user_agent: ua
    }]);
  } catch (err) {
    console.warn('Analytics log failed:', err);
  }
}

async function updateAdminStatsUI() {
  if (!currentUser?.isAdmin || !sb) return;
  try {
    const { count, error } = await sb.from('activity_logs').select('*', { count: 'exact', head: true });
    if (error) {
      document.getElementById('adminVisitCount').textContent = '0';
      document.getElementById('adminDeviceStats').textContent = '設備分佈統計 ➔ 尚未建立 activity_logs 表';
      return;
    }
    document.getElementById('adminVisitCount').textContent = count || 0;

    const { data: devData } = await sb.from('activity_logs').select('device_type');
    if (devData) {
      const counts = {};
      devData.forEach(d => { counts[d.device_type] = (counts[d.device_type] || 0) + 1; });
      const summary = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' ｜ ');
      document.getElementById('adminDeviceStats').textContent = '設備分佈統計 ➔ ' + (summary || '尚無數據');
    }
  } catch (err) {
    console.warn('Admin stats update failed:', err);
  }
}

async function openStatsModal() {
  if (!currentUser?.isAdmin || !sb) return;
  document.getElementById('statsModal').classList.remove('hidden');
  const container = document.getElementById('statsListContainer');
  container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">載入詳細流量紀錄中...</div>';
  
  const { data, error } = await sb.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error || !data) {
    container.innerHTML = '<div class="text-center py-4 text-rose-500 text-xs">載入失敗</div>';
    return;
  }
  
  container.innerHTML = data.map(log => `
    <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
      <div>
        <span class="font-bold text-slate-800">${log.action_type}</span>
        <span class="text-[10px] text-slate-400 block">${new Date(log.created_at).toLocaleString()}</span>
      </div>
      <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">${log.device_type}</span>
    </div>
  `).join('');
}
