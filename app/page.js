'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── HELPERS ───────────────────────────────────────────────────────
const fmt = (n, d = 0) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })
const fmtS = n => {
  n = Number(n) || 0
  if (Math.abs(n) >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr'
  if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (Math.abs(n) >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return fmt(n)
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const GOAL_COLORS = ['#4f9eff','#38d9f5','#3dd68c','#9b6dff','#f0b84a','#f06eb0']
const SAV_COLORS = ['#4f9eff','#38d9f5','#3dd68c','#9b6dff','#f0b84a','#f05a5a']
const proj10 = (mo, ret, corpus) => {
  const r = ret / 100 / 12, n = 120
  return Math.round(corpus * Math.pow(1 + r, n) + (r > 0 ? mo * (Math.pow(1 + r, n) - 1) / r : mo * n))
}

const EMPTY = { salary: [], assets: [], liabilities: [], investments: [], savings: [], goals: [], essentials: [], budget: [] }

// ─── STYLES ────────────────────────────────────────────────────────
const S = `
:root{
  --bg:#020918;--bg2:#040d1e;--bg3:#07132b;--bg4:#0b1a38;
  --surface:#0f2040;--surface2:#162850;
  --bdr:rgba(60,120,255,0.15);--bdr2:rgba(60,120,255,0.3);
  --accent:#4f9eff;--accent2:#80bfff;--adim:rgba(79,158,255,0.13);
  --cyan:#38d9f5;--cdim:rgba(56,217,245,0.12);
  --green:#3dd68c;--gdim:rgba(61,214,140,0.12);
  --red:#f05a5a;--rdim:rgba(240,90,90,0.13);
  --amber:#f0b84a;--adm2:rgba(240,184,74,0.12);
  --purple:#9b6dff;--pdim:rgba(155,109,255,0.12);
  --text:#d6eaff;--text2:#6a9abf;--text3:#2a4a6a;
  --fd:'DM Serif Display',serif;--fb:'DM Sans',sans-serif;--fm:'JetBrains Mono',monospace;
  --r:12px;--r2:8px;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100vh;font-family:var(--fb);font-size:14px;background:var(--bg);color:var(--text);overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;
  background:radial-gradient(ellipse 90% 70% at 5% 0%,rgba(20,60,200,0.38) 0%,transparent 55%),
             radial-gradient(ellipse 70% 60% at 95% 100%,rgba(10,30,140,0.42) 0%,transparent 55%);
  pointer-events:none;z-index:0}
.wrap{position:relative;z-index:1;display:flex;min-height:100vh}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--bg2)}
::-webkit-scrollbar-thumb{background:var(--surface2);border-radius:3px}

/* LOCK */
.lock{position:fixed;inset:0;z-index:999;background:var(--bg);display:flex;align-items:center;justify-content:center}
.lock::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 70% 60% at 20% 20%,rgba(30,80,220,0.4) 0%,transparent 60%),
             radial-gradient(ellipse 60% 50% at 80% 80%,rgba(10,40,160,0.45) 0%,transparent 55%);
  pointer-events:none}
.lbox{background:rgba(7,19,43,0.95);border:1px solid var(--bdr2);border-radius:20px;
  padding:44px 38px 36px;width:380px;max-width:94vw;text-align:center;position:relative;
  box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 60px rgba(30,80,220,0.15)}
.lbox::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:55%;height:1.5px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.lic{width:64px;height:64px;background:linear-gradient(135deg,rgba(30,80,220,0.3),rgba(79,158,255,0.15));
  border:1px solid var(--bdr2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 22px}
.lh{font-family:var(--fd);font-size:26px;letter-spacing:-.4px;margin-bottom:6px}
.lp{font-size:13px;color:var(--text2);margin-bottom:28px}
.lpw{position:relative;margin-bottom:14px}
.lpwi{width:100%;height:46px;background:var(--bg4);border:1px solid var(--bdr2);border-radius:var(--r2);
  padding:0 44px 0 14px;font-size:14px;font-family:var(--fb);color:var(--text);outline:none;
  letter-spacing:2px;transition:border-color .2s,box-shadow .2s}
.lpwi:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,158,255,0.12)}
.lpwi.err{border-color:var(--red);animation:shk .35s ease}
@keyframes shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
.leye{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  background:transparent;border:none;cursor:pointer;color:var(--text3);padding:4px}
.leye:hover{color:var(--text2)}
.lbtn{width:100%;height:46px;background:linear-gradient(135deg,#4f9eff,#1a55cc);border:none;
  border-radius:var(--r2);font-size:14px;font-weight:600;font-family:var(--fb);color:#fff;
  cursor:pointer;transition:opacity .15s}
.lbtn:hover{opacity:.88}
.lerr{font-size:12px;color:var(--red);margin-top:10px;min-height:18px;font-family:var(--fm)}

/* SIDEBAR */
.sb{width:242px;min-height:100vh;background:rgba(4,13,30,0.9);border-right:1px solid var(--bdr);
  display:flex;flex-direction:column;position:fixed;top:0;left:0;z-index:100;
  backdrop-filter:blur(14px);transition:transform .3s}
.sb-logo{padding:22px 18px 16px;border-bottom:1px solid var(--bdr)}
.sb-mark{display:flex;align-items:center;gap:10px}
.sb-ico{width:32px;height:32px;background:linear-gradient(135deg,#4f9eff,#1a55cc);
  border-radius:8px;display:flex;align-items:center;justify-content:center}
.sb-name{font-family:var(--fd);font-size:17px;color:var(--text);letter-spacing:-.3px}
.sb-sub{font-size:10px;color:var(--text3);font-family:var(--fm);letter-spacing:1px;text-transform:uppercase;margin-top:1px}
.nav{padding:12px 10px 8px;flex:1;overflow-y:auto}
.nl{font-size:10px;color:var(--text3);font-family:var(--fm);letter-spacing:1.5px;
  text-transform:uppercase;padding:0 8px;margin-bottom:4px;margin-top:14px}
.nl:first-child{margin-top:0}
.ni{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:var(--r2);
  cursor:pointer;color:var(--text2);font-size:13px;margin-bottom:1px;transition:all .15s;
  border:1px solid transparent;background:none;width:100%;text-align:left}
.ni:hover{background:var(--surface);color:var(--text);border-color:var(--bdr)}
.ni.active{background:var(--adim);color:var(--accent2);border-color:var(--bdr2);font-weight:500}
.ni svg{width:14px;height:14px;flex-shrink:0;opacity:.6;stroke:currentColor;fill:none;stroke-width:2}
.ni.active svg{opacity:1}
.sb-foot{padding:12px;border-top:1px solid var(--bdr)}
.nwp{background:linear-gradient(135deg,var(--surface),var(--surface2));border:1px solid var(--bdr2);
  border-radius:var(--r);padding:12px;text-align:center}
.nwp-l{font-size:10px;color:var(--text3);font-family:var(--fm);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
.nwp-v{font-family:var(--fd);font-size:19px;letter-spacing:-.4px}
.lockbtn{display:flex;align-items:center;gap:6px;width:100%;padding:7px 12px;margin-top:8px;
  background:transparent;border:1px solid var(--bdr);border-radius:var(--r2);color:var(--text3);
  font-size:12px;font-family:var(--fb);cursor:pointer;transition:all .15s;justify-content:center}
.lockbtn:hover{background:var(--rdim);border-color:var(--red);color:var(--red)}
.lockbtn svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}

/* MAIN */
.mn{margin-left:242px;flex:1;min-height:100vh}
.tb{height:56px;background:rgba(4,13,30,0.85);border-bottom:1px solid var(--bdr);
  display:flex;align-items:center;justify-content:space-between;padding:0 26px;
  position:sticky;top:0;z-index:50;backdrop-filter:blur(12px)}
.tbt{font-family:var(--fd);font-size:18px;color:var(--text);letter-spacing:-.3px}
.tbr{display:flex;align-items:center;gap:8px}
.btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:var(--r2);
  font-size:12px;font-weight:500;font-family:var(--fb);cursor:pointer;transition:all .15s;
  border:1px solid var(--bdr2);background:transparent;color:var(--text2)}
.btn:hover{background:var(--surface);color:var(--text);border-color:var(--accent)}
.btn svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}
.btn-p{background:linear-gradient(135deg,#4f9eff,#1a55cc);color:#fff;border-color:#4f9eff;font-weight:600}
.btn-p:hover{opacity:.88}
.lu{font-size:11px;color:var(--text3);font-family:var(--fm)}

/* PAGE */
.pg{padding:24px;animation:fi .2s ease}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.pgh{margin-bottom:22px}
.pgh h1{font-family:var(--fd);font-size:26px;color:var(--text);letter-spacing:-.5px;margin-bottom:3px}
.pgh p{font-size:13px;color:var(--text2)}

/* CARDS */
.card{background:rgba(7,19,43,0.8);border:1px solid var(--bdr);border-radius:var(--r);
  overflow:hidden;margin-bottom:13px;backdrop-filter:blur(6px)}
.ch{padding:13px 18px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between}
.ct{font-size:13px;font-weight:600;color:var(--text);letter-spacing:-.1px}
.cs{font-size:11px;color:var(--text3);margin-top:1px}
.cb{padding:16px 18px}
.cf{padding:12px 18px;border-top:1px solid var(--bdr);background:rgba(2,9,24,0.6);display:flex;gap:20px;flex-wrap:wrap}
.cfs{display:flex;flex-direction:column;gap:2px}
.cfl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;font-family:var(--fm)}
.cfv{font-size:16px;font-weight:600;font-family:var(--fd);letter-spacing:-.3px}

/* FORM */
.fg{display:grid;gap:9px}
.fgg{display:flex;flex-direction:column;gap:4px}
.fl{font-size:10px;color:var(--text3);font-family:var(--fm);letter-spacing:.5px;text-transform:uppercase}
.fi,.fs{background:var(--bg4);border:1px solid var(--bdr2);border-radius:var(--r2);
  padding:7px 11px;font-size:13px;font-family:var(--fb);color:var(--text);outline:none;
  transition:border-color .15s,box-shadow .15s;width:100%}
.fi:focus,.fs:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,158,255,0.1)}
.fi::placeholder{color:var(--text3)}
.fs option{background:var(--bg3);color:var(--text)}

/* TABLE */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
thead tr{border-bottom:1px solid var(--bdr2)}
th{text-align:left;padding:8px 12px;font-size:10px;font-family:var(--fm);color:var(--text3);
  letter-spacing:1px;text-transform:uppercase;font-weight:500;white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid var(--bdr);color:var(--text)}
tr:last-child td{border-bottom:none}
tbody tr:hover{background:rgba(79,158,255,0.05)}
.tn{font-weight:500}
.tm{font-family:var(--fm);font-size:11px}
.er td{color:var(--text3);text-align:center;padding:22px;font-style:italic}
.ac{display:flex;gap:3px;align-items:center}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;
  font-size:10px;font-weight:500;white-space:nowrap}
.b-blue{background:var(--adim);color:var(--accent2);border:1px solid rgba(79,158,255,.25)}
.b-green{background:var(--gdim);color:var(--green);border:1px solid rgba(61,214,140,.25)}
.b-red{background:var(--rdim);color:var(--red);border:1px solid rgba(240,90,90,.25)}
.b-amber{background:var(--adm2);color:var(--amber);border:1px solid rgba(240,184,74,.25)}
.b-cyan{background:var(--cdim);color:var(--cyan);border:1px solid rgba(56,217,245,.25)}
.b-purple{background:var(--pdim);color:var(--purple);border:1px solid rgba(155,109,255,.25)}

/* ACTION BTNS */
.dbt,.ebt{background:transparent;border:none;cursor:pointer;padding:4px 5px;border-radius:4px;transition:all .15s;line-height:1}
.dbt{color:var(--text3)}.dbt:hover{background:var(--rdim);color:var(--red)}
.ebt{color:var(--text3)}.ebt:hover{background:var(--adim);color:var(--accent2)}

/* PROGRESS */
.pt{height:5px;background:var(--surface);border-radius:3px;overflow:hidden;margin-top:5px}
.pb{height:100%;border-radius:3px;transition:width .5s ease}

/* DASHBOARD HERO */
.dh{background:linear-gradient(135deg,rgba(11,26,56,.9),rgba(18,38,80,.85));
  border:1px solid var(--bdr2);border-radius:16px;padding:24px 26px;margin-bottom:18px;
  position:relative;overflow:hidden}
.dh::before{content:'';position:absolute;top:-50px;right:-50px;width:200px;height:200px;
  border-radius:50%;background:radial-gradient(circle,rgba(79,158,255,.2) 0%,transparent 70%)}
.dhl{font-size:11px;color:var(--text3);font-family:var(--fm);letter-spacing:1px;text-transform:uppercase;margin-bottom:5px}
.dhv{font-family:var(--fd);font-size:44px;letter-spacing:-1.5px;margin-bottom:3px}
.dhs{font-size:12px;color:var(--text2)}
.dhr{display:flex;gap:20px;margin-top:16px;padding-top:16px;border-top:1px solid var(--bdr);flex-wrap:wrap}
.dhi-l{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;font-family:var(--fm);margin-bottom:2px}
.dhi-v{font-family:var(--fd);font-size:17px;letter-spacing:-.3px}

/* CHARTS */
.cr{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px}
.ci{position:relative;width:100%;height:205px}

/* GOAL CARDS */
.gg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.gc{background:rgba(7,19,43,.8);border:1px solid var(--bdr);border-radius:var(--r);
  padding:15px;transition:border-color .2s;position:relative;overflow:hidden}
.gc:hover{border-color:var(--bdr2)}
.ga{position:absolute;top:0;left:0;bottom:0;width:3px}

/* SAVINGS */
.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:11px;margin-bottom:13px}
.sc{background:rgba(7,19,43,.8);border:1px solid var(--bdr);border-radius:var(--r);padding:13px;transition:border-color .2s}
.sc:hover{border-color:var(--bdr2)}

/* ESSENTIALS */
.eg{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.ec{background:rgba(7,19,43,.8);border:1px solid var(--bdr);border-radius:var(--r);padding:13px;transition:border-color .2s;position:relative}
.ec:hover{border-color:var(--bdr2)}

/* BUDGET */
.bi{padding:11px 0;border-bottom:1px solid var(--bdr)}
.bi:last-child{border-bottom:none}

/* MODAL */
.mb{display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.75);
  backdrop-filter:blur(5px);align-items:center;justify-content:center}
.mb.open{display:flex}
.mo{background:var(--bg3);border:1px solid var(--bdr2);border-radius:16px;padding:26px;
  width:520px;max-width:95vw;max-height:88vh;overflow-y:auto;
  box-shadow:0 24px 80px rgba(0,0,0,.7);position:relative}
.mo::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:45%;height:1.5px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.mo-t{font-family:var(--fd);font-size:19px;color:var(--text);margin-bottom:18px}
.mo-a{display:flex;gap:9px;justify-content:flex-end;margin-top:18px}

/* TOAST */
.toast{position:fixed;bottom:24px;right:24px;z-index:9000;padding:10px 18px;
  border-radius:var(--r2);font-size:13px;font-weight:500;transition:opacity .3s;
  background:var(--surface2);border:1px solid var(--bdr2);color:var(--text)}
.toast.err{background:rgba(240,90,90,.15);border-color:var(--red);color:var(--red)}
.toast.ok{background:rgba(61,214,140,.13);border-color:var(--green);color:var(--green)}

/* CORPUS BADGE */
.corpus-updated{font-size:9px;color:var(--cyan);font-family:var(--fm);margin-left:4px;vertical-align:middle}

/* LOADING */
.loading{display:flex;align-items:center;justify-content:center;height:200px;color:var(--text3);font-family:var(--fm);font-size:13px}

.es{text-align:center;padding:28px 16px;color:var(--text3);font-size:12px;font-style:italic}
.mtog{display:none;background:transparent;border:none;cursor:pointer;color:var(--text);padding:4px}
.mtog svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2}
.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99}
.ov.open{display:block}

@media(max-width:900px){
  .sb{transform:translateX(-100%)}.sb.open{transform:translateX(0)}
  .mn{margin-left:0}.cr{grid-template-columns:1fr}
  .gg,.sg{grid-template-columns:1fr}.eg{grid-template-columns:repeat(2,1fr)}
  .mtog{display:block}.tb{padding:0 14px}.pg{padding:14px}
}
@media(max-width:500px){.eg{grid-template-columns:1fr}.dhv{font-size:32px}}
`

// ─── ICONS ─────────────────────────────────────────────────────────
const Icon = ({ d, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)
const EditIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12,display:'block'}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const DelIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12,display:'block'}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>

// ─── MAIN COMPONENT ────────────────────────────────────────────────
export default function App() {
  const [locked, setLocked] = useState(true)
  const [pw, setPw] = useState('')
  const [pwVis, setPwVis] = useState(false)
  const [pwErr, setPwErr] = useState('')
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [sbOpen, setSbOpen] = useState(false)
  const [editModal, setEditModal] = useState(null) // { section, item }
  const [editForm, setEditForm] = useState({})
  const ccRef = useRef(null); const wcRef = useRef(null)
  const ccChart = useRef(null); const wcChart = useRef(null)

  // Check session
  useEffect(() => {
    if (sessionStorage.getItem('wm_ok') === '1') { setLocked(false); loadData() }
  }, [])

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ─── AUTH ───
  const tryUnlock = async () => {
    setPwErr('')
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (res.ok) {
      sessionStorage.setItem('wm_ok', '1')
      setLocked(false)
      setPw('')
      loadData()
    } else {
      setPwErr('Incorrect password. Try again.')
      setPw('')
    }
  }
  const doLock = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    sessionStorage.removeItem('wm_ok')
    setLocked(true)
    setData(EMPTY)
  }

  // ─── DATA ───
  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/data')
      if (res.status === 401) { setLocked(true); return }
      const { data: d } = await res.json()
      setData(d || EMPTY)
    } catch (e) { showToast('Failed to load data', 'err') }
    finally { setLoading(false) }
  }

  const addItem = async (section, item) => {
    const id = Date.now()
    const newItem = { ...item, id }
    const res = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, item: newItem }) })
    if (res.ok) {
      setData(d => ({ ...d, [section]: [...d[section], newItem] }))
      showToast('Saved ✓')
    } else showToast('Save failed', 'err')
  }

  const updateItem = async (section, item) => {
    const res = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, item }) })
    if (res.ok) {
      setData(d => ({ ...d, [section]: d[section].map(x => x.id === item.id ? item : x) }))
      showToast('Updated ✓')
      setEditModal(null)
    } else showToast('Update failed', 'err')
  }

  const deleteItem = async (section, id) => {
    const res = await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, id }) })
    if (res.ok) {
      setData(d => ({ ...d, [section]: d[section].filter(x => x.id !== id) }))
      showToast('Deleted')
    } else showToast('Delete failed', 'err')
  }

  // ─── STATS ───
  const stats = () => {
    const ta = data.assets.reduce((a, x) => a + x.value, 0) + data.savings.reduce((a, x) => a + x.balance, 0) + data.investments.reduce((a, x) => a + x.corpus, 0)
    const tl = data.liabilities.reduce((a, x) => a + x.outstanding, 0)
    const ni = data.salary.reduce((a, x) => a + x.net, 0)
    const emi = data.liabilities.reduce((a, x) => a + x.emi, 0)
    const inv = data.investments.reduce((a, x) => a + x.amount, 0)
    const savm = data.savings.reduce((a, x) => a + x.monthly, 0)
    const essm = data.essentials.reduce((a, x) => a + Math.round(x.premium / 12), 0)
    const budg = data.budget.reduce((a, x) => a + x.spent, 0)
    return { ta, tl, ni, emi, inv, savm, essm, budg, sur: ni - emi - inv - savm - essm - budg }
  }

  // ─── CHARTS ───
  useEffect(() => {
    if (page !== 'dashboard' || locked) return
    if (typeof window === 'undefined') return
    import('chart.js/auto').then(({ default: Chart }) => {
      const s = stats()
      if (ccChart.current) ccChart.current.destroy()
      if (wcChart.current) wcChart.current.destroy()
      if (!ccRef.current || !wcRef.current) return
      const cfC = ['#f05a5a','#4f9eff','#38d9f5','#f0b84a','#9b6dff','#3dd68c']
      ccChart.current = new Chart(ccRef.current, { type: 'bar', data: { labels: ['EMI','Invest','Savings','Essentials','Expenses','Surplus'], datasets: [{ data: [s.emi,s.inv,s.savm,s.essm,s.budg,Math.max(0,s.sur)], backgroundColor: cfC.map(c=>c+'28'), borderColor: cfC, borderWidth: 1.5, borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#2a4a6a', font: { size: 10, family: 'JetBrains Mono' } }, grid: { color: 'rgba(79,158,255,0.06)' } }, y: { ticks: { color: '#2a4a6a', font: { size: 10 }, callback: v => fmtS(v) }, grid: { color: 'rgba(79,158,255,0.06)' } } } } })
      const cm = {}
      data.assets.forEach(a => { cm[a.category] = (cm[a.category] || 0) + a.value })
      if (data.savings.length) cm['Savings'] = data.savings.reduce((a, x) => a + x.balance, 0)
      if (data.investments.length) cm['Inv. Corpus'] = data.investments.reduce((a, x) => a + x.corpus, 0)
      const wl = [], wd = []; const wp = ['#4f9eff','#38d9f5','#3dd68c','#9b6dff','#f0b84a','#f05a5a','#f06eb0']
      Object.entries(cm).forEach(([k, v]) => { if (v > 0) { wl.push(k); wd.push(v) } })
      if (!wd.length) { wl.push('No data'); wd.push(1) }
      wcChart.current = new Chart(wcRef.current, { type: 'doughnut', data: { labels: wl, datasets: [{ data: wd, backgroundColor: wp.slice(0, wl.length).map(c => c + '40'), borderColor: wp.slice(0, wl.length), borderWidth: 1.5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#6a9abf', font: { size: 10, family: 'JetBrains Mono' }, boxWidth: 9, padding: 7 } } }, cutout: '65%' } })
    })
    return () => { if (ccChart.current) ccChart.current.destroy(); if (wcChart.current) wcChart.current.destroy() }
  }, [page, data, locked])

  // ─── FORM HELPERS ───
  const [forms, setForms] = useState({
    salary: { name: '', type: 'Salary', gross: '', net: '' },
    assets: { name: '', category: 'Real Estate', value: '', cost: '' },
    liabilities: { name: '', type: 'Home Loan', outstanding: '', emi: '', rate: '', months: '' },
    investments: { name: '', type: 'SIP — Equity', amount: '', return: '12', corpus: '' },
    savings: { name: '', type: 'Emergency Fund', balance: '', monthly: '', target: '' },
    goals: { name: '', category: 'Home', target: '', saved: '', year: '2030' },
    essentials: { name: '', type: 'Health Insurance', cover: '', premium: '', renewal: '1' },
    budget: { name: '', type: 'Housing', budget: '', spent: '' },
  })
  const setF = (sec, k, v) => setForms(f => ({ ...f, [sec]: { ...f[sec], [k]: v } }))
  const numF = (sec, fields) => {
    const f = forms[sec]
    const item = { ...f }
    fields.forEach(k => { item[k] = Number(item[k]) || 0 })
    return item
  }

  // ─── NAV ───
  const PAGE_TITLES = { dashboard:'Dashboard', salary:'Salary & Income', assets:'Assets', liabilities:'Liabilities & Loans', investments:'Investments', savings:'Savings', goals:'Financial Goals', essentials:'Essentials', budget:'Monthly Budget' }
  const goTo = p => { setPage(p); setSbOpen(false) }

  // ─── EDIT MODAL ───
  const openEdit = (section, item) => { setEditModal({ section, item }); setEditForm({ ...item }) }
  const saveEdit = () => updateItem(editModal.section, editForm)

  // ─── RENDER HELPERS ───
  const ActBtns = ({ section, item }) => (
    <div className="ac">
      <button className="ebt" onClick={() => openEdit(section, item)} title="Edit"><EditIcon /></button>
      <button className="dbt" onClick={() => deleteItem(section, item.id)} title="Delete"><DelIcon /></button>
    </div>
  )

  // ─── SECTIONS ───
  const s = stats()

  // ── DASHBOARD ──
  const DashPage = () => (
    <div className="pg">
      <div className="dh">
        <div className="dhl">Total Net Worth</div>
        <div className="dhv" style={{ color: (s.ta-s.tl) >= 0 ? 'var(--accent2)' : 'var(--red)' }}>{fmt(s.ta - s.tl)}</div>
        <div className="dhs">Assets − Liabilities · {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
        <div className="dhr">
          {[['Assets',s.ta,'var(--green)'],['Liabilities',s.tl,'var(--red)'],['Monthly Invest',s.inv,'var(--accent2)'],['Monthly Savings',s.savm,'var(--cyan)'],['Monthly EMI',s.emi,'var(--amber)'],['Surplus/mo',s.sur,s.sur>=0?'var(--green)':'var(--red)']].map(([l,v,c])=>(
            <div key={l}><div className="dhi-l">{l}</div><div className="dhi-v" style={{color:c}}>{fmtS(Math.abs(v))}</div></div>
          ))}
        </div>
      </div>
      <div className="cr">
        <div className="card"><div className="ch"><div><div className="ct">Monthly cashflow</div><div className="cs">Income allocation</div></div></div><div className="cb"><div className="ci"><canvas ref={ccRef} /></div></div></div>
        <div className="card"><div className="ch"><div><div className="ct">Wealth composition</div><div className="cs">Asset breakdown</div></div></div><div className="cb"><div className="ci"><canvas ref={wcRef} /></div></div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13}}>
        <div className="card"><div className="ch"><div className="ct">Goals snapshot</div></div><div className="cb" style={{padding:'12px 16px'}}>
          {!data.goals.length ? <div className="es">No goals set</div> : data.goals.slice(0,5).map((g,i)=>{const p=Math.min(100,Math.round(g.saved/g.target*100));const c=GOAL_COLORS[i%GOAL_COLORS.length];return(<div key={g.id} style={{marginBottom:11}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span style={{fontWeight:500}}>{g.name}</span><span style={{fontFamily:'var(--fm)',fontSize:10,color:c}}>{p}%</span></div><div className="pt"><div className="pb" style={{width:`${p}%`,background:c}} /></div></div>)})}
        </div></div>
        <div className="card"><div className="ch"><div className="ct">Monthly P&L</div></div><div className="cb" style={{padding:'4px 16px'}}>
          {[['Net income',s.ni,true],['EMIs',-s.emi,false],['Investments',-s.inv,false],['Savings',-s.savm,false],['Essentials',-s.essm,false],['Expenses',-s.budg,false],['Surplus',s.sur,s.sur>=0]].map(([k,v,pos],i,arr)=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<arr.length-1?'1px solid var(--bdr)':'none',borderTop:i===arr.length-1?'1px solid var(--bdr2)':'none',marginTop:i===arr.length-1?4:0}}>
              <span style={{fontSize:12,color:'var(--text2)'}}>{k}</span>
              <span style={{fontSize:12,fontWeight:500,fontFamily:'var(--fm)',color:v===0?'var(--text2)':pos?'var(--green)':'var(--red)'}}>{v>=0?'+':'-'}{fmt(Math.abs(v))}</span>
            </div>
          ))}
        </div></div>
      </div>
    </div>
  )

  // ── SALARY ──
  const SalaryPage = () => {
    const f = forms.salary; let tg=0,tn=0
    return <div className="pg">
      <div className="pgh"><h1>Salary &amp; Income</h1><p>All income streams in one place</p></div>
      <div className="card"><div className="ch"><div className="ct">Add income source</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr auto'}}>
          <div className="fgg"><label className="fl">Source name</label><input className="fi" value={f.name} onChange={e=>setF('salary','name',e.target.value)} placeholder="e.g. Primary job" /></div>
          <div className="fgg"><label className="fl">Type</label><select className="fs" value={f.type} onChange={e=>setF('salary','type',e.target.value)}>{['Salary','Freelance','Rental','Business','Dividend','Side Hustle','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Gross/mo (₹)</label><input className="fi" type="number" value={f.gross} onChange={e=>setF('salary','gross',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Net/mo (₹)</label><input className="fi" type="number" value={f.net} onChange={e=>setF('salary','net',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 14px'}} onClick={()=>{if(!f.name)return;addItem('salary',numF('salary',['gross','net']));setForms(p=>({...p,salary:{name:'',type:'Salary',gross:'',net:''}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="card"><div className="tw"><table>
        <thead><tr><th>Source</th><th>Type</th><th>Gross/mo</th><th>Net/mo</th><th>Annual net</th><th>Tax est.</th><th></th></tr></thead>
        <tbody>{!data.salary.length?<tr className="er"><td colSpan="7">No income sources added yet</td></tr>:data.salary.map(s=>{tg+=s.gross;tn+=s.net;const tx=s.gross>0?Math.round((s.gross-s.net)/s.gross*100):0;return(<tr key={s.id}><td className="tn">{s.name}</td><td><span className="badge b-blue">{s.type}</span></td><td className="tm">{fmt(s.gross)}</td><td className="tm">{fmt(s.net)}</td><td className="tm">{fmt(s.net*12)}</td><td><span className={`badge ${tx>30?'b-red':'b-amber'}`}>{tx}%</span></td><td><ActBtns section="salary" item={s} /></td></tr>)})}</tbody>
      </table></div>
      <div className="cf"><div className="cfs"><div className="cfl">Gross/mo</div><div className="cfv">{fmt(tg)}</div></div><div className="cfs"><div className="cfl">Net/mo</div><div className="cfv">{fmt(tn)}</div></div><div className="cfs"><div className="cfl">Annual net</div><div className="cfv">{fmt(tn*12)}</div></div></div></div>
    </div>
  }

  // ── ASSETS ──
  const AssetsPage = () => {
    const f = forms.assets; let tv=0,tc=0
    return <div className="pg">
      <div className="pgh"><h1>Assets</h1><p>Everything you own</p></div>
      <div className="card"><div className="ch"><div className="ct">Add asset</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1.5fr 1fr 1fr auto'}}>
          <div className="fgg"><label className="fl">Asset name</label><input className="fi" value={f.name} onChange={e=>setF('assets','name',e.target.value)} placeholder="e.g. Apartment" /></div>
          <div className="fgg"><label className="fl">Category</label><select className="fs" value={f.category} onChange={e=>setF('assets','category',e.target.value)}>{['Real Estate','Equity / Stocks','Mutual Funds','Fixed Deposit','Gold','Crypto','Vehicle','Cash & Savings','EPF / PPF','NPS','Business','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Current value (₹)</label><input className="fi" type="number" value={f.value} onChange={e=>setF('assets','value',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Purchase price (₹)</label><input className="fi" type="number" value={f.cost} onChange={e=>setF('assets','cost',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 14px'}} onClick={()=>{if(!f.name)return;addItem('assets',numF('assets',['value','cost']));setForms(p=>({...p,assets:{name:'',category:'Real Estate',value:'',cost:''}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="card"><div className="tw"><table>
        <thead><tr><th>Asset</th><th>Category</th><th>Cost basis</th><th>Current value</th><th>Gain/Loss</th><th>Return %</th><th></th></tr></thead>
        <tbody>{!data.assets.length?<tr className="er"><td colSpan="7">No assets added yet</td></tr>:data.assets.map(a=>{tv+=a.value;tc+=a.cost;const g=a.value-a.cost;const p=a.cost>0?((g/a.cost)*100).toFixed(1):0;return(<tr key={a.id}><td className="tn">{a.name}</td><td><span className="badge b-cyan">{a.category}</span></td><td className="tm">{fmt(a.cost)}</td><td className="tm" style={{fontWeight:600}}>{fmt(a.value)}</td><td className="tm" style={{color:g>=0?'var(--green)':'var(--red)'}}>{g>=0?'+':''}{fmt(g)}</td><td><span className={`badge ${g>=0?'b-green':'b-red'}`}>{g>=0?'+':''}{p}%</span></td><td><ActBtns section="assets" item={a} /></td></tr>)})}</tbody>
      </table></div>
      <div className="cf"><div className="cfs"><div className="cfl">Total assets</div><div className="cfv" style={{color:'var(--green)'}}>{fmt(tv)}</div></div><div className="cfs"><div className="cfl">Cost basis</div><div className="cfv">{fmt(tc)}</div></div><div className="cfs"><div className="cfl">Unrealised gain</div><div className="cfv" style={{color:(tv-tc)>=0?'var(--green)':'var(--red)'}}>{(tv-tc)>=0?'+':''}{fmt(tv-tc)}</div></div></div></div>
    </div>
  }

  // ── LIABILITIES ──
  const LiabPage = () => {
    const f = forms.liabilities; let to=0,te=0,ti=0
    const bc = {'Home Loan':'b-blue','Car Loan':'b-cyan','Credit Card':'b-red','Personal Loan':'b-amber'}
    return <div className="pg">
      <div className="pgh"><h1>Liabilities &amp; Loans</h1><p>Outstanding debt, EMIs, and interest burden</p></div>
      <div className="card"><div className="ch"><div className="ct">Add liability</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr 0.7fr 0.7fr auto',gap:7}}>
          <div className="fgg"><label className="fl">Loan name</label><input className="fi" value={f.name} onChange={e=>setF('liabilities','name',e.target.value)} placeholder="e.g. SBI Home Loan" /></div>
          <div className="fgg"><label className="fl">Type</label><select className="fs" value={f.type} onChange={e=>setF('liabilities','type',e.target.value)}>{['Home Loan','Car Loan','Personal Loan','Education Loan','Credit Card','Business Loan','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Outstanding (₹)</label><input className="fi" type="number" value={f.outstanding} onChange={e=>setF('liabilities','outstanding',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">EMI/mo (₹)</label><input className="fi" type="number" value={f.emi} onChange={e=>setF('liabilities','emi',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Rate %</label><input className="fi" type="number" value={f.rate} onChange={e=>setF('liabilities','rate',e.target.value)} placeholder="8.5" /></div>
          <div className="fgg"><label className="fl">Months</label><input className="fi" type="number" value={f.months} onChange={e=>setF('liabilities','months',e.target.value)} placeholder="120" /></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 12px'}} onClick={()=>{if(!f.name)return;addItem('liabilities',numF('liabilities',['outstanding','emi','rate','months']));setForms(p=>({...p,liabilities:{name:'',type:'Home Loan',outstanding:'',emi:'',rate:'',months:''}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="card"><div className="tw"><table>
        <thead><tr><th>Loan</th><th>Type</th><th>Outstanding</th><th>EMI/mo</th><th>Rate %</th><th>Months</th><th>Total interest</th><th></th></tr></thead>
        <tbody>{!data.liabilities.length?<tr className="er"><td colSpan="8">No liabilities added yet</td></tr>:data.liabilities.map(l=>{to+=l.outstanding;te+=l.emi;const int=l.outstanding*l.rate/100/12*l.months;ti+=int;return(<tr key={l.id}><td className="tn">{l.name}</td><td><span className={`badge ${bc[l.type]||'b-purple'}`}>{l.type}</span></td><td className="tm" style={{color:'var(--red)'}}>{fmt(l.outstanding)}</td><td className="tm">{fmt(l.emi)}</td><td><span className={`badge ${l.rate>12?'b-red':l.rate>8?'b-amber':'b-green'}`}>{l.rate}%</span></td><td className="tm">{l.months}</td><td className="tm" style={{color:'var(--amber)'}}>{fmt(Math.round(int))}</td><td><ActBtns section="liabilities" item={l} /></td></tr>)})}</tbody>
      </table></div>
      <div className="cf"><div className="cfs"><div className="cfl">Outstanding</div><div className="cfv" style={{color:'var(--red)'}}>{fmt(to)}</div></div><div className="cfs"><div className="cfl">EMI/mo</div><div className="cfv">{fmt(te)}</div></div><div className="cfs"><div className="cfl">Interest cost</div><div className="cfv" style={{color:'var(--amber)'}}>{fmt(Math.round(ti))}</div></div></div></div>
    </div>
  }

  // ── INVESTMENTS ──
  const InvPage = () => {
    const f = forms.investments; let tm=0,tc=0,t10=0
    return <div className="pg">
      <div className="pgh"><h1>Monthly Investments</h1><p>SIPs, PPF, NPS — corpus auto-compounds monthly ✦</p></div>
      <div className="card"><div className="ch"><div className="ct">Add investment</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1.5fr 1fr 0.8fr 1fr auto'}}>
          <div className="fgg"><label className="fl">Investment name</label><input className="fi" value={f.name} onChange={e=>setF('investments','name',e.target.value)} placeholder="e.g. Parag Parikh Flexi Cap" /></div>
          <div className="fgg"><label className="fl">Type</label><select className="fs" value={f.type} onChange={e=>setF('investments','type',e.target.value)}>{['SIP — Equity','SIP — Debt','SIP — ELSS','PPF','NPS','Stocks','Crypto','Gold SGB','Fixed Deposit','RD','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Monthly (₹)</label><input className="fi" type="number" value={f.amount} onChange={e=>setF('investments','amount',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Return %</label><input className="fi" type="number" value={f.return} onChange={e=>setF('investments','return',e.target.value)} placeholder="12" /></div>
          <div className="fgg"><label className="fl">Corpus (₹)</label><input className="fi" type="number" value={f.corpus} onChange={e=>setF('investments','corpus',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 12px'}} onClick={()=>{if(!f.name)return;addItem('investments',numF('investments',['amount','return','corpus']));setForms(p=>({...p,investments:{name:'',type:'SIP — Equity',amount:'',return:'12',corpus:''}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="card"><div className="tw"><table>
        <thead><tr><th>Investment</th><th>Type</th><th>Monthly</th><th>Return %</th><th>Corpus</th><th>Annual</th><th>10yr proj.</th><th></th></tr></thead>
        <tbody>{!data.investments.length?<tr className="er"><td colSpan="8">No investments added yet</td></tr>:data.investments.map(i=>{tm+=i.amount;tc+=i.corpus;const p=proj10(i.amount,i.return,i.corpus);t10+=p;return(<tr key={i.id}><td className="tn">{i.name}{i._corpusUpdated&&<span className="corpus-updated">↑ auto</span>}</td><td><span className="badge b-green">{i.type}</span></td><td className="tm">{fmt(i.amount)}</td><td><span className="badge b-cyan">{i.return}%</span></td><td className="tm" style={{color:'var(--accent2)',fontWeight:600}}>{fmt(i.corpus)}</td><td className="tm">{fmt(i.amount*12)}</td><td className="tm" style={{color:'var(--green)'}}>{fmtS(p)}</td><td><ActBtns section="investments" item={i} /></td></tr>)})}</tbody>
      </table></div>
      <div className="cf"><div className="cfs"><div className="cfl">Monthly SIP</div><div className="cfv">{fmt(tm)}</div></div><div className="cfs"><div className="cfl">Total corpus</div><div className="cfv" style={{color:'var(--accent2)'}}>{fmt(tc)}</div></div><div className="cfs"><div className="cfl">10yr projection</div><div className="cfv" style={{color:'var(--green)'}}>{fmtS(t10)}</div></div></div></div>
    </div>
  }

  // ── SAVINGS ──
  const SavPage = () => {
    const f = forms.savings; let tb=0,tm=0
    data.savings.forEach(s=>{tb+=s.balance;tm+=s.monthly})
    return <div className="pg">
      <div className="pgh"><h1>Savings</h1><p>Emergency fund, liquid savings, and short-term targets</p></div>
      <div className="card"><div className="ch"><div className="ct">Add savings account</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr 1fr auto'}}>
          <div className="fgg"><label className="fl">Name</label><input className="fi" value={f.name} onChange={e=>setF('savings','name',e.target.value)} placeholder="e.g. Emergency Fund" /></div>
          <div className="fgg"><label className="fl">Type</label><select className="fs" value={f.type} onChange={e=>setF('savings','type',e.target.value)}>{['Emergency Fund','Savings Account','FD','Liquid Fund','Cash','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Balance (₹)</label><input className="fi" type="number" value={f.balance} onChange={e=>setF('savings','balance',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Top-up/mo (₹)</label><input className="fi" type="number" value={f.monthly} onChange={e=>setF('savings','monthly',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Target (₹)</label><input className="fi" type="number" value={f.target} onChange={e=>setF('savings','target',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 12px'}} onClick={()=>{if(!f.name)return;addItem('savings',numF('savings',['balance','monthly','target']));setForms(p=>({...p,savings:{name:'',type:'Emergency Fund',balance:'',monthly:'',target:''}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="sg">{!data.savings.length?<div className="card" style={{gridColumn:'1/-1'}}><div className="cb"><div className="es">No savings added yet</div></div></div>:data.savings.map((sv,i)=>{const p=sv.target>0?Math.min(100,Math.round(sv.balance/sv.target*100)):100;const c=SAV_COLORS[i%SAV_COLORS.length];return(<div key={sv.id} className="sc"><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5}}><div><div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{sv.name}</div><span className="badge b-cyan" style={{marginTop:3}}>{sv.type}</span></div><ActBtns section="savings" item={sv} /></div><div style={{fontFamily:'var(--fd)',fontSize:21,color:c,letterSpacing:'-.4px',margin:'5px 0'}}>{fmt(sv.balance)}</div>{sv.target>0&&<><div className="pt"><div className="pb" style={{width:`${p}%`,background:c}} /></div><div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text3)',marginTop:3,fontFamily:'var(--fm)'}}><span>{p}% of {fmtS(sv.target)}</span><span>+{fmt(sv.monthly)}/mo</span></div></>}</div>)})}</div>
      <div className="card"><div className="cf"><div className="cfs"><div className="cfl">Total balance</div><div className="cfv">{fmt(tb)}</div></div><div className="cfs"><div className="cfl">Monthly top-up</div><div className="cfv">{fmt(tm)}</div></div></div></div>
    </div>
  }

  // ── GOALS ──
  const GoalsPage = () => {
    const f = forms.goals; const yr = new Date().getFullYear()
    return <div className="pg">
      <div className="pgh"><h1>Financial Goals</h1><p>Set targets, track progress, see monthly savings needed</p></div>
      <div className="card"><div className="ch"><div className="ct">Add goal</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 0.8fr auto'}}>
          <div className="fgg"><label className="fl">Goal name</label><input className="fi" value={f.name} onChange={e=>setF('goals','name',e.target.value)} placeholder="e.g. Buy a house in Pune" /></div>
          <div className="fgg"><label className="fl">Category</label><select className="fs" value={f.category} onChange={e=>setF('goals','category',e.target.value)}>{['Home','Vehicle','Retirement','Education','Travel','Emergency Fund','Wedding','Business','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Target (₹)</label><input className="fi" type="number" value={f.target} onChange={e=>setF('goals','target',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Saved so far (₹)</label><input className="fi" type="number" value={f.saved} onChange={e=>setF('goals','saved',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Target year</label><input className="fi" type="number" value={f.year} onChange={e=>setF('goals','year',e.target.value)} placeholder="2030" /></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 12px'}} onClick={()=>{if(!f.name||!f.target)return;addItem('goals',numF('goals',['target','saved','year']));setForms(p=>({...p,goals:{name:'',category:'Home',target:'',saved:'',year:'2030'}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="gg">{!data.goals.length?<div className="card" style={{gridColumn:'1/-1'}}><div className="cb"><div className="es">No goals added yet</div></div></div>:data.goals.map((g,i)=>{const p=Math.min(100,Math.round(g.saved/g.target*100));const yl=Math.max(0,g.year-yr);const need=Math.max(0,g.target-g.saved);const mn=yl>0?Math.ceil(need/(yl*12)):need;const c=GOAL_COLORS[i%GOAL_COLORS.length];return(<div key={g.id} className="gc"><div className="ga" style={{background:c}} /><div style={{marginLeft:10}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2}}>{g.name}</div><div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--fm)',marginBottom:9}}>{g.category} · {g.year}</div></div><ActBtns section="goals" item={g} /></div><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}><span>Saved: <b style={{color:c}}>{fmtS(g.saved)}</b></span><span>Target: <b>{fmtS(g.target)}</b></span><span style={{color:c,fontWeight:600}}>{p}%</span></div><div className="pt"><div className="pb" style={{width:`${p}%`,background:c}} /></div><div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text3)',fontFamily:'var(--fm)',marginTop:7}}><span>{yl} yr left</span><span>Need {fmt(mn)}/mo</span><span>{fmt(need)} remaining</span></div></div></div>)})}</div>
    </div>
  }

  // ── ESSENTIALS ──
  const EssPage = () => {
    const f = forms.essentials; let tc=0,tp=0
    data.essentials.forEach(e=>{tc+=e.cover;tp+=e.premium})
    const bc = {'Health Insurance':'b-green','Term Insurance':'b-blue','Life Insurance':'b-cyan','Vehicle Insurance':'b-amber','Critical Illness':'b-red'}
    return <div className="pg">
      <div className="pgh"><h1>Essentials &amp; Protection</h1><p>Health, term, vehicle, and other policies</p></div>
      <div className="card"><div className="ch"><div className="ct">Add policy</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1.5fr 1fr 1fr 0.8fr auto'}}>
          <div className="fgg"><label className="fl">Policy name</label><input className="fi" value={f.name} onChange={e=>setF('essentials','name',e.target.value)} placeholder="e.g. Star Health Family Floater" /></div>
          <div className="fgg"><label className="fl">Type</label><select className="fs" value={f.type} onChange={e=>setF('essentials','type',e.target.value)}>{['Health Insurance','Term Insurance','Life Insurance','Vehicle Insurance','Travel Insurance','Critical Illness','Accident Cover','Home Insurance','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Cover (₹)</label><input className="fi" type="number" value={f.cover} onChange={e=>setF('essentials','cover',e.target.value)} placeholder="500000" /></div>
          <div className="fgg"><label className="fl">Annual premium (₹)</label><input className="fi" type="number" value={f.premium} onChange={e=>setF('essentials','premium',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Renewal</label><select className="fs" value={f.renewal} onChange={e=>setF('essentials','renewal',e.target.value)}>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 12px'}} onClick={()=>{if(!f.name)return;addItem('essentials',numF('essentials',['cover','premium','renewal']));setForms(p=>({...p,essentials:{name:'',type:'Health Insurance',cover:'',premium:'',renewal:'1'}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="eg">{!data.essentials.length?<div className="card" style={{gridColumn:'1/-1'}}><div className="cb"><div className="es">No policies added yet</div></div></div>:data.essentials.map(e=>{const b=bc[e.type]||'b-purple';return(<div key={e.id} className="ec"><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}><span className={`badge ${b}`}>{e.type}</span><ActBtns section="essentials" item={e} /></div><div style={{fontSize:13,fontWeight:600,color:'var(--text)',margin:'5px 0 7px',lineHeight:1.3}}>{e.name}</div><div style={{fontFamily:'var(--fd)',fontSize:19,color:'var(--green)',letterSpacing:'-.3px'}}>{fmtS(e.cover)}</div><div style={{fontSize:10,color:'var(--text2)',fontFamily:'var(--fm)',marginTop:3}}>{fmt(e.premium)}/yr · Renews {MONTHS[e.renewal-1]}</div></div>)})}</div>
      <div className="card" style={{marginTop:13}}><div className="cf"><div className="cfs"><div className="cfl">Total cover</div><div className="cfv" style={{color:'var(--green)'}}>{fmtS(tc)}</div></div><div className="cfs"><div className="cfl">Annual premium</div><div className="cfv" style={{color:'var(--amber)'}}>{fmt(tp)}</div></div><div className="cfs"><div className="cfl">Monthly cost</div><div className="cfv">{fmt(Math.round(tp/12))}</div></div></div></div>
    </div>
  }

  // ── BUDGET ──
  const BudgetPage = () => {
    const f = forms.budget; let tb=0,ts=0
    data.budget.forEach(b=>{tb+=b.budget;ts+=b.spent})
    return <div className="pg">
      <div className="pgh"><h1>Monthly Budget</h1><p>Track spending against your monthly targets</p></div>
      <div className="card"><div className="ch"><div className="ct">Add category</div></div><div className="cb">
        <div className="fg" style={{gridTemplateColumns:'2fr 1.5fr 1fr 1fr auto'}}>
          <div className="fgg"><label className="fl">Category</label><input className="fi" value={f.name} onChange={e=>setF('budget','name',e.target.value)} placeholder="e.g. Groceries" /></div>
          <div className="fgg"><label className="fl">Type</label><select className="fs" value={f.type} onChange={e=>setF('budget','type',e.target.value)}>{['Housing','Food & Dining','Transport','Utilities','Healthcare','Education','Entertainment','Shopping','Subscriptions','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgg"><label className="fl">Budget (₹)</label><input className="fi" type="number" value={f.budget} onChange={e=>setF('budget','budget',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">Spent (₹)</label><input className="fi" type="number" value={f.spent} onChange={e=>setF('budget','spent',e.target.value)} placeholder="0" /></div>
          <div className="fgg"><label className="fl">&nbsp;</label><button className="btn btn-p" style={{height:34,padding:'0 12px'}} onClick={()=>{if(!f.name)return;addItem('budget',numF('budget',['budget','spent']));setForms(p=>({...p,budget:{name:'',type:'Housing',budget:'',spent:''}}));}}>+ Add</button></div>
        </div>
      </div></div>
      <div className="card"><div className="cb" style={{padding:'6px 16px'}}>{!data.budget.length?<div className="es">No budget categories yet</div>:data.budget.map(b=>{const p=b.budget>0?Math.min(100,Math.round(b.spent/b.budget*100)):0;const ov=b.spent>b.budget;const c=ov?'var(--red)':p>80?'var(--amber)':'var(--accent2)';return(<div key={b.id} className="bi"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}><div><span style={{fontWeight:500,fontSize:13}}>{b.name}</span><span className="badge b-amber" style={{marginLeft:7}}>{b.type}</span></div><div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:11,fontFamily:'var(--fm)',color:'var(--text2)'}}>{fmt(b.spent)} / {fmt(b.budget)}</span><span style={{fontSize:11,fontWeight:600,fontFamily:'var(--fm)',color:c}}>{ov?'Over '+fmt(b.spent-b.budget):fmt(b.budget-b.spent)+' left'}</span><ActBtns section="budget" item={b} /></div></div><div className="pt"><div className="pb" style={{width:`${p}%`,background:c}} /></div></div>)})}</div>
      <div className="cf"><div className="cfs"><div className="cfl">Budgeted</div><div className="cfv">{fmt(tb)}</div></div><div className="cfs"><div className="cfl">Spent</div><div className="cfv">{fmt(ts)}</div></div><div className="cfs"><div className="cfl">Remaining</div><div className="cfv" style={{color:(tb-ts)>=0?'var(--green)':'var(--red)'}}>{(tb-ts)<0?'-':''}{fmt(Math.abs(tb-ts))}</div></div></div></div>
    </div>
  }

  // ── EDIT MODAL FORM ──
  const EditForm = () => {
    if (!editModal) return null
    const { section } = editModal
    const ef = editForm
    const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }))
    const numInput = (label, field, placeholder = '0') => (
      <div className="fgg"><label className="fl">{label}</label><input className="fi" type="number" value={ef[field] ?? ''} onChange={e => setEF(field, e.target.value)} placeholder={placeholder} /></div>
    )
    const txtInput = (label, field, placeholder = '') => (
      <div className="fgg"><label className="fl">{label}</label><input className="fi" value={ef[field] ?? ''} onChange={e => setEF(field, e.target.value)} placeholder={placeholder} /></div>
    )
    const selInput = (label, field, options) => (
      <div className="fgg"><label className="fl">{label}</label><select className="fs" value={ef[field] ?? ''} onChange={e => setEF(field, e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></div>
    )
    const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
    const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }
    const forms_map = {
      salary: <div style={g2}>{txtInput('Source name','name','Primary job')}{selInput('Type','type',['Salary','Freelance','Rental','Business','Dividend','Side Hustle','Other'])}{numInput('Gross/mo (₹)','gross')}{numInput('Net/mo (₹)','net')}</div>,
      assets: <div style={g2}>{txtInput('Asset name','name')}{selInput('Category','category',['Real Estate','Equity / Stocks','Mutual Funds','Fixed Deposit','Gold','Crypto','Vehicle','Cash & Savings','EPF / PPF','NPS','Business','Other'])}{numInput('Current value (₹)','value')}{numInput('Purchase price (₹)','cost')}</div>,
      liabilities: <div style={g3}>{txtInput('Loan name','name')}{selInput('Type','type',['Home Loan','Car Loan','Personal Loan','Education Loan','Credit Card','Business Loan','Other'])}{numInput('Outstanding (₹)','outstanding')}{numInput('EMI/mo (₹)','emi')}{numInput('Rate %','rate','8.5')}{numInput('Months left','months','120')}</div>,
      investments: <div style={g3}>{txtInput('Investment name','name')}{selInput('Type','type',['SIP — Equity','SIP — Debt','SIP — ELSS','PPF','NPS','Stocks','Crypto','Gold SGB','Fixed Deposit','RD','Other'])}{numInput('Monthly (₹)','amount')}{numInput('Return %','return','12')}{numInput('Corpus (₹)','corpus')}</div>,
      savings: <div style={g2}>{txtInput('Name','name')}{selInput('Type','type',['Emergency Fund','Savings Account','FD','Liquid Fund','Cash','Other'])}{numInput('Balance (₹)','balance')}{numInput('Top-up/mo (₹)','monthly')}{numInput('Target (₹)','target')}</div>,
      goals: <div style={g2}>{txtInput('Goal name','name')}{selInput('Category','category',['Home','Vehicle','Retirement','Education','Travel','Emergency Fund','Wedding','Business','Other'])}{numInput('Target (₹)','target')}{numInput('Saved so far (₹)','saved')}{numInput('Target year','year','2030')}</div>,
      essentials: <div style={g2}>{txtInput('Policy name','name')}{selInput('Type','type',['Health Insurance','Term Insurance','Life Insurance','Vehicle Insurance','Travel Insurance','Critical Illness','Accident Cover','Home Insurance','Other'])}{numInput('Cover (₹)','cover')}{numInput('Annual premium (₹)','premium')}</div>,
      budget: <div style={g2}>{txtInput('Category','name')}{selInput('Type','type',['Housing','Food & Dining','Transport','Utilities','Healthcare','Education','Entertainment','Shopping','Subscriptions','Other'])}{numInput('Budget (₹)','budget')}{numInput('Spent (₹)','spent')}</div>,
    }
    return forms_map[section] || null
  }

  const nw = s.ta - s.tl
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', group: 'Overview', icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></> },
    { id: 'salary', label: 'Salary & Income', group: 'Money In', icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></> },
    { id: 'assets', label: 'Assets', group: 'Wealth', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
    { id: 'liabilities', label: 'Liabilities & Loans', group: null, icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></> },
    { id: 'investments', label: 'Investments', group: 'Grow', icon: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></> },
    { id: 'savings', label: 'Savings', group: null, icon: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/> },
    { id: 'goals', label: 'Goals', group: null, icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> },
    { id: 'essentials', label: 'Essentials', group: 'Protect & Spend', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> },
    { id: 'budget', label: 'Budget', group: null, icon: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></> },
  ]

  const PAGES = { dashboard: DashPage, salary: SalaryPage, assets: AssetsPage, liabilities: LiabPage, investments: InvPage, savings: SavPage, goals: GoalsPage, essentials: EssPage, budget: BudgetPage }
  const PageComponent = PAGES[page] || DashPage

  if (locked) return (
    <>
      <style>{S}</style>
      <div className="lock">
        <div className="lbox">
          <div className="lic">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div className="lh">Wealthmap</div>
          <div className="lp">Enter your password to continue</div>
          <div className="lpw">
            <input className={`lpwi ${pwErr ? 'err' : ''}`} type={pwVis ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryUnlock()} placeholder="Password" autoFocus />
            <button className="leye" onClick={() => setPwVis(v => !v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <button className="lbtn" onClick={tryUnlock}>Unlock</button>
          <div className="lerr">{pwErr}</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{S}</style>
      <div className="wrap">
        {/* Sidebar overlay */}
        <div className={`ov ${sbOpen ? 'open' : ''}`} onClick={() => setSbOpen(false)} />

        {/* Sidebar */}
        <aside className={`sb ${sbOpen ? 'open' : ''}`}>
          <div className="sb-logo">
            <div className="sb-mark">
              <div className="sb-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
              <div><div className="sb-name">Wealthmap</div><div className="sb-sub">Finance Planner</div></div>
            </div>
          </div>
          <div className="nav">
            {navItems.map((item, i) => {
              const prev = navItems[i - 1]
              return (
                <div key={item.id}>
                  {item.group && <div className="nl">{item.group}</div>}
                  <button className={`ni ${page === item.id ? 'active' : ''}`} onClick={() => goTo(item.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
                    {item.label}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="sb-foot">
            <div className="nwp">
              <div className="nwp-l">Net Worth</div>
              <div className="nwp-v" style={{ color: nw >= 0 ? 'var(--accent2)' : 'var(--red)' }}>{fmtS(nw)}</div>
            </div>
            <button className="lockbtn" onClick={doLock}>
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Lock App
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="mn">
          <div className="tb">
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <button className="mtog" onClick={() => setSbOpen(o => !o)}>
                <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <span className="tbt">{PAGE_TITLES[page]}</span>
            </div>
            <div className="tbr">
              <span className="lu">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <button className="btn" onClick={loadData}>
                <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Refresh
              </button>
            </div>
          </div>

          {loading ? <div className="loading">Loading your data…</div> : <PageComponent />}
        </main>
      </div>

      {/* Edit Modal */}
      <div className={`mb ${editModal ? 'open' : ''}`} onClick={e => { if (e.target.className === 'mb open') setEditModal(null) }}>
        <div className="mo">
          <div className="mo-t">Edit {editModal?.section}</div>
          {editModal && <EditForm />}
          <div className="mo-a">
            <button className="btn" onClick={() => setEditModal(null)}>Cancel</button>
            <button className="btn btn-p" onClick={saveEdit}>Save changes</button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
