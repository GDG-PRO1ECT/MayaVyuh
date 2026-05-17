import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSyncState, broadcastEvent, useEventListener } from "./useSync.js";

// ─── ASSET IMPORTS (Vite resolves these at build time) ───────────────────────
import bg1 from "./assets/bg-1.jpg";
import bg2 from "./assets/bg-2.jpg";
import bg3 from "./assets/bg-3.jpg";
import bg4 from "./assets/bg-4.jpg";
import bg5 from "./assets/bg-5.jpg";

const BG_IMAGES = [bg1, bg2, bg3, bg4, bg5];

// ─── INITIAL SHARED STATE ─────────────────────────────────────────────────────
const INIT_TEAMS = [];
const INIT_WORDS = ["dragon", "ancient", "fire"];
const INIT_TIMERS = { round1: 300, round2: 300, round3: 300, discussion: 120, swap: 60 };
const INIT_EVENT_STATE = { started: false, phase: "lobby" };

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=IM+Fell+English:ital@0;1&family=Share+Tech+Mono&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --void: #04050a; --abyss: #080c14; --stone: #0e1420; --slate: #141c2e;
      --rune-gold: #c8920a; --rune-gold-glow: #f5b800; --rune-amber: #d4780a;
      --oracle-blue: #00d4ff; --oracle-glow: #0099cc;
      --spirit-purple: #8b5cf6; --spirit-glow: #a78bfa;
      --blood-red: #cc2200; --blood-glow: #ff3300;
      --parchment: #c4a46b; --parchment-dim: #7a6340;
      --text-bright: #e8dcc8; --text-dim: #6b5e4a;
      --border-rune: rgba(200,146,10,0.3); --border-oracle: rgba(0,212,255,0.3);
    }
    html, body { background: var(--void); color: var(--text-bright); font-family: 'Cinzel', serif; overflow-x: hidden; }
    #root { width: 100%; max-width: 100%; margin: 0; text-align: left; border: none; min-height: 100svh; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--abyss); } ::-webkit-scrollbar-thumb { background: var(--rune-gold); border-radius: 2px; }

    /* ── Backgrounds ── */
    .immersive-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
    .bg-layer { position: absolute; inset: -5%; background-size: cover; background-position: center; opacity: 0; transition: opacity 2.5s ease-in-out; filter: sepia(0.4) contrast(1.15) brightness(0.55); }
    .bg-layer.active { opacity: 1; }
    .bg-layer.pan-a { animation: panBg 40s linear infinite; }
    .bg-layer.pan-b { animation: panBgSlow 55s linear infinite; }
    .bg-layer.pan-c { animation: panBg 45s linear infinite reverse; }
    .bg-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(4,5,10,0.72) 0%, rgba(4,5,10,0.92) 100%); }
    .particle-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; opacity: 0.4; }
    .grid-bg { position: fixed; inset: 0; z-index: 1; pointer-events: none; background-image: linear-gradient(rgba(200,146,10,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(200,146,10,0.022) 1px, transparent 1px); background-size: 60px 60px; }
    .bg-runes { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 1; opacity: 0.04; }
    .bg-rune { position: absolute; font-size: 80px; color: var(--rune-gold); animation: runeFloat 6s ease-in-out infinite; }

    /* ── Keyframes ── */
    @keyframes goldPulse { 0%,100%{text-shadow:0 0 8px var(--rune-gold),0 0 20px var(--rune-gold-glow)} 50%{text-shadow:0 0 15px var(--rune-gold),0 0 40px var(--rune-gold-glow),0 0 60px var(--rune-amber)} }
    @keyframes oraclePulse { 0%,100%{box-shadow:0 0 15px var(--oracle-glow)} 50%{box-shadow:0 0 30px var(--oracle-glow),0 0 60px rgba(0,212,255,0.3)} }
    @keyframes screenShake { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-8px,4px)} 20%{transform:translate(8px,-4px)} 30%{transform:translate(-6px,6px)} 40%{transform:translate(6px,-2px)} 50%{transform:translate(-4px,8px)} 60%{transform:translate(4px,-6px)} 70%{transform:translate(-2px,4px)} 80%{transform:translate(2px,-2px)} 90%{transform:translate(-1px,1px)} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
    @keyframes runeFloat { 0%,100%{transform:translateY(0) rotate(0deg);opacity:0.6} 50%{transform:translateY(-20px) rotate(5deg);opacity:1} }
    @keyframes labyLoading { 0%{stroke-dashoffset:300} 100%{stroke-dashoffset:0} }
    @keyframes banPulse { 0%,100%{box-shadow:0 0 15px var(--blood-red),0 0 30px var(--blood-red)} 50%{box-shadow:0 0 30px var(--blood-glow),0 0 60px var(--blood-glow),0 0 100px rgba(255,51,0,0.5)} }
    @keyframes toastSlide { 0%{transform:translateY(-120px);opacity:0} 15%{transform:translateY(0);opacity:1} 85%{transform:translateY(0);opacity:1} 100%{transform:translateY(-120px);opacity:0} }
    @keyframes disqualFlash { 0%,100%{opacity:1} 50%{opacity:0.7} }
    @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes panBg { 0%{transform:scale(1.05) translate(0,0)} 25%{transform:scale(1.1) translate(-1%,1%)} 50%{transform:scale(1.05) translate(1%,-1%)} 75%{transform:scale(1.1) translate(1%,1%)} 100%{transform:scale(1.05) translate(0,0)} }
    @keyframes panBgSlow { 0%{transform:scale(1.1) translate(1%,1%)} 50%{transform:scale(1.05) translate(-1%,-1%)} 100%{transform:scale(1.1) translate(1%,1%)} }
    @keyframes ringRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes victoryGlow { 0%,100%{filter:drop-shadow(0 0 8px var(--rune-gold))} 50%{filter:drop-shadow(0 0 24px var(--rune-gold-glow)) drop-shadow(0 0 48px var(--rune-amber))} }
    @keyframes pendingPulse { 0%,100%{border-color:rgba(255,200,0,0.3)} 50%{border-color:rgba(255,200,0,0.9)} }
    @keyframes approvedFlash { 0%{background:rgba(0,255,136,0.3)} 100%{background:rgba(0,255,136,0.05)} }
    @keyframes lockRingHint { 0%{transform:rotate(0deg)} 15%{transform:rotate(8deg)} 30%{transform:rotate(-4deg)} 45%{transform:rotate(2deg)} 60%{transform:rotate(0deg)} 100%{transform:rotate(0deg)} }

    /* ── Admin shell ── */
    .app-shell { min-height: 100vh; position: relative; z-index: 2; }
    .admin-nav { position:fixed;left:0;top:0;height:100vh;width:260px;background:linear-gradient(180deg,var(--abyss) 0%,var(--stone) 100%);border-right:1px solid var(--border-rune);display:flex;flex-direction:column;z-index:100;overflow:hidden; }
    .admin-nav::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--rune-gold),transparent); }
    .nav-logo { padding:28px 20px 20px;border-bottom:1px solid var(--border-rune); }
    .nav-logo h1 { font-family:'Cinzel Decorative',serif;font-size:18px;font-weight:900;color:var(--rune-gold);animation:goldPulse 3s infinite;letter-spacing:2px;line-height:1.3; }
    .nav-logo p { font-family:'IM Fell English',serif;font-size:13px;color:var(--parchment-dim);margin-top:4px;letter-spacing:3px;font-style:italic; }
    .nav-items { flex:1;padding:20px 0;overflow-y:auto; }
    .nav-section-title { font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--parchment-dim);letter-spacing:3px;padding:16px 20px 8px;text-transform:uppercase; }
    .nav-item { display:flex;align-items:center;gap:12px;padding:12px 20px;cursor:pointer;border-left:3px solid transparent;transition:all 0.3s;font-size:15px;letter-spacing:1px;color:var(--parchment-dim); }
    .nav-item:hover,.nav-item.active { background:rgba(200,146,10,0.08);border-left-color:var(--rune-gold);color:var(--rune-gold); }
    .nav-footer { padding:16px 20px;border-top:1px solid var(--border-rune); }
    .system-status { display:flex;align-items:center;gap:8px;font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--parchment-dim); }
    .status-dot { width:6px;height:6px;border-radius:50%;background:#00ff88;box-shadow:0 0 8px #00ff88;animation:oraclePulse 2s infinite; }
    .admin-main { margin-left:260px;min-height:100vh;padding:0 30px 30px; }
    .top-bar { height:50px;background:var(--abyss);border-bottom:1px solid var(--border-rune);display:flex;align-items:center;padding:0 30px;justify-content:space-between;position:sticky;top:0;z-index:50; }

    /* ── Cards ── */
    .card { background:linear-gradient(135deg,rgba(8,12,20,0.96),rgba(14,20,32,0.96));border:1px solid var(--border-rune);border-radius:4px;padding:24px;position:relative;overflow:hidden; }
    .card::after { content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(200,146,10,0.03) 0%,transparent 60%);pointer-events:none; }
    .card-title { font-family:'Cinzel',serif;font-size:14px;color:var(--rune-gold);letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border-rune); }
    .grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:20px; }
    .grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px; }
    .stat-card { background:linear-gradient(135deg,rgba(8,12,20,0.96),rgba(14,20,32,0.96));border:1px solid var(--border-rune);border-radius:4px;padding:20px 24px;position:relative;overflow:hidden; }
    .stat-card::before { content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--rune-gold); }
    .stat-value { font-family:'Cinzel Decorative',serif;font-size:32px;color:var(--rune-gold);line-height:1; }
    .stat-label { font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--parchment-dim);letter-spacing:2px;margin-top:6px; }
    .stat-icon { position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:28px;opacity:0.2; }
    .page-header { margin-bottom:32px; }
    .page-header h2 { font-family:'Cinzel Decorative',serif;font-size:22px;color:var(--rune-gold);animation:goldPulse 3s infinite;letter-spacing:3px; }
    .page-header p { font-family:'IM Fell English',serif;color:var(--parchment-dim);font-size:16px;margin-top:6px;font-style:italic; }
    .breadcrumb { font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--parchment-dim);letter-spacing:2px;margin-bottom:8px; }

    /* ── Buttons ── */
    .btn { display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;border-radius:3px;transition:all 0.3s;position:relative;overflow:hidden; }
    .btn-gold { background:linear-gradient(135deg,var(--rune-amber),var(--rune-gold));color:var(--void);font-weight:700;box-shadow:0 0 20px rgba(200,146,10,0.3); }
    .btn-gold:hover { box-shadow:0 0 30px rgba(200,146,10,0.6),0 0 60px rgba(200,146,10,0.2); }
    .btn-ghost { background:transparent;color:var(--rune-gold);border:1px solid var(--border-rune); }
    .btn-ghost:hover { border-color:var(--rune-gold);background:rgba(200,146,10,0.08); }
    .btn-danger { background:linear-gradient(135deg,#8b0000,var(--blood-red));color:#fff;box-shadow:0 0 20px rgba(204,34,0,0.5); }
    .btn-danger:hover { transform:scale(1.02);cursor:crosshair; }
    .btn-oracle { background:linear-gradient(135deg,rgba(0,153,204,0.2),rgba(0,212,255,0.15));color:var(--oracle-blue);border:1px solid rgba(0,212,255,0.4); }
    .btn-oracle:hover { box-shadow:0 0 20px rgba(0,212,255,0.3);border-color:var(--oracle-blue); }
    .btn-approve { background:linear-gradient(135deg,rgba(0,100,60,0.4),rgba(0,200,100,0.2));color:#00ff88;border:1px solid rgba(0,255,136,0.4); }
    .btn-approve:hover { box-shadow:0 0 20px rgba(0,255,136,0.3); }

    /* ── Forms ── */
    .form-group { margin-bottom:20px; }
    .form-label { font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--rune-gold);letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:8px; }
    .form-input,.form-select,.form-textarea { width:100%;background:var(--abyss);border:1px solid var(--border-rune);color:var(--text-bright);padding:10px 14px;border-radius:3px;font-family:'Share Tech Mono',monospace;font-size:15px;outline:none;transition:border-color 0.3s; }
    .form-input:focus,.form-select:focus,.form-textarea:focus { border-color:var(--rune-gold); }
    .form-select option { background:var(--stone); }
    .form-textarea { resize:vertical;min-height:100px;font-family:'IM Fell English',serif;font-size:16px; }

    /* ── Tags ── */
    .tag-input-wrap { background:var(--abyss);border:1px solid var(--border-rune);border-radius:4px;padding:10px 14px;min-height:50px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;transition:border-color 0.3s; }
    .tag-input-wrap:focus-within { border-color:var(--rune-gold); }
    .tag { background:rgba(200,146,10,0.15);border:1px solid rgba(200,146,10,0.4);color:var(--rune-gold);border-radius:2px;padding:3px 8px;font-family:'Share Tech Mono',monospace;font-size:14px;display:flex;align-items:center;gap:6px; }
    .tag-remove { cursor:pointer;opacity:0.6;transition:opacity 0.2s; }
    .tag-remove:hover { opacity:1;color:var(--blood-red); }
    .tag-input { background:none;border:none;outline:none;color:var(--text-bright);font-family:'Share Tech Mono',monospace;font-size:15px;min-width:120px; }

    /* ── Tables ── */
    .data-table { width:100%;border-collapse:collapse; }
    .data-table th { font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:2px;color:var(--parchment-dim);text-align:left;padding:10px 16px;border-bottom:1px solid var(--border-rune);text-transform:uppercase; }
    .data-table tr.team-row { cursor:pointer;transition:all 0.3s;border-bottom:1px solid rgba(200,146,10,0.08); }
    .data-table tr.team-row:hover { background:rgba(200,146,10,0.05); }
    .data-table tr.team-row.expanded { background:rgba(200,146,10,0.08); }
    .data-table td { padding:14px 16px;font-size:15px;color:var(--text-bright);font-family:'Share Tech Mono',monospace;vertical-align:middle; }
    .status-badge { display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:2px;font-size:13px;letter-spacing:1px;font-weight:600; }
    .badge-active { background:rgba(0,255,136,0.12);color:#00ff88;border:1px solid rgba(0,255,136,0.3); }
    .badge-penalized { background:rgba(255,200,0,0.12);color:#ffc800;border:1px solid rgba(255,200,0,0.3); }
    .badge-banned { background:rgba(204,34,0,0.12);color:var(--blood-glow);border:1px solid rgba(204,34,0,0.3); }
    .badge-pending { background:rgba(255,200,0,0.08);color:#ffc800;border:1px solid rgba(255,200,0,0.3);animation:pendingPulse 2s infinite; }
    .badge-approved { background:rgba(0,255,136,0.08);color:#00ff88;border:1px solid rgba(0,255,136,0.3); }
    .expand-row { background:var(--abyss);border-bottom:1px solid var(--border-rune); }
    .spectator-feed { padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px; }
    .feed-panel { background:var(--stone);border:1px solid var(--border-oracle);border-radius:4px;padding:14px; }
    .feed-title { font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--oracle-blue);letter-spacing:2px;margin-bottom:10px; }
    .feed-text { font-family:'IM Fell English',serif;font-size:15px;color:var(--parchment-dim);font-style:italic;line-height:1.6; }
    .live-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#ff4444;box-shadow:0 0 6px #ff4444;animation:oraclePulse 1s infinite;margin-right:6px; }
    .leaderboard-row { display:flex;align-items:center;gap:16px;padding:12px 16px;border-bottom:1px solid rgba(200,146,10,0.06);transition:background 0.2s; }
    .leaderboard-row:hover { background:rgba(200,146,10,0.04); }
    .activity-item { display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(200,146,10,0.06); }
    .alert-panel { background:rgba(204,34,0,0.08);border:1px solid rgba(204,34,0,0.3);border-radius:4px;padding:16px;margin-bottom:12px; }

    /* ── Modals ── */
    .modal-overlay { position:fixed;inset:0;z-index:1000;background:rgba(4,5,10,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center; }
    .modal-glass { background:rgba(14,20,32,0.97);border:1px solid var(--rune-gold);box-shadow:0 0 60px rgba(200,146,10,0.2),0 0 120px rgba(200,146,10,0.1);border-radius:6px;padding:36px;max-width:500px;width:90%;position:relative;overflow:hidden; }
    .modal-glass::before { content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--rune-gold),transparent); }
    .modal-title { font-family:'Cinzel Decorative',serif;font-size:21px;color:var(--rune-gold);margin-bottom:6px;animation:goldPulse 3s infinite; }
    .modal-subtitle { font-family:'IM Fell English',serif;font-size:16px;color:var(--parchment-dim);font-style:italic;margin-bottom:24px; }
    .modal-danger { border-color:var(--blood-red);box-shadow:0 0 60px rgba(204,34,0,0.3); }
    .modal-danger::before { background:linear-gradient(90deg,transparent,var(--blood-red),transparent); }
    .live-screen-modal { width:90%;max-width:800px;height:80vh;max-height:600px;padding:0;display:flex;flex-direction:column; }

    /* ── Disciplinary ── */
    .disciplinary-layout { display:grid;grid-template-columns:300px 1fr;gap:24px; }
    .team-list { display:flex;flex-direction:column;gap:12px;max-height:600px;overflow-y:auto;padding-right:12px; }
    .team-card { background:var(--abyss);border:1px solid var(--border-rune);border-radius:4px;padding:16px;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden; }
    .team-card:hover,.team-card.selected { border-color:var(--rune-gold);background:rgba(200,146,10,0.05);transform:translateX(4px); }
    .team-card.selected::before { content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--rune-gold);box-shadow:0 0 10px var(--rune-gold); }

    /* ── Difficulty ── */
    .difficulty-pills { display:flex;gap:8px;flex-wrap:wrap; }
    .diff-pill { padding:5px 14px;border-radius:20px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:1px;border:1px solid;transition:all 0.3s; }
    .diff-novice { border-color:rgba(0,255,136,0.3);color:#00ff88; } .diff-novice.active { background:rgba(0,255,136,0.15); }
    .diff-adept { border-color:rgba(255,200,0,0.3);color:#ffc800; } .diff-adept.active { background:rgba(255,200,0,0.15); }
    .diff-arcane { border-color:rgba(204,34,0,0.3);color:var(--blood-glow); } .diff-arcane.active { background:rgba(204,34,0,0.15); }
    .drop-zone { border:2px dashed var(--border-rune);border-radius:4px;padding:48px 24px;text-align:center;transition:all 0.3s;cursor:pointer;background:rgba(200,146,10,0.02); }
    .drop-zone:hover,.drop-zone.dragging { border-color:var(--rune-gold);background:rgba(200,146,10,0.06); }

    /* ── Player shell ── */
    .player-shell { min-height:100vh;position:relative;background:var(--void);overflow:hidden; }
    .lobby-wrap { min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;z-index:2;padding:40px; }
    .lobby-title { font-family:'Cinzel Decorative',serif;font-size:52px;font-weight:900;background:linear-gradient(135deg,var(--rune-gold),var(--rune-gold-glow),var(--rune-amber));background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite;line-height:1.1;margin-bottom:8px; }
    .role-cards { display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:40px; }
    .role-card { border:1px solid rgba(200,146,10,0.2);border-radius:6px;padding:36px 28px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.4s;background:rgba(8,12,20,0.8);text-align:left; }
    .role-card::before { content:'';position:absolute;inset:0;opacity:0;transition:opacity 0.4s; }
    .role-card.observer::before { background:radial-gradient(circle at 50% 100%,rgba(0,212,255,0.15),transparent 70%); }
    .role-card.creator::before { background:radial-gradient(circle at 50% 100%,rgba(139,92,246,0.15),transparent 70%); }
    .role-card:hover::before { opacity:1; }
    .role-card.observer:hover,.role-card.selected.observer { border-color:var(--oracle-blue);box-shadow:0 0 40px rgba(0,212,255,0.2);transform:translateY(-4px); }
    .role-card.creator:hover,.role-card.selected.creator { border-color:var(--spirit-purple);box-shadow:0 0 40px rgba(139,92,246,0.2);transform:translateY(-4px); }
    .waiting-screen { min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;z-index:2; }
    .phase-label { font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--oracle-blue);letter-spacing:4px;margin-bottom:8px; }
    .phase-title { font-family:'Cinzel Decorative',serif;font-size:22px;color:var(--text-bright);margin-bottom:20px; }
    .observer-wrap { min-height:calc(100vh - 44px);display:grid;grid-template-columns:1fr 1fr;gap:0;position:relative;z-index:2; }
    .observer-image-pane { padding:40px;display:flex;flex-direction:column;border-right:1px solid var(--border-rune);background:rgba(8,12,20,0.6); }
    .observer-input-pane { padding:40px;display:flex;flex-direction:column; }
    .target-image-frame { position:relative;border:1px solid var(--border-rune);border-radius:4px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.8);flex:1;min-height:280px;display:flex;align-items:center;justify-content:center;perspective:600px; }
    .target-image-frame img { transform:rotateY(2deg) rotateX(1deg);transition:transform 0.3s; }
    .target-image-frame:hover img { transform:rotateY(0deg) rotateX(0deg); }
    .spell-textarea { flex:1;background:rgba(8,12,20,0.9);border:1px solid var(--border-rune);border-radius:4px;color:var(--text-bright);padding:20px;font-family:'Share Tech Mono',monospace;font-size:16px;line-height:1.7;resize:none;outline:none;transition:border-color 0.3s,box-shadow 0.3s;min-height:280px; }
    .spell-textarea:focus { border-color:var(--rune-gold); }
    .spell-textarea.forbidden { border-color:var(--blood-red)!important;animation:screenShake 0.5s ease-out;box-shadow:0 0 20px rgba(204,34,0,0.3)!important; }
    .word-rejected-tooltip { position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--blood-red);color:#fff;font-family:'Share Tech Mono',monospace;font-size:15px;padding:10px 24px;border-radius:3px;box-shadow:0 0 30px rgba(204,34,0,0.6);animation:toastSlide 2s ease-out forwards;z-index:9999;letter-spacing:2px; }
    .timer-bar { height:3px;background:var(--stone);border-radius:2px;overflow:hidden;margin:8px 0; }
    .timer-fill { height:100%;background:linear-gradient(90deg,var(--rune-gold),var(--rune-gold-glow));transition:width 1s linear;box-shadow:0 0 8px var(--rune-gold); }
    .timer-fill.danger { background:linear-gradient(90deg,var(--blood-red),var(--blood-glow));box-shadow:0 0 8px var(--blood-red); }
    .timer-display { font-family:'Cinzel Decorative',serif;font-size:36px;color:var(--rune-gold);letter-spacing:4px;text-align:center; }
    .timer-display.danger { color:var(--blood-glow);animation:goldPulse 0.5s infinite; }
    .transfer-screen { position:fixed;inset:0;z-index:500;background:rgba(4,5,10,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center; }
    .transfer-text { font-family:'Cinzel Decorative',serif;font-size:20px;color:var(--rune-gold);animation:goldPulse 2s infinite;margin-top:32px;letter-spacing:4px; }
    .creator-wrap { min-height:calc(100vh - 44px);display:grid;grid-template-columns:280px 1fr;grid-template-rows:1fr auto;position:relative;z-index:2; }
    .transmission-pane { grid-row:1/3;padding:30px 20px;border-right:1px solid var(--border-rune);background:rgba(8,12,20,0.7);overflow-y:auto; }
    .prompt-box { background:var(--abyss);border:1px solid var(--border-oracle);border-radius:4px;padding:20px;resize:none;color:var(--text-bright);font-family:'Share Tech Mono',monospace;font-size:16px;line-height:1.6;outline:none;width:100%;min-height:160px;transition:border-color 0.3s; }
    .prompt-box:focus { border-color:var(--oracle-blue);box-shadow:0 0 20px rgba(0,212,255,0.1); }
    .generate-btn { width:100%;padding:20px;position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(0,153,204,0.3),rgba(0,212,255,0.2));border:1px solid var(--oracle-blue);border-radius:4px;cursor:pointer;color:var(--oracle-blue);font-family:'Cinzel Decorative',serif;font-size:21px;letter-spacing:3px;transition:all 0.3s;box-shadow:0 0 30px rgba(0,212,255,0.2); }
    .generate-btn:hover { box-shadow:0 0 50px rgba(0,212,255,0.4);transform:scale(1.01); }
    .submit-btn { width:100%;padding:18px;position:relative;overflow:hidden;background:rgba(8,12,20,0.9);border:1px solid var(--spirit-purple);border-radius:4px;cursor:pointer;color:var(--spirit-purple);font-family:'Cinzel Decorative',serif;font-size:18px;letter-spacing:3px;transition:all 0.3s; }
    .gallery-bar { padding:16px 20px;border-top:1px solid var(--border-rune);display:flex;gap:12px;overflow-x:auto; }
    .gallery-item { flex-shrink:0;width:100px;height:76px;background:var(--stone);border:1px solid var(--border-rune);border-radius:3px;overflow:hidden;cursor:pointer;transition:border-color 0.3s;display:flex;align-items:center;justify-content:center;font-size:24px;opacity:0.6; }
    .gallery-item:hover { border-color:var(--rune-gold);opacity:1; }
    .penalty-overlay { position:fixed;inset:0;z-index:800;mix-blend-mode:overlay;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,0,0,0.03) 0px,rgba(255,0,0,0.03) 2px,transparent 2px,transparent 4px);animation:screenShake 0.6s ease-out; }
    .penalty-toast { position:fixed;top:0;left:0;right:0;z-index:9000;background:linear-gradient(90deg,var(--blood-red),#ff0000);padding:16px 24px;text-align:center;font-family:'Cinzel',serif;font-size:17px;letter-spacing:3px;color:#fff;animation:toastSlide 4s ease-out forwards;box-shadow:0 4px 40px rgba(255,0,0,0.5); }
    .disqual-screen { position:fixed;inset:0;z-index:9999;background:#0d0000;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:disqualFlash 0.3s ease-out 4; }
    .disqual-title { font-family:'Cinzel Decorative',serif;font-size:64px;font-weight:900;color:var(--blood-glow);text-shadow:0 0 40px var(--blood-red),0 0 80px var(--blood-red);margin-bottom:16px;animation:goldPulse 1s infinite; }
    .results-wrap { min-height:calc(100vh - 44px);display:grid;grid-template-columns:1fr auto 1fr;align-items:stretch;position:relative;z-index:2; }
    .result-panel { display:flex;flex-direction:column;padding:40px; }
    .result-label { font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:3px;margin-bottom:16px;text-transform:uppercase; }
    .tab-warning { position:fixed;top:44px;left:0;right:0;z-index:9998;background:var(--blood-red);color:#fff;text-align:center;padding:12px;font-family:'Cinzel',serif;font-size:16px;letter-spacing:2px;animation:toastSlide 5s ease-out forwards; }
    .minigame-container { width:100%;max-width:440px;margin:0 auto;aspect-ratio:1;background:rgba(8,12,20,0.8);border:1px solid var(--border-oracle);border-radius:8px;position:relative;overflow:hidden; }

    /* ── Oracle's Lock game ── */
    .oracles-lock { display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px; }
    .lock-ring-wrap { position:relative;width:260px;height:260px; }
    .lock-ring { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:50%;transition:filter 0.3s; }
    .lock-ring:hover { filter:brightness(1.3); }
    .lock-ring svg { position:absolute;inset:0;width:100%;height:100%;transition:transform 0.6s cubic-bezier(0.34,1.56,0.64,1); }
    .lock-ring.aligned svg { filter:drop-shadow(0 0 12px var(--rune-gold)); }
    .lock-win-overlay { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,12,20,0.9);border-radius:50%;flex-direction:column;gap:8px;animation:fadeInUp 0.5s ease-out; }

    /* ── Landing page ── */
    .landing-wrap { min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;z-index:2;padding:40px; }
    .landing-cards { display:grid;grid-template-columns:1fr 1fr;gap:32px;max-width:700px;width:100%; }
    .landing-card { border:1px solid var(--border-rune);border-radius:8px;padding:48px 36px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.4s;background:rgba(8,12,20,0.85);text-align:center; }
    .landing-card::before { content:'';position:absolute;inset:0;opacity:0;transition:opacity 0.4s; }
    .landing-card.admin-card::before { background:radial-gradient(circle at 50% 0%,rgba(200,146,10,0.12),transparent 70%); }
    .landing-card.player-card::before { background:radial-gradient(circle at 50% 0%,rgba(0,212,255,0.12),transparent 70%); }
    .landing-card:hover::before { opacity:1; }
    .landing-card.admin-card:hover { border-color:var(--rune-gold);box-shadow:0 0 60px rgba(200,146,10,0.15);transform:translateY(-6px); }
    .landing-card.player-card:hover { border-color:var(--oracle-blue);box-shadow:0 0 60px rgba(0,212,255,0.15);transform:translateY(-6px); }

    /* ── Victory screen ── */
    .victory-wrap { min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;position:relative;z-index:2; }
    .winner-card { border:1px solid var(--rune-gold);border-radius:6px;padding:24px;background:rgba(8,12,20,0.9);animation:victoryGlow 2s infinite; }
    .winner-card.gold { border-color:var(--rune-gold); }
    .winner-card.silver { border-color:#a8a8a8; }
    .winner-card.bronze { border-color:#8b6533; }
  `}</style>
);

// ─── BACKGROUND ───────────────────────────────────────────────────────────────
const BackgroundWrapper = () => {
  const [activeBg, setActiveBg] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveBg(a => (a + 1) % BG_IMAGES.length), 14000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="immersive-bg">
      {BG_IMAGES.map((src, i) => (
        <div key={i} className={`bg-layer ${i === activeBg ? "active" : ""} ${["pan-a","pan-b","pan-c","pan-a","pan-b"][i]}`}
          style={{ backgroundImage: `url(${src})` }} />
      ))}
      <div className="bg-overlay" />
    </div>
  );
};

// ─── PARTICLES ────────────────────────────────────────────────────────────────
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, dx: (Math.random() - 0.5) * 0.3,
      dy: -Math.random() * 0.4 - 0.1, opacity: Math.random() * 0.6 + 0.2,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,146,10,${p.opacity})`; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5 || p.x > canvas.width + 5) p.dx *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="particle-canvas" />;
};

const SceneWrapper = ({ children }) => (
  <>
    <BackgroundWrapper />
    <ParticleCanvas />
    <div className="grid-bg" />
    <div className="bg-runes">
      {["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ"].map((r,i)=>(
        <span key={i} className="bg-rune" style={{left:`${[5,15,30,50,65,75,85,95][i]}%`,top:`${[10,60,20,80,30,70,15,50][i]}%`,animationDelay:`${i*0.8}s`,animationDuration:`${5+i}s`}}>{r}</span>
      ))}
    </div>
    {children}
  </>
);

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
const LandingPage = ({ onSelect }) => (
  <div className="landing-wrap">
    <div style={{textAlign:"center",maxWidth:800,width:"100%",animation:"fadeInUp 0.8s ease-out"}}>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:"var(--oracle-blue)",letterSpacing:4,marginBottom:16}}>⬡ THE ANCIENT ORACLE AWAITS ⬡</div>
      <div className="lobby-title" style={{marginBottom:12}}>MayaVyuh</div>
      <div style={{fontFamily:"'IM Fell English',serif",fontSize:21,color:"var(--parchment-dim)",fontStyle:"italic",marginBottom:56,letterSpacing:2}}>The Prompt War — Enter Your Sanctum</div>
      <div className="landing-cards">
        <div className="landing-card admin-card" onClick={() => onSelect("admin")}>
          <div style={{fontSize:56,marginBottom:20}}>👑</div>
          <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:22,color:"var(--rune-gold)",marginBottom:12,animation:"goldPulse 3s infinite"}}>Admin Sanctum</div>
          <p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic",lineHeight:1.6,marginBottom:24}}>"Command the labyrinth. Observe all. Cast judgment upon the worthy and the fallen."</p>
          <button className="btn btn-gold" style={{width:"100%",justifyContent:"center"}}>Enter as Admin →</button>
        </div>
        <div className="landing-card player-card" onClick={() => onSelect("player")}>
          <div style={{fontSize:56,marginBottom:20}}>⚔️</div>
          <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:22,color:"var(--oracle-blue)",marginBottom:12}}>Player Portal</div>
          <p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic",lineHeight:1.6,marginBottom:24}}>"Register your team, receive your role, and enter the ancient trial of vision and creation."</p>
          <button className="btn btn-oracle" style={{width:"100%",justifyContent:"center"}}>Enter as Player →</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── SVG COMPONENTS ───────────────────────────────────────────────────────────
const LabyrinthSVG = ({ size=200, color="var(--rune-gold)", animated=false }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={color} strokeWidth="1.5">
    <circle cx="50" cy="50" r="48" opacity="0.3"/>
    <circle cx="50" cy="50" r="40" opacity="0.2" strokeDasharray="4 4"/>
    <rect x="20" y="20" width="60" height="60" rx="4" opacity="0.4"
      style={animated ? {strokeDasharray:240,strokeDashoffset:240,animation:"labyLoading 2s ease-out forwards"} : {}}/>
    <rect x="30" y="30" width="40" height="40" rx="2" opacity="0.3"/>
    <path d="M50 20L50 80M20 50L80 50" opacity="0.4"/>
    <path d="M30 30L70 70M70 30L30 70" opacity="0.2"/>
    <circle cx="50" cy="50" r="6" fill={color} opacity="0.8"/>
    <circle cx="50" cy="50" r="3" fill={color}/>
    {[0,60,120,180,240,300].map((a,i)=>(
      <circle key={i} cx={50+40*Math.cos(a*Math.PI/180)} cy={50+40*Math.sin(a*Math.PI/180)} r="2" fill={color} opacity="0.5"/>
    ))}
  </svg>
);

// ─── ORACLE'S LOCK GAME ───────────────────────────────────────────────────────
const RUNE_SYMBOLS = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ"];
const RING_COUNT = 3;
const SLOTS_PER_RING = [8, 6, 4];
const WIN_SLOT = 0; // slot 0 = 12 o'clock

const OraclesLockGame = ({ onWin }) => {
  // Each ring has an array of rune indices and a rotation (in slots)
  const [rings, setRings] = useState(() =>
    Array.from({ length: RING_COUNT }, (_, ri) => ({
      runes: Array.from({ length: SLOTS_PER_RING[ri] }, () =>
        Math.floor(Math.random() * RUNE_SYMBOLS.length)
      ),
      rotation: Math.floor(Math.random() * SLOTS_PER_RING[ri]),
    }))
  );
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [hint, setHint] = useState(false);

  const isAligned = (ring) => ring.rotation % SLOTS_PER_RING[rings.indexOf(ring)] === WIN_SLOT;
  const allAligned = rings.every((r, i) => r.rotation % SLOTS_PER_RING[i] === 0);

  useEffect(() => {
    if (allAligned && !won) {
      setWon(true);
      setScore(s => s + 100);
      onWin?.();
    }
  }, [allAligned, won, onWin]);

  const rotateRing = (ri, dir = 1) => {
    setRings(prev => prev.map((r, i) => {
      if (i !== ri) return r;
      const slots = SLOTS_PER_RING[i];
      const newRot = ((r.rotation + dir) % slots + slots) % slots;
      // Inner rings get dragged slightly when outer rings move
      return { ...r, rotation: newRot };
    }));
    setScore(s => s + 5);
  };

  const reset = () => {
    setRings(Array.from({ length: RING_COUNT }, (_, ri) => ({
      runes: Array.from({ length: SLOTS_PER_RING[ri] }, () =>
        Math.floor(Math.random() * RUNE_SYMBOLS.length)
      ),
      rotation: Math.floor(Math.random() * SLOTS_PER_RING[ri]) + 1,
    })));
    setWon(false);
  };

  const sizes = [260, 180, 100];
  const radii = [120, 80, 40];

  return (
    <div className="oracles-lock">
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--oracle-blue)",letterSpacing:2,marginBottom:4}}>
        ORACLE'S LOCK · SCORE: {score}
      </div>
      <div style={{fontFamily:"'IM Fell English',serif",fontSize:13,color:"var(--parchment-dim)",fontStyle:"italic",marginBottom:12,textAlign:"center"}}>
        "Align all runes to the apex — click a ring to rotate it"
      </div>
      <div className="lock-ring-wrap" style={{width:280,height:280,margin:"0 auto"}}>
        {rings.map((ring, ri) => {
          const size = sizes[ri];
          const radius = radii[ri];
          const slots = SLOTS_PER_RING[ri];
          const aligned = ring.rotation % slots === 0;
          return (
            <div key={ri} className={`lock-ring ${aligned ? "aligned" : ""}`}
              style={{width:size,height:size,top:(280-size)/2,left:(280-size)/2,position:"absolute"}}
              onClick={() => !won && rotateRing(ri)}>
              <svg viewBox={`0 0 ${size} ${size}`} style={{transform:`rotate(${(ring.rotation/slots)*360}deg)`,width:size,height:size}}>
                {/* Ring track */}
                <circle cx={size/2} cy={size/2} r={radius}
                  fill="none"
                  stroke={aligned ? "var(--rune-gold)" : "rgba(200,146,10,0.25)"}
                  strokeWidth="18"
                  strokeDasharray="4 3" />
                {/* Rune symbols around ring */}
                {ring.runes.map((runeIdx, si) => {
                  const angle = (si / slots) * 2 * Math.PI - Math.PI/2;
                  const x = size/2 + radius * Math.cos(angle);
                  const y = size/2 + radius * Math.sin(angle);
                  const isTop = si === 0;
                  return (
                    <text key={si} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                      fontSize={isTop ? 18 : 14}
                      fill={isTop ? (aligned ? "var(--rune-gold)" : "var(--oracle-blue)") : "rgba(200,146,10,0.5)"}
                      style={{fontFamily:"serif"}}>
                      {RUNE_SYMBOLS[runeIdx]}
                    </text>
                  );
                })}
              </svg>
            </div>
          );
        })}
        {/* Center indicator */}
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:32,height:32,borderRadius:"50%",background:allAligned?"var(--rune-gold)":"rgba(200,146,10,0.2)",border:"1px solid var(--rune-gold)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all 0.3s"}}>
          {allAligned ? "★" : "◉"}
        </div>
        {/* 12 o'clock marker */}
        <div style={{position:"absolute",top:4,left:"50%",transform:"translateX(-50%)",width:4,height:16,background:"var(--rune-gold)",borderRadius:2,boxShadow:"0 0 8px var(--rune-gold)"}}/>
        {won && (
          <div className="lock-win-overlay" style={{position:"absolute",inset:0,borderRadius:"50%"}}>
            <div style={{fontSize:36}}>✨</div>
            <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:14,color:"var(--rune-gold)",animation:"goldPulse 1s infinite"}}>ALIGNED!</div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:12,marginTop:12,justifyContent:"center"}}>
        {rings.map((_,ri)=>(
          <div key={ri} style={{display:"flex",gap:6}}>
            <button className="btn btn-ghost" style={{padding:"4px 10px",fontSize:11}} onClick={()=>!won&&rotateRing(ri,-1)}>Ring {ri+1} ↺</button>
            <button className="btn btn-ghost" style={{padding:"4px 10px",fontSize:11}} onClick={()=>!won&&rotateRing(ri,1)}>Ring {ri+1} ↻</button>
          </div>
        ))}
      </div>
      {won && (
        <button className="btn btn-gold" style={{marginTop:8}} onClick={reset}>🔒 New Lock</button>
      )}
    </div>
  );
};

// ─── ADMIN NAV ────────────────────────────────────────────────────────────────
const AdminNav = ({ activeView, setActiveView, pendingCount }) => {
  const navItems = [
    {id:"arsenal",icon:"⚗️",label:"Arsenal & Spell Book",section:"command"},
    {id:"roster",icon:"📜",label:"The Roster",section:"command"},
    {id:"disciplinary",icon:"⚖️",label:"Disciplinary Suite",section:"command"},
    {id:"leaderboard",icon:"🏆",label:"Hall of Champions",section:"intel"},
    {id:"activity",icon:"🔮",label:"Activity Oracle",section:"intel"},
    {id:"alerts",icon:"🚨",label:"Security Alerts",section:"system"},
    {id:"settings",icon:"⚙️",label:"Oracle Config",section:"system"},
  ];
  return (
    <nav className="admin-nav">
      <div className="nav-logo"><h1>MAYA<br/>VYUH</h1><p>⬡ Admin Sanctum ⬡</p></div>
      <div className="nav-items">
        {["command","intel","system"].map(sec=>(
          <div key={sec}>
            <div className="nav-section-title">{{command:"Command",intel:"Intelligence",system:"System"}[sec]}</div>
            {navItems.filter(n=>n.section===sec).map(item=>(
              <div key={item.id} className={`nav-item ${activeView===item.id?"active":""}`} onClick={()=>setActiveView(item.id)}>
                <span style={{fontSize:19,width:20,textAlign:"center"}}>{item.icon}</span>
                <span>{item.label}</span>
                {item.id==="roster"&&pendingCount>0&&(
                  <span style={{marginLeft:"auto",background:"rgba(255,200,0,0.2)",color:"#ffc800",border:"1px solid rgba(255,200,0,0.4)",borderRadius:10,padding:"1px 7px",fontSize:11,fontFamily:"'Share Tech Mono',monospace"}}>{pendingCount}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="nav-footer"><div className="system-status"><span className="status-dot"/><span>ORACLE NETWORK LIVE</span></div></div>
    </nav>
  );
};

// ─── ARSENAL VIEW ─────────────────────────────────────────────────────────────
const ArsenalView = ({ globalTags, addForbiddenWord, removeForbiddenWord, timers, updateTimers, eventState, setEventState }) => {
  const [tagInput,setTagInput]=useState("");
  const [dragging,setDragging]=useState(false);
  const [difficulty,setDifficulty]=useState("adept");
  const [uploadedImage,setUploadedImage]=useState(null);

  const handleAddTag=(e)=>{ if(e.key==="Enter"&&tagInput.trim()){ addForbiddenWord(tagInput.trim().toLowerCase()); setTagInput(""); } };
  const handleTimerChange=(round,type,value)=>{
    const currentTotal=timers[round]||300;
    let mins=Math.floor(currentTotal/60), secs=currentTotal%60;
    const val=Math.max(0,parseInt(value)||0);
    if(type==="min") mins=val;
    if(type==="sec") secs=Math.min(59,val);
    updateTimers(round,mins*60+secs);
  };

  return (
    <div style={{animation:"fadeInUp 0.5s ease-out"}}>
      <div className="page-header"><div className="breadcrumb">ADMIN › ARSENAL</div><h2>The Arsenal & Spell Book</h2><p>"Configure the trial — forge the vision, seal the forbidden lexicon"</p></div>
      <div className="grid-2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-title">⚡ Target Vision</div>
          <div className={`drop-zone ${dragging?"dragging":""}`}
            onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f&&f.type.startsWith("image/"))setUploadedImage(URL.createObjectURL(f));}}
            onClick={()=>document.getElementById("fInput").click()}>
            <input id="fInput" type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)setUploadedImage(URL.createObjectURL(f));}}/>
            {uploadedImage ? <img src={uploadedImage} alt="target" style={{maxWidth:"100%",maxHeight:200,objectFit:"contain",borderRadius:4}}/> : <>
              <div style={{fontSize:40,marginBottom:12,opacity:0.6}}>🗺️</div>
              <p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontSize:17,fontStyle:"italic"}}>Cast your vision here</p>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--rune-gold)",letterSpacing:2,display:"block",marginTop:8}}>DROP IMAGE OR CLICK TO INVOKE</span>
            </>}
          </div>
          <div style={{marginTop:16}}>
            <div className="form-label">Difficulty Tier</div>
            <div className="difficulty-pills">{["novice","adept","arcane"].map(d=><span key={d} className={`diff-pill diff-${d} ${difficulty===d?"active":""}`} onClick={()=>setDifficulty(d)}>{d.toUpperCase()}</span>)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">🚫 Forbidden Lexicon</div>
          <p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontSize:16,fontStyle:"italic",marginBottom:16}}>"Words that must never pass the Observer's lips..."</p>
          <div className="tag-input-wrap">
            {globalTags.map((t,i)=><span key={i} className="tag">{t}<span className="tag-remove" onClick={()=>removeForbiddenWord(t)}>✕</span></span>)}
            <div style={{display:"flex",gap:8}}>
              <input className="tag-input" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="Type word + Enter..."/>
              <button className="btn btn-ghost" style={{padding:"4px 8px"}} onClick={()=>{if(tagInput.trim()){addForbiddenWord(tagInput.trim().toLowerCase());setTagInput("");}}}>➕</button>
            </div>
          </div>
          <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--parchment-dim)",marginTop:10}}>{globalTags.length} FORBIDDEN WORDS SEALED</p>
        </div>
      </div>
      <div className="card">
        <div className="card-title">⚙️ Round Timer Configuration</div>
        <div className="grid-3">
          {["round1","round2","round3","discussion","swap"].map((round,idx)=>{
            const total=timers[round]||60, m=Math.floor(total/60), s=total%60;
            const labels=["Round 1","Round 2","Round 3","Discussion Interval","Swap Interval"];
            return (
              <div className="form-group" key={round}>
                <label className="form-label">{labels[idx]}</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input className="form-input" type="number" min="0" value={m} onChange={e=>handleTimerChange(round,"min",e.target.value)} title="Minutes"/>
                  <span style={{color:"var(--parchment-dim)",fontFamily:"'Share Tech Mono',monospace",fontSize:12}}>MIN</span>
                  <input className="form-input" type="number" min="0" max="59" value={s} onChange={e=>handleTimerChange(round,"sec",e.target.value)} title="Seconds"/>
                  <span style={{color:"var(--parchment-dim)",fontFamily:"'Share Tech Mono',monospace",fontSize:12}}>SEC</span>
                </div>
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <button className="btn btn-ghost" style={{padding:"3px 7px",fontSize:10}} onClick={()=>updateTimers(round,3600)}>60M</button>
                  <button className="btn btn-ghost" style={{padding:"3px 7px",fontSize:10}} onClick={()=>updateTimers(round,300)}>5M</button>
                  <button className="btn btn-ghost" style={{padding:"3px 7px",fontSize:10}} onClick={()=>updateTimers(round,60)}>1M</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,alignItems:"center"}}>
          <button className="btn btn-gold" onClick={()=>{ setEventState(prev=>({...prev,started:true})); broadcastEvent("EVENT_STARTED",{timers}); }}>
            {eventState.started ? "🔄 Restart Event" : "⚡ Start Event"}
          </button>
          {eventState.started && <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"#00ff88"}}>✓ EVENT IS LIVE</span>}
        </div>
      </div>
    </div>
  );
};

// ─── ROSTER VIEW ──────────────────────────────────────────────────────────────
const RosterView = ({ teams, setTeams, onLiveScreen, addAlert }) => {
  const [expanded,setExpanded]=useState(null);
  const fmt=(secs)=>{ if(secs==null)return"—"; const m=Math.floor(secs/60),s=secs%60; return`${m}:${s.toString().padStart(2,"0")}`; };

  const approve = (team) => {
    setTeams(prev=>prev.map(t=>t.id===team.id?{...t,status:"approved"}:t));
    broadcastEvent("TEAM_APPROVED",{teamId:team.id});
    addAlert({type:"APPROVAL",team:team.name,message:`Team ${team.name} approved to enter the labyrinth.`,time:new Date().toLocaleTimeString()});
  };

  return (
    <div style={{animation:"fadeInUp 0.5s ease-out"}}>
      <div className="page-header"><div className="breadcrumb">ADMIN › ROSTER</div><h2>The Roster</h2><p>"All who enter the labyrinth are watched by the eternal eye"</p></div>
      {teams.filter(t=>t.status==="pending").length>0&&(
        <div style={{background:"rgba(255,200,0,0.05)",border:"1px solid rgba(255,200,0,0.3)",borderRadius:4,padding:16,marginBottom:20,fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"#ffc800",letterSpacing:2}}>
          🕯️ {teams.filter(t=>t.status==="pending").length} TEAM(S) AWAITING APPROVAL
        </div>
      )}
      <div className="card">
        <table className="data-table">
          <thead><tr><th>⬡ Team</th><th>Observer · Creator</th><th>Round</th><th>Time Left</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {teams.map(team=>(
              <React.Fragment key={team.id}>
                <tr className={`team-row ${expanded===team.id?"expanded":""}`} onClick={()=>setExpanded(expanded===team.id?null:team.id)}>
                  <td><span style={{color:"var(--rune-gold)"}}>{team.name}</span></td>
                  <td><span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:15,color:"var(--parchment-dim)"}}>{team.observer||"—"} · {team.creator||"—"}</span></td>
                  <td><span style={{color:"var(--oracle-blue)",fontFamily:"'Share Tech Mono',monospace",fontSize:15}}>Round {team.round||0}</span></td>
                  <td><span style={{color:"#ffc800",fontFamily:"'Share Tech Mono',monospace",fontSize:15}}>{fmt(team.timeLeft)}</span></td>
                  <td><span style={{color:"var(--spirit-purple)",fontFamily:"'Cinzel',serif"}}>{team.score||0}%</span></td>
                  <td><span className={`status-badge badge-${team.status==="active"?"active":team.status==="penalized"?"penalized":team.status==="banned"?"banned":team.status==="approved"?"approved":"pending"}`}>●{(team.status||"pending").toUpperCase()}</span></td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {team.status==="pending"&&<button className="btn btn-approve" style={{padding:"5px 10px",fontSize:11}} onClick={()=>approve(team)}>✓ APPROVE</button>}
                      <button className="btn btn-oracle" style={{padding:"5px 10px",fontSize:11}} onClick={()=>onLiveScreen(team)}>👁 VIEW</button>
                    </div>
                  </td>
                </tr>
                {expanded===team.id&&(
                  <tr className="expand-row" key={`${team.id}-ex`}><td colSpan={7}>
                    <div className="spectator-feed">
                      <div className="feed-panel"><div className="feed-title"><span className="live-dot"/>OBSERVER TRANSMISSION</div><p className="feed-text">{team.observerText||"No transmission yet."}</p></div>
                      <div className="feed-panel"><div className="feed-title"><span className="live-dot"/>CREATOR ACTIVITY</div><p className="feed-text">{team.creatorText||"Awaiting Creator..."}</p></div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
            {teams.length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:40,fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic"}}>No teams have registered yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── LIVE SCREEN MODAL ────────────────────────────────────────────────────────
const LiveScreenModal = ({ team, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-glass live-screen-modal" onClick={e=>e.stopPropagation()}>
      <div style={{padding:"24px 30px",borderBottom:"1px solid var(--border-rune)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div className="modal-title" style={{margin:0}}>👁️ Oracle View</div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:"var(--oracle-blue)",marginTop:4}}>Live feed: {team.name}</div>
        </div>
        <button className="btn btn-ghost" style={{padding:"6px 12px"}} onClick={onClose}>CLOSE</button>
      </div>
      <div style={{flex:1,padding:30,background:"rgba(0,0,0,0.4)",overflowY:"auto",display:"flex",flexDirection:"column",gap:16}}>
        <div>
          <div className="phase-label">OBSERVER TRANSMISSION</div>
          <div style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic",lineHeight:1.7,padding:16,background:"rgba(0,212,255,0.05)",border:"1px solid var(--border-oracle)",borderRadius:4}}>
            {team.observerText || "Observer has not yet started transmitting..."}
          </div>
        </div>
        <div>
          <div className="phase-label">CREATOR PROMPT</div>
          <textarea readOnly className="prompt-box" style={{height:120,opacity:0.85}} value={team.creatorText||""} />
        </div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:"var(--parchment-dim)"}}>
          Status: <span style={{color:team.status==="active"?"#00ff88":"var(--rune-gold)"}}>{(team.status||"pending").toUpperCase()}</span> · Round {team.round||0} · Score: {team.score||0}%
        </div>
      </div>
    </div>
  </div>
);

// ─── DISCIPLINARY SUITE ───────────────────────────────────────────────────────
const DisciplinarySuite = ({ teams, setTeams, addAlert }) => {
  const [selectedTeam,setSelectedTeam]=useState(null);
  const [penaltyType,setPenaltyType]=useState("time_reduction");
  const [reason,setReason]=useState("");
  const [banTarget,setBanTarget]=useState(null);

  const handlePenalize=()=>{
    if(!selectedTeam)return;
    setTeams(prev=>prev.map(t=>t.id===selectedTeam.id?{...t,status:"penalized",timeLeft:Math.max(0,(t.timeLeft||0)-30)}:t));
    broadcastEvent("PENALTY_CAST",{teamId:selectedTeam.id,type:penaltyType,reason});
    addAlert({type:"PENALTY",team:selectedTeam.name,message:`Penalty (${penaltyType}): ${reason||"No reason given"}`,time:new Date().toLocaleTimeString()});
    setReason("");
  };

  const handleBanConfirm=()=>{
    if(!banTarget)return;
    setTeams(prev=>prev.map(t=>t.id===banTarget.id?{...t,status:"banned"}:t));
    broadcastEvent("TEAM_BANNED",{teamId:banTarget.id});
    addAlert({type:"BAN",team:banTarget.name,message:`Team permanently disqualified.`,time:new Date().toLocaleTimeString()});
    setBanTarget(null);setSelectedTeam(null);
  };

  return (
    <div style={{animation:"fadeInUp 0.5s ease-out"}}>
      <div className="page-header"><div className="breadcrumb">ADMIN › DISCIPLINARY</div><h2>Disciplinary Suite</h2><p>"Select a team — then cast your judgment"</p></div>
      <div className="disciplinary-layout">
        <div className="team-list card" style={{padding:16}}>
          <div className="card-title" style={{marginBottom:12}}>SELECT TEAM</div>
          {teams.length===0&&<p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic",fontSize:14}}>No teams registered yet.</p>}
          {teams.map(t=>(
            <div key={t.id} className={`team-card ${selectedTeam?.id===t.id?"selected":""}`} onClick={()=>setSelectedTeam(t)}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:16,color:"var(--rune-gold)"}}>{t.name}</div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--parchment-dim)",marginTop:4}}>{t.observer||"—"} & {t.creator||"—"}</div>
              <span className={`status-badge badge-${t.status==="active"?"active":t.status==="penalized"?"penalized":t.status==="banned"?"banned":"pending"}`} style={{marginTop:6,display:"inline-flex"}}>●{(t.status||"pending").toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{opacity:selectedTeam?1:0.5,pointerEvents:selectedTeam?"auto":"none",transition:"opacity 0.3s"}}>
          {selectedTeam ? (
            <>
              <div className="card-title" style={{color:"var(--blood-red)",borderColor:"rgba(204,34,0,0.3)"}}>⚖️ Cast Judgment on {selectedTeam.name}</div>
              <div className="form-group"><label className="form-label">Penalty Type</label>
                <select className="form-select" value={penaltyType} onChange={e=>setPenaltyType(e.target.value)}>
                  <option value="time_reduction">Time Reduction (−30s)</option>
                  <option value="score_deduction">Score Deduction (−10 pts)</option>
                  <option value="round_skip">Round Skip</option>
                  <option value="warning">Official Warning</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Reason</label><textarea className="form-textarea" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe the transgression..."/></div>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:20}}>
                <button className="btn btn-ghost" onClick={handlePenalize}>⚡ CAST PENALTY</button>
                <button className="btn btn-danger" style={{animation:"banPulse 2s infinite"}} onClick={()=>setBanTarget(selectedTeam)}>☠️ UNLEASH BAN HAMMER</button>
              </div>
            </>
          ) : (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",opacity:0.5,minHeight:200}}>
              <span style={{fontSize:48,marginBottom:16}}>⚖️</span>
              <p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic"}}>Select a team to cast judgment.</p>
            </div>
          )}
        </div>
      </div>
      {banTarget&&(
        <div className="modal-overlay" onClick={()=>setBanTarget(null)}>
          <div className="modal-glass modal-danger" onClick={e=>e.stopPropagation()}>
            <div className="modal-title" style={{color:"var(--blood-glow)",animation:"none"}}>☠️ THE BAN HAMMER</div>
            <div className="modal-subtitle" style={{color:"rgba(255,100,80,0.6)"}}>"This action cannot be undone. {banTarget?.name} shall be cast from the labyrinth."</div>
            <div style={{background:"rgba(204,34,0,0.1)",border:"1px solid rgba(204,34,0,0.3)",borderRadius:4,padding:20,marginBottom:24,textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:12}}>🔴</div>
              <div style={{fontFamily:"'Cinzel',serif",color:"var(--blood-glow)",fontSize:17,letterSpacing:2}}>PERMANENTLY DISQUALIFY {banTarget?.name?.toUpperCase()}?</div>
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setBanTarget(null)}>SPARE THEM</button>
              <button className="btn btn-danger" style={{cursor:"crosshair"}} onClick={handleBanConfirm}>☠️ UNLEASH</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── LEADERBOARD + WINNER DECLARATION ────────────────────────────────────────
const LeaderboardView = ({ teams, winners, setWinners }) => {
  const sorted = [...teams].sort((a,b)=>(b.score||0)-(a.score||0));
  const [declaring,setDeclaring]=useState(false);
  const [selected,setSelected]=useState(winners.map(w=>w.id)||[]);

  const handleDeclare=()=>{
    const win=sorted.filter(t=>selected.includes(t.id)).slice(0,3);
    setWinners(win);
    broadcastEvent("WINNERS_DECLARED",{winners:win});
    setDeclaring(false);
  };

  return (
    <div style={{animation:"fadeInUp 0.5s ease-out"}}>
      <div className="page-header"><div className="breadcrumb">ADMIN › LEADERBOARD</div><h2>Hall of Champions</h2><p>"Only the most precise vision shall be crowned"</p></div>
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div className="card-title" style={{marginBottom:0,border:"none",padding:0}}>LIVE RANKINGS</div>
          <button className="btn btn-gold" style={{fontSize:12}} onClick={()=>setDeclaring(d=>!d)}>
            {declaring?"Cancel":"🏆 Declare Winners"}
          </button>
        </div>
        {declaring&&(
          <div style={{background:"rgba(200,146,10,0.06)",border:"1px solid var(--border-rune)",borderRadius:4,padding:16,marginBottom:16}}>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:"var(--rune-gold)",marginBottom:10,letterSpacing:2}}>SELECT UP TO 3 WINNERS</div>
            {sorted.map(t=>(
              <label key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(200,146,10,0.08)",cursor:"pointer"}}>
                <input type="checkbox" checked={selected.includes(t.id)} onChange={e=>{if(e.target.checked&&selected.length<3)setSelected(s=>[...s,t.id]);else setSelected(s=>s.filter(x=>x!==t.id));}} style={{accentColor:"var(--rune-gold)"}}/>
                <span style={{fontFamily:"'Cinzel',serif",color:"var(--rune-gold)",flex:1}}>{t.name}</span>
                <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--spirit-purple)"}}>{t.score||0}%</span>
              </label>
            ))}
            <button className="btn btn-gold" style={{marginTop:12,width:"100%",justifyContent:"center"}} onClick={handleDeclare}>✨ DECLARE WINNERS</button>
          </div>
        )}
        {sorted.map((team,i)=>(
          <div key={team.id} className="leaderboard-row">
            <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:20,color:["var(--rune-gold)","#a8a8a8","#8b6533","var(--parchment-dim)"][i]??`var(--parchment-dim)`,width:32,textAlign:"center"}}>{i+1}</div>
            <div>
              <div style={{color:"var(--text-bright)",fontFamily:"'Cinzel',serif",fontSize:16}}>{team.name}</div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--parchment-dim)",marginTop:4}}>{team.observer||"—"} & {team.creator||"—"} · Round {team.round||0}</div>
            </div>
            <div style={{marginLeft:"auto",fontFamily:"'Cinzel Decorative',serif",fontSize:21,color:"var(--oracle-blue)"}}>{team.score||0}%</div>
          </div>
        ))}
        {sorted.length===0&&<p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic",textAlign:"center",padding:30}}>No results yet. The labyrinth awaits.</p>}
      </div>
    </div>
  );
};

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = ({ alerts, setAlerts, teams, setTeams, forbiddenWords, addForbiddenWord, removeForbiddenWord, timers, updateTimers, winners, setWinners, eventState, setEventState }) => {
  const [activeView,setActiveView]=useState("arsenal");
  const [liveScreenTarget,setLiveScreenTarget]=useState(null);

  const addAlert=useCallback(a=>setAlerts(prev=>[a,...prev]),[setAlerts]);
  const pendingCount=teams.filter(t=>t.status==="pending").length;

  return (
    <div className="app-shell">
      <AdminNav activeView={activeView} setActiveView={setActiveView} pendingCount={pendingCount}/>
      <div className="admin-main">
        <div className="top-bar">
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--parchment-dim)"}}>⬡ MAYAVYUH COMMAND CENTER · {new Date().toLocaleTimeString()}</div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            {alerts.length>0&&<span style={{background:"rgba(204,34,0,0.2)",border:"1px solid rgba(204,34,0,0.4)",color:"var(--blood-glow)",padding:"4px 10px",borderRadius:2,fontFamily:"'Share Tech Mono',monospace",fontSize:13,animation:"banPulse 2s infinite"}}>🚨 {alerts.length} ALERTS</span>}
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"#00ff88"}}>■ {teams.filter(t=>t.status==="active").length} ACTIVE</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"#ffc800"}}>■ {pendingCount} PENDING</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--blood-glow)"}}>■ {teams.filter(t=>t.status==="banned").length} BANNED</span>
          </div>
        </div>
        <div style={{paddingTop:20}}>
          <div className="grid-3" style={{marginBottom:24}}>
            <div className="stat-card"><div className="stat-value">{teams.length}</div><div className="stat-label">Teams Registered</div><div className="stat-icon">👥</div></div>
            <div className="stat-card"><div className="stat-value">{Math.max(...teams.map(t=>t.score||0),0)}%</div><div className="stat-label">Peak Similarity</div><div className="stat-icon">🎯</div></div>
            <div className="stat-card"><div className="stat-value">{alerts.length}</div><div className="stat-label">Security Alerts</div><div className="stat-icon">🚨</div></div>
          </div>
          {activeView==="arsenal"&&<ArsenalView globalTags={forbiddenWords} addForbiddenWord={addForbiddenWord} removeForbiddenWord={removeForbiddenWord} timers={timers} updateTimers={updateTimers} eventState={eventState} setEventState={setEventState}/>}
          {activeView==="roster"&&<RosterView teams={teams} setTeams={setTeams} onLiveScreen={setLiveScreenTarget} addAlert={addAlert}/>}
          {activeView==="disciplinary"&&<DisciplinarySuite teams={teams} setTeams={setTeams} addAlert={addAlert}/>}
          {activeView==="leaderboard"&&<LeaderboardView teams={teams} winners={winners} setWinners={setWinners}/>}
          {activeView==="activity"&&(
            <div style={{animation:"fadeInUp 0.5s ease-out"}}>
              <div className="page-header"><div className="breadcrumb">ADMIN › ACTIVITY</div><h2>Activity Oracle</h2></div>
              <div className="card">
                {alerts.length===0&&<p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic",textAlign:"center",padding:30}}>All is calm in the labyrinth...</p>}
                {alerts.map((a,i)=>(
                  <div key={i} className="activity-item">
                    <span style={{fontSize:17,flexShrink:0,marginTop:2}}>🔮</span>
                    <div>
                      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:"var(--text-dim)"}}><span style={{color:"var(--rune-gold)"}}>{a.team}</span> — {a.message}</div>
                      <div style={{fontSize:13,color:"var(--text-dim)",marginTop:2}}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeView==="alerts"&&(
            <div style={{animation:"fadeInUp 0.5s ease-out"}}>
              <div className="page-header"><div className="breadcrumb">ADMIN › ALERTS</div><h2>Security Alerts</h2><p>"No transgression goes unseen"</p></div>
              {alerts.length===0?<div className="card" style={{textAlign:"center",padding:60}}><div style={{fontSize:40,marginBottom:16}}>🔮</div><p style={{fontFamily:"'IM Fell English',serif",color:"var(--parchment-dim)",fontStyle:"italic"}}>All is calm in the labyrinth...</p></div>
              :alerts.map((a,i)=><div key={i} className="alert-panel"><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:"var(--blood-glow)",letterSpacing:2,marginBottom:6}}>🚨 {a.type} — {a.team}</div><p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:"rgba(255,100,80,0.8)"}}>{a.message}</p><p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"var(--parchment-dim)",marginTop:4}}>{a.time}</p></div>)}
            </div>
          )}
          {activeView==="settings"&&(
            <div style={{animation:"fadeInUp 0.5s ease-out"}}>
              <div className="page-header"><div className="breadcrumb">ADMIN › SETTINGS</div><h2>Oracle Configuration</h2></div>
              <div className="card">
                <div className="card-title">ANTI-CHEAT PROTOCOL</div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Auto-Disqualify on Tab Switch</label><select className="form-select"><option>Yes — Immediate</option><option>Yes — After 1 Warning</option><option>No — Alert Only</option></select></div>
                  <div className="form-group"><label className="form-label">Similarity Model</label><select className="form-select"><option>CLIP ViT-B/32</option><option>SSIM Algorithm</option><option>Gemini Vision API</option></select></div>
                </div>
                <button className="btn btn-gold">💾 Save Oracle Config</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {liveScreenTarget&&<LiveScreenModal team={liveScreenTarget} onClose={()=>setLiveScreenTarget(null)}/>}
    </div>
  );
};

export { AdminDashboard, LandingPage, BackgroundWrapper, ParticleCanvas, SceneWrapper, GlobalStyles };
export { OraclesLockGame };