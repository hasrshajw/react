-- 04_seed_telugu_traditional.sql  -  OPTIONAL. Adds the Telugu "Traditional Red & Gold" wedding template. Run after 01_schema.sql.
-- Safe to re-run: it updates the template if it already exists. Source of truth: docs/templates/telugu-traditional.html
insert into public.categories (id, name) values ('wedding', 'Wedding') on conflict (id) do nothing;
insert into public.templates (id, category_id, name, html_code) values ('telugu-traditional', 'wedding', 'Telugu Traditional (Red & Gold)', $tpl$<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Suranna&family=Cinzel:wght@400;500;600&family=Noto+Serif+Telugu:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--ink:#FFFFFF;--ivory:#2C1A12;--red:#A8213A;--red-deep:#7C1528;--gold:#BF8B2E;--gold-light:#D9A942;--gold-pale:#F0D98A;--ivory-dark:#1E0E08;--muted:#6b7280;--border:#e5e7eb;--gold-soft:var(--gold-pale)}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{background-color:#E5E7EB;display:flex;justify-content:center;scroll-behavior:smooth}
body{font-family:'Noto Serif Telugu',Georgia,serif;background:var(--ink);color:var(--ivory);overflow-x:hidden;width:100%;max-width:480px;margin:0 auto;min-height:100vh;box-shadow:0 0 25px rgba(0,0,0,.08);display:flex;flex-direction:column;position:relative}
/* hero */
.hero{min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:6rem 0 3.5rem;background:#FFFFFF}
.top-decor-container{position:absolute;top:0;left:0;width:100%;z-index:5;pointer-events:none}
.top-decor-full{width:100%;height:auto;display:block;position:relative;z-index:2}
.hanging{position:absolute;z-index:1;transform-origin:top center;animation:hangSwing 4s ease-in-out infinite alternate}
.hanging-outer{top:-2px;width:6%;max-width:24px}
.hanging-inner{top:-12px;width:5%;max-width:20px;animation-duration:5s;animation-direction:alternate-reverse}
.hanging.left{left:3%}.hanging.left-in{left:15%}.hanging.right-in{right:15%}.hanging.right{right:3%}
@keyframes hangSwing{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
.hero-center-img{display:block;width:85%;max-width:250px;height:auto;margin:1.2rem auto .8rem;filter:drop-shadow(0 8px 16px rgba(192,57,43,.15))}
.hero-bottom-img{display:block;width:100%;height:auto;margin:.2rem 0 .5rem}
.hero-inner{position:relative;z-index:2;width:100%;text-align:center;animation:heroReveal 1.8s cubic-bezier(.22,1,.36,1) both}
@keyframes heroReveal{from{opacity:0;transform:translateY(40px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.hero-sub{font-family:'Suranna',serif;font-size:1.6rem;letter-spacing:.05em;color:#3D7B89;margin-bottom:.5rem;font-weight:400}
/* second section */
.second-section{min-height:100vh;width:100%;background:#FFFFFF;display:flex;flex-direction:column;position:relative;overflow-x:hidden}
#flower-container{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;overflow:hidden}
.fall-flower{position:absolute;top:-60px;width:36px;height:36px;object-fit:contain;pointer-events:none;will-change:transform,opacity}
.ribbon{width:100%;background:linear-gradient(135deg,var(--red-deep) 0%,var(--red) 50%,var(--red-deep) 100%);padding:.65rem 1.5rem;display:flex;align-items:center;justify-content:center;gap:1rem;position:relative;overflow:hidden;z-index:2}
.ribbon::after,.section-divider-bar::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(105deg,transparent 0,transparent 18px,rgba(255,255,255,.03) 18px,rgba(255,255,255,.03) 20px);pointer-events:none}
.ribbon-line,.bar-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(240,217,138,.5))}
.ribbon-line.r,.bar-line.r{background:linear-gradient(90deg,rgba(240,217,138,.5),transparent)}
.ribbon-text{font-family:'Noto Serif Telugu',serif;font-weight:400;font-size:.88rem;letter-spacing:.1em;color:var(--gold-pale);white-space:nowrap}
.flower-banner{width:100%;position:relative;background:#FFFFFF;overflow:hidden;height:110px}
.flower-banner img{width:128%;position:absolute;top:-18px;left:-14%;display:block;object-fit:cover;object-position:center top}
.flower-banner::before{content:'';position:absolute;inset:0;background:linear-gradient(to right,#FFFFFF 0%,transparent 12%,transparent 88%,#FFFFFF 100%),linear-gradient(to bottom,transparent 0%,transparent 80%,#FFFFFF 100%);z-index:2;pointer-events:none}
.gold-stripe{width:100%;height:4px;background:linear-gradient(90deg,#FFF 0%,var(--gold) 20%,var(--gold-light) 50%,var(--gold) 80%,#FFF 100%)}
.muhurtham-hero{width:100%;padding:2.6rem 2rem 0;display:flex;flex-direction:column;align-items:center;text-align:center;background:#FFFFFF;position:relative}
.eyebrow{display:inline-flex;align-items:center;gap:.55rem;background:linear-gradient(90deg,rgba(168,33,58,.06),rgba(168,33,58,.11),rgba(168,33,58,.06));border:1px solid rgba(168,33,58,.18);border-radius:50px;padding:.28rem .9rem;margin-bottom:1.3rem;opacity:0;animation:fadeUp .6s ease .1s forwards;position:relative;z-index:1}
.eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);flex-shrink:0}
.eyebrow-text{font-family:'Noto Serif Telugu',serif;font-size:.78rem;letter-spacing:.08em;color:var(--red);font-weight:500}
.sec-title{font-family:'Suranna',serif;font-size:3.1rem;color:var(--red);line-height:1.12;letter-spacing:.01em;opacity:0;animation:fadeUp .7s ease .25s forwards;position:relative;z-index:1}
.subtitle{font-family:'Noto Serif Telugu',serif;font-size:1rem;color:var(--gold);letter-spacing:.06em;margin-top:.5rem;opacity:0;animation:fadeUp .6s ease .38s forwards;position:relative;z-index:1}
.orn-divider{display:flex;align-items:center;justify-content:center;margin:1.6rem 0 2.2rem;width:82%;opacity:0;animation:fadeUp .6s ease .5s forwards}
.orn-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold-light))}
.orn-line.r{background:linear-gradient(90deg,var(--gold-light),transparent)}
.orn-center{display:flex;align-items:center;gap:4px;padding:0 8px}
.orn-rhomb{width:7px;height:7px;background:var(--gold-light);transform:rotate(45deg)}
.orn-rhomb.sm{width:4px;height:4px;background:rgba(168,33,58,.5)}
.card-wrap{width:100%;padding:0 0 .8rem;opacity:0;animation:fadeUp .8s ease .65s forwards}
.details-card{background:#FFFFFF;border-radius:18px;overflow:hidden;position:relative}
.card-body{padding:.4rem 1.4rem 1.2rem}
.corner{position:absolute;width:28px;height:28px;opacity:.35}
.corner svg{width:100%;height:100%}
.corner.tl{top:8px;left:8px}.corner.tr{top:8px;right:8px;transform:scaleX(-1)}.corner.bl{bottom:8px;left:8px;transform:scaleY(-1)}.corner.br{bottom:8px;right:8px;transform:scale(-1)}
.detail-pill{display:flex;align-items:center;gap:1.1rem;padding:1.15rem 0}
.detail-pill+.detail-pill{border-top:1px solid rgba(191,139,46,.15)}
.pill-icon-wrap{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(168,33,58,.08),rgba(168,33,58,.14));border:1px solid rgba(168,33,58,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pill-icon-wrap svg{width:22px;height:22px}
.pill-text{display:flex;flex-direction:column;gap:.15rem;flex:1;text-align:left}
.pill-label{font-size:.78rem;letter-spacing:.06em;color:var(--gold);font-family:'Noto Serif Telugu',serif;font-weight:500}
.pill-value{font-size:1.2rem;color:var(--ivory-dark);font-family:'Noto Serif Telugu',serif;font-weight:500;line-height:1.4}
.image-section{width:100%;position:relative;overflow:hidden;opacity:0;animation:fadeIn 1.1s ease 1s forwards}
.image-section::before{content:'';position:absolute;top:0;left:0;right:0;height:70px;background:linear-gradient(to bottom,#FFFFFF 0%,transparent 100%);z-index:2;pointer-events:none}
.image-section::after{content:'';position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent 0%,var(--gold) 30%,var(--gold-pale) 50%,var(--gold) 70%,transparent 100%);z-index:3}
.sec-image{width:100%;height:auto;display:block}
.footer{width:100%;background:linear-gradient(135deg,var(--red-deep) 0%,var(--red) 60%,var(--red-deep) 100%);padding:1.1rem 1.5rem;display:flex;flex-direction:column;align-items:center;gap:.35rem;position:relative;overflow:hidden}
.footer::before,.premium-footer::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(105deg,transparent 0,transparent 18px,rgba(255,255,255,.025) 18px,rgba(255,255,255,.025) 20px);pointer-events:none}
.footer-row{display:flex;align-items:center;gap:.7rem;position:relative;z-index:1}
.footer-gem{width:5px;height:5px;background:var(--gold-pale);transform:rotate(45deg);opacity:.7}
.footer-main{font-family:'Noto Serif Telugu',serif;font-size:1.05rem;color:var(--gold-pale);letter-spacing:.08em}
.footer-sub{font-family:'Noto Serif Telugu',serif;font-size:.78rem;color:rgba(240,217,138,.6);letter-spacing:.1em;position:relative;z-index:1}
/* couple */
.couple-details-section{width:100%;background:#ffffff;position:relative;overflow:hidden;padding:40px 20px 50px}
.couple-details-section::before{content:"";position:absolute;right:0;top:80px;width:300px;height:300px;background:url('https://www.schedy.in/assets/muggu.svg') no-repeat right center;background-size:contain;z-index:0;pointer-events:none}
@media (max-width:600px){.couple-details-section::before{width:180px;height:180px;top:120px}}
.couple-container{max-width:100%;margin:0 auto;position:relative;z-index:1}
.couple-title{text-align:center;margin-bottom:30px}
.couple-title h1{font-family:'Suranna',serif;font-size:1.8rem;color:var(--red);margin:10px 0}
.couple-divider{display:flex;justify-content:center;gap:10px;align-items:center}
.couple-divider span{width:50px;height:1px;background:var(--gold)}
.couple-divider .heart{color:var(--gold);font-size:1.2rem;width:auto;height:auto;background:none}
.couple-card{display:flex;align-items:center;background:linear-gradient(145deg,#fff,#f9f3ea);border:1px solid #e3c97a;border-radius:14px;margin-bottom:20px;padding:10px;box-shadow:0 4px 12px rgba(0,0,0,.05)}
.groom-card{flex-direction:row}.bride-card{flex-direction:row-reverse}
.card-img{width:90px;height:130px;object-fit:cover;border-radius:10px;border:2px solid #e3c97a;box-shadow:0 4px 8px rgba(0,0,0,.1)}
.card-content{padding:10px;flex:1}
.card-content small{font-size:.7rem;letter-spacing:1.5px;color:var(--gold);font-weight:500}
.card-content h2{font-size:1.3rem;margin:5px 0;color:var(--red);font-family:'Suranna',serif}
.list-item{display:flex;gap:8px;font-size:.75rem;margin-bottom:6px;color:var(--ivory-dark)}
.icon-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);margin-top:6px;flex-shrink:0}
/* events */
.events-section{width:100%;background:#fff;padding:2.8rem 1.3rem 3rem;display:flex;flex-direction:column;align-items:center}
.section-header{text-align:center;margin-bottom:2.4rem;width:100%;display:flex;flex-direction:column;align-items:center}
.event-card{width:100%;background:#fff;border-radius:16px;border:1px solid rgba(191,139,46,.22);box-shadow:0 2px 0 rgba(191,139,46,.10),0 8px 32px rgba(168,33,58,.06),0 2px 8px rgba(0,0,0,.04);overflow:hidden;position:relative;margin-bottom:1.4rem;opacity:0;animation:fadeUp .75s ease var(--delay,.5s) forwards}
.card-accent{width:100%;height:3px;background:linear-gradient(90deg,transparent 0%,var(--gold) 25%,var(--gold-light) 50%,var(--gold) 75%,transparent 100%)}
.card-header{padding:1rem 1.4rem .9rem;display:flex;align-items:center;gap:.9rem;border-bottom:1px solid rgba(191,139,46,.15);background:linear-gradient(to bottom,#fffdf8,#fff)}
.icon-wrap{width:52px;height:52px;flex-shrink:0;border-radius:14px;background:linear-gradient(145deg,rgba(168,33,58,.07),rgba(168,33,58,.14));border:1px solid rgba(168,33,58,.18);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 2px 8px rgba(168,33,58,.06)}
.icon-wrap svg{width:30px;height:30px}
.card-header-text{display:flex;flex-direction:column;gap:3px}
.card-event-label{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.28em;color:var(--gold);font-weight:600;text-transform:uppercase}
.card-event-title{font-family:'Suranna',serif;font-size:1.45rem;color:var(--red);letter-spacing:.02em;line-height:1.2}
.detail-icon{width:40px;height:40px;flex-shrink:0;border-radius:10px;background:linear-gradient(145deg,rgba(168,33,58,.05),rgba(168,33,58,.10));border:1px solid rgba(191,139,46,.16);display:flex;align-items:center;justify-content:center}
.detail-icon svg{width:20px;height:20px}
.venue-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px 4px 8px;background:linear-gradient(135deg,rgba(168,33,58,.07),rgba(168,33,58,.12));border:1px solid rgba(168,33,58,.2);border-radius:50px;font-family:'Noto Serif Telugu',serif;font-size:.88rem;color:var(--red);font-weight:500}
.venue-badge svg{width:14px;height:14px;flex-shrink:0}
.map-link-wrap{text-align:center;margin-top:15px}
.map-link-wrap .venue-badge{text-decoration:none}
/* venue */
.venue-wrapper{width:100%;background:#FFFFFF}
.venue-section{display:flex;width:100%;background:#FFFFFF;position:relative;overflow:hidden}
.venue-section::before,.venue-section::after{content:'';position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--gold),var(--gold-light),var(--gold),transparent)}
.venue-section::before{top:0}.venue-section::after{bottom:0}
.venue-left{width:36%;position:relative}
.venue-left img{width:100%;height:100%;object-fit:cover;display:block}
.venue-right{width:64%;padding:28px 22px 28px 40px;display:flex;flex-direction:column;justify-content:center;position:relative;margin-left:-40px;z-index:2;background:transparent}
.venue-eyebrow{font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.35em;color:var(--gold);margin-bottom:8px}
.venue-title{font-family:'Suranna',serif;font-size:2.3rem;color:var(--red);margin-bottom:6px;line-height:1.1}
.venue-divider{display:flex;align-items:center;gap:6px;margin:10px 0 16px}
.venue-divider span{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold-light))}
.venue-divider .dot{width:6px;height:6px;background:var(--gold);transform:rotate(45deg);flex:none}
.venue-name{font-size:1.7rem;font-weight:500;color:var(--ivory-dark);margin-bottom:10px;font-family:'Cormorant Garamond','Noto Serif Telugu',serif}
.venue-address{font-size:.95rem;color:var(--gold);line-height:1.6;margin-bottom:20px}
.venue-btn{display:inline-flex;align-items:center;align-self:flex-start;gap:8px;padding:11px 20px;background:linear-gradient(135deg,var(--red),var(--red-deep));color:#fff;border-radius:40px;font-size:.78rem;letter-spacing:.15em;text-decoration:none;box-shadow:0 8px 24px rgba(168,33,58,.25);transition:all .25s ease}
.venue-btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(168,33,58,.35)}
.venue-btn svg{width:14px;height:14px}
.section-divider-bar{width:100%;background:linear-gradient(135deg,var(--red-deep) 0%,var(--red) 50%,var(--red-deep) 100%);padding:.5rem 1.5rem;display:flex;align-items:center;justify-content:center;gap:1rem;position:relative;overflow:hidden}
.bar-text{font-family:'Noto Serif Telugu',serif;font-weight:400;font-size:.7rem;letter-spacing:.1em;color:var(--gold-pale);white-space:nowrap}
/* invitation */
.invitation-section{width:100%;background:var(--red);color:#fff;position:relative;z-index:0;display:flex;flex-direction:column;justify-content:flex-start;padding:32px 16px 40px}
.invitation-section::before{content:"";position:absolute;inset:10px;border:1px solid rgba(243,210,122,.25);border-radius:18px;pointer-events:none;z-index:0}
.invite-sub{text-align:center;font-size:.72rem;letter-spacing:.45em;color:var(--gold-soft);font-family:'Cinzel',serif;margin-bottom:6px;position:relative;z-index:2}
.invite-title{text-align:center;font-family:'Cinzel','Noto Serif Telugu',serif;font-size:3rem;letter-spacing:.08em;background:linear-gradient(180deg,#fff5c6,var(--gold));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px;position:relative;z-index:2}
.invite-head-divider{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:30px;position:relative;z-index:2}
.invite-head-divider span{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold))}
.invite-head-divider .dot{width:12px;height:12px;background:var(--gold);border-radius:50%;box-shadow:0 0 12px rgba(243,210,122,.7)}
.invite-card{position:relative;z-index:1;margin-top:20px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(0,0,0,.25));border:1px solid rgba(243,210,122,.4);border-radius:26px;padding:28px 18px;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 18px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12);text-align:center}
.invite-card::after{content:"";position:absolute;inset:0;border-radius:26px;border:1px solid rgba(243,210,122,.15);pointer-events:none}
.invite-text{font-size:1.08rem;line-height:2.1;color:#fff6e0;letter-spacing:.025em}
.invite-divider{margin:30px auto;display:flex;align-items:center;justify-content:center;gap:12px}
.invite-divider span{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold))}
.invite-divider .plus{color:var(--gold);font-size:20px;filter:drop-shadow(0 0 6px rgba(243,210,122,.6))}
.invite-from{color:var(--gold-pale);font-size:.9rem;letter-spacing:.15em;margin-bottom:6px}
.invite-names{margin-top:8px;color:var(--gold);font-size:1.3rem;line-height:1.6;font-family:'Noto Serif Telugu','Cinzel',serif;letter-spacing:.03em;text-shadow:0 3px 12px rgba(0,0,0,.45)}
.invite-names .inv-line:empty{display:none}
.invite-names:not(:has(.inv-line:not(:empty))){display:none}
.invite-names .inv-line{margin-bottom:.6rem}
.invite-divider,.invite-names{transition:opacity .9s cubic-bezier(.22,1,.36,1),transform .9s cubic-bezier(.22,1,.36,1)}
.is-hidden{opacity:0;transform:translateY(12px)}
.invite-scroll-cue{position:relative;margin-top:25px;display:flex;flex-direction:column;align-items:center;gap:6px;z-index:10}
.invite-scroll-cue-label{font-family:'Noto Serif Telugu',serif;font-size:.6rem;letter-spacing:.3em;color:var(--gold-pale);font-weight:600}
.invite-scroll-cue-track{width:20px;height:34px;border:1px solid rgba(240,217,138,.6);border-radius:10px;position:relative;overflow:hidden}
.invite-scroll-cue-thumb{position:absolute;width:4px;height:8px;background:var(--gold-pale);border-radius:2px;left:50%;transform:translateX(-50%);top:5px;animation:thumbSc 2s cubic-bezier(.4,0,.6,1) infinite}
@keyframes thumbSc{0%{top:5px;opacity:1}70%{top:18px;opacity:.4}100%{top:5px;opacity:0}}
/* contact (a group or the whole section hides itself when it has no card) */
.contact-wrapper{width:100%;background:#FFFFFF;padding:30px 16px 50px}
.contact-wrapper:not(:has(.contact-card)),.contact-group:not(:has(.contact-card)){display:none}
.contact-title{text-align:center;font-family:'Suranna',serif;font-size:2.4rem;color:var(--red);margin-bottom:12px}
.contact-section-title{margin:30px 0 16px;text-align:center;font-size:.85rem;letter-spacing:.2em;color:var(--gold);font-family:'Noto Serif Telugu','Cinzel',serif;position:relative}
.contact-section-title::before,.contact-section-title::after{content:'';position:absolute;top:50%;width:14%;height:1px;background:linear-gradient(90deg,transparent,var(--gold))}
.contact-section-title::after{right:0;background:linear-gradient(90deg,var(--gold),transparent)}
.contact-section-title::before{left:0}
.contact-card{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 14px;border-radius:16px;background:#ffffff;border:1px solid rgba(0,0,0,.05);margin-bottom:14px;box-shadow:0 6px 18px rgba(0,0,0,.06)}
.contact-left{display:flex;align-items:center;gap:14px;min-width:0}
.contact-icon{width:48px;height:48px;flex-shrink:0;border-radius:14px;background:linear-gradient(145deg,#fafafa,#f0f0f0);display:flex;align-items:center;justify-content:center;border:1px solid #eee;color:var(--red)}
.contact-text{min-width:0}
.contact-text small{font-size:.68rem;color:var(--muted);letter-spacing:.04em}
.contact-text h3{margin:3px 0 0;font-size:1.1rem;color:var(--ivory-dark);font-family:'Noto Serif Telugu','Cormorant Garamond',serif;font-weight:500}
.contact-phone{font-family:system-ui,sans-serif;font-size:.85rem;color:var(--gold);margin-top:3px;font-weight:700}
.contact-actions{display:flex;gap:10px;flex-shrink:0}
.contact-btn{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--border);box-shadow:0 4px 10px rgba(0,0,0,.05);transition:all .2s ease;cursor:pointer;text-decoration:none;color:var(--red)}
.contact-btn:hover{transform:scale(1.08)}
/* footer */
.premium-footer{width:100%;background:linear-gradient(135deg,var(--red-deep) 0%,var(--red) 60%,var(--red-deep) 100%);padding:1.8rem 1.5rem;display:flex;flex-direction:column;align-items:center;gap:1rem;position:relative;overflow:hidden}
.heart-divider{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:.5rem;position:relative;z-index:1;width:100%}
.heart-divider span{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold-pale),transparent)}
.heart-icon{color:var(--gold-pale);font-size:1.4rem;filter:drop-shadow(0 0 6px rgba(240,217,138,.5));animation:heartbeat 1.5s ease-in-out infinite}
@keyframes heartbeat{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
.couple-names{font-family:'Suranna',serif;font-size:1.9rem;color:var(--gold-pale);letter-spacing:.03em;text-align:center;position:relative;z-index:1;line-height:1.3}
.wedding-datetime{font-family:'Noto Serif Telugu',serif;font-size:.9rem;color:rgba(240,217,138,.9);letter-spacing:.05em;text-align:center;position:relative;z-index:1;margin-top:.2rem}
.blessing-text{font-family:'Noto Serif Telugu',serif;font-size:.7rem;color:rgba(240,217,138,.7);letter-spacing:.1em;text-align:center;margin-top:.8rem;position:relative;z-index:1}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.hanging,.heart-icon,.invite-scroll-cue-thumb{animation:none}.eyebrow,.sec-title,.subtitle,.orn-divider,.card-wrap,.event-card,.image-section{animation:none;opacity:1}}
</style>

<section class="hero" id="top">
  <div class="top-decor-container">
    <img src="https://www.schedy.in/assets/flower-hangings.webp" alt="" class="hanging hanging-outer left">
    <img src="https://www.schedy.in/assets/flower-hangings.webp" alt="" class="hanging hanging-inner left-in">
    <img src="https://www.schedy.in/assets/flower-hangings.webp" alt="" class="hanging hanging-inner right-in">
    <img src="https://www.schedy.in/assets/flower-hangings.webp" alt="" class="hanging hanging-outer right">
    <img src="https://www.schedy.in/assets/flowers.png" alt="" class="top-decor-full">
  </div>
  <div class="hero-inner">
    {{#if surname-te}}<p class="hero-sub" data-scroll-target="surname-te">{{surname-te}} వారి</p>{{/if}}
    <img src="https://www.schedy.in/assets/image.svg" alt="" class="hero-center-img">
    <img src="https://www.schedy.in/assets/hero.svg" alt="" class="hero-bottom-img">
  </div>
</section>

<div class="second-section">
  <div id="flower-container"></div>
  <div class="ribbon"><div class="ribbon-line"></div><span class="ribbon-text">శుభ వివాహం</span><div class="ribbon-line r"></div></div>
  <div class="flower-banner"><img src="https://www.schedy.in/assets/flowerss.webp" alt=""></div>
  <div class="gold-stripe"></div>

  <div class="muhurtham-hero">
    <div class="eyebrow"><div class="eyebrow-dot"></div><span class="eyebrow-text">శుభ సందర్భం</span><div class="eyebrow-dot"></div></div>
    <h2 class="sec-title">వివాహ సుముహూర్తం</h2>
    <p class="subtitle">{{groom-te}} &amp; {{bride-te}}</p>
    <div class="orn-divider"><div class="orn-line"></div><div class="orn-center"><div class="orn-rhomb sm"></div><div class="orn-rhomb"></div><div class="orn-rhomb sm"></div></div><div class="orn-line r"></div></div>

    <div class="card-wrap">
      <div class="details-card">
        <div class="corner tl"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner tr"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner bl"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner br"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div>
        <div class="card-body">
          {{#if event-wedding-date}}
          <div class="detail-pill">
            <div class="pill-icon-wrap"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" stroke="#A8213A" stroke-width="1.6"/><path d="M3 9h18" stroke="#A8213A" stroke-width="1.6" stroke-linecap="round"/><path d="M8 2v4M16 2v4" stroke="#BF8B2E" stroke-width="1.6" stroke-linecap="round"/><circle cx="8.5" cy="14" r="1.1" fill="#A8213A"/><circle cx="12" cy="14" r="1.1" fill="#A8213A"/><circle cx="15.5" cy="14" r="1.1" fill="#A8213A"/></svg></div>
            <div class="pill-text"><span class="pill-label">తేదీ</span><span class="pill-value" data-scroll-target="event-wedding-date">{{event-wedding-date}}</span></div>
          </div>
          {{/if}}
          {{#if event-wedding-time}}
          <div class="detail-pill">
            <div class="pill-icon-wrap"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#A8213A" stroke-width="1.6"/><path d="M12 7v5.5l3.5 2" stroke="#BF8B2E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.2" fill="#A8213A"/></svg></div>
            <div class="pill-text"><span class="pill-label">సుముహూర్తం</span><span class="pill-value" data-scroll-target="event-wedding-time">{{event-wedding-time}}</span></div>
          </div>
          {{/if}}
        </div>
      </div>
    </div>
  </div>

  <div class="image-section"><img src="https://www.schedy.in/assets/sec2.jpg" alt="" class="sec-image"></div>
  <div class="footer">
    <div class="footer-row"><div class="footer-gem"></div><span class="footer-main">శుభాకాంక్షలు</span><div class="footer-gem"></div></div>
    <span class="footer-sub">ప్రేమతో మరియు దీవెనలతో</span>
  </div>
</div>

<div class="couple-details-section">
  <div class="couple-container">
    <div class="couple-title">
      <h1>వధూవరుల వివరాలు</h1>
      <div class="couple-divider"><span></span><span class="heart">❤</span><span></span></div>
    </div>

    <div class="couple-card groom-card" data-scroll-target="groom-te">
      <img src="https://www.schedy.in/assets/groom.jpg" class="card-img" alt="">
      <div class="card-content">
        <small>వరుడు</small>
        <h2>{{groom-te}}</h2>
        {{#if groom-mother-te}}<div class="list-item" data-scroll-target="groom-mother-te"><div class="icon-dot"></div><div>శ్రీమతి {{groom-mother-te}} గారి ఆత్మీయ కుమారుడు</div></div>{{/if}}
        {{#if groom-father-te}}<div class="list-item" data-scroll-target="groom-father-te"><div class="icon-dot"></div><div>శ్రీ {{groom-father-te}} గారి ఆత్మీయ కుమారుడు</div></div>{{/if}}
      </div>
    </div>

    <div class="couple-card bride-card" data-scroll-target="bride-te">
      <img src="https://www.schedy.in/assets/bride.png" class="card-img" alt="">
      <div class="card-content">
        <small>వధువు</small>
        <h2>{{bride-te}}</h2>
        {{#if bride-mother-te}}<div class="list-item" data-scroll-target="bride-mother-te"><div class="icon-dot"></div><div>శ్రీమతి {{bride-mother-te}} గారి ఆత్మీయ కుమార్తె</div></div>{{/if}}
        {{#if bride-father-te}}<div class="list-item" data-scroll-target="bride-father-te"><div class="icon-dot"></div><div>శ్రీ {{bride-father-te}} గారి ఆత్మీయ కుమార్తె</div></div>{{/if}}
      </div>
    </div>
  </div>
</div>

<div class="events-section">
  <div class="section-header">
    <div class="eyebrow"><div class="eyebrow-dot"></div><span class="eyebrow-text">శుభ సందర్భం</span><div class="eyebrow-dot"></div></div>
    <h2 class="sec-title">వివాహ కార్యక్రమాలు</h2>
    <div class="orn-divider"><div class="orn-line"></div><div class="orn-center"><div class="orn-rhomb sm"></div><div class="orn-rhomb"></div><div class="orn-rhomb sm"></div></div><div class="orn-line r"></div></div>
  </div>

  <div class="event-card" style="--delay:.5s">
    <div class="card-accent"></div>
    <div class="corner tl"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner tr"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner bl"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner br"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div>
    <div class="card-header">
      <div class="icon-wrap"><svg viewBox="0 0 30 30" fill="none"><defs><linearGradient id="fl-out" x1="15" y1="26" x2="15" y2="3" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#A8213A"/><stop offset="50%" stop-color="#D9A942"/><stop offset="100%" stop-color="#F5D870"/></linearGradient><linearGradient id="fl-in" x1="15" y1="22" x2="15" y2="9" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#D9A942"/><stop offset="100%" stop-color="#FFF5B0"/></linearGradient></defs><path d="M7 25 Q15 23 23 25 L22 27 Q15 25.5 8 27Z" fill="#A8213A" opacity="0.75"/><rect x="7" y="23" width="16" height="2.5" rx="1.25" fill="#BF8B2E" opacity="0.55"/><path d="M15 4 C13 8 9 11 9 16 C9 19.5 11.5 22 15 22 C18.5 22 21 19.5 21 16 C21 11 17 8 15 4Z" fill="url(#fl-out)"/><path d="M15 10 C14 13 12.5 15.5 13 18 C13.5 20 14.5 21 15 21 C15.5 21 16.5 20 17 18 C17.5 15.5 16 13 15 10Z" fill="url(#fl-in)" opacity="0.9"/><ellipse cx="15" cy="12" rx="1.5" ry="2.5" fill="white" opacity="0.45"/></svg></div>
      <div class="card-header-text"><span class="card-event-label">కార్యక్రమం - ౧</span><span class="card-event-title">వివాహ మహోత్సవం</span></div>
    </div>
    <div class="card-body">
      {{#if event-wedding-date}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><rect x="2" y="4.5" width="18" height="14.5" rx="2.5" fill="rgba(168,33,58,0.07)" stroke="#A8213A" stroke-width="1.4"/><path d="M2 7 Q2 4.5 4.5 4.5 H17.5 Q20 4.5 20 7 V8 H2Z" fill="#A8213A" opacity="0.18"/><line x1="2" y1="8" x2="20" y2="8" stroke="#A8213A" stroke-width="1.3"/><rect x="6" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><rect x="14" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><circle cx="6.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="12" r="1.3" fill="#A8213A"/><circle cx="15.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="16.5" r="1" fill="#BF8B2E" opacity="0.6"/></svg></div><div class="pill-text"><span class="pill-label">తేదీ</span><span class="pill-value" data-scroll-target="event-wedding-date">{{event-wedding-date}} — {{event-wedding-day}}</span></div></div>{{/if}}
      {{#if event-wedding-time}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#A8213A" stroke-width="1.5" fill="rgba(168,33,58,0.06)"/><line x1="11" y1="4" x2="11" y2="5.4" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="11" x2="16.6" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="18" x2="11" y2="16.6" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="4" y1="11" x2="5.4" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="11" x2="7.5" y2="7.5" stroke="#A8213A" stroke-width="1.7" stroke-linecap="round"/><line x1="11" y1="11" x2="11" y2="6" stroke="#A8213A" stroke-width="1.2" stroke-linecap="round"/><circle cx="11" cy="11" r="1.8" fill="#BF8B2E"/><circle cx="11" cy="11" r="0.9" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">సుముహూర్తం</span><span class="pill-value" data-scroll-target="event-wedding-time">{{event-wedding-time}}</span></div></div>{{/if}}
      {{#if venue-te}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><rect x="2" y="18" width="18" height="2" rx="0.6" fill="#A8213A" opacity="0.65"/><rect x="3.5" y="15.5" width="15" height="2.5" rx="0.6" fill="#A8213A" opacity="0.5"/><rect x="4.5" y="10" width="2" height="5.5" rx="0.6" fill="#BF8B2E" opacity="0.75"/><rect x="15.5" y="10" width="2" height="5.5" rx="0.6" fill="#BF8B2E" opacity="0.75"/><path d="M5.5 10.5 Q11 7 16.5 10.5" stroke="#BF8B2E" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M11 2 L18 10 H4Z" fill="#A8213A" opacity="0.82"/><path d="M11 2 L13.5 6 H8.5Z" fill="#7C1528" opacity="0.7"/><circle cx="11" cy="1.8" r="1.4" fill="#BF8B2E"/><circle cx="11" cy="1.8" r="0.7" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">వేదిక</span><span class="pill-value" data-scroll-target="venue-te">{{venue-te}}</span></div></div>{{/if}}
    </div>
  </div>

  {{#if event-reception-date}}
  <div class="event-card" style="--delay:.7s">
    <div class="card-accent"></div>
    <div class="corner tl"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner tr"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner bl"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div><div class="corner br"><svg viewBox="0 0 28 28" fill="none"><path d="M2 26L2 2L26 2" stroke="#BF8B2E" stroke-width="1.5"/><circle cx="2" cy="2" r="2" fill="#BF8B2E"/></svg></div>
    <div class="card-header">
      <div class="icon-wrap"><svg viewBox="0 0 30 30" fill="none"><ellipse cx="15" cy="17" rx="11" ry="9" fill="rgba(217,169,66,0.28)" stroke="#BF8B2E" stroke-width="1.5"/><ellipse cx="15" cy="17" rx="8.5" ry="7" stroke="#BF8B2E" stroke-width="0.7" stroke-dasharray="2.5 2" opacity="0.45"/><circle cx="9.5" cy="15" r="2.5" stroke="#A8213A" stroke-width="1.2"/><circle cx="20.5" cy="15" r="2.5" stroke="#A8213A" stroke-width="1.2"/><circle cx="15" cy="12.5" r="2.2" stroke="#A8213A" stroke-width="1.2"/><ellipse cx="15" cy="20" rx="3.5" ry="1.8" fill="#BF8B2E" opacity="0.28"/><path d="M15 5 C14 5 11.5 6 11 8 C10.5 10 12 11.5 15 11 C18 10.5 19.5 9 19 7 C18.5 5.5 16.5 5 15 5Z" fill="#A8213A" opacity="0.55"/></svg></div>
      <div class="card-header-text"><span class="card-event-label">కార్యక్రమం - ౨</span><span class="card-event-title">విందు సమారంభం</span></div>
    </div>
    <div class="card-body">
      <div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><rect x="2" y="4.5" width="18" height="14.5" rx="2.5" fill="rgba(168,33,58,0.07)" stroke="#A8213A" stroke-width="1.4"/><path d="M2 7 Q2 4.5 4.5 4.5 H17.5 Q20 4.5 20 7 V8 H2Z" fill="#A8213A" opacity="0.18"/><line x1="2" y1="8" x2="20" y2="8" stroke="#A8213A" stroke-width="1.3"/><rect x="6" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><rect x="14" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><circle cx="6.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="12" r="1.3" fill="#A8213A"/><circle cx="15.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="16.5" r="1" fill="#BF8B2E" opacity="0.6"/></svg></div><div class="pill-text"><span class="pill-label">తేదీ</span><span class="pill-value" data-scroll-target="event-reception-date">{{event-reception-date}} — {{event-reception-day}}</span></div></div>
      {{#if event-reception-time}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#A8213A" stroke-width="1.5" fill="rgba(168,33,58,0.06)"/><line x1="11" y1="4" x2="11" y2="5.4" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="11" x2="16.6" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="18" x2="11" y2="16.6" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="4" y1="11" x2="5.4" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="11" x2="7.5" y2="7.5" stroke="#A8213A" stroke-width="1.7" stroke-linecap="round"/><line x1="11" y1="11" x2="11" y2="6" stroke="#A8213A" stroke-width="1.2" stroke-linecap="round"/><circle cx="11" cy="11" r="1.8" fill="#BF8B2E"/><circle cx="11" cy="11" r="0.9" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">సమయం</span><span class="pill-value" data-scroll-target="event-reception-time">{{event-reception-time}}</span></div></div>{{/if}}
      {{#if reception-venue-te}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><path d="M11 2 C7.8 2 5.5 4.5 5.5 7.5 C5.5 12.5 11 20 11 20 C11 20 16.5 12.5 16.5 7.5 C16.5 4.5 14.2 2 11 2Z" fill="rgba(168,33,58,0.1)" stroke="#A8213A" stroke-width="1.4" stroke-linejoin="round"/><circle cx="11" cy="9" r="1.3" fill="#A8213A"/><circle cx="11" cy="9" r="0.6" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">వేదిక</span><span class="pill-value" data-scroll-target="venue-te"><span class="venue-badge"><svg viewBox="0 0 14 14" fill="none"><path d="M7 1.5C5 1.5 3.5 3.2 3.5 5.2 C3.5 8.5 7 12.5 7 12.5 C7 12.5 10.5 8.5 10.5 5.2 C10.5 3.2 9 1.5 7 1.5Z" fill="rgba(168,33,58,0.18)" stroke="#A8213A" stroke-width="1.2"/><circle cx="7" cy="5" r="1.6" fill="#A8213A"/><circle cx="7" cy="5" r="0.7" fill="#F0D98A"/></svg>{{reception-venue-te}}</span></span></div></div>{{/if}}
    </div>
  </div>
  {{/if}}

  {{#if event-1-name-te}}
  <div class="event-card" style="--delay:0.9s">
    <div class="card-accent"></div>
    <div class="card-header">
      <div class="icon-wrap"><svg viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="10" stroke="#BF8B2E" stroke-width="1.5" fill="rgba(217,169,66,0.1)"/><path d="M15 8 L15 15 L20 20" stroke="#A8213A" stroke-width="2" stroke-linecap="round"/></svg></div>
      <div class="card-header-text"><span class="card-event-label">అదనపు కార్యక్రమం</span><span class="card-event-title" data-scroll-target="event-1-name-te">{{event-1-name-te}}</span></div>
    </div>
    <div class="card-body">
      {{#if event-1-date}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><rect x="2" y="4.5" width="18" height="14.5" rx="2.5" fill="rgba(168,33,58,0.07)" stroke="#A8213A" stroke-width="1.4"/><path d="M2 7 Q2 4.5 4.5 4.5 H17.5 Q20 4.5 20 7 V8 H2Z" fill="#A8213A" opacity="0.18"/><line x1="2" y1="8" x2="20" y2="8" stroke="#A8213A" stroke-width="1.3"/><rect x="6" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><rect x="14" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><circle cx="6.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="12" r="1.3" fill="#A8213A"/><circle cx="15.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="16.5" r="1" fill="#BF8B2E" opacity="0.6"/></svg></div><div class="pill-text"><span class="pill-label">తేదీ</span><span class="pill-value" data-scroll-target="event-1-date">{{event-1-date}} — {{event-1-day}}</span></div></div>{{/if}}
      {{#if event-1-time}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#A8213A" stroke-width="1.5" fill="rgba(168,33,58,0.06)"/><line x1="11" y1="4" x2="11" y2="5.4" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="11" x2="16.6" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="18" x2="11" y2="16.6" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="4" y1="11" x2="5.4" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="11" x2="7.5" y2="7.5" stroke="#A8213A" stroke-width="1.7" stroke-linecap="round"/><line x1="11" y1="11" x2="11" y2="6" stroke="#A8213A" stroke-width="1.2" stroke-linecap="round"/><circle cx="11" cy="11" r="1.8" fill="#BF8B2E"/><circle cx="11" cy="11" r="0.9" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">సమయం</span><span class="pill-value" data-scroll-target="event-1-time">{{event-1-time}}</span></div></div>{{/if}}
      {{#if event-1-venue-te}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><path d="M11 2 C7.8 2 5.5 4.5 5.5 7.5 C5.5 12.5 11 20 11 20 C11 20 16.5 12.5 16.5 7.5 C16.5 4.5 14.2 2 11 2Z" fill="rgba(168,33,58,0.1)" stroke="#A8213A" stroke-width="1.4" stroke-linejoin="round"/><circle cx="11" cy="9" r="1.3" fill="#A8213A"/><circle cx="11" cy="9" r="0.6" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">వేదిక</span><span class="pill-value" data-scroll-target="event-1-venue-te">{{event-1-venue-te}}</span></div></div>{{/if}}
      {{#if event-1-maps}}<div class="map-link-wrap"><a href="{{event-1-maps}}" target="_blank" rel="noopener" class="venue-badge">📍 మ్యాప్ చూడండి</a></div>{{/if}}
    </div>
  </div>
  {{/if}}
  {{#if event-2-name-te}}
  <div class="event-card" style="--delay:1.1s">
    <div class="card-accent"></div>
    <div class="card-header">
      <div class="icon-wrap"><svg viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="10" stroke="#BF8B2E" stroke-width="1.5" fill="rgba(217,169,66,0.1)"/><path d="M15 8 L15 15 L20 20" stroke="#A8213A" stroke-width="2" stroke-linecap="round"/></svg></div>
      <div class="card-header-text"><span class="card-event-label">అదనపు కార్యక్రమం</span><span class="card-event-title" data-scroll-target="event-2-name-te">{{event-2-name-te}}</span></div>
    </div>
    <div class="card-body">
      {{#if event-2-date}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><rect x="2" y="4.5" width="18" height="14.5" rx="2.5" fill="rgba(168,33,58,0.07)" stroke="#A8213A" stroke-width="1.4"/><path d="M2 7 Q2 4.5 4.5 4.5 H17.5 Q20 4.5 20 7 V8 H2Z" fill="#A8213A" opacity="0.18"/><line x1="2" y1="8" x2="20" y2="8" stroke="#A8213A" stroke-width="1.3"/><rect x="6" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><rect x="14" y="2.5" width="2" height="4" rx="1" fill="#BF8B2E"/><circle cx="6.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="12" r="1.3" fill="#A8213A"/><circle cx="15.5" cy="12" r="1.3" fill="#A8213A"/><circle cx="11" cy="16.5" r="1" fill="#BF8B2E" opacity="0.6"/></svg></div><div class="pill-text"><span class="pill-label">తేదీ</span><span class="pill-value" data-scroll-target="event-2-date">{{event-2-date}} — {{event-2-day}}</span></div></div>{{/if}}
      {{#if event-2-time}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#A8213A" stroke-width="1.5" fill="rgba(168,33,58,0.06)"/><line x1="11" y1="4" x2="11" y2="5.4" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="11" x2="16.6" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="18" x2="11" y2="16.6" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="4" y1="11" x2="5.4" y2="11" stroke="#BF8B2E" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="11" x2="7.5" y2="7.5" stroke="#A8213A" stroke-width="1.7" stroke-linecap="round"/><line x1="11" y1="11" x2="11" y2="6" stroke="#A8213A" stroke-width="1.2" stroke-linecap="round"/><circle cx="11" cy="11" r="1.8" fill="#BF8B2E"/><circle cx="11" cy="11" r="0.9" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">సమయం</span><span class="pill-value" data-scroll-target="event-2-time">{{event-2-time}}</span></div></div>{{/if}}
      {{#if event-2-venue-te}}<div class="detail-pill"><div class="detail-icon"><svg viewBox="0 0 22 22" fill="none"><path d="M11 2 C7.8 2 5.5 4.5 5.5 7.5 C5.5 12.5 11 20 11 20 C11 20 16.5 12.5 16.5 7.5 C16.5 4.5 14.2 2 11 2Z" fill="rgba(168,33,58,0.1)" stroke="#A8213A" stroke-width="1.4" stroke-linejoin="round"/><circle cx="11" cy="9" r="1.3" fill="#A8213A"/><circle cx="11" cy="9" r="0.6" fill="#F0D98A"/></svg></div><div class="pill-text"><span class="pill-label">వేదిక</span><span class="pill-value" data-scroll-target="event-2-venue-te">{{event-2-venue-te}}</span></div></div>{{/if}}
      {{#if event-2-maps}}<div class="map-link-wrap"><a href="{{event-2-maps}}" target="_blank" rel="noopener" class="venue-badge">📍 మ్యాప్ చూడండి</a></div>{{/if}}
    </div>
  </div>
  {{/if}}
</div>

{{#if venue-te}}
<div class="section-divider-bar"><div class="bar-line"></div><span class="bar-text">✦ కళ్యాణ వేదిక ✦</span><div class="bar-line r"></div></div>
<div class="venue-wrapper">
  <div class="venue-section">
    <div class="venue-left"><img src="https://www.schedy.in/assets/pillar.png" alt=""></div>
    <div class="venue-right" data-scroll-target="venue-te">
      <div class="venue-eyebrow">వేదిక</div>
      <h2 class="venue-title">కళ్యాణ వేదిక</h2>
      <div class="venue-divider"><span></span><div class="dot"></div><span></span></div>
      <h3 class="venue-name">{{venue-te}}</h3>
      {{#if venue-address}}<p class="venue-address">{{venue-address}}</p>{{/if}}
      {{#if venue-maps}}<a href="{{venue-maps}}" target="_blank" rel="noopener" class="venue-btn">స్థానం చూడండి <svg viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>{{/if}}
    </div>
  </div>
</div>
{{/if}}

<div class="section-divider-bar"><div class="bar-line"></div><span class="bar-text">✦ శుభాకాంక్షలు ✦</span><div class="bar-line r"></div></div>

<div class="invitation-section" id="invitationSection">
  <div class="invite-sub">ఆహ్వానం</div>
  <h2 class="invite-title">ఆహ్వానము</h2>
  <div class="invite-head-divider"><span></span><div class="dot"></div><span></span></div>
  <div class="invite-card">
    <p class="invite-text" id="typeText">{{#if surname-te}}{{surname-te}} కుటుంబము వారి {{/if}}శుభ వివాహ కార్యక్రమమునకు మీరు సకుటుంబ సపరివార సమేతంగా విచ్చేసి, నూతన వధూవరులను ఆశీర్వదించి మా ఆనందాన్ని రెట్టింపు చేయవలసినదిగా సవినయంగా ప్రార్థిస్తున్నాము.</p>
    <div class="invite-divider" id="dividerInvite"><span></span><div class="plus">✦</div><span></span></div>
    <div class="invite-names" id="namesInvite">
      <div class="invite-from">ఇట్లు</div>
      <div class="inv-line" data-scroll-target="groom-father-te">{{#if groom-father-te}}శ్రీ {{groom-father-te}}{{/if}}{{#if groom-mother-te}}{{#if groom-father-te}} &amp; {{/if}}శ్రీమతి {{groom-mother-te}}{{/if}}</div>
      <div class="inv-line" data-scroll-target="bride-father-te">{{#if bride-father-te}}శ్రీ {{bride-father-te}}{{/if}}{{#if bride-mother-te}}{{#if bride-father-te}} &amp; {{/if}}శ్రీమతి {{bride-mother-te}}{{/if}}</div>
    </div>
  </div>
  <div class="invite-scroll-cue"><div class="invite-scroll-cue-track"><div class="invite-scroll-cue-thumb"></div></div><div class="invite-scroll-cue-label">క్రిందికి</div></div>
</div>

<div class="contact-wrapper">
  <h1 class="contact-title">సంప్రదించండి</h1>
  <div class="contact-group">
    <div class="contact-section-title">వరుడు వైపు కుటుంబం</div>
    {{#if groom-father-phone}}
    <div class="contact-card" data-scroll-target="groom-father-phone">
      <div class="contact-left">
        <div class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="contact-text"><small>తండ్రి</small><h3>{{groom-father-te}}</h3><div class="contact-phone">{{groom-father-phone}}</div></div>
      </div>
      <div class="contact-actions">
        <a href="tel:{{groom-father-phone}}" class="contact-btn" aria-label="Call"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></a>
        <a href="https://wa.me/{{groom-father-wa}}?text=నమస్కారం" target="_blank" rel="noopener" class="contact-btn" aria-label="WhatsApp"><svg viewBox="0 0 512 512" width="20" height="20"><path fill="#25D366" d="M256.06 0C114.62 0 0 114.62 0 256.06c0 45.18 11.8 87.62 32.41 124.34L0 512l134.59-32.1c35.41 19.38 75.9 30.42 121.47 30.42 141.44 0 256.06-114.62 256.06-256.06S397.5 0 256.06 0z"/><path fill="#fff" d="M380.9 334.09c-5.28-2.64-31.2-15.39-36.05-17.16-4.85-1.76-8.38-2.64-11.92 2.64-3.52 5.28-13.64 17.16-16.73 20.7-3.08 3.52-6.16 3.96-11.44 1.32-31.2-15.6-51.66-27.9-72.3-63.12-5.46-9.4 5.46-8.74 15.6-29.16 1.76-3.52.88-6.6-.44-9.24-1.32-2.64-11.92-28.74-16.33-39.38-4.29-10.32-8.64-8.9-11.92-9.06-3.08-.16-6.6-.2-10.12-.2s-9.24 1.32-14.08 6.6c-4.85 5.28-18.48 18.04-18.48 43.98s18.92 51.06 21.56 54.6c2.64 3.52 37.24 56.86 90.22 79.74 12.6 5.44 22.44 8.68 30.12 11.12 12.66 4.04 24.2 3.48 33.3 2.12 10.16-1.52 31.2-12.74 35.6-25.04 4.4-12.3 4.4-22.84 3.08-25.04-1.32-2.2-4.85-3.52-10.12-6.16z"/></svg></a>
      </div>
    </div>
    {{/if}}
    {{#if groom-mother-phone}}
    <div class="contact-card" data-scroll-target="groom-mother-phone">
      <div class="contact-left">
        <div class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="contact-text"><small>తల్లి</small><h3>{{groom-mother-te}}</h3><div class="contact-phone">{{groom-mother-phone}}</div></div>
      </div>
      <div class="contact-actions">
        <a href="tel:{{groom-mother-phone}}" class="contact-btn" aria-label="Call"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></a>
        <a href="https://wa.me/{{groom-mother-wa}}?text=నమస్కారం" target="_blank" rel="noopener" class="contact-btn" aria-label="WhatsApp"><svg viewBox="0 0 512 512" width="20" height="20"><path fill="#25D366" d="M256.06 0C114.62 0 0 114.62 0 256.06c0 45.18 11.8 87.62 32.41 124.34L0 512l134.59-32.1c35.41 19.38 75.9 30.42 121.47 30.42 141.44 0 256.06-114.62 256.06-256.06S397.5 0 256.06 0z"/><path fill="#fff" d="M380.9 334.09c-5.28-2.64-31.2-15.39-36.05-17.16-4.85-1.76-8.38-2.64-11.92 2.64-3.52 5.28-13.64 17.16-16.73 20.7-3.08 3.52-6.16 3.96-11.44 1.32-31.2-15.6-51.66-27.9-72.3-63.12-5.46-9.4 5.46-8.74 15.6-29.16 1.76-3.52.88-6.6-.44-9.24-1.32-2.64-11.92-28.74-16.33-39.38-4.29-10.32-8.64-8.9-11.92-9.06-3.08-.16-6.6-.2-10.12-.2s-9.24 1.32-14.08 6.6c-4.85 5.28-18.48 18.04-18.48 43.98s18.92 51.06 21.56 54.6c2.64 3.52 37.24 56.86 90.22 79.74 12.6 5.44 22.44 8.68 30.12 11.12 12.66 4.04 24.2 3.48 33.3 2.12 10.16-1.52 31.2-12.74 35.6-25.04 4.4-12.3 4.4-22.84 3.08-25.04-1.32-2.2-4.85-3.52-10.12-6.16z"/></svg></a>
      </div>
    </div>
    {{/if}}
    {{#if groom-extra-1-phone}}
    <div class="contact-card" data-scroll-target="groom-extra-1-phone">
      <div class="contact-left">
        <div class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="contact-text"><small>బంధువులు / మిత్రులు</small><h3>{{groom-extra-1-te}}</h3><div class="contact-phone">{{groom-extra-1-phone}}</div></div>
      </div>
      <div class="contact-actions">
        <a href="tel:{{groom-extra-1-phone}}" class="contact-btn" aria-label="Call"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></a>
        <a href="https://wa.me/{{groom-extra-1-wa}}?text=నమస్కారం" target="_blank" rel="noopener" class="contact-btn" aria-label="WhatsApp"><svg viewBox="0 0 512 512" width="20" height="20"><path fill="#25D366" d="M256.06 0C114.62 0 0 114.62 0 256.06c0 45.18 11.8 87.62 32.41 124.34L0 512l134.59-32.1c35.41 19.38 75.9 30.42 121.47 30.42 141.44 0 256.06-114.62 256.06-256.06S397.5 0 256.06 0z"/><path fill="#fff" d="M380.9 334.09c-5.28-2.64-31.2-15.39-36.05-17.16-4.85-1.76-8.38-2.64-11.92 2.64-3.52 5.28-13.64 17.16-16.73 20.7-3.08 3.52-6.16 3.96-11.44 1.32-31.2-15.6-51.66-27.9-72.3-63.12-5.46-9.4 5.46-8.74 15.6-29.16 1.76-3.52.88-6.6-.44-9.24-1.32-2.64-11.92-28.74-16.33-39.38-4.29-10.32-8.64-8.9-11.92-9.06-3.08-.16-6.6-.2-10.12-.2s-9.24 1.32-14.08 6.6c-4.85 5.28-18.48 18.04-18.48 43.98s18.92 51.06 21.56 54.6c2.64 3.52 37.24 56.86 90.22 79.74 12.6 5.44 22.44 8.68 30.12 11.12 12.66 4.04 24.2 3.48 33.3 2.12 10.16-1.52 31.2-12.74 35.6-25.04 4.4-12.3 4.4-22.84 3.08-25.04-1.32-2.2-4.85-3.52-10.12-6.16z"/></svg></a>
      </div>
    </div>
    {{/if}}
  </div>
  <div class="contact-group">
    <div class="contact-section-title">వధువు వైపు కుటుంబం</div>
    {{#if bride-father-phone}}
    <div class="contact-card" data-scroll-target="bride-father-phone">
      <div class="contact-left">
        <div class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="contact-text"><small>తండ్రి</small><h3>{{bride-father-te}}</h3><div class="contact-phone">{{bride-father-phone}}</div></div>
      </div>
      <div class="contact-actions">
        <a href="tel:{{bride-father-phone}}" class="contact-btn" aria-label="Call"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></a>
        <a href="https://wa.me/{{bride-father-wa}}?text=నమస్కారం" target="_blank" rel="noopener" class="contact-btn" aria-label="WhatsApp"><svg viewBox="0 0 512 512" width="20" height="20"><path fill="#25D366" d="M256.06 0C114.62 0 0 114.62 0 256.06c0 45.18 11.8 87.62 32.41 124.34L0 512l134.59-32.1c35.41 19.38 75.9 30.42 121.47 30.42 141.44 0 256.06-114.62 256.06-256.06S397.5 0 256.06 0z"/><path fill="#fff" d="M380.9 334.09c-5.28-2.64-31.2-15.39-36.05-17.16-4.85-1.76-8.38-2.64-11.92 2.64-3.52 5.28-13.64 17.16-16.73 20.7-3.08 3.52-6.16 3.96-11.44 1.32-31.2-15.6-51.66-27.9-72.3-63.12-5.46-9.4 5.46-8.74 15.6-29.16 1.76-3.52.88-6.6-.44-9.24-1.32-2.64-11.92-28.74-16.33-39.38-4.29-10.32-8.64-8.9-11.92-9.06-3.08-.16-6.6-.2-10.12-.2s-9.24 1.32-14.08 6.6c-4.85 5.28-18.48 18.04-18.48 43.98s18.92 51.06 21.56 54.6c2.64 3.52 37.24 56.86 90.22 79.74 12.6 5.44 22.44 8.68 30.12 11.12 12.66 4.04 24.2 3.48 33.3 2.12 10.16-1.52 31.2-12.74 35.6-25.04 4.4-12.3 4.4-22.84 3.08-25.04-1.32-2.2-4.85-3.52-10.12-6.16z"/></svg></a>
      </div>
    </div>
    {{/if}}
    {{#if bride-mother-phone}}
    <div class="contact-card" data-scroll-target="bride-mother-phone">
      <div class="contact-left">
        <div class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="contact-text"><small>తల్లి</small><h3>{{bride-mother-te}}</h3><div class="contact-phone">{{bride-mother-phone}}</div></div>
      </div>
      <div class="contact-actions">
        <a href="tel:{{bride-mother-phone}}" class="contact-btn" aria-label="Call"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></a>
        <a href="https://wa.me/{{bride-mother-wa}}?text=నమస్కారం" target="_blank" rel="noopener" class="contact-btn" aria-label="WhatsApp"><svg viewBox="0 0 512 512" width="20" height="20"><path fill="#25D366" d="M256.06 0C114.62 0 0 114.62 0 256.06c0 45.18 11.8 87.62 32.41 124.34L0 512l134.59-32.1c35.41 19.38 75.9 30.42 121.47 30.42 141.44 0 256.06-114.62 256.06-256.06S397.5 0 256.06 0z"/><path fill="#fff" d="M380.9 334.09c-5.28-2.64-31.2-15.39-36.05-17.16-4.85-1.76-8.38-2.64-11.92 2.64-3.52 5.28-13.64 17.16-16.73 20.7-3.08 3.52-6.16 3.96-11.44 1.32-31.2-15.6-51.66-27.9-72.3-63.12-5.46-9.4 5.46-8.74 15.6-29.16 1.76-3.52.88-6.6-.44-9.24-1.32-2.64-11.92-28.74-16.33-39.38-4.29-10.32-8.64-8.9-11.92-9.06-3.08-.16-6.6-.2-10.12-.2s-9.24 1.32-14.08 6.6c-4.85 5.28-18.48 18.04-18.48 43.98s18.92 51.06 21.56 54.6c2.64 3.52 37.24 56.86 90.22 79.74 12.6 5.44 22.44 8.68 30.12 11.12 12.66 4.04 24.2 3.48 33.3 2.12 10.16-1.52 31.2-12.74 35.6-25.04 4.4-12.3 4.4-22.84 3.08-25.04-1.32-2.2-4.85-3.52-10.12-6.16z"/></svg></a>
      </div>
    </div>
    {{/if}}
    {{#if bride-extra-1-phone}}
    <div class="contact-card" data-scroll-target="bride-extra-1-phone">
      <div class="contact-left">
        <div class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="contact-text"><small>బంధువులు / మిత్రులు</small><h3>{{bride-extra-1-te}}</h3><div class="contact-phone">{{bride-extra-1-phone}}</div></div>
      </div>
      <div class="contact-actions">
        <a href="tel:{{bride-extra-1-phone}}" class="contact-btn" aria-label="Call"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></a>
        <a href="https://wa.me/{{bride-extra-1-wa}}?text=నమస్కారం" target="_blank" rel="noopener" class="contact-btn" aria-label="WhatsApp"><svg viewBox="0 0 512 512" width="20" height="20"><path fill="#25D366" d="M256.06 0C114.62 0 0 114.62 0 256.06c0 45.18 11.8 87.62 32.41 124.34L0 512l134.59-32.1c35.41 19.38 75.9 30.42 121.47 30.42 141.44 0 256.06-114.62 256.06-256.06S397.5 0 256.06 0z"/><path fill="#fff" d="M380.9 334.09c-5.28-2.64-31.2-15.39-36.05-17.16-4.85-1.76-8.38-2.64-11.92 2.64-3.52 5.28-13.64 17.16-16.73 20.7-3.08 3.52-6.16 3.96-11.44 1.32-31.2-15.6-51.66-27.9-72.3-63.12-5.46-9.4 5.46-8.74 15.6-29.16 1.76-3.52.88-6.6-.44-9.24-1.32-2.64-11.92-28.74-16.33-39.38-4.29-10.32-8.64-8.9-11.92-9.06-3.08-.16-6.6-.2-10.12-.2s-9.24 1.32-14.08 6.6c-4.85 5.28-18.48 18.04-18.48 43.98s18.92 51.06 21.56 54.6c2.64 3.52 37.24 56.86 90.22 79.74 12.6 5.44 22.44 8.68 30.12 11.12 12.66 4.04 24.2 3.48 33.3 2.12 10.16-1.52 31.2-12.74 35.6-25.04 4.4-12.3 4.4-22.84 3.08-25.04-1.32-2.2-4.85-3.52-10.12-6.16z"/></svg></a>
      </div>
    </div>
    {{/if}}
  </div>
</div>

<div class="premium-footer">
  <div class="heart-divider"><span></span><div class="heart-icon">❤️</div><span></span></div>
  <div class="couple-names">{{groom-te}} &amp; {{bride-te}}</div>
  <div class="wedding-datetime">{{event-wedding-date}}{{#if event-wedding-time}} &nbsp;|&nbsp; {{event-wedding-time}}{{/if}}</div>
  <div class="blessing-text">సాక్షిగా స్వస్తి వాక్కులతో</div>
</div>

<script>
/* Runs on the public invitation only: the editor preview never executes template scripts, so everything below is decoration
   and the page must read correctly without it (nothing is hidden until the script chooses to animate it). */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* falling flowers, inside the second section */
  var box = document.getElementById('flower-container');
  if (box && !reduce && box.animate) {
    var SRC = 'https://www.schedy.in/assets/single-flower.webp', TOTAL = 14;
    var spawn = function () {
      var banner = document.querySelector('.flower-banner');
      var startY = banner ? banner.offsetTop + banner.offsetHeight * 0.6 : 80;
      var size = 14 + Math.random() * 13, w = box.offsetWidth || 360;
      var dist = Math.max(200, box.offsetHeight - startY + 40);
      var dur = 5000 + Math.random() * 5000, r0 = Math.random() * 360, r1 = r0 + (Math.random() - 0.5) * 400;
      var dx = (Math.random() - 0.5) * 70, op = 0.65 + Math.random() * 0.35;
      var img = document.createElement('img');
      img.src = SRC; img.alt = ''; img.className = 'fall-flower';
      img.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + Math.random() * (w - size) + 'px;top:' + startY + 'px;opacity:' + op;
      box.appendChild(img);
      var a = img.animate([
        { transform: 'translate(0,0) rotate(' + r0 + 'deg)', opacity: op },
        { transform: 'translate(' + dx / 2 + 'px,' + dist / 2 + 'px) rotate(' + (r0 + r1) / 2 + 'deg)', opacity: op },
        { transform: 'translate(' + dx + 'px,' + dist + 'px) rotate(' + r1 + 'deg)', opacity: 0 }
      ], { duration: dur, delay: Math.random() * 1500, easing: 'linear', fill: 'forwards' });
      a.onfinish = function () { img.remove(); spawn(); };
    };
    var go = function () { for (var i = 0; i < TOTAL; i++) setTimeout(spawn, i * 250); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }

  /* the invitation line is typed out when it scrolls into view (grapheme by grapheme, so Telugu conjuncts never split) */
  var sec = document.getElementById('invitationSection'), el = document.getElementById('typeText');
  if (!sec || !el || reduce || !('IntersectionObserver' in window)) return;
  var full = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (!full) return;
  var chars = (window.Intl && Intl.Segmenter)
    ? Array.from(new Intl.Segmenter('te', { granularity: 'grapheme' }).segment(full), function (s) { return s.segment; })
    : Array.from(full);
  var later = [document.getElementById('dividerInvite'), document.getElementById('namesInvite')].filter(Boolean);
  var started = false;
  new IntersectionObserver(function (entries, ob) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || started) return;
      started = true; ob.disconnect();
      el.style.minHeight = el.offsetHeight + 'px';
      el.textContent = '';
      later.forEach(function (n) { n.classList.add('is-hidden'); });
      var i = 0;
      (function tick() {
        if (i < chars.length) { el.textContent += chars[i++]; setTimeout(tick, 32); return; }
        later.forEach(function (n, k) { setTimeout(function () { n.classList.remove('is-hidden'); }, 250 + k * 450); });
      })();
    });
  }, { threshold: 0.35 }).observe(sec);
})();
</script>
$tpl$)
on conflict (id) do update set name = excluded.name, html_code = excluded.html_code;
