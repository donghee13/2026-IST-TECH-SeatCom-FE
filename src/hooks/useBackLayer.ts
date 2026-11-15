import { useEffect, useLayoutEffect, useRef } from 'react'

/*
 * 화면 위에 겹쳐 뜨는 것(좌석 정보 창, 자세히 보기, 별로예요 창 등)을 휴대폰·브라우저 뒤로 가기로 닫는다.
 * 열릴 때 같은 주소로 기록을 하나 쌓고, 뒤로 가기가 오면 맨 위 것 하나만 닫는다.
 * 화면 안 버튼으로 닫으면 쌓아 둔 기록을 되돌린다(이때 오는 popstate는 무시).
 */
type Layer = { id: number; close: () => void }
const stack: Layer[] = []
let seq = 0
let ignorePops = 0

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--
      return
    }
    stack.pop()?.close()
  })
}

export function useBackLayer(open: boolean, close: () => void) {
  const closeRef = useRef(close)
  useLayoutEffect(() => {
    closeRef.current = close
  })
  const mine = useRef<Layer | null>(null)

  useEffect(() => {
    if (!open) return
    const layer: Layer = {
      id: ++seq,
      close: () => {
        mine.current = null
        closeRef.current()
      },
    }
    mine.current = layer
    stack.push(layer)
    const st = (window.history.state ?? {}) as { i?: number }
    window.history.pushState({ ...st, i: (st.i ?? 0) + 1, layer: layer.id }, '', window.location.href)
    return () => {
      // 버튼으로 닫았거나 화면을 떠남: 아직 쌓여 있으면 빼고, 이 창의 기록이 맨 위면 되돌린다
      if (mine.current !== layer) return
      mine.current = null
      const at = stack.indexOf(layer)
      if (at >= 0) stack.splice(at, 1)
      // 같은 순간에 다른 창이 열리거나 화면이 바뀌었을 수 있어 한 박자 뒤에 확인한다
      setTimeout(() => {
        if ((window.history.state as { layer?: number } | null)?.layer === layer.id) {
          ignorePops++
          window.history.back()
        }
      }, 0)
    }
  }, [open])
}
