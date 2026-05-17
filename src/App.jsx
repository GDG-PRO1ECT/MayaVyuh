import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSyncState, broadcastEvent, useEventListener } from "./useSync.js";
import {
  AdminDashboard, LandingPage, SceneWrapper, GlobalStyles, OraclesLockGame,
} from "./AdminComponents.jsx";

const INIT_TEAMS  = [];
const INIT_WORDS  = ["dragon", "ancient", "fire"];
const INIT_TIMERS = { round1: 300, round2: 300, round3: 300, discussion: 120, swap: 60 };
const INIT_EVENT  = { started: false };

// ─── ANTI-CHEAT HOOK ─────────────────────────────────────────────────────────
const useAntiCheat = (enabled, onViolation) => {
  const vc = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const onVis  = () => { if (document.hidden) { vc.current++; onViolation("TAB_SWITCH", `Violation #${vc.current}: tab switched`); } };
    const onBlur = () => onViolation("WINDOW_BLUR", "Window blurred / minimized");
    const onBef  = (e) => { onViolation("PAGE_LEAVE", "Attempted to leave"); e.preventDefault(); e.returnValue = "The Oracle is watching."; return e.returnValue; };
    const onCtx  = (e) => e.preventDefault();
    const onKey  = (e) => {
      if (e.ctrlKey && (e.key==="t"||e.key==="n"||e.key==="w")) { e.preventDefault(); onViolation("HOTKEY", "Ctrl+"+e.key+" blocked"); }
      if (e.key==="F12"||(e.ctrlKey&&e.shiftKey&&e.key==="I")) { e.preventDefault(); onViolation("DEVTOOLS", "DevTools attempt"); }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBef);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBef);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("keydown", onKey);
    };
  }, [enabled, onViolation]);
};

// ─── LOBBY ────────────────────────────────────────────────────────────────────
const Lobby = ({ onSubmit }) => {
  const [step, setStep]       = useState(1);
  const [teamName, setTeamName] = useState("");
  const [player1, setPlayer1]   = useState("");
  const [player2, setPlayer2]   = useState("");
  const [role, setRole]         = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleIdentity = () => { if (teamName && player1 && player2) setStep(2); };
  const handleSubmit = () => {
    if (!role) return;
    setSubmitted(true);
    onSubmit({ teamName, player1, player2, role });
  };

  if (submitted) return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2, position:"relative" }}>
      <div style={{ textAlign:"center", maxWidth:500, animation:"fadeInUp 0.8s ease-out" }}>
        <div style={{ fontSize:72, marginBottom:24, animation:"oraclePulse 2s infinite", display:"inline-block" }}>⏳</div>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:22, color:"var(--rune-gold)", animation:"goldPulse 2s infinite", marginBottom:12 }}>
          Awaiting Admin Approval...
        </div>
        <div style={{ fontFamily:"'IM Fell English',serif", color:"var(--parchment-dim)", fontStyle:"italic", fontSize:16, lineHeight:1.8 }}>
          "Your name has been inscribed in the Oracle's scroll. The Admin must grant passage before you enter the labyrinth."
        </div>
        <div style={{ marginTop:40, opacity:0.4 }}>
          <svg viewBox="0 0 100 100" width={100} height={100} fill="none" stroke="var(--rune-gold)" strokeWidth="1.5" style={{ animation:"runeFloat 4s ease-in-out infinite" }}>
            <circle cx="50" cy="50" r="47" opacity="0.3"/>
            <rect x="20" y="20" width="60" height="60" rx="4" opacity="0.4"
              style={{ strokeDasharray:240, strokeDashoffset:240, animation:"labyLoading 2s ease-out forwards" }}/>
            <path d="M50 20L50 80M20 50L80 50" opacity="0.4"/>
            <circle cx="50" cy="50" r="5" fill="var(--rune-gold)" opacity="0.8"/>
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="lobby-wrap">
      <div style={{ textAlign:"center", maxWidth:820, width:"100%", animation:"fadeInUp 0.8s ease-out" }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:"var(--oracle-blue)", letterSpacing:4, marginBottom:12 }}>⬡ ENTER THE LABYRINTH ⬡</div>
        <div className="lobby-title">MayaVyuh</div>
        <div style={{ fontFamily:"'IM Fell English',serif", fontSize:20, color:"var(--parchment-dim)", fontStyle:"italic", marginBottom:48, letterSpacing:2 }}>The Prompt War</div>

        {step === 1 ? (
          <>
            <div className="card" style={{ maxWidth:520, margin:"0 auto 24px", textAlign:"left" }}>
              <div className="card-title">⬡ Your Identity</div>
              <div className="form-group">
                <label className="form-label">Team Name</label>
                <input className="form-input" value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="Name your fellowship..."/>
              </div>
              <div className="form-group">
                <label className="form-label">Player 1 — Name</label>
                <input className="form-input" value={player1} onChange={e=>setPlayer1(e.target.value)} placeholder="First warrior's name..."/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Player 2 — Name</label>
                <input className="form-input" value={player2} onChange={e=>setPlayer2(e.target.value)} placeholder="Second warrior's name..."/>
              </div>
            </div>
            <button className="btn btn-gold" style={{ fontSize:17, padding:"14px 48px", letterSpacing:4 }}
              onClick={handleIdentity} disabled={!teamName||!player1||!player2}>
              CHOOSE ROLES →
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:15, color:"var(--rune-gold)", marginBottom:24 }}>
              TEAM: {teamName.toUpperCase()}
            </div>
            <div className="role-cards">
              <div className={`role-card observer ${role==="observer"?"selected":""}`} onClick={()=>setRole("observer")}>
                <span style={{ position:"absolute", top:12, right:12, background:"rgba(0,212,255,0.15)", color:"var(--oracle-blue)", border:"1px solid rgba(0,212,255,0.3)", padding:"3px 8px", borderRadius:2, fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:1 }}>ROUND 1 & 3</span>
                <span style={{ fontSize:48, marginBottom:16, display:"block" }}>👁️</span>
                <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:20, color:"var(--oracle-blue)", marginBottom:8 }}>The Observer</div>
                <p style={{ fontFamily:"'IM Fell English',serif", fontSize:15, color:"var(--parchment-dim)", fontStyle:"italic", lineHeight:1.6 }}>
                  "Study the sacred image and transmit its essence through words alone. Your tongue is your weapon."
                </p>
                <div style={{ marginTop:12, fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--parchment-dim)" }}>
                  {player1} leads first
                </div>
              </div>
              <div className={`role-card creator ${role==="creator"?"selected":""}`} onClick={()=>setRole("creator")}>
                <span style={{ position:"absolute", top:12, right:12, background:"rgba(139,92,246,0.15)", color:"var(--spirit-purple)", border:"1px solid rgba(139,92,246,0.3)", padding:"3px 8px", borderRadius:2, fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:1 }}>ROUND 2</span>
                <span style={{ fontSize:48, marginBottom:16, display:"block" }}>✨</span>
                <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:20, color:"var(--spirit-purple)", marginBottom:8 }}>The Creator</div>
                <p style={{ fontFamily:"'IM Fell English',serif", fontSize:15, color:"var(--parchment-dim)", fontStyle:"italic", lineHeight:1.6 }}>
                  "Wait in the sanctum. When the Observer's transmission arrives, manifest the vision through AI generation."
                </p>
                <div style={{ marginTop:12, fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--parchment-dim)" }}>
                  {player2} waits first
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
              <button className="btn btn-ghost" onClick={()=>setStep(1)}>← BACK</button>
              <button className="btn btn-gold" style={{ fontSize:17, padding:"14px 48px", letterSpacing:4 }}
                onClick={handleSubmit} disabled={!role}>
                ⚡ ENTER THE LABYRINTH
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── WAITING LOBBY ────────────────────────────────────────────────────────────
const WaitingLobby = ({ teamName, otherTeams, observerName, observerTimerMax, observerTimeLeft, observerText, winners }) => {
  const pct  = observerTimerMax > 0 ? (observerTimeLeft / observerTimerMax) * 100 : 100;
  const mins = Math.floor(observerTimeLeft / 60);
  const secs = observerTimeLeft % 60;

  if (winners && winners.length > 0) return <VictoryScreen winners={winners} teamName={teamName}/>;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", minHeight:"calc(100vh - 44px)", overflow:"hidden" }}>
      {/* Main */}
      <div style={{ padding:"32px 28px", display:"flex", flexDirection:"column", gap:20, overflowY:"auto", borderRight:"1px solid var(--border-rune)" }}>
        <div>
          <div className="phase-label">⬡ WAITING CHAMBER · CREATOR'S SANCTUM</div>
          <div className="phase-title">{teamName} — Awaiting Transmission</div>
          <div style={{ fontFamily:"'IM Fell English',serif", fontSize:16, color:"var(--parchment-dim)", fontStyle:"italic", lineHeight:1.7 }}>
            "{observerName} is studying the sacred vision. Their transmission will arrive soon. Prepare your mind."
          </div>
        </div>

        {/* Observer progress */}
        <div className="card">
          <div className="card-title">📡 Observer Progress — {observerName}</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:"var(--oracle-blue)" }}>
              <span className="live-dot"/>TRANSMITTING...
            </div>
            <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:28, color: pct<20 ? "var(--blood-glow)" : "var(--rune-gold)" }}>
              {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
            </div>
          </div>
          <div className="timer-bar">
            <div className={`timer-fill ${pct<20?"danger":""}`} style={{ width:`${pct}%` }}/>
          </div>
          {observerText && (
            <div style={{ marginTop:14, fontFamily:"'IM Fell English',serif", fontSize:14, color:"var(--parchment-dim)", fontStyle:"italic", lineHeight:1.7, padding:14, background:"rgba(0,212,255,0.04)", border:"1px solid var(--border-oracle)", borderRadius:4 }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"var(--oracle-blue)", letterSpacing:2, display:"block", marginBottom:6 }}>LIVE TRANSMISSION</span>
              {observerText}
            </div>
          )}
        </div>

        {/* Oracle's Lock */}
        <div className="card" style={{ flex:1 }}>
          <div className="card-title">🔮 Oracle's Lock — Mental Preparation</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--parchment-dim)", letterSpacing:2, marginBottom:12 }}>
            Align all rune rings to the apex ↑
          </div>
          <OraclesLockGame/>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ padding:"24px 18px", display:"flex", flexDirection:"column", gap:18, overflowY:"auto", background:"rgba(4,5,10,0.7)" }}>
        <div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--rune-gold)", letterSpacing:3, marginBottom:14 }}>⬡ OTHER TEAMS</div>
          {(otherTeams||[]).map((t,i)=>(
            <div key={i} style={{ background:"rgba(8,12,20,0.8)", border:`1px solid ${t.name===teamName?"var(--rune-gold)":"var(--border-rune)"}`, borderRadius:4, padding:"12px 14px", marginBottom:8, transition:"all 0.3s" }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:t.name===teamName?"var(--rune-gold)":"var(--text-bright)", marginBottom:4 }}>
                {t.name} {t.name===teamName&&"(You)"}
              </div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--parchment-dim)", marginBottom:6 }}>Round {t.round||0}</div>
              <div className="timer-bar" style={{ margin:0 }}>
                <div className="timer-fill" style={{ width:`${t.timeLeft&&t.totalTime ? Math.max(0,(t.timeLeft/t.totalTime)*100) : 50}%` }}/>
              </div>
            </div>
          ))}
          {(!otherTeams||otherTeams.length===0)&&<p style={{ fontFamily:"'IM Fell English',serif", color:"var(--parchment-dim)", fontStyle:"italic", fontSize:13 }}>No other teams yet.</p>}
        </div>

        {/* Phase steps */}
        <div style={{ background:"rgba(8,12,20,0.8)", border:"1px solid var(--border-rune)", borderRadius:4, padding:16 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"var(--rune-gold)", letterSpacing:2, marginBottom:12 }}>⬡ GAME PHASES</div>
          {[
            {label:"Register",   done:true,  active:false},
            {label:"Observer R1",done:false, active:true},
            {label:"Discussion", done:false, active:false},
            {label:"Creator R2", done:false, active:false},
            {label:"Swap",       done:false, active:false},
            {label:"Observer R3",done:false, active:false},
            {label:"Submit",     done:false, active:false},
            {label:"Judgment",   done:false, active:false},
          ].map((ph,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(200,146,10,0.05)" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:ph.done?"rgba(0,255,136,0.15)":ph.active?"rgba(200,146,10,0.15)":"rgba(200,146,10,0.05)", border:`1px solid ${ph.done?"#00ff88":ph.active?"var(--rune-gold)":"rgba(200,146,10,0.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0 }}>
                {ph.done?"✓":ph.active?"→":i+1}
              </div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:ph.done?"#00ff88":ph.active?"var(--rune-gold)":"var(--parchment-dim)" }}>{ph.label}</div>
            </div>
          ))}
        </div>

        {/* Oracle broadcast */}
        <div style={{ background:"rgba(8,12,20,0.8)", border:"1px solid var(--border-oracle)", borderRadius:4, padding:16 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"var(--oracle-blue)", letterSpacing:2, marginBottom:8 }}>🔮 ORACLE BROADCAST</div>
          <div style={{ fontFamily:"'IM Fell English',serif", fontSize:13, color:"var(--parchment-dim)", fontStyle:"italic", lineHeight:1.6 }}>
            "The vision travels between minds. Be ready, Creator — when the transmission arrives, your trial begins."
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── GEMINI UI (all 3 rounds + forbidden word detection) ─────────────────────
const GEN_PHRASES = ["Invoking the Oracle...","Weaving light and shadow...","Manifesting the vision...","Almost there..."];

const GeminiUI = ({ forbiddenWords, onSelect, timerDuration, isRefining, imagesToRefine, roundLabel, onTextChange }) => {
  const [prompt, setPrompt]             = useState("");
  const [gallery, setGallery]           = useState([]);
  const [generating, setGenerating]     = useState(false);
  const [timeLeft, setTimeLeft]         = useState(timerDuration||300);
  const [selectedImage, setSelectedImage] = useState(null);
  const [forbidden, setForbidden]       = useState(false);
  const [showTooltip, setShowTooltip]   = useState(false);
  const [rejectedWord, setRejectedWord] = useState("");
  const [genPhrase, setGenPhrase]       = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(tl => {
      if (tl <= 1) {
        clearInterval(t);
        if (selectedImage) onSelect(selectedImage);
        else if (gallery.length) onSelect(gallery[0]);
        else onSelect(null);
        return 0;
      }
      return tl - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [selectedImage, gallery, onSelect]);

  const handleKeyUp = (e) => {
    const words = e.target.value.split(/\s+/);
    const last  = words[words.length-1]?.toLowerCase().replace(/[^a-z]/g,"");
    if (last && (forbiddenWords||[]).some(fw=>fw.toLowerCase()===last)) {
      setRejectedWord(last.toUpperCase()); setForbidden(true); setShowTooltip(true);
      setPrompt(e.target.value.slice(0, e.target.value.lastIndexOf(words[words.length-1])));
      setTimeout(()=>{ setForbidden(false); setShowTooltip(false); }, 2000);
    } else {
      setPrompt(e.target.value);
      onTextChange?.(e.target.value);
    }
  };

  const handleGenerate = () => {
    if (!prompt) return;
    setGenerating(true);
    let pi = 0;
    const pt = setInterval(()=>{ pi=(pi+1)%GEN_PHRASES.length; setGenPhrase(pi); }, 620);
    setTimeout(() => {
      clearInterval(pt);
      const imgs = [Date.now(), Date.now()+1, Date.now()+2].map(s=>`https://picsum.photos/seed/${s}/400/400`);
      setGallery(imgs); setSelectedImage(imgs[0]); setGenerating(false);
    }, 2500);
  };

  const pct  = (timeLeft/(timerDuration||300))*100;
  const mins = Math.floor(timeLeft/60);
  const secs = timeLeft%60;

  return (
    <div className="creator-wrap" style={{ animation:"fadeInUp 0.5s ease-out" }}>
      {showTooltip&&<div className="word-rejected-tooltip">🚫 FORBIDDEN: "{rejectedWord}" — REJECTED BY THE ORACLE</div>}

      {/* Left: target */}
      <div className="transmission-pane">
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--oracle-blue)", letterSpacing:3, marginBottom:12 }}>
          {isRefining ? "📡 REFINE TARGET" : "🎯 TARGET VISION"}
        </div>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:14, color:"var(--rune-gold)", marginBottom:16, animation:"goldPulse 3s infinite" }}>
          {roundLabel||"GENERATION PHASE"}
        </div>

        {isRefining ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(imagesToRefine||[]).map((img,i)=>(
              <div key={i} style={{ border:"1px solid var(--border-oracle)", padding:4, borderRadius:4 }}>
                <img src={img} alt="refine" style={{ width:"100%", borderRadius:3 }}/>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ border:"1px solid var(--border-oracle)", padding:4, borderRadius:4 }}>
            <img src="https://picsum.photos/seed/mayatarget/400/400" alt="target" style={{ width:"100%", borderRadius:3 }}/>
          </div>
        )}

        <div style={{ marginTop:20, padding:12, background:"rgba(0,212,255,0.05)", border:"1px solid var(--border-oracle)", borderRadius:4 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"var(--oracle-blue)", letterSpacing:2, marginBottom:6 }}>FORBIDDEN WORDS</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {(forbiddenWords||[]).map((w,i)=>(
              <span key={i} style={{ background:"rgba(204,34,0,0.12)", border:"1px solid rgba(204,34,0,0.3)", color:"var(--blood-glow)", padding:"2px 8px", borderRadius:2, fontFamily:"'Share Tech Mono',monospace", fontSize:12 }}>{w}</span>
            ))}
          </div>
        </div>

        <div style={{ marginTop:20 }}>
          <div className={`timer-display ${timeLeft<60?"danger":""}`}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
          <div className="timer-bar"><div className={`timer-fill ${timeLeft<60?"danger":""}`} style={{ width:`${pct}%` }}/></div>
          {timeLeft<60&&<div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"var(--blood-glow)", textAlign:"center", marginTop:6, letterSpacing:2 }}>AUTO-SUBMIT IN {timeLeft}s</div>}
        </div>
      </div>

      {/* Right: prompt + generate */}
      <div style={{ display:"flex", flexDirection:"column", minHeight:0 }}>
        <div style={{ padding:"28px 28px 0", display:"flex", flexDirection:"column", gap:16, flex:1, overflowY:"auto" }}>
          <div>
            <div className="phase-label">⬡ YOUR SPELL</div>
            <textarea
              className={`prompt-box ${forbidden?"forbidden":""}`}
              value={prompt}
              onChange={e=>{ setPrompt(e.target.value); onTextChange?.(e.target.value); }}
              onKeyUp={handleKeyUp}
              placeholder="Craft your generation prompt... Describe what you see or want to create. Avoid the forbidden words."
              style={{ minHeight:140 }}
            />
          </div>

          <button className="generate-btn" onClick={handleGenerate} disabled={generating||!prompt} style={{ position:"relative", overflow:"hidden" }}>
            {generating ? (
              <span style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center" }}>
                <span style={{ animation:"runeFloat 1s ease-in-out infinite", display:"inline-block" }}>⚗️</span>
                {GEN_PHRASES[genPhrase]}
              </span>
            ) : "✨ GENERATE VISION"}
            {generating&&<div style={{ position:"absolute", bottom:0, left:0, height:3, background:"var(--oracle-blue)", boxShadow:"0 0 12px var(--oracle-blue)", animation:"growBar 2.5s linear forwards" }}/>}
          </button>

          {gallery.length>0&&(
            <div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--oracle-blue)", letterSpacing:2, marginBottom:10 }}>⬡ GENERATED VISIONS — SELECT YOUR BEST</div>
              <div style={{ display:"flex", gap:14 }}>
                {gallery.map((img,idx)=>(
                  <div key={idx} onClick={()=>setSelectedImage(img)}
                    style={{ flex:1, border:selectedImage===img?"2px solid var(--rune-gold)":"2px solid transparent", cursor:"pointer", borderRadius:4, overflow:"hidden", boxShadow:selectedImage===img?"0 0 20px rgba(200,146,10,0.4)":"none", transition:"all 0.3s" }}>
                    <img src={img} alt="gen" style={{ width:"100%", display:"block" }}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="submit-btn" onClick={()=>onSelect(selectedImage)} disabled={!selectedImage} style={{ position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"rgba(139,92,246,0.25)", transformOrigin:"left", width:`${100-pct}%`, transition:"width 1s linear" }}/>
            <span style={{ position:"relative", zIndex:1 }}>⚡ SUBMIT FINAL SPELL</span>
          </button>
        </div>
        <div style={{ height:8 }}/>
      </div>
      <style>{`@keyframes growBar{from{width:0}to{width:100%}}`}</style>
    </div>
  );
};

// ─── INTERVAL SCREENS ─────────────────────────────────────────────────────────
const DiscussionInterval = ({ onComplete, duration }) => {
  const [tl, setTl] = useState(duration||120);
  useEffect(()=>{ const t=setInterval(()=>setTl(x=>{ if(x<=1){clearInterval(t);onComplete();return 0;} return x-1; }),1000); return()=>clearInterval(t); },[onComplete,duration]);
  const m=Math.floor(tl/60), s=tl%60;
  return (
    <div className="transfer-screen">
      <div style={{ fontSize:64, animation:"oraclePulse 2s infinite", display:"inline-block", marginBottom:24 }}>🎙️</div>
      <div className="transfer-text">Verbal Transfer Active</div>
      <div style={{ fontFamily:"'IM Fell English',serif", color:"var(--parchment-dim)", fontStyle:"italic", marginTop:8, fontSize:16, textAlign:"center", maxWidth:500, lineHeight:1.7 }}>
        "Explain the vision to Player 2 verbally. The original image is now hidden. Words only."
      </div>
      <div className="timer-display" style={{ marginTop:32 }}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div>
      <div className="timer-bar" style={{ width:300, margin:"8px auto" }}>
        <div className="timer-fill" style={{ width:`${(tl/(duration||120))*100}%` }}/>
      </div>
    </div>
  );
};

const SwapInterval = ({ onComplete, duration }) => {
  const [tl, setTl] = useState(duration||60);
  useEffect(()=>{ const t=setInterval(()=>setTl(x=>{ if(x<=1){clearInterval(t);onComplete();return 0;} return x-1; }),1000); return()=>clearInterval(t); },[onComplete,duration]);
  const m=Math.floor(tl/60), s=tl%60;
  return (
    <div className="transfer-screen">
      <div style={{ fontSize:64, marginBottom:24 }}>🔀</div>
      <div className="transfer-text">Player Swap</div>
      <div style={{ fontFamily:"'IM Fell English',serif", color:"var(--parchment-dim)", fontStyle:"italic", marginTop:8, fontSize:16, textAlign:"center", maxWidth:500, lineHeight:1.7 }}>
        "Player 1 returns to the keyboard. No communication allowed during this interval."
      </div>
      <div className="timer-display" style={{ marginTop:32 }}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div>
      <div className="timer-bar" style={{ width:300, margin:"8px auto" }}>
        <div className="timer-fill" style={{ width:`${(tl/(duration||60))*100}%` }}/>
      </div>
    </div>
  );
};

// ─── REFINEMENT SELECTION ─────────────────────────────────────────────────────
const RefinementSelection = ({ img1, img2, onSelect }) => (
  <div className="lobby-wrap" style={{ flexDirection:"column" }}>
    <div className="phase-label" style={{ marginBottom:8 }}>⬡ CHOOSE YOUR BASE</div>
    <div className="phase-title" style={{ color:"var(--oracle-blue)", marginBottom:40 }}>Select the Foundation for Round 3</div>
    <div className="grid-2" style={{ gap:40, maxWidth:900 }}>
      {[{img:img1,label:"Round 1 Output"},{img:img2,label:"Round 2 Output"}].map(({img,label},i)=>(
        <div key={i} className="card" style={{ cursor:"pointer", padding:12, border:"1px solid var(--border-oracle)", transition:"all 0.3s" }}
          onClick={()=>onSelect(img)}
          onMouseOver={e=>e.currentTarget.style.boxShadow="0 0 30px rgba(0,212,255,0.2)"}
          onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
          <div className="card-title">{label}</div>
          <img src={img} style={{ width:"100%", borderRadius:4 }} alt={label}/>
        </div>
      ))}
    </div>
  </div>
);

// ─── SUBMISSION FLOW ──────────────────────────────────────────────────────────
const SubmissionFlow = ({ images, onSelect }) => (
  <div className="lobby-wrap" style={{ flexDirection:"column" }}>
    <div className="phase-label" style={{ marginBottom:8 }}>⬡ FINAL SUBMISSION</div>
    <div className="phase-title" style={{ color:"var(--rune-gold)", marginBottom:12 }}>Choose Your Final Vision</div>
    <div style={{ fontFamily:"'IM Fell English',serif", color:"var(--parchment-dim)", fontStyle:"italic", fontSize:16, marginBottom:40, textAlign:"center" }}>
      "Select the image that best captures the sacred vision. This is your final answer."
    </div>
    <div className="grid-3" style={{ gap:30, maxWidth:1000 }}>
      {images.map((img,i)=>(
        <div key={i} className="card" style={{ cursor:"pointer", padding:12, border:"1px solid var(--border-rune)", transition:"all 0.3s" }}
          onClick={()=>onSelect(img)}
          onMouseOver={e=>e.currentTarget.style.borderColor="var(--rune-gold)"}
          onMouseOut={e=>e.currentTarget.style.borderColor="var(--border-rune)"}>
          <div className="card-title">Round {i+1} Output</div>
          <img src={img} style={{ width:"100%", borderRadius:4 }} alt={`R${i+1}`}/>
          <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center", marginTop:12, fontSize:12 }}>✓ Choose This</button>
        </div>
      ))}
    </div>
  </div>
);

// ─── JUDGMENT VIEW ────────────────────────────────────────────────────────────
const JudgmentView = ({ score=78, originalImage, finalImage, onReturnToLobby }) => {
  const [disp, setDisp] = useState(0);
  const circ = 2*Math.PI*100;
  useEffect(()=>{ let c=0; const step=score/80; const t=setInterval(()=>{ c+=step; if(c>=score){setDisp(score);clearInterval(t);return;} setDisp(Math.round(c)); },25); return()=>clearInterval(t); },[score]);
  const offset = circ-(disp/100)*circ;

  return (
    <div className="results-wrap" style={{ animation:"fadeInUp 0.8s ease-out" }}>
      <div className="result-panel">
        <div className="result-label" style={{ color:"var(--rune-gold)" }}>⬡ THE ORIGINAL VISION</div>
        <div style={{ flex:1, border:"1px solid var(--border-rune)", borderRadius:4, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,var(--stone),var(--abyss))" }}>
          {originalImage
            ? <img src={originalImage} style={{ width:"100%", height:"100%", objectFit:"contain" }} alt="original"/>
            : <div style={{ textAlign:"center", opacity:0.5 }}><div style={{ fontSize:60, marginBottom:12 }}>🖼️</div><div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:"var(--parchment-dim)" }}>ORIGINAL IMAGE</div></div>}
        </div>
      </div>

      <div style={{ width:220, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:"0 12px" }}>
        <svg viewBox="0 0 220 220" width="190" height="190">
          <circle cx="110" cy="110" r="100" fill="none" stroke="var(--stone)" strokeWidth="8"/>
          <circle cx="110" cy="110" r="100" fill="none" stroke="var(--rune-gold)" strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 110 110)"
            style={{ transition:"stroke-dashoffset 0.1s ease-out", filter:"drop-shadow(0 0 8px var(--rune-gold))" }}/>
          <text x="110" y="100" textAnchor="middle" fill="var(--rune-gold)" fontFamily="'Cinzel Decorative',serif" fontSize="36" fontWeight="900">{disp}%</text>
          <text x="110" y="130" textAnchor="middle" fill="var(--parchment-dim)" fontFamily="'Share Tech Mono',monospace" fontSize="10" letterSpacing="2">SIMILARITY</text>
          <text x="110" y="148" textAnchor="middle" fill="var(--parchment-dim)" fontFamily="'Share Tech Mono',monospace" fontSize="10" letterSpacing="2">SCORE</text>
        </svg>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--parchment-dim)", letterSpacing:2, textAlign:"center" }}>THE ORACLE'S VERDICT</div>
        <div style={{ fontFamily:"'IM Fell English',serif", fontSize:14, color:"var(--parchment-dim)", fontStyle:"italic", textAlign:"center" }}>
          {disp>=80?"⭐ Masterful Vision":disp>=60?"✨ Strong Resonance":disp>=40?"🌀 Partial Alignment":"💨 The Vision was lost"}
        </div>
        <button className="btn btn-ghost" style={{ fontSize:12, marginTop:8 }} onClick={onReturnToLobby}>↩ Return to Sanctum</button>
      </div>

      <div className="result-panel">
        <div className="result-label" style={{ color:"var(--oracle-blue)" }}>⬡ THE GENERATED VISION</div>
        <div style={{ flex:1, border:"1px solid var(--border-oracle)", borderRadius:4, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,rgba(0,153,204,0.1),var(--abyss))" }}>
          {finalImage
            ? <img src={finalImage} style={{ width:"100%", height:"100%", objectFit:"contain" }} alt="generated"/>
            : <div style={{ textAlign:"center", opacity:0.5 }}><div style={{ fontSize:60, marginBottom:12 }}>✨</div><div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:"var(--oracle-blue)" }}>GENERATED IMAGE</div></div>}
        </div>
      </div>
    </div>
  );
};

// ─── VICTORY SCREEN ───────────────────────────────────────────────────────────
const VictoryScreen = ({ winners, teamName }) => {
  const medals      = ["🥇","🥈","🥉"];
  const medalClass  = ["gold","silver","bronze"];
  const myRank      = (winners||[]).findIndex(w=>w.name===teamName);

  return (
    <div className="victory-wrap">
      <div style={{ textAlign:"center", marginBottom:48, animation:"fadeInUp 0.8s ease-out" }}>
        <div style={{ fontSize:72, marginBottom:16, animation:"victoryGlow 2s infinite", display:"inline-block" }}>👑</div>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:36, color:"var(--rune-gold)", animation:"goldPulse 2s infinite", marginBottom:8 }}>The Oracle Has Spoken</div>
        <div style={{ fontFamily:"'IM Fell English',serif", fontSize:18, color:"var(--parchment-dim)", fontStyle:"italic" }}>
          "The labyrinth has been conquered. These visions shall be remembered forever."
        </div>
        {myRank>=0&&(
          <div style={{ marginTop:16, fontFamily:"'Share Tech Mono',monospace", fontSize:15, color:"var(--rune-gold)", letterSpacing:3 }}>
            YOUR TEAM PLACED: {medals[myRank]} #{myRank+1}
          </div>
        )}
      </div>

      <div style={{ display:"flex", gap:32, justifyContent:"center", flexWrap:"wrap", maxWidth:1100, animation:"fadeInUp 0.8s ease-out" }}>
        {(winners||[]).map((w,i)=>(
          <div key={w.id||i} className={`winner-card ${medalClass[i]||""}`} style={{ flex:"1 1 300px", maxWidth:340 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>{medals[i]}</div>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:18, color:"var(--rune-gold)" }}>{w.name}</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--parchment-dim)", marginTop:4 }}>{w.observer} & {w.creator}</div>
            </div>
            <div className="grid-2" style={{ gap:12, marginBottom:16 }}>
              {["ORIGINAL","GENERATED"].map((lbl,li)=>(
                <div key={li}>
                  <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"var(--parchment-dim)", marginBottom:6, letterSpacing:2 }}>{lbl}</div>
                  <div style={{ border:`1px solid ${li===0?"var(--border-rune)":"var(--border-oracle)"}`, borderRadius:3, overflow:"hidden", height:120, background:"var(--stone)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, opacity:0.6 }}>
                    {li===0?"🖼️":"✨"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:28, color:"var(--oracle-blue)" }}>{w.score||0}%</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"var(--parchment-dim)", letterSpacing:2 }}>SIMILARITY SCORE</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PENALTY / DQ OVERLAYS ────────────────────────────────────────────────────
const PenaltyOverlay = ({ onDismiss }) => {
  useEffect(()=>{ const t=setTimeout(onDismiss,4000); return()=>clearTimeout(t); },[onDismiss]);
  return (
    <>
      <div className="penalty-overlay"/>
      <div className="penalty-toast">⚡ PENALTY INVOKED BY THE ORACLE — TIME REDUCED BY 30 SECONDS</div>
    </>
  );
};

const DisqualificationScreen = () => {
  const runes = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ"];
  return (
    <div className="disqual-screen">
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        {runes.map((r,i)=><span key={i} style={{ position:"absolute", fontSize:24, color:"rgba(255,0,0,0.15)", animation:"runeFloat 3s ease-in-out infinite", animationDelay:`${i*0.3}s`, left:`${(i*7+5)%90}%`, top:`${(i*11+5)%90}%` }}>{r}</span>)}
      </div>
      <div style={{ textAlign:"center", position:"relative", zIndex:1 }}>
        <div style={{ fontSize:80, marginBottom:24 }}>☠️</div>
        <div className="disqual-title">DISQUALIFIED</div>
        <div style={{ fontFamily:"'IM Fell English',serif", fontSize:20, color:"rgba(255,100,100,0.7)", fontStyle:"italic" }}>"The Oracle has cast you from the labyrinth"</div>
        <div style={{ marginTop:20, fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:"rgba(255,100,100,0.4)", letterSpacing:3 }}>ANTI-CHEAT PROTOCOL · ADMIN NOTIFIED</div>
      </div>
    </div>
  );
};

// ─── PLAYER SECTION ───────────────────────────────────────────────────────────
const PlayerSection = ({ addAlert, globalTags, timers, allTeams, setTeams, winners }) => {
  const [phase, setPhase]               = useState("lobby");
  const [playerInfo, setPlayerInfo]     = useState(null);
  const [r1Image, setR1Image]           = useState(null);
  const [r2Image, setR2Image]           = useState(null);
  const [r3Image, setR3Image]           = useState(null);
  const [r3BaseImage, setR3BaseImage]   = useState(null);
  const [finalImage, setFinalImage]     = useState(null);
  const [showPenalty, setShowPenalty]   = useState(false);
  const [disqualified, setDisqual]      = useState(false);
  const [showTabWarn, setShowTabWarn]   = useState(false);
  const [isActive, setIsActive]         = useState(false);
  const [obsTimeLeft, setObsTimeLeft]   = useState(0);
  const [liveObsText, setLiveObsText]   = useState("");
  const vc          = useRef(0);
  const myTeamId    = useRef(null);

  // Listen for admin events
  useEventListener((evt, payload) => {
    if (evt==="TEAM_APPROVED" && payload.teamId===myTeamId.current) {
      setIsActive(true);
      setPhase(playerInfo?.role==="observer" ? "round1" : "waiting");
      setObsTimeLeft(timers.round1||300);
    }
    if (evt==="PENALTY_CAST" && payload.teamId===myTeamId.current) setShowPenalty(true);
    if (evt==="TEAM_BANNED"  && payload.teamId===myTeamId.current) setDisqual(true);
  });

  const updateMyTeam = useCallback((u)=>setTeams(p=>p.map(t=>t.id===myTeamId.current?{...t,...u}:t)),[setTeams]);

  const handleViolation = useCallback((type,msg)=>{
    vc.current++;
    addAlert({type, team:playerInfo?.teamName||"Unknown", message:msg, time:new Date().toLocaleTimeString()});
    updateMyTeam({observerText: liveObsText});
    if (vc.current>=2||type==="TAB_SWITCH") setDisqual(true);
    else setShowTabWarn(true);
  },[playerInfo,addAlert,liveObsText,updateMyTeam]);

  useAntiCheat(isActive&&!disqualified, handleViolation);

  const handleLobbySubmit = (info) => {
    setPlayerInfo(info);
    const tid = Date.now();
    myTeamId.current = tid;
    const team = {
      id:tid, name:info.teamName,
      observer: info.role==="observer" ? info.player1 : info.player2,
      creator:  info.role==="creator"  ? info.player1 : info.player2,
      round:0, score:0, status:"pending",
      timeLeft:timers.round1||300, totalTime:timers.round1||300,
      observerText:"", creatorText:"",
    };
    setTeams(prev=>[...prev.filter(t=>t.name!==info.teamName), team]);
    setObsTimeLeft(timers.round1||300);
  };

  if (disqualified) return <DisqualificationScreen/>;

  const myTeamScore = allTeams.find(t=>t.id===myTeamId.current)?.score || Math.floor(Math.random()*40+55);

  return (
    <div className="player-shell">
      {showTabWarn&&(
        <div className="tab-warning" style={{ animation:"toastSlide 5s ease-out forwards" }} onAnimationEnd={()=>setShowTabWarn(false)}>
          🚨 WARNING: Page exit detected and reported to the Oracle. Next violation = DISQUALIFICATION.
        </div>
      )}
      {showPenalty&&<PenaltyOverlay onDismiss={()=>setShowPenalty(false)}/>}

      {/* Top bar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:44, background:"rgba(4,5,10,0.97)", borderBottom:"1px solid var(--border-rune)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", zIndex:200 }}>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:17, color:"var(--rune-gold)", animation:"goldPulse 3s infinite" }}>MAYAVYUH</div>
        <div style={{ display:"flex", gap:20, alignItems:"center" }}>
          {playerInfo&&<span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:"var(--parchment-dim)" }}>⬡ {playerInfo.teamName} · {playerInfo.role?.toUpperCase()}</span>}
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"var(--oracle-blue)", letterSpacing:2 }}>
            {phase.replace("round","ROUND ").replace("interval","INTERVAL ").replace("r3select","SELECT BASE").toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ paddingTop:44, minHeight:"100vh", position:"relative", zIndex:2 }}>
        {phase==="lobby"&&<Lobby onSubmit={handleLobbySubmit}/>}

        {phase==="waiting"&&(
          <WaitingLobby
            teamName={playerInfo?.teamName}
            otherTeams={allTeams}
            observerName={playerInfo?.role==="creator" ? (playerInfo?.player1||"Observer") : (playerInfo?.player2||"Observer")}
            observerTimerMax={timers.round1||300}
            observerTimeLeft={obsTimeLeft}
            observerText={liveObsText}
            winners={winners}
          />
        )}

        {phase==="round1"&&(
          <GeminiUI forbiddenWords={globalTags} timerDuration={timers.round1||300}
            isRefining={false} roundLabel="ROUND 1 · OBSERVER GENERATES"
            onSelect={img=>{ setR1Image(img); updateMyTeam({round:1,status:"active"}); setPhase("interval1"); }}
            onTextChange={t=>{ setLiveObsText(t); updateMyTeam({observerText:t}); }}
          />
        )}
        {phase==="interval1"&&<DiscussionInterval onComplete={()=>setPhase("round2")} duration={timers.discussion||120}/>}

        {phase==="round2"&&(
          <GeminiUI forbiddenWords={globalTags} timerDuration={timers.round2||300}
            isRefining={true} imagesToRefine={[r1Image||"https://picsum.photos/seed/r1/400/400"]}
            roundLabel="ROUND 2 · CREATOR REFINES"
            onSelect={img=>{ setR2Image(img); updateMyTeam({round:2,creatorText:""}); setPhase("interval2"); }}
            onTextChange={t=>updateMyTeam({creatorText:t})}
          />
        )}
        {phase==="interval2"&&<SwapInterval onComplete={()=>setPhase("r3select")} duration={timers.swap||60}/>}

        {phase==="r3select"&&(
          <RefinementSelection
            img1={r1Image||"https://picsum.photos/seed/r1/400/400"}
            img2={r2Image||"https://picsum.photos/seed/r2/400/400"}
            onSelect={img=>{ setR3BaseImage(img); setPhase("round3"); }}
          />
        )}

        {phase==="round3"&&(
          <GeminiUI forbiddenWords={globalTags} timerDuration={timers.round3||300}
            isRefining={true} imagesToRefine={[r3BaseImage||"https://picsum.photos/seed/r3base/400/400"]}
            roundLabel="ROUND 3 · FINAL REFINEMENT"
            onSelect={img=>{ setR3Image(img); updateMyTeam({round:3}); setPhase("submission"); }}
            onTextChange={t=>updateMyTeam({observerText:t})}
          />
        )}

        {phase==="submission"&&(
          <SubmissionFlow
            images={[
              r1Image||"https://picsum.photos/seed/r1/400/400",
              r2Image||"https://picsum.photos/seed/r2/400/400",
              r3Image||"https://picsum.photos/seed/r3/400/400",
            ]}
            onSelect={img=>{ setFinalImage(img); const sc=Math.floor(Math.random()*40+55); updateMyTeam({score:sc,status:"active",finalImage:img}); setPhase("judgment"); }}
          />
        )}

        {phase==="judgment"&&(
          <JudgmentView
            score={myTeamScore}
            originalImage="https://picsum.photos/seed/mayatarget/400/400"
            finalImage={finalImage}
            onReturnToLobby={()=>setPhase("waiting")}
          />
        )}
      </div>

      {/* Dev controls */}
      {isActive&&(
        <div style={{ position:"fixed", bottom:20, right:20, zIndex:300, display:"flex", gap:6, flexDirection:"column" }}>
          <button className="btn btn-ghost" style={{ fontSize:10, padding:"4px 10px", borderColor:"var(--oracle-blue)", color:"var(--oracle-blue)" }}
            onClick={()=>setPhase(p=>{ const f=["round1","interval1","round2","interval2","r3select","round3","submission","judgment","waiting"]; const i=f.indexOf(p); return f[Math.min(i+1,f.length-1)]; })}>
            [DEV] NEXT →
          </button>
          <button className="btn btn-ghost" style={{ fontSize:10, padding:"4px 10px", borderColor:"var(--blood-red)", color:"var(--blood-glow)" }}
            onClick={()=>setShowPenalty(true)}>
            [DEV] PENALTY
          </button>
        </div>
      )}
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const getView = () => {
    const h = window.location.hash;
    if (h==="#admin")  return "admin";
    if (h==="#player") return "player";
    return "landing";
  };
  const [view, setView] = useState(getView);

  useEffect(() => {
    const h = () => setView(getView());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const nav = (v) => { window.location.hash = v==="landing"?"":v; setView(v); };

  const [teams, setTeams]             = useSyncState("maya_teams",   INIT_TEAMS);
  const [forbiddenWords, setForbWords]= useSyncState("maya_words",   INIT_WORDS);
  const [timers, setTimersRaw]        = useSyncState("maya_timers",  INIT_TIMERS);
  const [alerts, setAlerts]           = useSyncState("maya_alerts",  []);
  const [winners, setWinners]         = useSyncState("maya_winners", []);
  const [eventState, setEventState]   = useSyncState("maya_event",   INIT_EVENT);

  const addForbiddenWord    = useCallback(w=>setForbWords(p=>[...p.filter(x=>x!==w),w]),[setForbWords]);
  const removeForbiddenWord = useCallback(w=>setForbWords(p=>p.filter(x=>x!==w)),[setForbWords]);
  const updateTimers = useCallback((round,secs)=>setTimersRaw(p=>({...p,[round]:secs})),[setTimersRaw]);
  const addAlert = useCallback(a=>setAlerts(p=>[a,...p.slice(0,49)]),[setAlerts]);

  return (
    <>
      <GlobalStyles/>
      <SceneWrapper>
        {view==="landing"&&(
          <LandingPage onSelect={role=>nav(role)}/>
        )}
        {view==="admin"&&(
          <AdminDashboard
            alerts={alerts} setAlerts={setAlerts}
            teams={teams} setTeams={setTeams}
            forbiddenWords={forbiddenWords}
            addForbiddenWord={addForbiddenWord}
            removeForbiddenWord={removeForbiddenWord}
            timers={timers} updateTimers={updateTimers}
            winners={winners} setWinners={setWinners}
            eventState={eventState} setEventState={setEventState}
          />
        )}
        {view==="player"&&(
          <PlayerSection
            addAlert={addAlert}
            globalTags={forbiddenWords}
            timers={timers}
            allTeams={teams}
            setTeams={setTeams}
            winners={winners}
          />
        )}
      </SceneWrapper>
    </>
  );
}