import { useState, useEffect, useRef } from "react";

// ─── Storage (shared across all users) ───────────────────────────────────────
const s = {
  async get(k) {
    try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(k, v) {
    try { await window.storage.set(k, JSON.stringify(v), true); } catch {}
  },
  async list(prefix) {
    try { const r = await window.storage.list(prefix, true); return r ? r.keys : []; }
    catch { return []; }
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = ["USD","EUR","GBP","TRY","JPY","CAD","AUD","CHF","CNY","INR","MXN","BRL","SEK","NOK","DKK"];
const SYMBOLS    = { USD:"$",EUR:"€",GBP:"£",TRY:"₺",JPY:"¥",CAD:"CA$",AUD:"A$",CHF:"CHF",CNY:"¥",INR:"₹",MXN:"MX$",BRL:"R$",SEK:"kr",NOK:"kr",DKK:"kr" };
const AVATAR_COLORS = ["#e8956d","#7ec8a4","#6db3e8","#c87ec0","#e8c96d","#e87e7e","#7eb3e8","#a4c87e"];

const avatarColor = (name) => AVATAR_COLORS[Math.abs([...name].reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATAR_COLORS.length];
const initials    = (name) => name.trim().split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);
const genCode     = () => Math.random().toString(36).substring(2,8).toUpperCase();
const genId       = () => Date.now().toString(36) + Math.random().toString(36).substring(2,5);
const fmtDate     = (ts) => new Date(ts).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
const fmt         = (amt, cur) => `${SYMBOLS[cur]||""}${parseFloat(amt).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [trip,   setTrip]   = useState(null);
  const [flash,  setFlash]  = useState(null);

  function showFlash(msg, type="info") {
    setFlash({msg,type}); setTimeout(()=>setFlash(null),3500);
  }

  async function handleCreate(name, yourName) {
    const id = genId(), code = genCode();
    const data = { id, name, code, createdBy:yourName, createdAt:Date.now() };
    await s.set(`trip:${id}`, data);
    await s.set(`expenses:${id}`, []);
    setTrip(data); setScreen("trip");
    showFlash("Trip created! Share the code with your friends 🎉","success");
  }

  // ── Join: look up trip by ID from shared storage ──────────────────────────
  async function handleJoin(tripId, code) {
    const data = await s.get(`trip:${tripId}`);
    if (!data) {
      showFlash("Trip not found. Double-check the Trip ID.","error");
      return;
    }
    if (data.code.toUpperCase() !== code.trim().toUpperCase()) {
      showFlash("Wrong code. Try again.","error");
      return;
    }
    setTrip(data); setScreen("trip");
    showFlash(`Welcome to ${data.name}!`,"success");
  }

  function openTrip(t) { setTrip(t); setScreen("trip"); }

  return (
    <div style={styles.root}>
      <style>{CSS}</style>
      {flash && <Toast msg={flash.msg} type={flash.type} />}
      {screen==="home"   && <Home    onCreate={()=>setScreen("create")} onJoin={()=>setScreen("join")} onOpenTrip={openTrip} />}
      {screen==="create" && <Create  onBack={()=>setScreen("home")} onCreate={handleCreate} />}
      {screen==="join"   && <Join    onBack={()=>setScreen("home")} onJoin={handleJoin} />}
      {screen==="trip"   && <TripPage trip={trip} onBack={()=>{setTrip(null);setScreen("home");}} showFlash={showFlash} />}
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function Home({ onCreate, onJoin, onOpenTrip }) {
  const [recentTrips, setRecentTrips] = useState([]);

  useEffect(()=>{
    s.list("trip:").then(async keys => {
      const trips = await Promise.all(keys.map(k => s.get(k)));
      const valid = trips.filter(Boolean).sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
      setRecentTrips(valid);
    });
  },[]);

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>✦</span>
          <h1 style={styles.logo}>Splitshare</h1>
        </div>
        <p style={styles.tagline}>Track every lira, euro & yen — split fairly with your travel crew.</p>
        <div style={styles.btnRow}>
          <button className="btn-primary" onClick={onCreate}>Create a Trip</button>
          <button className="btn-outline" onClick={onJoin}>Join a Trip</button>
        </div>
      </div>

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <div style={styles.recentSection}>
          <div style={styles.recentHeading}>
            <span style={styles.recentTitle}>Recent Trips</span>
          </div>
          <div style={styles.recentGrid}>
            {recentTrips.map(t=>(
              <div key={t.id} className="recent-card" onClick={()=>onOpenTrip(t)}>
                <div style={styles.recentCardIcon}>✈️</div>
                <div style={styles.recentCardName}>{t.name}</div>
                <div style={styles.recentCardMeta}>by {t.createdBy}</div>
                <div style={styles.recentCardDate}>{fmtDate(t.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.featGrid}>
        {[
          ["🗺️","Named Lists","Create a list for each destination — Rome, Bali, Tokyo."],
          ["🔐","Private & Secure","Each trip has a unique code. Only invited people can access it."],
          ["📸","Add Photos","Attach a photo to any bill — restaurant, hotel, you name it."],
          ["💱","Multi-currency","Log expenses in any currency. No conversion headaches."],
        ].map(([icon,title,desc])=>(
          <div key={title} style={styles.featCard}>
            <span style={styles.featIcon}>{icon}</span>
            <strong style={styles.featTitle}>{title}</strong>
            <p style={styles.featDesc}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────
function Create({ onBack, onCreate }) {
  const [name, setName]         = useState("");
  const [yourName, setYourName] = useState("");
  const [loading, setLoading]   = useState(false);
  async function submit() {
    if (!name.trim()||!yourName.trim()) return;
    setLoading(true); await onCreate(name.trim(), yourName.trim()); setLoading(false);
  }
  return (
    <FormPage title="Create a Trip" sub="Name your adventure and get a private code." onBack={onBack}>
      <label style={styles.label}>Trip Name</label>
      <input className="inp" placeholder="e.g. Rome Summer 2025" value={name} onChange={e=>setName(e.target.value)} />
      <label style={styles.label}>Your Name</label>
      <input className="inp" placeholder="e.g. Sofia" value={yourName} onChange={e=>setYourName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
      <button className="btn-primary" style={{marginTop:8}} onClick={submit} disabled={!name.trim()||!yourName.trim()||loading}>
        {loading?"Creating…":"Create Trip →"}
      </button>
    </FormPage>
  );
}

// ─── Join ─────────────────────────────────────────────────────────────────────
function Join({ onBack, onJoin }) {
  const [tripId, setTripId] = useState("");
  const [code,   setCode]   = useState("");
  const [loading,setLoading]= useState(false);

  function handleIdChange(v) {
    // auto-extract trip ID from a pasted share link
    const m = v.match(/trip=([a-z0-9]+)/i);
    setTripId(m ? m[1] : v.trim());
  }

  async function submit() {
    if (!tripId.trim()||!code.trim()) return;
    setLoading(true); await onJoin(tripId.trim(), code.trim()); setLoading(false);
  }

  return (
    <FormPage title="Join a Trip" sub="Paste the shareable link or enter the Trip ID + code." onBack={onBack}>
      <label style={styles.label}>Trip Link or ID</label>
      <input className="inp" placeholder="Paste link or trip ID" value={tripId} onChange={e=>handleIdChange(e.target.value)} />
      <label style={styles.label}>Access Code</label>
      <input className="inp" placeholder="6-character code e.g. A3BX9Z" value={code}
        onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6}
        onKeyDown={e=>e.key==="Enter"&&submit()} />
      <button className="btn-primary" style={{marginTop:8}} onClick={submit} disabled={!tripId.trim()||!code.trim()||loading}>
        {loading?"Joining…":"Join Trip →"}
      </button>
      <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.6,marginTop:4}}>
        💡 The trip creator should share both the <strong>link</strong> and the <strong>6-letter code</strong> with you.
      </p>
    </FormPage>
  );
}

// ─── Trip Page ────────────────────────────────────────────────────────────────
function TripPage({ trip, onBack, showFlash }) {
  const [expenses,     setExpenses]     = useState([]);
  const [loaded,       setLoaded]       = useState(false);
  const [showAdd,      setShowAdd]      = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [showSummary,  setShowSummary]  = useState(false);
  const [viewPhoto,    setViewPhoto]    = useState(null);
  const [filterPerson, setFilterPerson] = useState("all");
  const [sortBy,       setSortBy]       = useState("date-desc");

  useEffect(()=>{
    s.get(`expenses:${trip.id}`).then(data=>{
      setExpenses(Array.isArray(data)?data:[]);
      setLoaded(true);
    });
  },[trip.id]);

  async function addExpense(exp) {
    const next = [{ id:genId(), ...exp, createdAt:Date.now() }, ...expenses];
    setExpenses(next); await s.set(`expenses:${trip.id}`, next);
    setShowAdd(false); showFlash("Expense added!","success");
  }

  async function removeExpense(id) {
    const next = expenses.filter(e=>e.id!==id);
    setExpenses(next); await s.set(`expenses:${trip.id}`, next);
    showFlash("Removed.","info");
  }

  const people   = [...new Set(expenses.map(e=>e.addedBy))].sort();
  const filtered = expenses.filter(e => filterPerson==="all" || e.addedBy===filterPerson);
  const sorted   = [...filtered].sort((a,b)=>{
    if (sortBy==="date-desc")  return b.createdAt - a.createdAt;
    if (sortBy==="date-asc")   return a.createdAt - b.createdAt;
    if (sortBy==="amt-desc")   return b.amount - a.amount;
    if (sortBy==="amt-asc")    return a.amount - b.amount;
    if (sortBy==="person-az")  return a.addedBy.localeCompare(b.addedBy);
    return 0;
  });

  const shareLink = `${window.location.href.split("?")[0]}?trip=${trip.id}`;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.tripHeader}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div style={styles.tripTitleWrap}>
          <span style={styles.tripPill}>Trip</span>
          <h2 style={styles.tripTitle}>{trip.name}</h2>
          <span style={styles.tripSub}>created by <strong>{trip.createdBy}</strong> · {fmtDate(trip.createdAt)}</span>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-start"}}>
          <button className="btn-tab" onClick={()=>setShowSummary(true)}>📊 Summary</button>
          <button className="btn-share" onClick={()=>setShowShare(true)}>Share 🔗</button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          [expenses.length,  "Expenses"],
          [people.length||"–","People"],
          [expenses.filter(e=>e.photo).length,"Photos"],
          [[...new Set(expenses.map(e=>e.currency))].length||"–","Currencies"],
        ].map(([n,l])=>(
          <div key={l} style={styles.statCard}>
            <span style={styles.statNum}>{n}</span>
            <span style={styles.statLabel}>{l}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={styles.controlsBar}>
        <div style={styles.filterRow}>
          <span style={styles.controlLabel}>Filter</span>
          <div style={styles.filterChips}>
            <button className={`chip${filterPerson==="all"?" chip-active":""}`} onClick={()=>setFilterPerson("all")}>All</button>
            {people.map(p=>(
              <button key={p} className={`chip${filterPerson===p?" chip-active":""}`} onClick={()=>setFilterPerson(p)}>
                <Avatar name={p} size={18}/>{p}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.sortRow}>
          <span style={styles.controlLabel}>Sort</span>
          <div style={styles.sortChips}>
            {[["date-desc","Date ↓"],["date-asc","Date ↑"],["amt-desc","Amount ↓"],["amt-asc","Amount ↑"],["person-az","Person A–Z"]].map(([val,label])=>(
              <button key={val} className={`chip${sortBy===val?" chip-active":""}`} onClick={()=>setSortBy(val)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Count + Add */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:"var(--muted)"}}>
          Showing <strong style={{color:"var(--fg)"}}>{sorted.length}</strong> expense{sorted.length!==1?"s":""}
          {filterPerson!=="all"&&<> · <span style={{color:"var(--accent)"}}>{filterPerson}</span></>}
        </span>
        <button className="btn-primary" onClick={()=>setShowAdd(true)}>+ Add Expense</button>
      </div>

      {/* List */}
      {!loaded ? (
        <div style={styles.empty}><span className="spin">◌</span></div>
      ) : sorted.length===0 ? (
        <div style={styles.empty}>
          <span style={{fontSize:44}}>🧾</span>
          <p style={{marginTop:12,color:"var(--muted)"}}>
            {expenses.length===0?"No expenses yet. Add your first one!":"No expenses match this filter."}
          </p>
        </div>
      ) : (
        <div style={styles.expList}>
          {sorted.map(exp=>(
            <ExpenseRow key={exp.id} exp={exp}
              onDelete={()=>removeExpense(exp.id)}
              onViewPhoto={()=>setViewPhoto(exp.photo)} />
          ))}
        </div>
      )}

      {showAdd     && <AddModal    onClose={()=>setShowAdd(false)} onAdd={addExpense} />}
      {showShare   && <ShareModal  trip={trip} link={shareLink} onClose={()=>setShowShare(false)} showFlash={showFlash} />}
      {showSummary && <SummaryModal expenses={expenses} onClose={()=>setShowSummary(false)} />}
      {viewPhoto   && <PhotoModal  src={viewPhoto} onClose={()=>setViewPhoto(null)} />}
    </div>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────
function ExpenseRow({ exp, onDelete, onViewPhoto }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="exp-card" style={open?{...styles.expCard,...styles.expCardOpen}:styles.expCard}>
      <div style={styles.expMain} onClick={()=>setOpen(o=>!o)}>
        <div style={styles.expLeft}>
          {exp.photo
            ? <img src={exp.photo} style={styles.expThumb} alt="receipt" />
            : <div style={styles.expThumbEmpty}>📄</div>}
          <div style={{minWidth:0}}>
            <div style={styles.expDesc}>{exp.description}</div>
            <div style={styles.expPersonRow}>
              <Avatar name={exp.addedBy} size={20}/>
              <span style={{...styles.expPersonName,color:avatarColor(exp.addedBy)}}>{exp.addedBy}</span>
              <span style={styles.expDot}>·</span>
              <span style={styles.expDate}>{fmtDate(exp.createdAt)}</span>
            </div>
          </div>
        </div>
        <div style={styles.expRight}>
          <div style={styles.expAmtWrap}>
            <span style={styles.expAmount}>{fmt(exp.amount, exp.currency)}</span>
            <span style={styles.expCurrency}>{exp.currency}</span>
          </div>
          <span style={{...styles.chevron,transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
        </div>
      </div>
      {open && (
        <div style={styles.expActions}>
          {exp.photo && <button className="act-btn" onClick={e=>{e.stopPropagation();onViewPhoto();}}>🔍 View Photo</button>}
          <button className="act-btn danger" onClick={e=>{e.stopPropagation();onDelete();}}>🗑 Remove</button>
        </div>
      )}
    </div>
  );
}

// ─── Summary Modal ────────────────────────────────────────────────────────────
function SummaryModal({ expenses, onClose }) {
  if (expenses.length === 0) {
    return (
      <Modal title="Expense Summary" onClose={onClose}>
        <p style={{color:"var(--muted)",textAlign:"center",padding:"20px 0"}}>No expenses to summarize yet.</p>
      </Modal>
    );
  }

  // ── Build per-person totals per currency ──────────────────────────────────
  const byPerson = {}; // { personName: { USD: 120.5, EUR: 30 } }
  for (const e of expenses) {
    if (!byPerson[e.addedBy]) byPerson[e.addedBy] = {};
    byPerson[e.addedBy][e.currency] = (byPerson[e.addedBy][e.currency]||0) + (parseFloat(e.amount)||0);
  }

  // ── Grand totals per currency ─────────────────────────────────────────────
  const grandTotals = {}; // { USD: 500, EUR: 200 }
  for (const e of expenses) {
    grandTotals[e.currency] = (grandTotals[e.currency]||0) + (parseFloat(e.amount)||0);
  }

  // ── Sort people by total (sum across all currencies, approximation) ───────
  const sortedPeople = Object.entries(byPerson).sort((a,b)=>{
    const sumA = Object.values(a[1]).reduce((s,v)=>s+v,0);
    const sumB = Object.values(b[1]).reduce((s,v)=>s+v,0);
    return sumB - sumA;
  });

  return (
    <Modal title="Expense Summary" onClose={onClose}>

      {/* ── Per-person breakdown ── */}
      <div style={styles.summHeading}>Who spent what</div>

      {sortedPeople.map(([person, byCur])=>{
        const color = avatarColor(person);
        return (
          <div key={person} style={styles.summPersonCard}>
            {/* Person header */}
            <div style={styles.summPersonHead}>
              <Avatar name={person} size={40}/>
              <div style={{flex:1}}>
                <div style={{...styles.summPersonName, color}}>{person}</div>
                <div style={styles.summPersonCount}>
                  {Object.keys(byCur).length} currenc{Object.keys(byCur).length===1?"y":"ies"} · {expenses.filter(e=>e.addedBy===person).length} expenses
                </div>
              </div>
            </div>

            {/* Per-currency breakdown with % bar */}
            {Object.entries(byCur).sort((a,b)=>b[1]-a[1]).map(([cur, amt])=>{
              const grandForCur = grandTotals[cur] || 1;
              const pct         = (amt / grandForCur * 100);
              return (
                <div key={cur} style={styles.summCurBlock}>
                  <div style={styles.summAmtRow}>
                    <span style={styles.summCurTag}>{cur}</span>
                    <span style={styles.summAmt}>{fmt(amt, cur)}</span>
                    <span style={styles.summPct}>{pct.toFixed(1)}%</span>
                  </div>
                  {/* bar showing share of this currency's total */}
                  <div style={styles.summBarBg}>
                    <div style={{...styles.summBarFill, width:`${pct}%`, background:color}} />
                  </div>
                  <div style={styles.summBarLabel}>
                    of {fmt(grandForCur, cur)} total in {cur}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Divider ── */}
      <div style={{height:1,background:"var(--border)",margin:"4px 0"}}/>

      {/* ── Grand totals ── */}
      <div style={styles.summHeading}>Trip grand totals</div>
      {Object.entries(grandTotals).sort((a,b)=>b[1]-a[1]).map(([cur,amt])=>(
        <div key={cur} style={styles.summTotalRow}>
          <span style={styles.summCurTag}>{cur}</span>
          <div>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700}}>
              {fmt(amt, cur)}
            </span>
            <span style={{fontSize:12,color:"var(--muted)",marginLeft:8}}>
              across {expenses.filter(e=>e.currency===cur).length} expense{expenses.filter(e=>e.currency===cur).length!==1?"s":""}
            </span>
          </div>
        </div>
      ))}

    </Modal>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }) {
  const [desc,      setDesc]      = useState("");
  const [who,       setWho]       = useState("");
  const [amount,    setAmount]    = useState("");
  const [currency,  setCurrency]  = useState("EUR");
  const [photo,     setPhoto]     = useState(null);
  const [imgLoading,setImgLoading]= useState(false);
  const fileRef = useRef();

  function handleFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setImgLoading(true);
    const r = new FileReader();
    r.onload = ev => { setPhoto(ev.target.result); setImgLoading(false); };
    r.readAsDataURL(f);
  }
  function submit() {
    if (!desc.trim()||!who.trim()||!amount) return;
    onAdd({ description:desc.trim(), addedBy:who.trim(), amount:parseFloat(amount), currency, photo });
  }

  return (
    <Modal title="Add Expense" onClose={onClose}>
      <label style={styles.label}>Description</label>
      <input className="inp" placeholder="e.g. Dinner at Trattoria" value={desc} onChange={e=>setDesc(e.target.value)} />
      <label style={styles.label}>Added By</label>
      <input className="inp" placeholder="Your name" value={who} onChange={e=>setWho(e.target.value)} />
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:2}}>
          <label style={styles.label}>Amount</label>
          <input className="inp" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} />
        </div>
        <div style={{flex:1}}>
          <label style={styles.label}>Currency</label>
          <select className="inp" value={currency} onChange={e=>setCurrency(e.target.value)}>
            {CURRENCIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <label style={styles.label}>Photo <span style={{color:"var(--muted)",fontSize:12}}>(optional)</span></label>
      <div className="photo-drop" onClick={()=>fileRef.current.click()} style={photo?styles.photoPreviewWrap:styles.photoDrop}>
        {imgLoading ? <span className="spin">◌</span>
          : photo   ? <img src={photo} style={styles.photoPreview} alt="preview" />
          :            <span>📎 Click to attach a photo</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile} />
      {photo && <button className="act-btn" style={{alignSelf:"flex-start",marginTop:-4}} onClick={()=>setPhoto(null)}>✕ Remove photo</button>}
      <button className="btn-primary" style={{marginTop:8}} onClick={submit} disabled={!desc.trim()||!who.trim()||!amount}>
        Add Expense
      </button>
    </Modal>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ trip, link, onClose, showFlash }) {
  function copy(text) { navigator.clipboard.writeText(text).then(()=>showFlash("Copied!","success")); }
  return (
    <Modal title="Share This Trip" onClose={onClose}>
      <div style={{background:"var(--accent-light)",border:"1px solid var(--accent)",borderRadius:12,padding:"12px 16px",fontSize:13,color:"var(--fg)",lineHeight:1.7}}>
        📋 Share <strong>both</strong> the link and the code. Your friends need <strong>both</strong> to join.
      </div>
      <div style={styles.shareBlock}>
        <span style={styles.shareLabel}>Access Code</span>
        <div style={styles.shareRow}>
          <code style={{...styles.shareCode,...styles.shareCodeBig}}>{trip.code}</code>
          <button className="copy-btn" onClick={()=>copy(trip.code)}>Copy</button>
        </div>
      </div>
      <div style={styles.shareBlock}>
        <span style={styles.shareLabel}>Trip ID (for manual entry)</span>
        <div style={styles.shareRow}>
          <code style={styles.shareCode}>{trip.id}</code>
          <button className="copy-btn" onClick={()=>copy(trip.id)}>Copy</button>
        </div>
      </div>
      <div style={styles.shareBlock}>
        <span style={styles.shareLabel}>Shareable Link</span>
        <div style={styles.shareRow}>
          <code style={{...styles.shareCode,fontSize:11,wordBreak:"break-all"}}>{link}</code>
          <button className="copy-btn" onClick={()=>copy(link)}>Copy</button>
        </div>
      </div>
      <button className="btn-primary" style={{width:"100%"}} onClick={()=>copy(`${link}\nCode: ${trip.code}`)}>
        📋 Copy Link + Code Together
      </button>
    </Modal>
  );
}

// ─── Photo Modal ──────────────────────────────────────────────────────────────
function PhotoModal({ src, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.photoFull} onClick={e=>e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        <img src={src} style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:12,display:"block"}} alt="full" />
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size=28 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:avatarColor(name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:800,color:"#1a1410",flexShrink:0}}>
      {initials(name)}
    </div>
  );
}

// ─── Shared wrappers ──────────────────────────────────────────────────────────
function FormPage({ title, sub, onBack, children }) {
  return (
    <div style={styles.page}>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div style={styles.formWrap}>
        <h2 style={styles.formTitle}>{title}</h2>
        <p style={styles.formSub}>{sub}</p>
        <div style={styles.formFields}>{children}</div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  const bg = type==="success"?"var(--green)":type==="error"?"var(--red)":"var(--accent)";
  return <div style={{...styles.toast,background:bg}}>{msg}</div>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root:{ minHeight:"100vh", background:"var(--bg)", color:"var(--fg)", fontFamily:"'DM Sans', sans-serif" },
  page:{ maxWidth:740, margin:"0 auto", padding:"32px 20px 80px" },

  hero:{ textAlign:"center", padding:"48px 20px 36px", display:"flex", flexDirection:"column", alignItems:"center" },
  logoWrap:{ display:"flex", alignItems:"center", gap:12, marginBottom:14 },
  logoIcon:{ fontSize:28, color:"var(--accent)" },
  logo:{ fontFamily:"'Cormorant Garamond', serif", fontSize:52, fontWeight:700, margin:0, letterSpacing:-1 },
  tagline:{ fontSize:17, color:"var(--muted)", maxWidth:420, lineHeight:1.7, marginBottom:32 },
  btnRow:{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center" },

  recentSection:{ marginBottom:32 },
  recentHeading:{ display:"flex", alignItems:"center", marginBottom:14 },
  recentTitle:{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:.8, color:"var(--muted)" },
  recentGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 },

  featGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16, marginTop:8 },
  featCard:{ background:"var(--card)", borderRadius:16, padding:"24px 20px", display:"flex", flexDirection:"column", gap:8, border:"1px solid var(--border)" },
  featIcon:{ fontSize:28 }, featTitle:{ fontSize:15, fontWeight:700 },
  featDesc:{ fontSize:13, color:"var(--muted)", lineHeight:1.6, margin:0 },

  formWrap:{ maxWidth:420, margin:"40px auto 0", background:"var(--card)", borderRadius:20, padding:"36px 32px", border:"1px solid var(--border)" },
  formTitle:{ fontFamily:"'Cormorant Garamond', serif", fontSize:32, fontWeight:700, margin:"0 0 6px" },
  formSub:{ color:"var(--muted)", fontSize:14, marginBottom:28 },
  formFields:{ display:"flex", flexDirection:"column", gap:14 },
  label:{ fontSize:13, fontWeight:600, color:"var(--muted)", marginBottom:4, display:"block" },

  tripHeader:{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:22, flexWrap:"wrap" },
  tripTitleWrap:{ flex:1 },
  tripPill:{ background:"var(--accent-light)", color:"var(--accent)", fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20, letterSpacing:1, textTransform:"uppercase" },
  tripTitle:{ fontFamily:"'Cormorant Garamond', serif", fontSize:38, fontWeight:700, margin:"6px 0 4px", lineHeight:1.1 },
  tripSub:{ fontSize:13, color:"var(--muted)" },

  statsRow:{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" },
  statCard:{ flex:1, minWidth:80, background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 10px", textAlign:"center" },
  statNum:{ display:"block", fontFamily:"'Cormorant Garamond', serif", fontSize:30, fontWeight:700, lineHeight:1 },
  statLabel:{ display:"block", fontSize:11, color:"var(--muted)", marginTop:3 },

  controlsBar:{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, padding:"14px 16px", marginBottom:18, display:"flex", flexDirection:"column", gap:14 },
  filterRow:{ display:"flex", alignItems:"flex-start", gap:10, flexWrap:"wrap" },
  sortRow:{ display:"flex", alignItems:"flex-start", gap:10, flexWrap:"wrap" },
  controlLabel:{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:.8, paddingTop:6, flexShrink:0, minWidth:50 },
  filterChips:{ display:"flex", gap:7, flexWrap:"wrap", flex:1 },
  sortChips:{ display:"flex", gap:7, flexWrap:"wrap", flex:1 },

  expList:{ display:"flex", flexDirection:"column", gap:10 },
  expCard:{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden", transition:"box-shadow .2s" },
  expCardOpen:{ boxShadow:"0 4px 24px rgba(0,0,0,.2)" },
  expMain:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", cursor:"pointer", gap:12 },
  expLeft:{ display:"flex", alignItems:"center", gap:12, minWidth:0, flex:1 },
  expThumb:{ width:52, height:52, borderRadius:10, objectFit:"cover", flexShrink:0 },
  expThumbEmpty:{ width:52, height:52, borderRadius:10, background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, border:"1px solid var(--border)" },
  expDesc:{ fontWeight:600, fontSize:15, marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  expPersonRow:{ display:"flex", alignItems:"center", gap:6 },
  expPersonName:{ fontSize:13, fontWeight:700 },
  expDot:{ color:"var(--muted)", fontSize:12 },
  expDate:{ fontSize:12, color:"var(--muted)" },
  expRight:{ display:"flex", alignItems:"center", gap:10, flexShrink:0 },
  expAmtWrap:{ textAlign:"right" },
  expAmount:{ display:"block", fontFamily:"'Cormorant Garamond', serif", fontSize:22, fontWeight:700, lineHeight:1 },
  expCurrency:{ display:"block", fontSize:11, color:"var(--muted)", fontWeight:600, marginTop:2 },
  chevron:{ fontSize:14, color:"var(--muted)", transition:"transform .2s" },
  expActions:{ display:"flex", gap:10, padding:"10px 16px 14px", borderTop:"1px solid var(--border)" },

  // ── summary ──
  summHeading:{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.9, color:"var(--muted)", marginBottom:2 },
  summPersonCard:{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:14, padding:"16px", display:"flex", flexDirection:"column", gap:12 },
  summPersonHead:{ display:"flex", alignItems:"center", gap:12 },
  summPersonName:{ fontWeight:700, fontSize:17 },
  summPersonCount:{ fontSize:12, color:"var(--muted)" },
  summCurBlock:{ display:"flex", flexDirection:"column", gap:5 },
  summAmtRow:{ display:"flex", alignItems:"center", gap:10 },
  summCurTag:{ background:"var(--accent-light)", color:"var(--accent)", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0 },
  summAmt:{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, flex:1 },
  summPct:{ fontSize:13, fontWeight:700, color:"var(--fg)" },
  summBarBg:{ height:6, borderRadius:4, background:"var(--border)", overflow:"hidden" },
  summBarFill:{ height:"100%", borderRadius:4, transition:"width .6s ease" },
  summBarLabel:{ fontSize:11, color:"var(--muted)" },
  summTotalRow:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:12 },

  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 },
  modal:{ background:"var(--card)", borderRadius:20, width:"100%", maxWidth:500, maxHeight:"90vh", overflow:"auto", border:"1px solid var(--border)" },
  modalHead:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 12px", position:"sticky", top:0, background:"var(--card)", zIndex:1, borderBottom:"1px solid var(--border)" },
  modalTitle:{ fontFamily:"'Cormorant Garamond', serif", fontSize:26, fontWeight:700, margin:0 },
  modalBody:{ padding:"16px 24px 28px", display:"flex", flexDirection:"column", gap:14 },

  photoDrop:{ border:"2px dashed var(--border)", borderRadius:12, padding:"28px 16px", textAlign:"center", cursor:"pointer", color:"var(--muted)", fontSize:14 },
  photoPreviewWrap:{ cursor:"pointer", borderRadius:12, overflow:"hidden", border:"2px solid var(--accent)" },
  photoPreview:{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" },
  photoFull:{ position:"relative", padding:8 },

  shareBlock:{ display:"flex", flexDirection:"column", gap:6 },
  shareLabel:{ fontSize:12, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:.8 },
  shareRow:{ display:"flex", alignItems:"center", gap:10 },
  shareCode:{ flex:1, background:"var(--bg)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"monospace", wordBreak:"break-all" },
  shareCodeBig:{ fontSize:28, fontWeight:700, letterSpacing:6, textAlign:"center", color:"var(--accent)" },

  toast:{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", padding:"12px 24px", borderRadius:40, color:"#fff", fontWeight:600, fontSize:14, zIndex:999, boxShadow:"0 4px 20px rgba(0,0,0,.3)", whiteSpace:"nowrap" },
  empty:{ textAlign:"center", padding:"60px 20px", color:"var(--muted)" },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;700&family=DM+Sans:wght@400;500;600;700&display=swap');
  :root {
    --bg:#1a1410; --card:#231d17; --border:#3a3028;
    --fg:#f5ede3; --muted:#8a7d72; --accent:#e8956d;
    --accent-light:rgba(232,149,109,.15); --green:#5c9e78; --red:#c4614a;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);}

  .btn-primary{background:var(--accent);color:#1a1410;border:none;padding:12px 26px;border-radius:40px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .2s,transform .15s;}
  .btn-primary:hover{opacity:.88;transform:translateY(-1px);}
  .btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none;}
  .btn-outline{background:transparent;color:var(--fg);border:1.5px solid var(--border);padding:12px 26px;border-radius:40px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:border-color .2s,transform .15s;}
  .btn-outline:hover{border-color:var(--accent);transform:translateY(-1px);}
  .btn-share{background:var(--accent-light);color:var(--accent);border:1px solid var(--accent);padding:8px 18px;border-radius:40px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s;}
  .btn-share:hover{background:rgba(232,149,109,.25);}
  .btn-tab{background:var(--card);color:var(--fg);border:1px solid var(--border);padding:8px 18px;border-radius:40px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:border-color .2s,background .2s;}
  .btn-tab:hover{border-color:var(--accent);background:var(--accent-light);}
  .back-btn{background:none;border:none;color:var(--muted);font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:4px 0;transition:color .2s;margin-bottom:8px;display:block;}
  .back-btn:hover{color:var(--fg);}
  .close-btn{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .2s;flex-shrink:0;}
  .close-btn:hover{background:var(--border);}
  .copy-btn{background:var(--bg);border:1px solid var(--border);color:var(--fg);padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:border-color .2s;}
  .copy-btn:hover{border-color:var(--accent);}
  .act-btn{background:var(--bg);border:1px solid var(--border);color:var(--muted);padding:7px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s,color .2s;}
  .act-btn:hover{background:var(--border);color:var(--fg);}
  .act-btn.danger:hover{border-color:var(--red);color:var(--red);background:rgba(196,97,74,.08);}
  .inp{width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:11px 14px;color:var(--fg);font-size:15px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;-webkit-appearance:none;}
  .inp:focus{border-color:var(--accent);}
  .inp option{background:var(--card);}
  .chip{background:var(--bg);border:1px solid var(--border);color:var(--muted);padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:6px;transition:border-color .2s,color .2s,background .2s;white-space:nowrap;}
  .chip:hover{border-color:var(--accent);color:var(--fg);}
  .chip-active{border-color:var(--accent)!important;color:var(--accent)!important;background:var(--accent-light)!important;}
  .recent-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px 16px;cursor:pointer;transition:border-color .2s,transform .15s;display:flex;flex-direction:column;gap:6px;}
  .recent-card:hover{border-color:var(--accent);transform:translateY(-2px);}
  .exp-card:hover{box-shadow:0 2px 16px rgba(0,0,0,.2);}
  .photo-drop:hover{border-color:var(--accent)!important;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .spin{display:inline-block;animation:spin 1s linear infinite;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  .exp-card{animation:fadeIn .22s ease both;}
  .recent-card{animation:fadeIn .3s ease both;}
`;

// inject recent card text styles into JS (can't use CSS classes for dynamic content)
styles.recentCardIcon = { fontSize:28, marginBottom:4 };
styles.recentCardName = { fontWeight:700, fontSize:15, color:"var(--fg)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };
styles.recentCardMeta = { fontSize:12, color:"var(--muted)" };
styles.recentCardDate = { fontSize:11, color:"var(--muted)", marginTop:2 };
