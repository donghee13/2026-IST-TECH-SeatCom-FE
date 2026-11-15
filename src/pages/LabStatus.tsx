import { useEffect, useRef, useState } from 'react'
import { getLabStatus } from '../api'
import type { LabSession, LabStatus as Status, LabStatusValue } from '../types'
import { CheckIcon } from '../components/icons'
import LabHeader from '../components/LabHeader'
import { Card, ErrorText, Notice, PrimaryButton, Screen, SecondaryButton, Spinner, TextButton } from '../components/ui'

const AUTO_LIMIT_MS = 10 * 60 * 1000 // 자동 확인은 10분까지 (긴 대화는 분석이 몇 분 걸림)
const TERMINAL: LabStatusValue[] = ['completed', 'failed', 'expired', 'cancelled']
const STAGES = ['파일 받기', 'AI 분석', '완료']

const STAGE_INDEX: Partial<Record<LabStatusValue, number>> = {
  waiting_upload: 0,
  analyzing: 1,
  completed: 2,
}

const TITLE: Record<LabStatusValue, string> = {
  waiting_upload: '아직 파일을 받지 못했어요',
  analyzing: 'AI가 대화를 분석하고 있어요',
  completed: '분석이 끝났어요',
  failed: '처리 중 문제가 생겼어요',
  expired: '업로드 시간이 지났어요',
  cancelled: '분석을 취소했어요',
}

/** 3단계: 5초마다 상태 확인 (최대 10분, 이후 수동 확인) */
export default function LabStatus({
  session,
  onBack,
  onLater,
  onReupload,
  onStatus,
  onCompleted,
  onRestart,
  onCancel,
}: {
  session: LabSession
  onBack: () => void
  onLater: () => void
  onReupload: () => void // 파일 올리기 화면으로
  onStatus: (s: Status) => void // 진행 상태 저장용
  onCompleted: (analysisId: string) => void
  onRestart: () => Promise<void> // 같은 이름으로 새 세션을 만들어 파일 올리기부터
  onCancel: () => void // 세션 지우고 메인으로
}) {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState('')
  const [runId, setRunId] = useState(0) // 바뀌면 자동 확인을 다시 시작
  const [autoStopped, setAutoStopped] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const startedAt = useRef(Date.now())
  const onStatusRef = useRef(onStatus)
  onStatusRef.current = onStatus

  const intervalMs = Math.max(2, session.poll_interval_seconds ?? 5) * 1000

  // 상태 확인 반복: 요청이 끝나고 5초 뒤에 다음 요청 (중복 요청 없음)
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    startedAt.current = Date.now()
    setAutoStopped(false)

    async function tick() {
      if (cancelled) return
      if (document.hidden) {
        timer = setTimeout(tick, 1000) // 탭을 보고 있지 않으면 기다림
        return
      }
      try {
        const s = await getLabStatus(session.upload_id)
        if (cancelled) return
        setStatus(s)
        setError('')
        onStatusRef.current(s)
        if (TERMINAL.includes(s.status)) return
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : '상태를 확인하지 못했어요.')
      }
      if (Date.now() - startedAt.current >= AUTO_LIMIT_MS) {
        setAutoStopped(true)
        return
      }
      timer = setTimeout(tick, intervalMs)
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [session.upload_id, runId, intervalMs])

  // 경과 시간 표시용
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // 분석이 끝나면 결과 화면으로
  useEffect(() => {
    if (status?.status === 'completed' && status.analysis.analysis_id) onCompleted(status.analysis.analysis_id)
  }, [status, onCompleted])

  const value: LabStatusValue = status?.status ?? session.status ?? 'analyzing'
  const stage = STAGE_INDEX[value]
  const failed = value === 'failed' || value === 'expired' || value === 'cancelled'
  const polling = !autoStopped && !TERMINAL.includes(value)
  // 화면을 나갔다 와도 0부터 다시 세지 않게, 서버가 분석을 시작한 시각부터 잰다
  const serverStart = status?.analysis.started_at ? Date.parse(status.analysis.started_at) : NaN
  const elapsed = Math.max(0, Number.isFinite(serverStart) ? now - serverStart : Math.min(AUTO_LIMIT_MS, now - startedAt.current))
  const elapsedText = `${Math.floor(elapsed / 60000)}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')}`

  return (
    <Screen className="px-5 pt-3 pb-6">
      <LabHeader step={3} onBack={onBack} onLater={onLater} />

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <div
          aria-hidden="true"
          className={`flex size-16 items-center justify-center rounded-full ${failed ? 'bg-wood-tint text-wood' : 'bg-teal-tint text-teal'}`}
        >
          {value === 'completed' ? (
            <CheckIcon className="size-8" />
          ) : failed ? (
            <span className="text-2xl font-bold">!</span>
          ) : (
            <Spinner className="size-8" />
          )}
        </div>
        <h1 className="m-0 mt-2 font-serif text-[22px] leading-[1.4] font-bold text-balance text-teal-deep">{TITLE[value]}</h1>
        <p role="status" className="m-0 text-sm leading-relaxed text-muted">
          {status?.error?.message ?? status?.message ?? '분석 상태를 확인하고 있어요.'}
        </p>
        {polling && (
          <p className="m-0 flex items-center gap-1.5 text-xs text-muted tabular-nums">
            <Spinner className="size-3" />
            {Number.isFinite(serverStart) ? `분석 시작 후 ${elapsedText} · 자동으로 확인 중` : `자동으로 확인 중 ${elapsedText} / 10:00`}
          </p>
        )}
      </div>

      {stage !== undefined && (
        <Card className="mt-8 px-4 py-2">
          <ol className="m-0 list-none p-0">
            {STAGES.map((label, i) => {
              const done = i < stage || value === 'completed'
              const current = i === stage && value !== 'completed'
              return (
                <li key={label} className="flex items-center gap-3 py-2.5">
                  {done ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-teal text-white">
                      <CheckIcon className="size-3.5" strokeWidth={3} />
                    </span>
                  ) : current ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-teal-tint text-teal">
                      <Spinner className="size-3.5" />
                    </span>
                  ) : (
                    <span className="size-6 rounded-full border border-line-strong" />
                  )}
                  <span className={`text-[15px] ${current ? 'font-bold text-teal-deep' : done ? 'text-ink-2' : 'text-muted'}`}>{label}</span>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {value === 'analyzing' && (
        <Notice className="mt-4">대화 파일은 서버에 저장하지 않고 메모리에서만 분석해요. 이 화면을 닫아도 분석은 계속돼요.</Notice>
      )}

      {value === 'failed' && status?.error?.code === 'UPLOAD_LOST' && (
        <Notice tone="caution" className="mt-4">
          서버가 다시 시작되면서 분석 중이던 대화가 지워졌어요(파일을 저장하지 않기 때문이에요). 처음부터 다시 올려 주세요.
        </Notice>
      )}

      <div className="mt-3">
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="min-h-6 flex-1" />
      {value === 'failed' || value === 'expired' || value === 'cancelled' ? (
        <PrimaryButton
          onClick={async () => {
            setRestarting(true)
            setError('')
            try { await onRestart() }
            catch (e) { setError(e instanceof Error ? e.message : '다시 시작하지 못했어요. 잠시 후 다시 시도해 주세요.') }
            finally { setRestarting(false) }
          }}
          loading={restarting}
          className="w-full"
        >
          파일 다시 올리기
        </PrimaryButton>
      ) : (
        <div className="flex gap-2">
          {value === 'waiting_upload' && (
            <SecondaryButton className="flex-1" onClick={onReupload}>
              파일 올리기
            </SecondaryButton>
          )}
          <PrimaryButton className="flex-[1.4]" disabled={polling && !error} onClick={() => setRunId((n) => n + 1)}>
            {polling && !error ? '확인하는 중' : '다시 확인'}
          </PrimaryButton>
        </div>
      )}
      <TextButton tone="muted" onClick={onCancel} className="mt-1 self-center text-[13px]">
        카톡 분석 취소하기
      </TextButton>
    </Screen>
  )
}
