import { useState, useEffect, useRef, useCallback } from 'react'
import './index.css'

/* ═══════════════════════════════════════════════════════════
   CONFIG — edit to customise
═══════════════════════════════════════════════════════════ */
const CONFIG = {
  name:     { first: 'MIKE', last: 'STUCHBERY' },
  handle:   'mikestuchbery',
  coords:   '48.8566° N, 2.3522° E',   // display coordinates (flavour)
  roles:    ['HISTORIAN', 'WRITER', 'DIGITAL CRAFTSMAN'],
  tagline:  'A curious soul, fascinated by history, art and travel — who creates the things he wishes existed.',
  pinned:   ['roadtripperde', 'timeline-de'],
  expertise: [
    'German History', 'Investigative Journalism', 'Long-form Writing',
    'AI Integration', 'React / Vite', 'Geospatial Tools',
    'Email Production', 'Narrative Design',
  ],
  social: [
    { label: 'Email',     href: 'mailto:michael.stuchbery@gmail.com' },
    { label: 'GitHub',    href: 'https://github.com/mikestuchbery'   },
    { label: 'LinkedIn',  href: 'https://linkedin.com/in/mikestuchbery' },
    { label: 'Ko-fi',     href: 'https://ko-fi.com/mikestuchbery'    },
    { label: 'Instagram', href: 'https://instagram.com/mikestuchbery'},
    { label: 'TikTok',    href: 'https://tiktok.com/@mikestuchbery'  },
  ],
}

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
function useDesktop(bp = 768) {
  const [v, set] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= bp : false)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${bp}px)`)
    const fn = e => set(e.matches)
    mq.addEventListener('change', fn); set(mq.matches)
    return () => mq.removeEventListener('change', fn)
  }, [bp])
  return v
}

function useClock() {
  const [t, set] = useState(new Date())
  useEffect(() => { const id = setInterval(() => set(new Date()), 1000); return () => clearInterval(id) }, [])
  return t
}

/* ═══════════════════════════════════════════════════════════
   ICOSAHEDRON WIREFRAME CANVAS
   Slowly rotating, single moving light source.
   This is the one living element in an otherwise static page.
═══════════════════════════════════════════════════════════ */
const PHI = (1 + Math.sqrt(5)) / 2
const ISO_VERTS_RAW = [
  [-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],
  [0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],
  [PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1],
]
const ISO_FACES = [
  [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
  [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
  [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
  [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
]

function normalise(v) {
  const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])
  return [v[0]/l, v[1]/l, v[2]/l]
}

// Subdivide each face once for a denser mesh
function subdivide(verts, faces) {
  const midCache = {}
  const newVerts = [...verts]
  const newFaces = []
  function midpoint(a, b) {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    if (midCache[key] !== undefined) return midCache[key]
    const m = normalise([
      (newVerts[a][0]+newVerts[b][0])/2,
      (newVerts[a][1]+newVerts[b][1])/2,
      (newVerts[a][2]+newVerts[b][2])/2,
    ])
    midCache[key] = newVerts.length
    newVerts.push(m)
    return midCache[key]
  }
  for (const [a,b,c] of faces) {
    const ab = midpoint(a,b), bc = midpoint(b,c), ca = midpoint(c,a)
    newFaces.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])
  }
  return { verts:newVerts, faces:newFaces }
}

const BASE_NORM = ISO_VERTS_RAW.map(normalise)
const { verts: SPHERE_V, faces: SPHERE_F } = subdivide(BASE_NORM, ISO_FACES)

function rotateY(v, a) {
  return [ v[0]*Math.cos(a)+v[2]*Math.sin(a), v[1], -v[0]*Math.sin(a)+v[2]*Math.cos(a) ]
}
function rotateX(v, a) {
  return [ v[0], v[1]*Math.cos(a)-v[2]*Math.sin(a), v[1]*Math.sin(a)+v[2]*Math.cos(a) ]
}

function WireframeSphere({ dark, size = 320 }) {
  const ref = useRef(null)
  const raf = useRef(null)
  const t   = useRef(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const cx = size / 2, cy = size / 2, r = size * 0.38

    function frame() {
      t.current += 0.004
      ctx.clearRect(0, 0, size, size)

      const lightDir = normalise([
        Math.sin(t.current * 0.7) * 0.8,
        Math.cos(t.current * 0.5) * 0.6,
        1,
      ])

      const transformed = SPHERE_V.map(v => {
        const r1 = rotateY(v, t.current)
        return rotateX(r1, 0.14)
      })

      // Project 3D → 2D
      const projected = transformed.map(v => {
        const z = v[2]
        const scale = r / (2 - z * 0.5)  // mild perspective
        return { x: cx + v[0] * scale, y: cy - v[1] * scale, z }
      })

      // Draw edges — deduplicate
      const edgeSet = new Set()
      for (const [a,b,c] of SPHERE_F) {
        for (const [i,j] of [[a,b],[b,c],[c,a]]) {
          const key = i < j ? `${i}|${j}` : `${j}|${i}`
          if (edgeSet.has(key)) continue
          edgeSet.add(key)

          const va = transformed[i], vb = transformed[j]
          const pa = projected[i],   pb = projected[j]

          // Back-face-ish: dim far edges
          const avgZ = (va[2] + vb[2]) / 2
          const depthAlpha = (avgZ + 1) / 2   // 0..1

          // Light contribution
          const midV = normalise([
            (va[0]+vb[0])/2, (va[1]+vb[1])/2, (va[2]+vb[2])/2,
          ])
          const lit = Math.max(0, midV[0]*lightDir[0]+midV[1]*lightDir[1]+midV[2]*lightDir[2])

          const base = dark ? 200 : 100
          const alpha = (0.06 + lit * 0.22) * (0.4 + depthAlpha * 0.6)

          ctx.beginPath()
          ctx.moveTo(pa.x, pa.y)
          ctx.lineTo(pb.x, pb.y)
          ctx.strokeStyle = `rgba(${base},${base * 0.9},${base * 0.6},${alpha})`
          ctx.lineWidth   = 0.6 + lit * 0.5
          ctx.stroke()
        }
      }

      // Single bright vertex at light peak
      let brightestIdx = 0, brightestDot = -1
      transformed.forEach((v, i) => {
        const d = v[0]*lightDir[0]+v[1]*lightDir[1]+v[2]*lightDir[2]
        if (d > brightestDot) { brightestDot = d; brightestIdx = i }
      })
      const bp = projected[brightestIdx]
      const grd = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, 18)
      grd.addColorStop(0, `rgba(200,168,74,${0.5 * brightestDot})`)
      grd.addColorStop(1, 'rgba(200,168,74,0)')
      ctx.beginPath()
      ctx.arc(bp.x, bp.y, 18, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()

      raf.current = requestAnimationFrame(frame)
    }

    raf.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf.current)
  }, [dark, size])

  return (
    <canvas
      ref={ref}
      style={{
        width:  size,
        height: size,
        display: 'block',
        opacity: dark ? 0.75 : 0.55,
        transition: 'opacity 0.4s',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   LIGHT SCATTER — radial blooms, very faint, fixed
═══════════════════════════════════════════════════════════ */
function LightScatter() {
  return (
    <div aria-hidden style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none' }}>
      {/* Top-centre bloom */}
      <div style={{
        position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)',
        width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(200,168,74,0.055) 0%, transparent 65%)',
      }}/>
      {/* Bottom-right */}
      <div style={{
        position:'absolute', bottom:'-15%', right:'-10%',
        width:700, height:700, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(200,168,74,0.035) 0%, transparent 65%)',
      }}/>
      {/* Faint white centre */}
      <div style={{
        position:'absolute', top:'25%', left:'50%', transform:'translateX(-50%)',
        width:800, height:400, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(255,252,240,0.018) 0%, transparent 70%)',
      }}/>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ALCHEMIC GLYPH DRIFT — very sparse, very dim
═══════════════════════════════════════════════════════════ */
const GLYPHS = '☿☉☽♄♃♂△▽⊕⊗◆⬡∞∑∂∇√ᚠᚢᚦᚱᛁᛃᛈᛏ'.split('')

function GlyphField({ dark }) {
  const ref   = useRef(null)
  const parts = useRef([])
  const raf   = useRef(null)
  const dkRef = useRef(dark)
  useEffect(() => { dkRef.current = dark }, [dark])

  const spawn = (W, H) => ({
    x:Math.random()*W, y:Math.random()*H,
    vx:(Math.random()-.5)*.08, vy:(Math.random()-.5)*.08,
    alpha: .018 + Math.random()*.045,
    size: 11 + Math.random()*9,
    glyph: GLYPHS[Math.floor(Math.random()*GLYPHS.length)],
    rot: Math.random()*Math.PI*2,
    rotV: (Math.random()-.5)*.0012,
    life:0, maxLife:700+Math.random()*900,
  })

  const init = useCallback(canvas => {
    const W = canvas.width  = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight
    parts.current = Array.from({length:22}, () => {
      const p = spawn(W,H); p.life = Math.random()*p.maxLife; return p
    })
    return {W,H}
  },[])

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    let dims = {W:0,H:0}
    const obs = new ResizeObserver(() => { dims = init(canvas) })
    obs.observe(canvas); dims = init(canvas)
    const ctx = canvas.getContext('2d')
    function tick() {
      const {W,H} = dims; ctx.clearRect(0,0,W,H)
      parts.current.forEach((p,i) => {
        p.life++; p.x+=p.vx; p.y+=p.vy; p.rot+=p.rotV
        const t = p.life/p.maxLife
        const env = t<.1 ? t/.1 : t>.9 ? (1-t)/.1 : 1
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot)
        ctx.font=`${p.size}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'
        const rgb = dkRef.current ? '200,168,74' : '120,90,20'
        ctx.fillStyle=`rgba(${rgb},${p.alpha*env})`; ctx.fillText(p.glyph,0,0); ctx.restore()
        if (p.life>=p.maxLife||p.x<-40||p.x>W+40||p.y<-40||p.y>H+40) {
          parts.current[i]=spawn(W,H); parts.current[i].life=0
        }
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { obs.disconnect(); cancelAnimationFrame(raf.current) }
  },[init])

  return <canvas ref={ref} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}}/>
}

/* ═══════════════════════════════════════════════════════════
   POLYGON FRAME — SVG border around the name
═══════════════════════════════════════════════════════════ */
function PolygonFrame({ width, height }) {
  if (!width || !height) return null
  const pad = 16
  const w = width + pad * 2, h = height + pad * 2
  const cut = 14  // corner cut size
  const pts = [
    `${cut},0`, `${w-cut},0`,
    `${w},${cut}`, `${w},${h-cut}`,
    `${w-cut},${h}`, `${cut},${h}`,
    `0,${h-cut}`, `0,${cut}`,
  ].join(' ')

  return (
    <svg
      width={w} height={h}
      style={{ position:'absolute', top:-pad, left:-pad, pointerEvents:'none', zIndex:2 }}
      aria-hidden
    >
      <polygon
        points={pts}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="0.75"
        opacity="0.35"
      />
      {/* Corner dots */}
      {[[cut,0],[w-cut,0],[w,cut],[w,h-cut],[w-cut,h],[cut,h],[0,h-cut],[0,cut]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="var(--gold)" opacity="0.6"/>
      ))}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   BLINKING CURSOR
═══════════════════════════════════════════════════════════ */
function Cursor() {
  const [on, set] = useState(true)
  useEffect(() => { const t = setInterval(()=>set(v=>!v),560); return()=>clearInterval(t) },[])
  return <span aria-hidden style={{color:'var(--gold)',opacity:on?0.9:0,transition:'opacity .06s',marginLeft:'0.04em'}}>_</span>
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════════════ */
function ThemeToggle({ dark, onToggle }) {
  const [hov, set] = useState(false)
  return (
    <button onClick={onToggle} onMouseEnter={()=>set(true)} onMouseLeave={()=>set(false)}
      aria-label={dark?'Light mode':'Dark mode'}
      style={{
        background:'none', border:'none', cursor:'pointer', outline:'none',
        fontFamily:'var(--font)', fontSize:'.62rem', fontWeight:600,
        letterSpacing:'.18em', textTransform:'uppercase',
        color: hov ? 'var(--white)' : 'var(--ash)',
        transition:'color .15s', padding:0,
      }}
    >{dark?'LIGHT':'DARK'}</button>
  )
}

/* ═══════════════════════════════════════════════════════════
   MODULE HEADER COMPONENT
═══════════════════════════════════════════════════════════ */
function ModHeader({ label, right }) {
  return (
    <div className="mod-header">
      <span>{label}</span>
      {right && <span style={{opacity:.4}}>{right}</span>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   AVATAR
═══════════════════════════════════════════════════════════ */
function Avatar({ size }) {
  const [err, setErr] = useState(false)
  if (err) return null
  return (
    <img src={`https://avatars.githubusercontent.com/${CONFIG.handle}`}
      alt={`${CONFIG.name.first} ${CONFIG.name.last}`}
      onError={() => setErr(true)}
      style={{
        width:size, height:size, borderRadius:'50%', objectFit:'cover',
        display:'block', filter:'grayscale(25%) contrast(1.05)',
        opacity:.85, border:'1px solid var(--rule)',
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   SOCIAL LINK
═══════════════════════════════════════════════════════════ */
function SocialLink({ label, href }) {
  const [hov, set] = useState(false)
  return (
    <a href={href}
      target={href.startsWith('http')?'_blank':undefined}
      rel="noopener noreferrer"
      onMouseEnter={()=>set(true)} onMouseLeave={()=>set(false)}
      style={{
        display:'flex', alignItems:'center', gap:8,
        fontFamily:'var(--font)', fontSize:'.72rem', fontWeight:500,
        letterSpacing:'.1em', textTransform:'uppercase',
        color: hov ? 'var(--white)' : 'var(--silver)',
        textDecoration:'none',
        transition:'color .15s',
        padding:'8px 0',
        borderBottom:'1px solid var(--rule)',
      }}
    >
      <span style={{
        width:4, height:4, borderRadius:'50%',
        background: hov ? 'var(--gold)' : 'var(--fog)',
        transition:'background .15s', flexShrink:0,
      }}/>
      {label}
      <span style={{marginLeft:'auto', opacity: hov?1:.3, transition:'opacity .15s', fontSize:'.7rem'}}>→</span>
    </a>
  )
}

/* ═══════════════════════════════════════════════════════════
   REPO CARD — module style
═══════════════════════════════════════════════════════════ */
const LANG_MAP = {JavaScript:'JS',TypeScript:'TS',HTML:'HTML',CSS:'CSS',Python:'PY',Rust:'RS',Shell:'SH'}

function RepoCard({ repo, index }) {
  const [hov, set] = useState(false)
  const lang = repo.language ? (LANG_MAP[repo.language]||repo.language) : null
  const date = new Date(repo.updated_at).toLocaleDateString('en-GB',{month:'short',year:'numeric'})
  const opCode = ['OP-☿','OP-☉','OP-☽','OP-♄'][index % 4]

  return (
    <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={()=>set(true)} onMouseLeave={()=>set(false)}
      className="mod"
      style={{
        display:'block', textDecoration:'none',
        borderColor: hov ? 'var(--rule-hi)' : 'var(--rule)',
        transition:'border-color .2s, background .2s',
        background: hov ? 'var(--surface)' : 'var(--deep)',
      }}
    >
      <ModHeader label={opCode} right={date}/>
      <div style={{padding:'16px 16px 18px'}}>
        {/* Left-border accent on hover */}
        <div style={{
          position:'absolute', left:0, top:'20%', bottom:'20%', width:2,
          background:'var(--gold)',
          transform: hov ? 'scaleY(1)' : 'scaleY(0)',
          transformOrigin:'top',
          transition:'transform .22s cubic-bezier(.16,1,.3,1)',
        }}/>

        <div style={{
          fontFamily:'var(--font)', fontSize:'1rem', fontWeight:700,
          letterSpacing:'-.01em', color: hov?'var(--white)':'var(--white-dim)',
          marginBottom:8, transition:'color .18s',
          display:'flex', alignItems:'baseline', justifyContent:'space-between',
        }}>
          <span>{repo.name}</span>
          <span style={{
            fontSize:'.75rem', color: hov?'var(--gold)':'var(--ash)',
            transition:'color .18s, transform .18s',
            transform: hov?'translate(2px,-2px)':'none',
            display:'inline-block',
          }}>↗</span>
        </div>

        <p style={{
          fontFamily:'var(--font)', fontSize:'.8rem', fontWeight:400,
          lineHeight:1.65, color:'var(--silver)', marginBottom:14,
        }}>{repo.description||'—'}</p>

        <div style={{
          display:'flex', gap:12, alignItems:'center',
          fontFamily:'var(--font)', fontSize:'.58rem', fontWeight:600,
          letterSpacing:'.12em', color:'var(--ash)',
        }}>
          {lang && <span style={{color:'var(--gold)',opacity:.8}}>{lang}</span>}
          {repo.stargazers_count > 0 && <span>★ {repo.stargazers_count}</span>}
          <span style={{marginLeft:'auto', opacity:.45}}>{date}</span>
        </div>
      </div>
    </a>
  )
}

/* ═══════════════════════════════════════════════════════════
   DATA TICKER — ambient data stream in the background
═══════════════════════════════════════════════════════════ */
const TICKER_ITEMS = [
  '☿ MERCURY IN RETROGRADE', 'COORD 48.8566°N 2.3522°E',
  'SIGIL: ∇', 'PROTOCOL: OPEN', 'VECTOR: ACTIVE',
  '☉ SOL INVICTUS', 'CIPHER: NULL', 'NODE: LIVE',
  'ᚠ FEHU · ᚢ URUZ · ᚦ THURISAZ', 'EPOCH: 2026',
  '△ FIRE · ▽ WATER', 'FIELD: STABLE',
]

function DataTicker() {
  const [pos, setPos] = useState(0)
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]

  useEffect(() => {
    const id = setInterval(() => setPos(p => (p + 1) % TICKER_ITEMS.length), 3200)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      overflow:'hidden', borderTop:'1px solid var(--rule)',
      borderBottom:'1px solid var(--rule)',
      padding:'7px 0',
      background:'var(--deep)',
    }}>
      <div style={{
        display:'flex', gap:'0 40px',
        fontFamily:'var(--font)', fontSize:'.5rem', fontWeight:600,
        letterSpacing:'.25em', color:'var(--ash)',
        animation:'tickerScroll 40s linear infinite',
        whiteSpace:'nowrap',
      }}>
        {items.map((item, i) => (
          <span key={i} style={{flexShrink:0}}>
            {item}
            <span style={{margin:'0 20px', color:'var(--gold)', opacity:.4}}>·</span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   HERO NAME — with polygon frame and sphere
═══════════════════════════════════════════════════════════ */
function HeroName({ desktop, dark }) {
  const nameRef  = useRef(null)
  const [dims, setDims] = useState(null)

  useEffect(() => {
    if (!nameRef.current) return
    const obs = new ResizeObserver(() => {
      const r = nameRef.current?.getBoundingClientRect()
      if (r) setDims({ width: r.width, height: r.height })
    })
    obs.observe(nameRef.current)
    const r = nameRef.current.getBoundingClientRect()
    setDims({ width: r.width, height: r.height })
    return () => obs.disconnect()
  }, [desktop])

  const nameStyle = {
    fontFamily:    'var(--font)',
    fontWeight:    800,
    letterSpacing: '-0.03em',
    lineHeight:    0.88,
    color:         'var(--white)',
    textTransform: 'uppercase',
    position:      'relative', zIndex: 3,
  }

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      position:       'relative',
      padding:        desktop ? '60px 0 52px' : '40px 0 36px',
    }}>

      {/* Sphere — behind name, centred */}
      <div style={{
        position:       'absolute',
        top:            '50%', left:'50%',
        transform:      'translate(-50%,-50%)',
        zIndex:         1,
        opacity:        0.9,
        pointerEvents:  'none',
      }}>
        <WireframeSphere dark={dark} size={desktop ? 340 : 220}/>
      </div>

      {/* Name with polygon frame */}
      <div style={{position:'relative', zIndex:3, textAlign:'center'}}>
        {dims && <PolygonFrame width={dims.width} height={dims.height}/>}
        <h1 ref={nameRef} style={{
          ...nameStyle,
          fontSize: desktop ? 'clamp(4rem,10vw,9rem)' : 'clamp(2.8rem,13vw,5rem)',
          display:  'inline-block',
          padding:  desktop ? '0 8px' : '0 4px',
        }}>
          <span style={{display:'block'}}>{CONFIG.name.first}</span>
          <span style={{display:'block', color:'var(--gold)'}}>{CONFIG.name.last}</span>
          <Cursor/>
        </h1>
      </div>

      {/* Roles beneath */}
      <div style={{
        marginTop:     desktop ? 28 : 20,
        display:       'flex',
        gap:           '0 24px',
        flexWrap:      'wrap',
        justifyContent:'center',
        fontFamily:    'var(--font)',
        fontSize:      desktop ? '.72rem' : '.62rem',
        fontWeight:    600,
        letterSpacing: '.22em',
        color:         'var(--ash)',
        position:      'relative', zIndex:3,
      }}>
        {CONFIG.roles.map((r,i) => (
          <span key={r}>
            {r}
            {i < CONFIG.roles.length-1 && (
              <span style={{margin:'0 12px',color:'var(--gold)',opacity:.45}}>·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [dark,    setDark]    = useState(true)
  const [repos,   setRepos]   = useState(null)
  const [repoErr, setRepoErr] = useState(false)
  const desktop = useDesktop()
  const clock   = useClock()

  /* Theme */
  useEffect(() => {
    const s = localStorage.getItem('ms-theme')
    if (s === 'light') { setDark(false); document.documentElement.classList.add('light') }
  }, [])

  const toggleTheme = () => setDark(d => {
    const next = !d
    localStorage.setItem('ms-theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('light', !next)
    return next
  })

  /* Repos */
  useEffect(() => {
    fetch(`https://api.github.com/users/${CONFIG.handle}/repos?per_page=100`)
      .then(r => { if (!r.ok) throw 0; return r.json() })
      .then(all => {
        const p = CONFIG.pinned.map(n => all.find(r => r.name === n)).filter(Boolean)
        if (!p.length) throw 0
        setRepos(p)
      })
      .catch(() => {
        setRepoErr(true)
        setRepos(CONFIG.pinned.map((name, i) => ({
          name,
          description: i === 0
            ? 'Road trip heritage companion — surfacing historical POIs along driving routes across Germany.'
            : 'AI-powered historical content along German rail routes. React + Vite, deployed on Vercel.',
          language:'JavaScript', stargazers_count:0,
          updated_at:'2026-01-01T00:00:00Z',
          html_url:`https://github.com/${CONFIG.handle}/${name}`,
        })))
      })
  }, [])

  const timeStr = clock.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const dateStr = clock.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}).toUpperCase()

  const pad = desktop ? '0 32px' : '0 14px'
  const maxW = 960

  return (
    <>
      {/* ── Fixed bg layers ── */}
      <GlyphField dark={dark}/>
      <LightScatter/>

      {/* ── Bg overlay ── */}
      <div aria-hidden style={{
        position:'fixed', inset:0, zIndex:1,
        background:'var(--void)', opacity:.89,
        transition:'background .45s, opacity .45s',
        pointerEvents:'none',
      }}/>

      {/* ── Scanline boot effect ── */}
      <div className="scanline" aria-hidden/>

      {/* ── Page ── */}
      <div style={{position:'relative', zIndex:10}}>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            TOP BAR
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="rv rv-0" style={{
          background:   'var(--deep)',
          borderBottom: '1px solid var(--rule)',
          padding:      '8px 32px',
          display:      'flex', alignItems:'center', justifyContent:'space-between',
          fontFamily:   'var(--font)', fontSize:'.5rem', fontWeight:600,
          letterSpacing:'.22em', textTransform:'uppercase', color:'var(--ash)',
        }}>
          <span style={{color:'var(--gold)', opacity:.65}}>
            {CONFIG.handle}
          </span>
          <span>{dateStr} &nbsp;|&nbsp; {timeStr}</span>
          <ThemeToggle dark={dark} onToggle={toggleTheme}/>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HERO
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="rv rv-1" style={{
          borderBottom: '1px solid var(--rule)',
          maxWidth: maxW, margin:'0 auto', padding: pad,
        }}>
          <HeroName desktop={desktop} dark={dark}/>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            TICKER
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="rv rv-2">
          <DataTicker/>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MAIN GRID
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{maxWidth:maxW, margin:'0 auto', padding:pad}}>

          {/* ── Profile + Contact row ── */}
          <div className="rv rv-3" style={{
            display:'grid',
            gridTemplateColumns: desktop ? '1fr 1fr' : '1fr',
            gap:1,
            background:'var(--rule)',
            border:'1px solid var(--rule)',
            margin: desktop ? '24px 0' : '16px 0',
          }}>

            {/* BIO module */}
            <div className="mod" style={{border:'none'}}>
              <ModHeader label="PROFILE" right="OPEN"/>
              <div className="mod-body" style={{
                display:'flex', gap:20, alignItems:'flex-start',
              }}>
                <Avatar size={80}/>
                <div>
                  <p style={{
                    fontFamily:'var(--font)', fontSize:'.85rem', fontWeight:400,
                    lineHeight:1.7, color:'var(--silver)', marginBottom:0,
                  }}>
                    {CONFIG.tagline}
                  </p>
                </div>
              </div>
            </div>

            {/* CONTACT module */}
            <div className="mod" style={{border:'none', borderLeft:'1px solid var(--rule)'}}>
              <ModHeader label="CONTACT CHANNELS" right={`${CONFIG.social.length} NODES`}/>
              <div style={{padding:'0 16px'}}>
                {CONFIG.social.map(s => (
                  <SocialLink key={s.label} label={s.label} href={s.href}/>
                ))}
              </div>
            </div>
          </div>

          {/* ── Work module ── */}
          <div className="rv rv-4 mod" style={{marginBottom: desktop?24:16}}>
            <ModHeader
              label="ACTIVE OPERATIONS"
              right={repoErr ? 'CACHED' : repos ? `${repos.length} RECORDS` : 'FETCHING'}
            />
            {repos === null ? (
              <div style={{
                padding:'28px 20px',
                fontFamily:'var(--font)', fontSize:'.62rem', fontWeight:600,
                letterSpacing:'.28em', color:'var(--ash)',
                animation:'pulse 1.8s ease-in-out infinite',
              }}>
                FETCHING RECORDS…
              </div>
            ) : (
              <div style={{
                display:'grid',
                gridTemplateColumns: desktop ? 'repeat(2,1fr)' : '1fr',
                gap:1, background:'var(--rule)',
              }}>
                {repos.map((r,i) => <RepoCard key={r.name} repo={r} index={i}/>)}
              </div>
            )}
          </div>

          {/* ── Expertise module ── */}
          <div className="rv rv-5 mod" style={{marginBottom: desktop?24:16}}>
            <ModHeader label="CAPABILITIES" right={`${CONFIG.expertise.length} FIELDS`}/>
            <div className="mod-body" style={{
              display:'flex', flexWrap:'wrap', gap:'8px 12px',
            }}>
              {CONFIG.expertise.map(tag => (
                <ExpertiseTag key={tag} label={tag}/>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="rv rv-6" style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'16px 0 40px',
            borderTop:'1px solid var(--rule)',
            fontFamily:'var(--font)', fontSize:'.5rem', fontWeight:600,
            letterSpacing:'.2em', textTransform:'uppercase',
          }}>
            <span style={{color:'var(--ash)', opacity:.4}}>
              © MMXXVI {CONFIG.name.first} {CONFIG.name.last}
            </span>
            <span aria-hidden style={{
              fontFamily:'serif', fontSize:'.75rem',
              letterSpacing:'.45em', color:'var(--gold)', opacity:.22,
            }}>
              ☿ ☉ ☽
            </span>
            <span style={{color:'var(--ash)', opacity:.4}}>
              {CONFIG.coords}
            </span>
          </div>

        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   EXPERTISE TAG
═══════════════════════════════════════════════════════════ */
function ExpertiseTag({ label }) {
  const [hov, set] = useState(false)
  return (
    <span
      onMouseEnter={()=>set(true)} onMouseLeave={()=>set(false)}
      style={{
        fontFamily:'var(--font)', fontSize:'.6rem', fontWeight:600,
        letterSpacing:'.12em', textTransform:'uppercase',
        color: hov ? 'var(--white)' : 'var(--silver)',
        border:`1px solid ${hov ? 'var(--rule-hi)' : 'var(--rule)'}`,
        background: hov ? 'var(--surface)' : 'transparent',
        padding:'5px 12px',
        transition:'all .15s',
        cursor:'default',
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {hov && <span style={{color:'var(--gold)', fontSize:'.55rem'}}>◆</span>}
      {label}
    </span>
  )
}
