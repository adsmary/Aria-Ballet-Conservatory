(() => {
  const root = document.documentElement;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const header = $('#header');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasMouse = matchMedia('(pointer: fine)').matches;

  /* Fallback: sem libs ou "reduzir movimento" -> site estático e visível */
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn('Aria: GSAP/ScrollTrigger não carregaram (confira internet/ordem dos scripts).');
    root.classList.remove('locked');
    $('#intro')?.remove();
    addEventListener('scroll', () => header.classList.toggle('is-scrolled', scrollY > 60), { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('js');

  /* ---------- Scroll suave (Lenis) ---------- */
  const lenis = window.Lenis ? new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
    : { stop() {}, start() {}, on() {}, raf() {}, scrollTo: t => t.scrollIntoView({ behavior: 'smooth' }) };   // sem Lenis: scroll nativo
  addEventListener('scroll', () => header.classList.toggle('is-scrolled', scrollY > 60), { passive: true });
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(500, 33);               // evita saltos quando a aba trava um instante
  lenis.on('scroll', ({ scroll }) => header.classList.toggle('is-scrolled', scroll > 60));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = $(a.getAttribute('href'));
    if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.6 }); }
  }));

  /* ---------- Helpers de texto ---------- */
  const splitWords = el => {
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.innerHTML = txt.split(/\s+/).map(w => `<span class="w" aria-hidden="true"><span class="wi">${w}</span></span>`).join(' ');
    return $$('.wi', el);
  };

  /* ---------- INTRO (DOM) ---------- */
  const intro = $('#intro'), enter = $('#enter'), count = $('#count');
  const logo = $('.intro__logo');
  logo.innerHTML = `<span class="wi">${logo.textContent}</span>`;
  const logoInner = $('.wi', logo);
  const heroWords = splitWords($('.hero h1'));

  gsap.set(logoInner, { yPercent: 115 });
  gsap.set(enter, { autoAlpha: 0, y: 20 });
  gsap.set(heroWords, { yPercent: 115 });
  gsap.set(['.hero__sub', '.hero .btn', '.header', '.hero__scroll'], { opacity: 0 });

  const n = { v: 0 };
  const introTl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, paused: true })
    .fromTo('.intro__shade', { opacity: .45 }, { opacity: .3, duration: 2.8 }, 0)
    .fromTo('.intro__bg img', { scale: 1.32 }, { scale: 1.2, duration: 3.4 }, 0)
    .to(logoInner, { yPercent: 0, duration: 1.6, ease: 'power3.out' }, .3)
    .to(n, { v: 100, duration: 2.6, ease: 'power1.inOut', onUpdate: () => count.textContent = String(Math.round(n.v)).padStart(3, '0') }, .2)
    .to(count, { autoAlpha: 0, duration: .6 }, 2.2)
    .to(enter, { autoAlpha: 1, y: 0, duration: 1.4 }, 2.3);
  Promise.race([
    Promise.all([$('.intro__bg img').decode().catch(() => {}), document.fonts ? document.fonts.ready : 0]),
    new Promise(r => setTimeout(r, 2500))                       // segurança: nunca trava a intro
  ]).then(() => introTl.play());

  const heroIn = () => gsap.timeline({ defaults: { ease: 'power3.out' } })
    .fromTo('.hero__img', { scale: 1.25 }, { scale: 1, duration: 2.6, ease: 'power2.out' }, 0)
    .to(heroWords, { yPercent: 0, duration: 1.6, stagger: .12 }, .2)
    .to(['.hero__sub', '.hero .btn'], { opacity: 1, y: 0, duration: 1.2, stagger: .15 }, .9)
    .to('.header', { opacity: 1, duration: 1.2 }, .8)
    .to('.hero__scroll', { opacity: 1, duration: 1 }, 1.6);

  /* ---------- INTRO 3D leve: inclinação em perspectiva que segue o mouse (CSS 3D, sem WebGL) ---------- */
  const introImg = $('.intro__bg img');
  gsap.set(introImg, { transformPerspective: 1100 });
  let tiltOn = hasMouse;
  if (hasMouse) {
    const tY = gsap.quickTo(introImg, 'rotationY', { duration: 1.4, ease: 'power3' });
    const tX = gsap.quickTo(introImg, 'rotationX', { duration: 1.4, ease: 'power3' });
    const onMove = e => {
      if (!tiltOn) return removeEventListener('mousemove', onMove);
      tY((e.clientX / innerWidth - .5) * 7); tX(-(e.clientY / innerHeight - .5) * 5);
    };
    addEventListener('mousemove', onMove, { passive: true });
  }

  enter.addEventListener('click', () => {
    enter.disabled = true;
    tiltOn = false; gsap.killTweensOf(introImg, 'rotationX,rotationY');
    gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: () => {
      intro.remove(); root.classList.remove('locked'); lenis.start(); ScrollTrigger.refresh();
    } })
      .to([enter, logo], { autoAlpha: 0, duration: .6 }, 0)
      .to(introImg, { scale: 1, rotationX: 0, rotationY: 0, duration: 1.9 }, 0)
      .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.5, ease: 'power3.inOut' }, 1)
      .add(heroIn(), 1.5);
  });

  /* ---------- Barra de progresso ---------- */
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---------- HERO parallax ---------- */
  gsap.to('.hero__media', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });

  if (hasMouse) {
    const mx = gsap.quickTo('.hero__img', 'x', { duration: 1.6, ease: 'power3' });
    const my = gsap.quickTo('.hero__img', 'y', { duration: 1.6, ease: 'power3' });
    addEventListener('mousemove', e => {
      mx((e.clientX / innerWidth - .5) * -36);
      my((e.clientY / innerHeight - .5) * -24);
    }, { passive: true });
  }

  /* Marquee: velocidade constante (CSS puro, não reage ao scroll nem ao mouse) */

  /* ---------- Classes: cards revelam com máscara ao entrar ---------- */
  $$('.hcard').forEach(card => gsap.from(card, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'power4.inOut',
    scrollTrigger: { trigger: card, start: 'top 85%', once: true } }));

  /* ---------- TEXT REVEAL (sem filter:blur — era o maior causador de travadas) ---------- */
  const splitUnits = (el, chars) => {
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.innerHTML = txt.split(/\s+/).map(w =>
      `<span class="rw" aria-hidden="true">${chars ? [...w].map(c => `<span class="ru">${c}</span>`).join('') : `<span class="ru">${w}</span>`}</span>`
    ).join(' ');
    const units = $$('.ru', el);
    return units;
  };
  const scrubText = (el, { chars = false, start = 'top 92%', end = 'top 55%', from = 0 } = {}) => {
    const units = splitUnits(el, chars);
    gsap.fromTo(units,
      { opacity: from, y: 30 },
      { opacity: 1, y: 0, ease: 'none', stagger: chars ? .03 : .08,
        scrollTrigger: { trigger: el, start, end, scrub: .6 } });
  };
  $$('[data-text="chars"]').forEach(el => scrubText(el, { chars: true, end: 'top 50%' }));
  $$('[data-illuminate]').forEach(el => scrubText(el, { from: .14, start: 'top 85%', end: 'bottom 50%' }));
  $$('p[data-fade], cite[data-fade]').forEach(el => scrubText(el, { start: 'top 94%', end: 'top 62%' }));
  $$('[data-fade]:not(p):not(cite)').forEach(el => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } });
  });

  /* ---------- Fotos: máscara + zoom + parallax ---------- */
  $$('.reveal-img').forEach(fig => {
    const im = $('.im', fig);
    gsap.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power4.inOut', scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
    gsap.fromTo(im, { scale: 1.3 }, { scale: 1, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
    gsap.fromTo(im, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    // levanta em perspectiva 3D enquanto entra
    gsap.fromTo(fig, { rotationX: 12, transformPerspective: 1200, transformOrigin: '50% 100%' },
      { rotationX: 0, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'top 35%', scrub: true } });
  });
  gsap.fromTo('.quote__media', { yPercent: -9 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.quote blockquote', { rotationX: -14, scale: .92, transformPerspective: 1000 },
    { rotationX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top 85%', end: 'center center', scrub: true } });

  /* ---------- Mouse: tilt, ímã, cursor, lanterna ---------- */
  if (hasMouse) {
    $$('[data-tilt]').forEach(card => {
      const lift = card.classList.contains('hcard') ? -10 : 0;
      const rY = gsap.quickTo(card, 'rotationY', { duration: .7, ease: 'power3' });
      const rX = gsap.quickTo(card, 'rotationX', { duration: .7, ease: 'power3' });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        rY(((e.clientX - r.left) / r.width - .5) * 10);
        rX(-((e.clientY - r.top) / r.height - .5) * 10);
      });
      card.addEventListener('mouseenter', () => gsap.to(card, { y: lift, duration: .7, ease: 'power3.out', overwrite: 'auto' }));
      card.addEventListener('mouseleave', () => { rY(0); rX(0); gsap.to(card, { y: 0, duration: 1, ease: 'power3.out', overwrite: 'auto' }); });
    });

    $$('[data-magnetic]').forEach(btn => {
      const bx = gsap.quickTo(btn, 'x', { duration: .6, ease: 'power3' }), by = gsap.quickTo(btn, 'y', { duration: .6, ease: 'power3' });
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        bx((e.clientX - r.left - r.width / 2) * .35); by((e.clientY - r.top - r.height / 2) * .45);
        btn.style.setProperty('--bx', e.clientX - r.left + 'px');
        btn.style.setProperty('--by', e.clientY - r.top + 'px');
      });
      btn.addEventListener('mouseleave', () => { bx(0); by(0); });
    });

    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('i', ring);
    const dx = gsap.quickTo(dot, 'x', { duration: .1 }), dy = gsap.quickTo(dot, 'y', { duration: .1 });
    const rx = gsap.quickTo(ring, 'x', { duration: .7, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .7, ease: 'power3' });
    let shown = false, st;
    lenis.on('scroll', () => { cur.classList.add('is-scrolling'); clearTimeout(st); st = setTimeout(() => cur.classList.remove('is-scrolling'), 160); });
    addEventListener('mousemove', e => {
      if (!shown) { shown = true; gsap.to([dot, ring], { opacity: 1, duration: .4 }); }   // antes: criava um tween a cada movimento
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    }, { passive: true });

    const TEXT = 'h1, h2, h3, p, cite, blockquote, .statement';
    document.addEventListener('mouseover', e => {
      const tag  = e.target.closest('[data-cursor]');
      const link = !tag && e.target.closest('a, button, .btn');
      cur.classList.toggle('is-big', !!tag);
      cur.classList.toggle('is-link', !!link);
      cur.classList.toggle('is-text', !tag && !link && !!e.target.closest(TEXT));
      if (tag) label.textContent = tag.dataset.cursor;
    });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) cur.classList.remove('is-text', 'is-big', 'is-link'); });

    $$('[data-spot]').forEach(el => {
      el.style.setProperty('--mx', '-999px'); el.style.setProperty('--my', '-999px');
      const sx = gsap.quickTo(el, '--mx', { duration: .6, ease: 'power3', unit: 'px' });
      const sy = gsap.quickTo(el, '--my', { duration: .6, ease: 'power3', unit: 'px' });
      el.addEventListener('mouseenter', e => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px'); });
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); sx(e.clientX - r.left); sy(e.clientY - r.top); });
      el.addEventListener('mouseleave', () => { el.style.setProperty('--mx', '-999px'); el.style.setProperty('--my', '-999px'); });
    });
  }

  /* Refresh quando as imagens terminarem de carregar */
  addEventListener('load', () => ScrollTrigger.refresh());
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); });
})();