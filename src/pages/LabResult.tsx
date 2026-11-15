import { useEffect, useRef, useState } from 'react'
import { getLabAnalysis } from '../api'
import { LAB_FEATURE_LABEL, LAB_VALUE_LABEL } from '../data/options'
import type { LabAnalysis, LabPreference } from '../types'
import { Card, ErrorScreen, ErrorText, LoadingScreen, Notice, PageHeader, PrimaryButton, Screen, SecondaryButton } from '../components/ui'

/** 실험실: 카톡 대화 분석 결과 (설문 결과와 따로 보여줌) */
export default function LabResult({ analysisId, onDone, onReset }: { analysisId: string; onDone: () => void; onReset: () => Promise<void> }) {
  const [data, setData] = useState<LabAnalysis | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const resetPending = useRef(false)

  async function resetAnalysis() {
    if (resetPending.current) return
    resetPending.current = true
    setResetting(true)
    setResetError('')
    try {
      await onReset()
    } catch (e) {
      setResetError(e instanceof Error ? e.message : '초기화하지 못했어요. 다시 시도해 주세요.')
    } finally {
      resetPending.current = false
      setResetting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setError('')
    getLabAnalysis(analysisId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '결과를 불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [analysisId, retry])

  if (!data) {
    return error ? (
      <ErrorScreen message={error} onRetry={() => setRetry((n) => n + 1)} secondaryLabel="메인으로" onSecondary={onDone} />
    ) : (
      <LoadingScreen label="결과를 불러오는 중…" />
    )
  }

  const a = data.analysis
  const prefs: [string, LabPreference][] = Object.entries(a.preferences ?? {})
  const known = prefs.filter(([, p]) => p.preference !== 'unknown')
  const unknown = prefs.filter(([, p]) => p.preference === 'unknown')

  return (
    <Screen className="px-5 pt-10 pb-6">
      <PageHeader eyebrow="실험실 · 카톡 대화 분석" title="카톡 대화에서 이런 점을 찾았어요" description={a.behavioral_summary} />

      {a.seat_recommendation && (
        <Notice className="mt-6 text-[15px]">
          <p className="m-0 mb-1 text-xs font-bold">추천하는 자리</p>
          {a.seat_recommendation}
        </Notice>
      )}

      {known.length > 0 && (
        <Card className="mt-4 px-4">
          <h2 className="m-0 pt-4 pb-1 text-[15px] font-bold">찾아낸 취향</h2>
          <ul className="m-0 list-none divide-y divide-line p-0">
            {known.map(([key, p]) => {
              const pct = Math.round(Math.max(0, Math.min(1, p.confidence)) * 100)
              return (
                <li key={key} className="flex flex-col gap-2 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-muted">{LAB_FEATURE_LABEL[key] ?? key}</span>
                    <span className="text-[15px] font-bold">{LAB_VALUE_LABEL[p.preference] ?? p.preference}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                      role="meter"
                      aria-label={`${LAB_FEATURE_LABEL[key] ?? key} 확신도`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-14 text-right text-xs text-muted tabular-nums">확신 {pct}%</span>
                  </div>
                  {p.reason && <p className="m-0 text-[13px] leading-relaxed text-ink-2">{p.reason}</p>}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {unknown.length > 0 && (
        <p className="m-0 mt-3 text-[13px] leading-relaxed text-muted">
          근거가 부족해 판단하지 못한 항목: {unknown.map(([k]) => LAB_FEATURE_LABEL[k] ?? k).join(', ')}
        </p>
      )}
      {a.follow_up_question && (
        <Notice tone="caution" className="mt-3">
          더 알고 싶은 점: {a.follow_up_question}
        </Notice>
      )}
      <p className="m-0 mt-4 text-xs leading-relaxed text-muted">AI가 대화로 추정한 결과예요. 설문 답변은 바뀌지 않고, 자리 추천에 참고로만 써요.</p>

      <div className="min-h-6 flex-1" />
      {resetError && <ErrorText>{resetError}</ErrorText>}
      <p className="m-0 mb-3 text-center text-xs leading-relaxed text-muted">초기화하면 현재 카톡 분석 결과를 삭제하고 TXT 업로드부터 다시 시작해요. 설문 답변은 유지돼요.</p>
      <SecondaryButton onClick={() => void resetAnalysis()} loading={resetting} className="mb-3 w-full">
        {resetting ? '초기화 중…' : '분석 초기화'}
      </SecondaryButton>
      <PrimaryButton onClick={onDone} disabled={resetting} className="w-full">
        메인으로
      </PrimaryButton>
    </Screen>
  )
}
