import { useState, useEffect, useRef, useCallback } from 'react'
import './index.css'

/* ════════════════════════════════════════════════════════
   ▸ CONFIGURATION  — edit these to customise the page
════════════════════════════════════════════════════════ */
const CONFIG = {
  name:     { first: 'Mike', last: 'Stuchbery' },
  handle:   'mikestuchbery',
  roles:    ['Historian', 'Writer', 'Digital Craftsman'],
  tagline:  'A curious soul, fascinated by history, art and travel — who creates the things he wishes existed.',
  pinned:   ['roadtripperde', 'timeline-de'],   // exact GitHub repo names, in order
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

/* ════════════════════════════════════════════════════════
   ▸ BREAKPOINT HOOK
════════════════════════════════════════════════════════ */
function useDesktop(bp = 768) {
  const [v, set] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= bp : false
  )
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${bp}px)`)
    const fn  = e => set(e.matches)
    mq.addEventListener('change', fn)
    set(mq.matches)
    return () => mq.removeEventListener('change', fn)
  }, [bp])
  return v
}

/* ════════════════════════════════════════════════════════
   ▸ ALCHEMIC GLYPH CANVAS
   Very slow, very dim — atmosphere not decoration.
════════════════════════════════════════════════════════ */
const GLYPHS = '☿☉☽♄♃♂△▽⊕⊗◆⬡∞∑∂∇√ᚠᚢᚦᚱᛁᛃᛈᛏ'.split('')

function GlyphCanvas({ dark }) {
  const ref    = useRef(null)
  const parts  = useRef([])
  const raf    = useRef(null)
  const darkRef = useRef(dark)
  useEffect(() => { darkRef.current = dark }, [dark])

  const spawn = (W, H) => ({
    x:       Math.random() * W,
    y:       Math.random() * H,
    vx:      (Math.random() - 0.5) * 0.1,
    vy:      (Math.random() - 0.5) * 0.1,
    alpha:   0.02 + Math.random() * 0.055,
    size:    12 + Math.random() * 10,
    glyph:   GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    rot:     Math.random() * Math.PI * 2,
    rotV:    (Math.random() - 0.5) * 0.0015,
    life:    0,
    maxLife: 600 + Math.random() * 800,
  })

  const init = useCallback(canvas => {
    const W = canvas.width  = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight
    parts.current = Array.from({ length: 28 }, () => {
      const p = spawn(W, H)
      p.life = Math.random() * p.maxLife
      return p
    })
    return { W, H }
  }, [])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let dims = { W: 0, H: 0 }
    const obs = new ResizeObserver(() => { dims = init(canvas) })
    obs.observe(canvas)
    dims = init(canvas)
    const ctx = canvas.getContext('2d')

    function tick() {
      const { W, H } = dims
      ctx.clearRect(0, 0, W, H)
      const isDark = darkRef.current
      parts.current.forEach((p, i) => {
        p.life += 1
        p.x    += p.vx
        p.y    += p.vy
        p.rot  += p.rotV
        const t   = p.life / p.maxLife
        const env = t < 0.12 ? t / 0.12 : t > 0.88 ? (1 - t) / 0.12 : 1
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.font = `${p.size}px serif`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        const base = isDark ? '200,168,74' : '140,102,20'
        ctx.fillStyle = `rgba(${base},${p.alpha * env})`
        ctx.fillText(p.glyph, 0, 0)
        ctx.restore()
        if (
          p.life >= p.maxLife ||
          p.x < -40 || p.x > W + 40 ||
          p.y < -40 || p.y > H + 40
        ) {
          parts.current[i]      = spawn(W, H)
          parts.current[i].life = 0
        }
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { obs.disconnect(); cancelAnimationFrame(raf.current) }
  }, [init])

  return (
    <canvas
      ref={ref}
      style={{
        position:      'fixed',
        inset:         0,
        width:         '100%',
        height:        '100%',
        zIndex:        0,
        display:       'block',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ════════════════════════════════════════════════════════
   ▸ WATERMARK  — single enormous ☿ behind the name
════════════════════════════════════════════════════════ */
function Watermark() {
  return (
    <div
      aria-hidden
      style={{
        position:      'fixed',
        top:           '-10vh',
        right:         '-8vw',
        fontFamily:    'serif',
        fontSize:      'clamp(400px, 55vw, 800px)',
        lineHeight:    1,
        color:         'var(--fg)',
        opacity:       0.016,
        pointerEvents: 'none',
        userSelect:    'none',
        zIndex:        0,
        transition:    'color 0.4s',
      }}
    >
      ☿
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   ▸ THEME TOGGLE
════════════════════════════════════════════════════════ */
function ThemeToggle({ dark, onToggle }) {
  const [hov, set] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => set(true)}
      onMouseLeave={() => set(false)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background:    'none',
        border:        'none',
        cursor:        'pointer',
        outline:       'none',
        fontFamily:    'var(--font)',
        fontSize:      '0.7rem',
        fontWeight:    400,
        letterSpacing: '0.06em',
        color:         hov ? 'var(--fg)' : 'var(--mid)',
        transition:    'color 0.15s',
        padding:       0,
        lineHeight:    1,
      }}
    >
      {dark ? 'light' : 'dark'}
    </button>
  )
}

/* ════════════════════════════════════════════════════════
   ▸ BLINKING CURSOR
════════════════════════════════════════════════════════ */
function Cursor() {
  const [on, set] = useState(true)
  useEffect(() => {
    const t = setInterval(() => set(v => !v), 560)
    return () => clearInterval(t)
  }, [])
  return (
    <span
      aria-hidden
      style={{
        color:      'var(--gold)',
        opacity:    on ? 0.9 : 0,
        transition: 'opacity 0.06s',
        marginLeft: '0.04em',
        fontWeight: 400,
      }}
    >
      |
    </span>
  )
}

/* ════════════════════════════════════════════════════════
   ▸ AVATAR
════════════════════════════════════════════════════════ */
function Avatar({ size }) {
  const [err, setErr] = useState(false)
  if (err) return null
  return (
    <img
      src={`https://avatars.githubusercontent.com/${CONFIG.handle}`}
      alt={`${CONFIG.name.first} ${CONFIG.name.last}`}
      onError={() => setErr(true)}
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        objectFit:    'cover',
        display:      'block',
        filter:       'grayscale(20%) contrast(1.04)',
        opacity:      0.88,
        flexShrink:   0,
        border:       '1px solid var(--rule)',
      }}
    />
  )
}

/* ════════════════════════════════════════════════════════
   ▸ SOCIAL LINK
════════════════════════════════════════════════════════ */
function SocialLink({ label, href }) {
  const [hov, set] = useState(false)
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      onMouseEnter={() => set(true)}
      onMouseLeave={() => set(false)}
      style={{
        fontFamily:          'var(--font)',
        fontSize:            '0.85rem',
        fontWeight:          400,
        color:               hov ? 'var(--fg)' : 'var(--mid)',
        textDecoration:      hov ? 'underline' : 'none',
        textDecorationColor: 'var(--gold)',
        textUnderlineOffset: '4px',
        transition:          'color 0.15s',
        lineHeight:          1,
        whiteSpace:          'nowrap',
      }}
    >
      {label}
    </a>
  )
}

/* ════════════════════════════════════════════════════════
   ▸ REPO ROW
════════════════════════════════════════════════════════ */
const LANG_MAP = {
  JavaScript: 'JS', TypeScript: 'TS', HTML: 'HTML',
  CSS: 'CSS', Python: 'PY', Rust: 'RS', Shell: 'SH',
}

function RepoRow({ repo }) {
  const [hov, set] = useState(false)
  const lang = repo.language ? (LANG_MAP[repo.language] || repo.language) : null
  const date = new Date(repo.updated_at).toLocaleDateString('en-GB', {
    month: 'short', year: 'numeric',
  })

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => set(true)}
      onMouseLeave={() => set(false)}
      style={{
        display:        'block',
        textDecoration: 'none',
        padding:        '24px 0',
        borderBottom:   '1px solid var(--rule)',
        background:     hov ? 'var(--hover-row)' : 'transparent',
        margin:         '0 -24px',
        padding:        '24px 24px',
        position:       'relative',
        transition:     'background 0.18s',
      }}
    >
      {/* Gold left bar — slides in on hover */}
      <div
        style={{
          position:        'absolute',
          left:            0,
          top:             '20%',
          bottom:          '20%',
          width:           2,
          background:      'var(--gold)',
          transformOrigin: 'top',
          transform:       hov ? 'scaleY(1)' : 'scaleY(0)',
          transition:      'transform 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* Top row: name + arrow */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'baseline',
        gap:            24,
        marginBottom:   8,
      }}>
        <span style={{
          fontFamily:    'var(--font)',
          fontSize:      '1rem',
          fontWeight:    600,
          letterSpacing: '-0.01em',
          color:         hov ? 'var(--fg)' : '#A8A4A0',
          transition:    'color 0.18s',
        }}>
          {repo.name}
        </span>
        <span style={{
          fontSize:   '0.9rem',
          color:      hov ? 'var(--gold)' : 'var(--mid)',
          opacity:    hov ? 1 : 0.45,
          transition: 'color 0.18s, opacity 0.18s, transform 0.18s',
          transform:  hov ? 'translate(3px, -3px)' : 'translate(0,0)',
          display:    'inline-block',
          flexShrink: 0,
        }}>
          ↗
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontFamily:   'var(--font)',
        fontSize:     '0.83rem',
        fontWeight:   400,
        lineHeight:   1.65,
        color:        'var(--mid)',
        marginBottom: 12,
      }}>
        {repo.description || '—'}
      </p>

      {/* Meta */}
      <div style={{
        display:    'flex',
        gap:        14,
        alignItems: 'center',
        fontFamily: 'var(--font)',
        fontSize:   '0.68rem',
        fontWeight: 400,
        color:      'var(--mid)',
        opacity:    0.5,
      }}>
        {lang && (
          <span style={{ color: 'var(--gold)', opacity: 0.85 }}>{lang}</span>
        )}
        {repo.stargazers_count > 0 && (
          <span>★ {repo.stargazers_count}</span>
        )}
        <span style={{ marginLeft: 'auto' }}>{date}</span>
      </div>
    </a>
  )
}

/* ════════════════════════════════════════════════════════
   ▸ SECTION LABEL
════════════════════════════════════════════════════════ */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily:    'var(--font)',
      fontSize:      '0.62rem',
      fontWeight:    500,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color:         'var(--mid)',
      opacity:       0.45,
      marginBottom:  24,
    }}>
      {children}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   ▸ ROOT APP
════════════════════════════════════════════════════════ */
export default function App() {
  const [dark,    setDark]    = useState(true)
  const [repos,   setRepos]   = useState(null)
  const [repoErr, setRepoErr] = useState(false)
  const desktop = useDesktop()

  /* ── Theme ── */
  useEffect(() => {
    const saved = localStorage.getItem('ms-theme')
    if (saved === 'light') {
      setDark(false)
      document.documentElement.classList.add('light')
    }
  }, [])

  const toggleTheme = () => {
    setDark(d => {
      const next = !d
      localStorage.setItem('ms-theme', next ? 'dark' : 'light')
      document.documentElement.classList.toggle('light', !next)
      return next
    })
  }

  /* ── Repos ── */
  useEffect(() => {
    fetch(`https://api.github.com/users/${CONFIG.handle}/repos?per_page=100`)
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json() })
      .then(all => {
        const pinned = CONFIG.pinned
          .map(name => all.find(r => r.name === name))
          .filter(Boolean)
        if (!pinned.length) throw new Error('No pinned repos found')
        setRepos(pinned)
      })
      .catch(() => {
        setRepoErr(true)
        setRepos(CONFIG.pinned.map((name, i) => ({
          name,
          description: i === 0
            ? 'Road trip heritage companion — surfacing historical POIs along driving routes across Germany.'
            : 'AI-powered historical content along German rail routes. React + Vite, deployed on Vercel.',
          language:          'JavaScript',
          stargazers_count:  0,
          updated_at:        '2026-01-01T00:00:00Z',
          html_url:          `https://github.com/${CONFIG.handle}/${name}`,
        })))
      })
  }, [])

  /* ── Layout values ── */
  const maxW  = 860
  const padH  = desktop ? '0 48px' : '0 22px'
  const heroGap = desktop
    ? 'clamp(64px, 10vw, 100px)'
    : '52px'

  return (
    <>
      {/* ── Fixed background layers ── */}
      <GlyphCanvas dark={dark} />
      <Watermark />

      {/* ── Bg overlay for readability ── */}
      <div
        aria-hidden
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     1,
          background: 'var(--bg)',
          opacity:    0.91,
          transition: 'background 0.4s, opacity 0.4s',
          pointerEvents: 'none',
        }}
      />

      {/* ── Page ── */}
      <div
        style={{
          position:  'relative',
          zIndex:    10,
          maxWidth:  maxW,
          margin:    '0 auto',
          padding:   padH,
        }}
      >

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            NAV
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <nav
          className="reveal reveal-1"
          style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            padding:        desktop ? '34px 0 32px' : '22px 0 20px',
            borderBottom:   '1px solid var(--rule)',
            marginBottom:   heroGap,
          }}
        >
          <span style={{
            fontFamily:    'var(--font)',
            fontSize:      '0.7rem',
            fontWeight:    400,
            letterSpacing: '0.06em',
            color:         'var(--mid)',
            opacity:       0.55,
          }}>
            {CONFIG.handle}
          </span>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </nav>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HERO
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          style={{ marginBottom: heroGap }}
        >
          {desktop ? (
            /* ── DESKTOP ── */
            <div>
              {/* Name — full-width, dominant */}
              <div className="reveal reveal-1" style={{ marginBottom: 28 }}>
                <h1
                  style={{
                    fontFamily:    'var(--font)',
                    fontSize:      'clamp(4.5rem, 9.5vw, 8.5rem)',
                    fontWeight:    800,
                    letterSpacing: '-0.035em',
                    lineHeight:    0.9,
                    color:         'var(--fg)',
                    display:       'flex',
                    alignItems:    'baseline',
                    gap:           '0.22em',
                    flexWrap:      'wrap',
                  }}
                >
                  <span>{CONFIG.name.first}</span>
                  <span style={{ color: 'var(--gold)' }}>{CONFIG.name.last}</span>
                  <Cursor />
                </h1>
              </div>

              {/* Role + photo row */}
              <div
                className="reveal reveal-2"
                style={{
                  display:        'grid',
                  gridTemplateColumns: '1fr auto',
                  gap:            40,
                  alignItems:     'end',
                  marginBottom:   32,
                }}
              >
                <div>
                  <p style={{
                    fontFamily:    'var(--font)',
                    fontSize:      '0.85rem',
                    fontWeight:    400,
                    letterSpacing: '0.05em',
                    color:         'var(--mid)',
                    marginBottom:  22,
                  }}>
                    {CONFIG.roles.join('  ·  ')}
                  </p>
                  <p style={{
                    fontFamily:   'var(--font)',
                    fontSize:     'clamp(1rem, 1.6vw, 1.22rem)',
                    fontWeight:   300,
                    lineHeight:   1.75,
                    color:        'var(--fg)',
                    opacity:      0.6,
                    maxWidth:     520,
                  }}>
                    {CONFIG.tagline}
                  </p>
                </div>
                <Avatar size={120} />
              </div>

              {/* Social links */}
              <div className="reveal reveal-3" style={{
                display:  'flex',
                flexWrap: 'wrap',
                gap:      '0 24px',
              }}>
                {CONFIG.social.map(s => (
                  <SocialLink key={s.label} label={s.label} href={s.href} />
                ))}
              </div>
            </div>
          ) : (
            /* ── MOBILE ── */
            <div>
              {/* Photo + name compact row */}
              <div
                className="reveal reveal-1"
                style={{
                  display:      'flex',
                  gap:          16,
                  alignItems:   'center',
                  marginBottom: 20,
                }}
              >
                <Avatar size={64} />
                <h1 style={{
                  fontFamily:    'var(--font)',
                  fontSize:      'clamp(2rem, 8vw, 2.8rem)',
                  fontWeight:    800,
                  letterSpacing: '-0.03em',
                  lineHeight:    0.95,
                  color:         'var(--fg)',
                }}>
                  {CONFIG.name.first}{' '}
                  <span style={{ color: 'var(--gold)' }}>
                    {CONFIG.name.last}
                  </span>
                  <Cursor />
                </h1>
              </div>

              <p
                className="reveal reveal-2"
                style={{
                  fontFamily:    'var(--font)',
                  fontSize:      '0.75rem',
                  fontWeight:    400,
                  letterSpacing: '0.04em',
                  color:         'var(--mid)',
                  marginBottom:  18,
                }}
              >
                {CONFIG.roles.join(' · ')}
              </p>

              <p
                className="reveal reveal-2"
                style={{
                  fontFamily:   'var(--font)',
                  fontSize:     '0.95rem',
                  fontWeight:   300,
                  lineHeight:   1.72,
                  color:        'var(--fg)',
                  opacity:      0.6,
                  marginBottom: 24,
                }}
              >
                {CONFIG.tagline}
              </p>

              <div
                className="reveal reveal-3"
                style={{
                  display:  'flex',
                  flexWrap: 'wrap',
                  gap:      '0 18px',
                }}
              >
                {CONFIG.social.map(s => (
                  <SocialLink key={s.label} label={s.label} href={s.href} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            WORK
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="reveal reveal-4"
          style={{ marginBottom: desktop ? 80 : 56 }}
        >
          <SectionLabel>Selected work</SectionLabel>

          <div style={{ borderTop: '1px solid var(--rule)' }}>
            {repos === null ? (
              <p style={{
                fontFamily:    'var(--font)',
                fontSize:      '0.7rem',
                fontWeight:    400,
                letterSpacing: '0.15em',
                color:         'var(--mid)',
                opacity:       0.35,
                padding:       '28px 0',
                animation:     'softPulse 1.8s ease-in-out infinite',
              }}>
                fetching…
              </p>
            ) : (
              repos.map(r => <RepoRow key={r.name} repo={r} />)
            )}
          </div>

          {repoErr && (
            <p style={{
              fontFamily:    'var(--font)',
              fontSize:      '0.6rem',
              fontWeight:    400,
              letterSpacing: '0.12em',
              color:         'var(--mid)',
              opacity:       0.25,
              marginTop:     10,
            }}>
              cached data — github api unavailable
            </p>
          )}
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            EXPERTISE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="reveal reveal-4"
          style={{ marginBottom: desktop ? 80 : 56 }}
        >
          <SectionLabel>Expertise</SectionLabel>
          <p style={{
            fontFamily:    'var(--font)',
            fontSize:      '0.88rem',
            fontWeight:    300,
            lineHeight:    2.2,
            color:         'var(--mid)',
            letterSpacing: '0.01em',
          }}>
            {CONFIG.expertise.join('  ·  ')}
          </p>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FOOTER
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <footer
          className="reveal reveal-5"
          style={{
            borderTop:     '1px solid var(--rule)',
            paddingTop:    22,
            paddingBottom: desktop ? 56 : 40,
            display:       'flex',
            justifyContent:'space-between',
            alignItems:    'center',
          }}
        >
          <span style={{
            fontFamily:    'var(--font)',
            fontSize:      '0.65rem',
            fontWeight:    400,
            letterSpacing: '0.08em',
            color:         'var(--mid)',
            opacity:       0.3,
          }}>
            © 2026 {CONFIG.name.first} {CONFIG.name.last}
          </span>

          <span
            aria-hidden
            style={{
              fontFamily:    'serif',
              fontSize:      '0.8rem',
              letterSpacing: '0.45em',
              color:         'var(--gold)',
              opacity:       0.2,
            }}
          >
            ☿ ☉ ☽
          </span>
        </footer>

      </div>
    </>
  )
}
