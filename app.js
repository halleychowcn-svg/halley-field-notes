(() => {
  const $ = (s) => document.querySelector(s);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 需求模板：可编辑、复制、恢复 ---- */
  const brief = $('#brief');
  const status = $('#copy-status');
  const template = brief.defaultValue;
  const copyBtn = $('#copy');
  let statusTimer;
  let doneTimer;
  const copied = () => {
    say('已复制，去钉钉发给我吧。');
    copyBtn.classList.add('done');
    copyBtn.textContent = '已复制';
    clearTimeout(doneTimer);
    doneTimer = setTimeout(() => { copyBtn.classList.remove('done'); copyBtn.textContent = '复制'; }, 1600);
  };
  // sticky = true 的提示（需要用户手动操作）不自动消失
  const say = (msg, sticky = false) => {
    status.textContent = msg;
    clearTimeout(statusTimer);
    if (!sticky) statusTimer = setTimeout(() => { status.textContent = ''; }, 4000);
  };
  copyBtn.addEventListener('click', async () => {
    const text = brief.value;
    try {
      await navigator.clipboard.writeText(text);
      copied();
    } catch {
      brief.focus();
      brief.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      if (ok) copied();
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
  if (reduced) setPaused(true);
  motion.addEventListener('click', () => setPaused(!document.body.classList.contains('paused')));

  /* ---- 循环动画只在看得见时跑：插画离开视口或切到后台就停 ---- */
  const scene = $('.pixel-scene');
  let sceneVisible = true;
  const syncIdle = () => scene.classList.toggle('idle', !sceneVisible || document.hidden);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { sceneVisible = e.isIntersecting; syncIdle(); }).observe(scene);
  }
  document.addEventListener('visibilitychange', syncIdle);

  /* ---- 平台流程：进入视口时依次点亮 ---- */
  const pipeline = $('.pipeline');
  if (reduced || !('IntersectionObserver' in window)) pipeline.classList.add('lit');
  else {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { pipeline.classList.add('lit'); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(pipeline);
  }

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
  const daysEl = $('#clock-days');
  const aiEl = $('#ai-days');
  // 首次加载时天数分 10 档跳到实际值（0.7 秒），之后每秒正常更新
  let rolling = !reduced;
  const tick = () => {
    const now = Date.now();
    const s = Math.max(0, Math.floor((now - joinedAt) / 1000));
    $('#clock-time').textContent = `${pad(Math.floor(s % 86400 / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
    if (rolling) return;
    daysEl.textContent = String(Math.floor(s / 86400));
    aiEl.textContent = String(Math.max(0, Math.round((shanghaiDay(now) - aiStart) / 86400000)));
  };
  tick();
  if (rolling) {
    const now = Date.now();
    const targets = [
      [daysEl, Math.floor(Math.max(0, now - joinedAt) / 86400000)],
      [aiEl, Math.max(0, Math.round((shanghaiDay(now) - aiStart) / 86400000))],
    ];
    const t0 = performance.now();
    const roll = (t) => {
      const step = Math.min(10, Math.floor((t - t0) / 70) + 1);
      const k = 1 - Math.pow(1 - step / 10, 3);
      targets.forEach(([el, v]) => { el.textContent = String(Math.round(v * k)); });
      if (step < 10) requestAnimationFrame(roll);
      else { rolling = false; tick(); }
    };
    requestAnimationFrame(roll);
  }
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
