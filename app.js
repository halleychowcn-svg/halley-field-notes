(() => {
  const $ = (s) => document.querySelector(s);

  /* ---- 需求模板：可编辑、复制、恢复 ---- */
  const brief = $('#brief');
  const status = $('#copy-status');
  const template = brief.defaultValue;
  let statusTimer;
  // sticky = true 的提示（需要用户手动操作）不自动消失
  const say = (msg, sticky = false) => {
    status.textContent = msg;
    clearTimeout(statusTimer);
    if (!sticky) statusTimer = setTimeout(() => { status.textContent = ''; }, 4000);
  };
  $('#copy').addEventListener('click', async () => {
    const text = brief.value;
    try {
      await navigator.clipboard.writeText(text);
      say('已复制，去钉钉发给我吧。');
    } catch {
      brief.focus();
      brief.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      if (ok) say('已复制，去钉钉发给我吧。');
      else say('浏览器不支持自动复制，已帮你选中，请按 Ctrl/⌘ + C。', true);
    }
  });
  $('#reset').addEventListener('click', () => {
    brief.value = template;
    brief.focus();
    say('已恢复成空白模板。');
  });

  /* ---- 动画开关（系统要求减少动态效果时默认暂停） ---- */
  const motion = $('#motion');
  const setPaused = (paused) => {
    document.body.classList.toggle('paused', paused);
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? '播放动画' : '暂停动画';
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
  motion.addEventListener('click', () => setPaused(!document.body.classList.contains('paused')));

  /* ---- 入职计时 & AI 天数 ---- */
  const joinedAt = Date.parse('2024-07-11T08:00:00+08:00');
  const pad = (n) => String(n).padStart(2, '0');
  const shanghaiDay = (now) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date(now)).map((x) => [x.type, x.value])
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day);
  };
  const aiStart = Date.UTC(2026, 6, 15);
  const tick = () => {
    const now = Date.now();
    const s = Math.max(0, Math.floor((now - joinedAt) / 1000));
    $('#clock-days').textContent = String(Math.floor(s / 86400));
    $('#clock-time').textContent = `${pad(Math.floor(s % 86400 / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
    $('#ai-days').textContent = String(Math.max(0, Math.round((shanghaiDay(now) - aiStart) / 86400000)));
  };
  tick();
  setInterval(tick, 1000);

  /* ---- 导航高亮当前区块 ---- */
  const links = [...document.querySelectorAll('.site-header nav a')];
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const sections = [...document.querySelectorAll('main section[id]')];
  let ticking = false;
  let lastActive = null;
  const markActive = () => {
    ticking = false;
    const line = window.innerHeight * 0.4;
    let current = null;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s;
    let activeLink = null;
    links.forEach((a) => {
      const on = !!current && byId.get(current.id) === a;
      a.classList.toggle('active', on);
      if (on) activeLink = a;
    });
    // 窄屏导航可横滑时，把高亮项滚进可见区（只滚导航自身，不动页面）
    if (activeLink && activeLink !== lastActive) {
      const nav = activeLink.parentElement;
      if (nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({ left: activeLink.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2, behavior: 'smooth' });
      }
    }
    lastActive = activeLink;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(markActive); }
  }, { passive: true });
  markActive();
})();
