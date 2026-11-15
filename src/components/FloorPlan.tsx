import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RoomFloor, SeatStateValue } from '../types'
import { MinusIcon, PlusIcon } from './icons'

/*
 * 열람실 평면도(SVG, 지도 픽셀 좌표). 위에서 내려다본 모습으로 그린다.
 * - 좌석마다 책상 하나 + 의자. 의자는 책상 바깥쪽(통로 쪽)에 둔다. 좌석끼리는 틈을 둬서 겹쳐 보이지 않게.
 * - 사용할 수 없는 자리는 책상·의자를 무채색(회색)으로 그린다.
 * - 에어컨(벽걸이·천장형·스탠드)과 창문(유리·창틀)은 실제 기기·창처럼 그린다.
 * 환경 객체(창문·에어컨·조명·콘센트)는 가상 데이터다.
 */

export type LayerKey = 'ac' | 'window' | 'light' | 'outlet'
const LAYERS: { key: LayerKey; label: string; Icon: () => ReactNode }[] = [
  { key: 'ac', label: '에어컨', Icon: LegendAc },
  { key: 'window', label: '창문', Icon: LegendWindow },
  { key: 'light', label: '조명', Icon: LegendLight },
  { key: 'outlet', label: '콘센트', Icon: LegendOutlet },
]

const DESK_COLORS = ['#DDBB8A', '#C29A64'] // 책상은 모두 같은 나무색
const RANK_FILL = ['#2E6A68', '#7A5236', '#6A5A4B', '#6A5A4B', '#6A5A4B']
const TAKEN: SeatStateValue[] = ['occupied', 'reserved', 'blocked']

type Dir = [number, number]
type Geo = { x: number; y: number; w: number; h: number; dir: Dir }

/** 좌석별 그릴 칸(이웃 좌석과 겹치지 않게 줄임)과 의자 방향 */
function layout(floor: RoomFloor): Record<string, Geo> {
  const c = floor.seats.map((s) => ({ s, cx: s.box.x + s.box.width / 2, cy: s.box.y + s.box.height / 2 }))
  const out: Record<string, Geo> = {}
  const rb = floor.roomBounds
  const roomC = [rb.x + rb.width / 2, rb.y + rb.height / 2]

  // 묶음별 의자 방향: 두 줄 책상은 바깥쪽, 한 줄은 방 안쪽, 혼자 있는 자리는 가까운 벽을 마주 봄
  const dirOf: Record<string, Dir> = {}
  for (const g of floor.deskGroups) {
    const mem = c.filter((m) => g.seatIds.includes(m.s.seatId))
    if (!mem.length) continue
    const tol = Math.min(...mem.map((m) => Math.min(m.s.box.width, m.s.box.height))) * 0.5
    const distinct = (vals: number[]) => vals.sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > tol).length
    const rows = distinct(mem.map((m) => m.cy))
    const cols = distinct(mem.map((m) => m.cx))
    const gx = g.box.x + g.box.width / 2
    const gy = g.box.y + g.box.height / 2
    for (const m of mem) {
      let d: Dir
      if (rows === 2 && cols !== 2) d = [0, m.cy < gy ? -1 : 1]
      else if (cols === 2 && rows !== 2) d = [m.cx < gx ? -1 : 1, 0]
      else if (rows === 2 && cols === 2) d = g.box.width >= g.box.height ? [0, m.cy < gy ? -1 : 1] : [m.cx < gx ? -1 : 1, 0]
      else if (rows === 1 && cols > 1) d = [0, m.cy < roomC[1] ? 1 : -1]
      else if (cols === 1 && rows > 1) d = [m.cx < roomC[0] ? 1 : -1, 0]
      else {
        const walls: [number, Dir][] = [
          [m.cx - rb.x, [1, 0]],
          [rb.x + rb.width - m.cx, [-1, 0]],
          [m.cy - rb.y, [0, 1]],
          [rb.y + rb.height - m.cy, [0, -1]],
        ]
        d = walls.sort((a, b) => a[0] - b[0])[0][1]
      }
      dirOf[m.s.seatId] = d
    }
  }

  for (const a of c) {
    const { width: w, height: h } = a.s.box
    let sx = Infinity
    let sy = Infinity
    for (const b of c) {
      if (b === a) continue
      const dx = Math.abs(b.cx - a.cx)
      const dy = Math.abs(b.cy - a.cy)
      if (dy < h * 0.5 && dx > w * 0.2) sx = Math.min(sx, dx)
      if (dx < w * 0.5 && dy > h * 0.2) sy = Math.min(sy, dy)
    }
    const cw = Math.min(w, sx)
    const ch = Math.min(h, sy)
    const gap = Math.min(cw, ch) * 0.14
    out[a.s.seatId] = { x: a.cx - (cw - gap) / 2, y: a.cy - (ch - gap) / 2, w: cw - gap, h: ch - gap, dir: dirOf[a.s.seatId] ?? [0, 1] }
  }
  return out
}

export default function FloorPlan({
  floor,
  states = {},
  ranks = {},
  focusId,
  onSeat,
  initialZoom = 1,
  maxHeightClass = '',
  compactLegend = false,
}: {
  floor: RoomFloor
  states?: Record<string, SeatStateValue>
  ranks?: Record<string, number>
  focusId?: string | null
  onSeat?: (seatId: string) => void
  initialZoom?: number
  maxHeightClass?: string
  compactLegend?: boolean
}) {
  const [layers, setLayers] = useState<Set<LayerKey>>(() => new Set<LayerKey>(['ac', 'window', 'light', 'outlet']))
  const [zoom, setZoom] = useState(1)
  const box = useRef<HTMLDivElement>(null)
  const pending = useRef<[number, number] | null>(null) // 확대 뒤 가운데로 올 지점(지도 비율)

  const rb = floor.roomBounds
  const M = floor.pxPerMeter
  const geo = useMemo(() => layout(floor), [floor])
  const cs = useMemo(() => {
    const s = Object.values(geo)
      .map((g) => Math.max(g.w, g.h))
      .sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)] ?? 30
  }, [geo])
  const pad = Math.max(1.2 * M, cs * 1.6)
  const vb = { x: rb.x - pad, y: rb.y - pad, w: rb.width + 2 * pad, h: rb.height + 2 * pad }
  const wt = Math.max(0.22 * M, cs * 0.2) // 벽 두께
  const lw = Math.max(cs * 0.05, 0.8)
  const has = (k: LayerKey) => layers.has(k)
  const toggle = (k: LayerKey) =>
    setLayers((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  /** 크게 보기 배율: 화면에서 좌석 하나가 52px쯤 되도록(작은 화면일수록 많이 확대) */
  const bigZoom = useCallback(() => {
    const cw = box.current?.clientWidth || 360
    const seatPx = (cs / vb.w) * cw
    return Math.min(8, Math.max(2, 52 / Math.max(seatPx, 1)))
  }, [cs, vb.w])
  const zoomed = zoom > 1

  // 처음부터 크게 보기(자세히 보기 화면 모바일)
  useLayoutEffect(() => {
    if (initialZoom > 1) setZoom(bigZoom())
  }, [initialZoom, bigZoom])

  // 지도를 누른 곳을 확대해서 가운데로
  useEffect(() => {
    const el = box.current
    const p = pending.current
    if (!el || !p) return
    pending.current = null
    el.scrollTo({ left: p[0] * el.scrollWidth - el.clientWidth / 2, top: p[1] * el.scrollHeight - el.clientHeight / 2, behavior: 'smooth' })
  }, [zoom])

  /** 크게 보기로 전환하며 (clientX, clientY) 지점을 가운데로. 좌표가 없으면 지금 보이는 가운데 */
  function zoomIn(clientX?: number, clientY?: number) {
    const el = box.current
    const svg = el?.querySelector('svg')
    if (!el || !svg || zoomed) return
    const r = svg.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    const cx = clientX ?? er.left + er.width / 2
    const cy = clientY ?? er.top + er.height / 2
    pending.current = [(cx - r.left) / r.width, (cy - r.top) / r.height]
    setZoom(bigZoom())
  }

  // 고른 좌석 보기: 모바일에서는 지도를 화면 맨 위로 올리고, 아래 좌석 정보 창과 겹치지 않게 지도 높이를 맞춘 뒤 좌석을 가운데로
  useEffect(() => {
    const el = box.current
    if (!el) return
    if (!focusId) {
      el.style.maxHeight = ''
      return
    }
    const s = floor.seats.find((x) => x.seatId === focusId)
    if (!s) return
    const fx = (s.box.x + s.box.width / 2 - vb.x) / vb.w
    const fy = (s.box.y + s.box.height / 2 - vb.y) / vb.h
    const raf = requestAnimationFrame(() => {
      const sheet = document.querySelector('[data-seat-sheet]')
      const mobile = window.innerWidth < 1024
      if (mobile && sheet) {
        // 레이어·확대 버튼 줄이 화면 안에 남도록 그만큼 띄운다
        const controls = el.previousElementSibling as HTMLElement | null
        const top = 8 + (controls ? el.getBoundingClientRect().top - controls.getBoundingClientRect().top : 0)
        const sheetTop = sheet.getBoundingClientRect().top
        el.style.maxHeight = `${Math.max(180, sheetTop - top - 12)}px`
        const r = el.getBoundingClientRect()
        window.scrollTo({ top: window.scrollY + r.top - top, behavior: 'smooth' })
      } else el.style.maxHeight = ''
      el.scrollTo({ left: fx * el.scrollWidth - el.clientWidth / 2, top: fy * el.scrollHeight - el.clientHeight / 2, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [focusId, zoom, floor, vb.x, vb.y, vb.w, vb.h])

  const id = floor.roomId.replace(/[^a-z0-9]/gi, '')
  const showLabels = zoomed
  // 같은 방향·가까운 위치의 화장실 표지는 하나만
  const toilets = floor.toilets.filter(
    (t, i, all) =>
      !all
        .slice(0, i)
        .some((u) => arrowOf(u.direction) === arrowOf(t.direction) && Math.hypot(u.point[0] - t.point[0], u.point[1] - t.point[1]) < rb.width * 0.3),
  )

  return (
    <div className="flex flex-col gap-2.5">
      {/* 안내·확대 */}
      <div className="flex items-center gap-2">
        <p className="m-0 flex-1 text-xs leading-snug text-muted">
          {zoomed ? '자리를 누르면 그 자리 정보가 나와요. −를 누르면 전체로 돌아가요.' : '지도를 누르면 그곳을 크게 보여 드려요.'}
        </p>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-line-strong bg-cream">
          <button
            type="button"
            aria-label="축소"
            disabled={!zoomed}
            onClick={() => setZoom(1)}
            className="flex size-8 items-center justify-center text-ink-2 disabled:opacity-30"
          >
            <MinusIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="확대"
            disabled={zoomed}
            onClick={() => zoomIn()}
            className="flex size-8 items-center justify-center border-l border-line text-ink-2 disabled:opacity-30"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={box}
        className={`relative overflow-auto rounded-xl border border-line bg-[#E4DFD6] ${maxHeightClass}`}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          style={{ width: `${zoom * 100}%`, display: 'block', cursor: zoomed ? 'default' : 'zoom-in' }}
          onClick={(ev) => zoomIn(ev.clientX, ev.clientY)}
          role="group"
          aria-label={`${floor.roomName} 평면도`}
        >
          <defs>
            <pattern id={`floor${id}`} width={cs} height={cs} patternUnits="userSpaceOnUse">
              <rect width={cs} height={cs} fill="#F6F1E7" />
              <path d={`M0 0H${cs}V${cs}`} fill="none" stroke="#ECE3D2" strokeWidth={cs * 0.03} />
            </pattern>
            <pattern id={`out${id}`} width={cs * 0.5} height={cs * 0.5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={cs * 0.5} height={cs * 0.5} fill="#E4DFD6" />
              <path d={`M0 0V${cs * 0.5}`} stroke="#D9D3C8" strokeWidth={cs * 0.06} />
            </pattern>
            <radialGradient id={`air${id}`}>
              <stop offset="0" stopColor="#5AA6E0" stopOpacity="0.5" />
              <stop offset="1" stopColor="#5AA6E0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`glow${id}`}>
              <stop offset="0" stopColor="#FFF0B8" stopOpacity="0.8" />
              <stop offset="1" stopColor="#FFF0B8" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`glass${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#D9F1FB" />
              <stop offset="0.5" stopColor="#A9D8EE" />
              <stop offset="1" stopColor="#CDEBF8" />
            </linearGradient>
            <linearGradient id={`unit${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#E3E8ED" />
            </linearGradient>
            <linearGradient id={`desk${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={DESK_COLORS[0]} />
              <stop offset="1" stopColor={DESK_COLORS[1]} />
            </linearGradient>
            <filter id={`sh${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={cs * 0.03} dy={cs * 0.05} stdDeviation={cs * 0.04} floodOpacity="0.28" />
            </filter>
            <clipPath id={`clip${id}`}>
              <rect x={rb.x} y={rb.y} width={rb.width} height={rb.height} />
            </clipPath>
            <marker id={`arrow${id}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10Z" fill="#3D8BD0" />
            </marker>
          </defs>

          {/* 바깥(복도)과 바닥 */}
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={`url(#out${id})`} />
          <rect x={rb.x} y={rb.y} width={rb.width} height={rb.height} fill={`url(#floor${id})`} />

          {/* 창문으로 들어오는 햇빛 */}
          {has('window') &&
            floor.windows.map((w, i) => {
              const [[ax, ay], [bx, by]] = w.line
              const d = 2.4 * M
              const dir = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] }[w.wall] ?? [0, 1]
              const x = Math.min(ax, bx) - (dir[0] < 0 ? d : 0)
              const y = Math.min(ay, by) - (dir[1] < 0 ? d : 0)
              const ww = dir[0] ? d : Math.abs(bx - ax)
              const hh = dir[1] ? d : Math.abs(by - ay)
              const gid = `sun${id}${i}`
              return (
                <g key={`sun${i}`} clipPath={`url(#clip${id})`}>
                  <linearGradient id={gid} x1={dir[0] < 0 ? 1 : 0} y1={dir[1] < 0 ? 1 : 0} x2={dir[0] > 0 ? 1 : 0} y2={dir[1] > 0 ? 1 : 0}>
                    <stop offset="0" stopColor="#FFF3C4" stopOpacity={w.blindClosed ? 0.15 : 0.8} />
                    <stop offset="1" stopColor="#FFF3C4" stopOpacity="0" />
                  </linearGradient>
                  <rect x={x} y={y} width={ww} height={hh} fill={`url(#${gid})`} />
                </g>
              )
            })}

          {/* 조명 빛 */}
          {has('light') &&
            floor.lights.map((l, i) => (
              <circle
                key={`lg${i}`}
                cx={l.point[0]}
                cy={l.point[1]}
                r={1.5 * M}
                fill={`url(#glow${id})`}
                opacity={l.dim ? 0.3 : 0.85}
                clipPath={`url(#clip${id})`}
              />
            ))}

          {/* 에어컨 바람 범위 */}
          {has('ac') &&
            floor.airConditioners.map((a, i) => {
              const [x, y] = a.point
              const r = a.reachPx
              const op = 0.35 + a.strength * 0.55
              if (a.direction) {
                const ang = Math.atan2(a.direction[1], a.direction[0])
                const sp = 0.62
                const p1 = [x + r * Math.cos(ang - sp), y + r * Math.sin(ang - sp)]
                const p2 = [x + r * Math.cos(ang + sp), y + r * Math.sin(ang + sp)]
                return (
                  <path
                    key={`air${i}`}
                    d={`M${x} ${y}L${p1[0]} ${p1[1]}A${r} ${r} 0 0 1 ${p2[0]} ${p2[1]}Z`}
                    fill={`url(#air${id})`}
                    opacity={op}
                    clipPath={`url(#clip${id})`}
                  />
                )
              }
              return <circle key={`air${i}`} cx={x} cy={y} r={r} fill={`url(#air${id})`} opacity={op} clipPath={`url(#clip${id})`} />
            })}

          {/* 천장 조명 기구(긴 형광등 판) — 좌석 아래에 깔아 책상을 가리지 않게 */}
          {has('light') &&
            floor.lights.map((l, i) => {
              const L = Math.max(1.0 * M, cs * 1.2)
              const T = L * 0.16
              const [x, y] = l.point
              return (
                <rect
                  key={`l${i}`}
                  x={x - L / 2}
                  y={y - T / 2}
                  width={L}
                  height={T}
                  rx={T * 0.4}
                  fill={l.dim ? '#B9B5AD' : '#FFFDF2'}
                  stroke={l.dim ? '#8E8A82' : '#E3CF86'}
                  strokeWidth={lw * 0.7}
                  opacity={0.85}
                  style={{ pointerEvents: 'none' }}
                />
              )
            })}

          {/* 천장형 에어컨: 천장에 붙어 있으니 책상을 가리지 않게 좌석 아래에 */}
          {floor.airConditioners.map(
            (a, i) =>
              a.kind === 'ceiling_cassette' && (
                <AirConditioner key={`cac${i}`} a={a} M={M} cs={cs} lw={lw} fill={`url(#unit${id})`} arrow={`url(#arrow${id})`} wind={has('ac')} />
              ),
          )}

          {/* 좌석: 책상 + 의자 (사용 불가는 회색) */}
          {floor.seats.map((s) => {
            const g = geo[s.seatId]
            if (!g) return null
            const taken = TAKEN.includes(states[s.seatId])
            const r = ranks[s.seatId]
            return (
              <g
                key={s.seatId}
                onClick={(ev) => {
                  ev.stopPropagation()
                  // 작게 보일 때 누르면 그 자리를 크게 보여 준다
                  if (!zoomed) zoomIn(ev.clientX, ev.clientY)
                  onSeat?.(s.seatId)
                }}
                style={{ cursor: 'pointer' }}
                role={onSeat ? 'button' : undefined}
                aria-label={`${s.label}번 ${taken ? '사용 불가' : '빈자리'}${r ? ` 추천 ${r}순위` : ''}`}
              >
                <title>{`${s.label}번 · ${taken ? '사용 불가' : '빈자리'}${s.partition ? ' · 칸막이' : ''}${s.deskOutlet ? ' · 책상 콘센트' : ''}`}</title>
                <Seat
                  g={g}
                  deskFill={`url(#desk${id})`}
                  partition={s.partition}
                  taken={taken}
                  rankColor={r ? RANK_FILL[r - 1] : null}
                  rank={r ?? null}
                  focused={focusId === s.seatId}
                  label={showLabels ? s.label : null}
                  shadow={`url(#sh${id})`}
                />
              </g>
            )
          })}

          {/* 콘센트 */}

          {/* 벽 */}
          <rect x={rb.x} y={rb.y} width={rb.width} height={rb.height} fill="none" stroke="#3A3029" strokeWidth={wt} />

          {/* 창문: 벽 속 유리창(창틀·창살) */}
          {has('window') && floor.windows.map((w, i) => <Window key={`w${i}`} w={w} t={wt * 1.35} M={M} glass={`url(#glass${id})`} />)}

          {/* 벽걸이·스탠드 에어컨 본체 (천장형은 좌석 아래에 깔았다) */}
          {floor.airConditioners.map(
            (a, i) =>
              a.kind !== 'ceiling_cassette' && (
                <AirConditioner key={`ac${i}`} a={a} M={M} cs={cs} lw={lw} fill={`url(#unit${id})`} arrow={`url(#arrow${id})`} wind={has('ac')} />
              ),
          )}

          {/* 콘센트(2구 멀티탭 모양): 벽에 가리지 않게 벽 위에, 벽 콘센트는 벽을 따라 세운다 */}
          {has('outlet') &&
            floor.outlets.map((c, i) => {
              const [x, y] = c.point
              const dl = x - rb.x
              const dr = rb.x + rb.width - x
              const dt = y - rb.y
              const db = rb.y + rb.height - y
              const near = Math.min(dl, dr, dt, db)
              const onWall = c.kind !== 'desk' && near < cs * 0.6
              const vertical = onWall && (near === dl || near === dr)
              const T = cs * 0.34
              // 벽 콘센트는 방 안쪽으로 살짝 들여 벽선에 겹치지 않게
              const inset = onWall ? wt * 0.5 + T * 0.55 : 0
              const ox = onWall && vertical ? (near === dl ? inset : -inset) : 0
              const oy = onWall && !vertical ? (near === dt ? inset : -inset) : 0
              return <Outlet key={`o${i}`} x={x + ox} y={y + oy} L={cs * (c.kind === 'desk' ? 0.62 : 0.72)} T={T} vertical={vertical} lw={lw} />
            })}

          {/* 출입구 */}
          {floor.entrances.map((e, i) => {
            const [x, y] = e.point
            const d = Math.max(1.1 * M, cs * 1.3)
            const horiz = e.wall === 'top' || e.wall === 'bottom'
            const into = { top: 1, bottom: -1, left: 1, right: -1 }[e.wall ?? 'bottom'] ?? -1
            return (
              <g key={`e${i}`}>
                <title>출입구</title>
                {horiz ? (
                  <>
                    <rect x={x - d / 2} y={y - wt * 0.6} width={d} height={wt * 1.2} fill="#F6F1E7" />
                    <path
                      d={`M${x - d / 2} ${y}L${x - d / 2} ${y + into * d}A${d} ${d} 0 0 ${into > 0 ? 0 : 1} ${x + d / 2} ${y}`}
                      fill="rgba(122,82,54,.10)"
                      stroke="#7A5236"
                      strokeWidth={lw}
                    />
                    <line x1={x - d / 2} y1={y} x2={x - d / 2} y2={y + into * d} stroke="#7A5236" strokeWidth={lw * 2.2} strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <rect x={x - wt * 0.6} y={y - d / 2} width={wt * 1.2} height={d} fill="#F6F1E7" />
                    <path
                      d={`M${x} ${y - d / 2}L${x + into * d} ${y - d / 2}A${d} ${d} 0 0 ${into > 0 ? 1 : 0} ${x} ${y + d / 2}`}
                      fill="rgba(122,82,54,.10)"
                      stroke="#7A5236"
                      strokeWidth={lw}
                    />
                    <line x1={x} y1={y - d / 2} x2={x + into * d} y2={y - d / 2} stroke="#7A5236" strokeWidth={lw * 2.2} strokeLinecap="round" />
                  </>
                )}
              </g>
            )
          })}

          {/* 화장실 방향 */}
          {toilets.map((t, i) => {
            const [x, y] = t.point
            const ox = t.direction[0] * pad * 0.55
            const oy = t.direction[1] * pad * 0.55
            return (
              <g key={`t${i}`}>
                <title>화장실 방향</title>
                <ToiletSign x={x + ox} y={y + oy} cs={cs} vb={vb} arrow={t.outside ? arrowOf(t.direction) : ''} />
              </g>
            )
          })}
        </svg>
      </div>

      {/* 범례: 크게, 무리 지어. 시설은 눌러서 지도에서 켜고 끈다 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-3 lg:p-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 text-[13px] font-bold text-ink-2">자리{compactLegend ? '' : '·공간'}</h3>
          <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-3 lg:grid-cols-4">
            <LegendItem label="빈자리" icon={<LegendSeat />} />
            <LegendItem label="사용 불가" icon={<LegendSeat taken />} />
            <LegendItem label="추천 순위" icon={<LegendRank />} />
            <LegendItem label="칸막이 자리" icon={<LegendSeat partition />} />
            {!compactLegend && <LegendItem label="출입구" icon={<LegendDoor />} />}
            {!compactLegend && <LegendItem label="화장실" icon={<LegendToilet />} />}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 flex items-baseline gap-1.5 text-[13px] font-bold text-ink-2">
            시설 <span className="text-[11px] font-normal text-muted">누르면 지도에서 켜고 꺼요</span>
          </h3>
          <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 lg:grid-cols-4">
            {LAYERS.map(({ key, label, Icon }) => {
              const on = has(key)
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(key)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${
                      on ? 'border-teal bg-cream' : 'border-line bg-paper'
                    }`}
                  >
                    <svg viewBox="0 0 20 20" className={`size-7 shrink-0 ${on ? '' : 'opacity-35 grayscale'}`} aria-hidden="true">
                      <Icon />
                    </svg>
                    <span className={`min-w-0 flex-1 text-[13px] font-medium ${on ? 'text-ink' : 'text-muted line-through'}`}>{label}</span>
                    <span
                      aria-hidden="true"
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        on ? 'bg-teal text-white' : 'border border-line-strong text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {floor.virtual && (
        <p className="m-0 text-[11px] leading-relaxed text-muted">좌석 위치는 실제 배치도이고, 창문·에어컨·조명·콘센트 위치는 가상 데이터예요.</p>
      )}
    </div>
  )
}

/** 좌석 하나: 책상(안쪽) + 의자(바깥쪽). 사용할 수 없으면 회색 */
function Seat({
  g,
  deskFill,
  partition,
  taken,
  rankColor,
  rank,
  focused,
  label,
  shadow,
}: {
  g: Geo
  deskFill: string
  partition: boolean
  taken: boolean
  rankColor: string | null
  rank: number | null
  focused: boolean
  label: string | null
  shadow: string
}) {
  const { x, y, w, h, dir } = g
  const vert = dir[1] !== 0
  const along = vert ? w : h // 책상 폭
  const depth = vert ? h : w // 책상 깊이 + 의자
  const deskD = depth * 0.56
  const chair = Math.min(along * 0.62, depth * 0.42)
  const lw = Math.min(w, h) * 0.05
  // 책상(의자 반대편)
  const desk = vert ? { x, y: dir[1] > 0 ? y : y + h - deskD, w, h: deskD } : { x: dir[0] > 0 ? x : x + w - deskD, y, w: deskD, h }
  // 의자 중심(바깥쪽)
  const ccx = vert ? x + w / 2 : dir[0] > 0 ? x + w - chair / 2 : x + chair / 2
  const ccy = vert ? (dir[1] > 0 ? y + h - chair / 2 : y + chair / 2) : y + h / 2
  // 칸막이: 책상 뒤쪽 + 양옆
  const back = vert ? (dir[1] > 0 ? desk.y : desk.y + desk.h) : dir[0] > 0 ? desk.x : desk.x + desk.w
  const side = deskD * 0.95 // 칸막이 옆판: 책상 깊이 거의 끝까지
  const partPath = vert
    ? `M${x} ${back + dir[1] * side}V${back}H${x + w}V${back + dir[1] * side}`
    : `M${back + dir[0] * side} ${y}H${back}V${y + h}H${back + dir[0] * side}`
  const ring = Math.min(w, h) * 0.1

  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill="transparent" />
      {(focused || rankColor) && (
        <rect
          x={x - ring}
          y={y - ring}
          width={w + 2 * ring}
          height={h + 2 * ring}
          rx={ring * 1.4}
          fill={focused ? 'rgba(46,106,104,.14)' : 'rgba(255,255,255,.55)'}
          stroke={focused ? '#2E6A68' : (rankColor ?? undefined)}
          strokeWidth={lw * (focused ? 2.6 : 1.8)}
        />
      )}
      {/* 의자 + 등받이(바깥쪽) */}
      <rect
        x={ccx - chair / 2}
        y={ccy - chair / 2}
        width={chair}
        height={chair}
        rx={chair * 0.28}
        fill={taken ? '#C4C2BE' : '#93A2B2'}
        stroke={taken ? '#A3A09B' : '#56606C'}
        strokeWidth={lw * 0.6}
      />
      {vert ? (
        <rect
          x={ccx - chair / 2}
          y={dir[1] > 0 ? ccy + chair * 0.28 : ccy - chair * 0.5}
          width={chair}
          height={chair * 0.22}
          rx={chair * 0.1}
          fill={taken ? '#A9A6A1' : '#4A5563'}
        />
      ) : (
        <rect
          x={dir[0] > 0 ? ccx + chair * 0.28 : ccx - chair * 0.5}
          y={ccy - chair / 2}
          width={chair * 0.22}
          height={chair}
          rx={chair * 0.1}
          fill={taken ? '#A9A6A1' : '#4A5563'}
        />
      )}
      {/* 책상 */}
      <rect
        x={desk.x}
        y={desk.y}
        width={desk.w}
        height={desk.h}
        rx={Math.min(desk.w, desk.h) * 0.12}
        fill={taken ? '#D9D7D3' : (rankColor ?? deskFill)}
        stroke={taken ? '#ADAAA5' : rankColor ? '#FFFFFF' : '#7A5A36'}
        strokeWidth={lw * 0.7}
        filter={shadow}
      />
      {partition && (
        <path
          d={partPath}
          fill="none"
          stroke={taken ? '#6F6C67' : '#3B2414'}
          strokeWidth={Math.min(w, h) * 0.16}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {/* 추천 순위: 그 자리 한가운데에(옆자리와 헷갈리지 않게 자기 칸 안에만) */}
      {rank && rankColor && (
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.46} fill={rankColor} stroke="#FFFFFF" strokeWidth={lw * 1.6} />
          <text
            x={x + w / 2}
            y={y + h / 2}
            fontSize={Math.min(w, h) * 0.56}
            fontWeight={800}
            fill="#FFFFFF"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {rank}
          </text>
        </g>
      )}
      {label && !rank && (
        <text
          x={desk.x + desk.w / 2}
          y={desk.y + desk.h / 2}
          fontSize={Math.min(desk.w, desk.h) * 0.48}
          fontWeight={700}
          fill={taken ? '#8F8C87' : '#4A3420'}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
    </>
  )
}

/** 콘센트: 노란 2구 멀티탭(구멍 두 개짜리 소켓 둘) */
function Outlet({ x, y, L, T, vertical, lw }: { x: number; y: number; L: number; T: number; vertical: boolean; lw: number }) {
  const w = vertical ? T : L
  const h = vertical ? L : T
  const sr = T * 0.34 // 소켓 반지름
  const sockets = [-0.24, 0.24].map((f) => (vertical ? [x, y + f * L] : [x + f * L, y]))
  return (
    <g style={{ pointerEvents: 'none' }}>
      <title>콘센트</title>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={T * 0.3} fill="#FFD84D" stroke="#7A4E00" strokeWidth={lw * 0.9} />
      {sockets.map(([sx, sy], i) => (
        <g key={i}>
          <circle cx={sx} cy={sy} r={sr} fill="#FFFBEA" stroke="#7A4E00" strokeWidth={lw * 0.5} />
          {vertical ? (
            <>
              <circle cx={sx} cy={sy - sr * 0.38} r={sr * 0.18} fill="#4A3200" />
              <circle cx={sx} cy={sy + sr * 0.38} r={sr * 0.18} fill="#4A3200" />
            </>
          ) : (
            <>
              <circle cx={sx - sr * 0.38} cy={sy} r={sr * 0.18} fill="#4A3200" />
              <circle cx={sx + sr * 0.38} cy={sy} r={sr * 0.18} fill="#4A3200" />
            </>
          )}
        </g>
      ))}
    </g>
  )
}

/** 창문: 벽 위에 창틀 + 유리 + 창살. 블라인드가 닫혀 있으면 회색 살 */
function Window({ w, t, M, glass }: { w: RoomFloor['windows'][number]; t: number; M: number; glass: string }) {
  const [[ax, ay], [bx, by]] = w.line
  const horiz = Math.abs(by - ay) < Math.abs(bx - ax)
  const len = horiz ? Math.abs(bx - ax) : Math.abs(by - ay)
  const x0 = Math.min(ax, bx)
  const y0 = Math.min(ay, by)
  const r = horiz ? { x: x0, y: ay - t / 2, w: len, h: t } : { x: ax - t / 2, y: y0, w: t, h: len }
  const panes = Math.max(1, Math.round(len / (1.1 * M)))
  const frame = '#56707E'
  const f = t * 0.14
  const cuts = Array.from({ length: panes - 1 }, (_, i) => ((i + 1) * len) / panes)
  const n = Math.max(2, Math.round(len / (t * 0.5)))
  const slats = Array.from({ length: n }, (_, i) => ((i + 0.5) * len) / n)
  return (
    <g>
      <title>{`창문${w.blindClosed ? ' · 블라인드 닫힘' : ''} · ${w.view}`}</title>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={frame} />
      <rect x={r.x + f} y={r.y + f} width={r.w - 2 * f} height={r.h - 2 * f} fill={w.blindClosed ? '#C4C7CA' : glass} />
      {w.blindClosed &&
        slats.map((o) =>
          horiz ? (
            <line key={o} x1={x0 + o} y1={r.y + f} x2={x0 + o} y2={r.y + r.h - f} stroke="#9EA3A8" strokeWidth={f * 0.6} />
          ) : (
            <line key={o} x1={r.x + f} y1={y0 + o} x2={r.x + r.w - f} y2={y0 + o} stroke="#9EA3A8" strokeWidth={f * 0.6} />
          ),
        )}
      {!w.blindClosed &&
        (horiz ? (
          <line x1={r.x + f * 2} y1={r.y + r.h / 2} x2={r.x + r.w - f * 2} y2={r.y + r.h / 2} stroke="#FFFFFF" strokeWidth={f * 0.7} opacity={0.85} />
        ) : (
          <line x1={r.x + r.w / 2} y1={r.y + f * 2} x2={r.x + r.w / 2} y2={r.y + r.h - f * 2} stroke="#FFFFFF" strokeWidth={f * 0.7} opacity={0.85} />
        ))}
      {cuts.map((o) =>
        horiz ? (
          <line key={o} x1={x0 + o} y1={r.y} x2={x0 + o} y2={r.y + r.h} stroke={frame} strokeWidth={f * 1.4} />
        ) : (
          <line key={o} x1={r.x} y1={y0 + o} x2={r.x + r.w} y2={y0 + o} stroke={frame} strokeWidth={f * 1.4} />
        ),
      )}
    </g>
  )
}

/** 에어컨: 벽걸이(긴 몸체+루버), 천장형(네 방향 토출구), 스탠드(세로 몸체+그릴) */
function AirConditioner({
  a,
  M,
  cs,
  lw,
  fill,
  arrow,
  wind,
}: {
  a: RoomFloor['airConditioners'][number]
  M: number
  cs: number
  lw: number
  fill: string
  arrow: string
  wind: boolean
}) {
  const [x, y] = a.point
  const stroke = '#6F7C8A'
  const blue = '#3D8BD0'
  const title = <title>{`에어컨 · ${a.strengthWord}`}</title>
  const windLen = Math.min(a.reachPx * 0.45, Math.max(1.4 * M, cs * 1.8))
  const windProps = { stroke: blue, strokeWidth: lw * 1.3, strokeDasharray: `${lw * 3} ${lw * 2}`, markerEnd: arrow, opacity: 0.85, fill: 'none' }

  if (a.kind === 'ceiling_cassette') {
    const s = Math.max(0.95 * M, cs * 1.05)
    const dirs: Dir[] = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]
    const L = s * 0.62
    const T = s * 0.1
    return (
      <g>
        {title}
        {wind &&
          dirs.map(([dx, dy]) => (
            <line
              key={`w${dx}${dy}`}
              x1={x + dx * s * 0.55}
              y1={y + dy * s * 0.55}
              x2={x + dx * (s * 0.55 + windLen * 0.5)}
              y2={y + dy * (s * 0.55 + windLen * 0.5)}
              {...windProps}
            />
          ))}
        <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * 0.1} fill={fill} stroke={stroke} strokeWidth={lw} />
        {dirs.map(([dx, dy]) => {
          const cx = x + dx * s * 0.34
          const cy = y + dy * s * 0.34
          return dy !== 0 ? (
            <rect key={`s${dx}${dy}`} x={cx - L / 2} y={cy - T / 2} width={L} height={T} rx={T / 2} fill="#7E8C9A" />
          ) : (
            <rect key={`s${dx}${dy}`} x={cx - T / 2} y={cy - L / 2} width={T} height={L} rx={T / 2} fill="#7E8C9A" />
          )
        })}
        <rect
          x={x - s * 0.17}
          y={y - s * 0.17}
          width={s * 0.34}
          height={s * 0.34}
          rx={s * 0.04}
          fill="#E8EDF2"
          stroke="#A5B1BC"
          strokeWidth={lw * 0.6}
        />
        <path d={`M${x - s * 0.17} ${y}H${x + s * 0.17}M${x} ${y - s * 0.17}V${y + s * 0.17}`} stroke="#A5B1BC" strokeWidth={lw * 0.5} />
      </g>
    )
  }

  const [dx, dy] = a.direction ?? [0, 1]
  const ang = Math.atan2(dy, dx)
  const ux = Math.cos(ang) // 바람 방향
  const uy = Math.sin(ang)
  const px = -uy // 기기 길이 방향
  const py = ux
  const at = (ox: number, oy: number, fl: number, fd: number) => `${ox + px * fl + ux * fd} ${oy + py * fl + uy * fd}`

  if (a.kind === 'standing') {
    const W = Math.max(0.55 * M, cs * 0.65)
    const D = W * 0.7
    return (
      <g>
        {title}
        {wind &&
          [-0.25, 0.25].map((o) => (
            <path key={o} d={`M${at(x, y, W * o, D * 1.05)}L${at(x, y, W * o * 2.2, D * 1.05 + windLen * 0.6)}`} {...windProps} />
          ))}
        <path
          d={`M${at(x, y, -W / 2, 0)}L${at(x, y, W / 2, 0)}L${at(x, y, W / 2, D)}L${at(x, y, -W / 2, D)}Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={lw}
          strokeLinejoin="round"
        />
        {[-0.3, -0.1, 0.1, 0.3].map((o) => (
          <path key={o} d={`M${at(x, y, W * o, D * 0.5)}L${at(x, y, W * o, D * 0.92)}`} stroke="#8E9AA6" strokeWidth={lw * 0.7} />
        ))}
        <circle cx={x + ux * D * 0.25} cy={y + uy * D * 0.25} r={W * 0.08} fill={blue} />
      </g>
    )
  }

  // 벽걸이: 벽에 붙은 긴 몸체, 앞쪽 루버에서 바람이 나온다
  const L = Math.max(1.1 * M, cs * 1.4)
  const D = L * 0.3
  return (
    <g>
      {title}
      {wind &&
        [-0.3, 0, 0.3].map((o) => (
          <path
            key={o}
            d={`M${at(x, y, L * o, D * 1.05)}Q${at(x, y, L * o + L * 0.12, D + windLen * 0.35)} ${at(x, y, L * o * 1.6, D + windLen * 0.7)}`}
            {...windProps}
          />
        ))}
      <path
        d={`M${at(x, y, -L / 2, 0)}L${at(x, y, L / 2, 0)}L${at(x, y, L / 2, D)}L${at(x, y, -L / 2, D)}Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={lw}
        strokeLinejoin="round"
      />
      {[0.62, 0.82].map((f) => (
        <path
          key={f}
          d={`M${at(x, y, -L * 0.42, D * f)}L${at(x, y, L * 0.42, D * f)}`}
          stroke="#7E8C9A"
          strokeWidth={lw * 0.8}
          strokeLinecap="round"
        />
      ))}
      <circle cx={x + px * L * 0.38 + ux * D * 0.3} cy={y + py * L * 0.38 + uy * D * 0.3} r={D * 0.1} fill={blue} />
    </g>
  )
}

/** 화장실 방향 화살표 */
function arrowOf([dx, dy]: [number, number]) {
  const k = `${Math.sign(dx)},${Math.sign(dy)}`
  return ({ '1,0': '→', '-1,0': '←', '0,-1': '↑', '0,1': '↓', '1,-1': '↗', '-1,-1': '↖', '1,1': '↘', '-1,1': '↙' } as Record<string, string>)[k] ?? ''
}

/** 화장실 표지: 남녀 그림 + 글자(+ 방향) */
function ToiletSign({
  x: x0,
  y: y0,
  cs,
  vb,
  arrow,
}: {
  x: number
  y: number
  cs: number
  vb: { x: number; y: number; w: number; h: number }
  arrow: string
}) {
  const fs = cs * 0.58
  const text = `화장실${arrow ? ` ${arrow}` : ''}`
  const icon = fs * 2.3
  const w = icon + fs * (text.length * 0.95 + 0.8)
  const h = fs * 2.1
  const x = Math.min(Math.max(x0, vb.x + w / 2 + fs * 0.2), vb.x + vb.w - w / 2 - fs * 0.2)
  const y = Math.min(Math.max(y0, vb.y + h / 2 + fs * 0.2), vb.y + vb.h - h / 2 - fs * 0.2)
  const left = x - w / 2
  // 그림 칸(파랑) 안에 남자·여자
  const fig = (cx: number, woman: boolean, color: string) => {
    const hr = fs * 0.2
    const top = y - h * 0.3
    return (
      <g fill={color}>
        <circle cx={cx} cy={top + hr} r={hr} />
        {woman ? (
          <path d={`M${cx} ${top + hr * 2.4}L${cx + fs * 0.32} ${top + fs * 1.15}H${cx - fs * 0.32}Z`} />
        ) : (
          <rect x={cx - fs * 0.2} y={top + hr * 2.4} width={fs * 0.4} height={fs * 0.62} rx={fs * 0.08} />
        )}
        <rect x={cx - fs * 0.16} y={top + fs * (woman ? 1.1 : 1.0)} width={fs * 0.1} height={fs * 0.4} />
        <rect x={cx + fs * 0.06} y={top + fs * (woman ? 1.1 : 1.0)} width={fs * 0.1} height={fs * 0.4} />
      </g>
    )
  }
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={left} y={y - h / 2} width={w} height={h} rx={fs * 0.4} fill="#FFFFFF" stroke="#2F5D8A" strokeWidth={fs * 0.09} />
      <rect x={left} y={y - h / 2} width={icon} height={h} rx={fs * 0.4} fill="#2F5D8A" />
      {fig(left + icon * 0.3, false, '#FFFFFF')}
      <line
        x1={left + icon * 0.5}
        y1={y - h * 0.32}
        x2={left + icon * 0.5}
        y2={y + h * 0.32}
        stroke="#FFFFFF"
        strokeWidth={fs * 0.06}
        opacity={0.7}
      />
      {fig(left + icon * 0.7, true, '#FFD1DC')}
      <text x={left + icon + (w - icon) / 2} y={y} fontSize={fs} fontWeight={700} fill="#2F5D8A" textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </g>
  )
}

/* ---------- 범례 아이콘 ---------- */
function LegendItem({ icon, label, sub }: { icon: ReactNode; label: string; sub?: string }) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-cream px-2.5 py-2">
      <svg viewBox="0 0 20 20" className="size-7 shrink-0" aria-hidden="true">
        {icon}
      </svg>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {sub && <span className="text-[11px] leading-tight text-muted">{sub}</span>}
      </span>
    </li>
  )
}

function LegendOutlet() {
  return (
    <>
      <rect x="1.5" y="6" width="17" height="8" rx="2.4" fill="#FFD84D" stroke="#7A4E00" strokeWidth="1" />
      <circle cx="6" cy="10" r="2.7" fill="#FFFBEA" stroke="#7A4E00" strokeWidth="0.7" />
      <circle cx="14" cy="10" r="2.7" fill="#FFFBEA" stroke="#7A4E00" strokeWidth="0.7" />
      <circle cx="5" cy="10" r="0.6" fill="#4A3200" />
      <circle cx="7" cy="10" r="0.6" fill="#4A3200" />
      <circle cx="13" cy="10" r="0.6" fill="#4A3200" />
      <circle cx="15" cy="10" r="0.6" fill="#4A3200" />
    </>
  )
}

function LegendLight() {
  return (
    <>
      <circle cx="10" cy="10" r="9" fill="#FFF0B8" opacity="0.8" />
      <rect x="3" y="8.4" width="14" height="3.2" rx="1.2" fill="#FFFDF2" stroke="#D8BE62" strokeWidth="0.9" />
    </>
  )
}

function LegendDoor() {
  return (
    <>
      <path d="M1 18H5M15 18H19" stroke="#3A3029" strokeWidth="2.4" />
      <path d="M5 18V8A10 10 0 0 1 15 18" fill="rgba(122,82,54,.12)" stroke="#7A5236" strokeWidth="1.1" />
      <path d="M5 18V8" stroke="#7A5236" strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

function LegendToilet() {
  return (
    <>
      <rect x="1" y="2" width="18" height="16" rx="3" fill="#2F5D8A" />
      <circle cx="6.5" cy="6" r="1.5" fill="#fff" />
      <rect x="5" y="8.2" width="3" height="4.6" rx="0.8" fill="#fff" />
      <rect x="5.2" y="12.5" width="1" height="3" fill="#fff" />
      <rect x="6.8" y="12.5" width="1" height="3" fill="#fff" />
      <path d="M10 4V16" stroke="#fff" strokeWidth="0.6" opacity="0.7" />
      <circle cx="13.5" cy="6" r="1.5" fill="#FFD1DC" />
      <path d="M13.5 8.2L16 13H11Z" fill="#FFD1DC" />
      <rect x="12.4" y="12.8" width="1" height="2.7" fill="#FFD1DC" />
      <rect x="13.7" y="12.8" width="1" height="2.7" fill="#FFD1DC" />
    </>
  )
}

function LegendSeat({ taken = false, partition = false }: { taken?: boolean; partition?: boolean }) {
  return (
    <>
      <rect x="5.5" y="11" width="9" height="8" rx="2.4" fill={taken ? '#C4C2BE' : '#93A2B2'} />
      <rect
        x="2"
        y="1.5"
        width="16"
        height="9.5"
        rx="1.5"
        fill={taken ? '#D9D7D3' : '#D7B07C'}
        stroke={taken ? '#ADAAA5' : '#7A5A36'}
        strokeWidth="0.8"
      />
      {partition && <path d="M2.6 10V2.6H17.4V10" fill="none" stroke="#3B2414" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />}
    </>
  )
}

function LegendRank() {
  return (
    <>
      <circle cx="10" cy="10" r="8" fill="#2E6A68" />
      <text x="10" y="10.5" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle" dominantBaseline="central">
        1
      </text>
    </>
  )
}

function LegendAc() {
  return (
    <>
      <rect x="1.5" y="2.5" width="17" height="6" rx="1.5" fill="#F4F6F8" stroke="#6F7C8A" strokeWidth="1" />
      <path d="M4 6.5H16" stroke="#7E8C9A" strokeWidth="1" />
      <path d="M6 10.5Q7 14 5.5 17.5M10 10.5V17.5M14 10.5Q13 14 14.5 17.5" fill="none" stroke="#3D8BD0" strokeWidth="1.3" strokeDasharray="2 1.4" />
    </>
  )
}

function LegendWindow() {
  return (
    <>
      <rect x="1" y="6" width="18" height="8" fill="#56707E" />
      <rect x="2.2" y="7.2" width="15.6" height="5.6" fill="#A9D8EE" />
      <path d="M10 6V14" stroke="#56707E" strokeWidth="1.6" />
      <path d="M3.5 10H8.5M11.5 10H16.5" stroke="#fff" strokeWidth="0.8" />
    </>
  )
}
