import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ApiError, uploadLabFile } from '../api'
import type { LabSession, LabStatus } from '../types'
import { CheckIcon } from '../components/icons'
import LabHeader from '../components/LabHeader'
import { Card, ErrorText, Notice, PageHeader, PrimaryButton, Screen } from '../components/ui'

const DEFAULT_MAX = 5_000_000

function sizeText(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1000))}KB`
}

/** 2단계: 내보낸 .txt 파일을 고르면 바로 올린다. 파일은 브라우저 저장소에도, 서버 디스크에도 남기지 않는다. */
export default function LabUpload({
  session,
  onBack,
  onLater,
  onRenew,
  onAlreadyUsed,
  onUploaded,
}: {
  session: LabSession
  onBack: () => void
  onLater: () => void
  onRenew: () => Promise<LabSession> // 업로드 시간이 지난 세션을 같은 이름으로 새로 만든다
  onAlreadyUsed: () => void // 이미 파일을 받은 세션이면 진행 상태 화면으로
  onUploaded: (s: LabStatus, session: LabSession) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const max = session.max_bytes ?? DEFAULT_MAX

  function pick(f: File | undefined | null) {
    setError('')
    setFile(null)
    if (!f) return
    if (!/\.txt$/i.test(f.name)) return setError('카톡에서 내보낸 .txt 파일만 올릴 수 있어요.')
    if (f.size === 0) return setError('빈 파일이에요.')
    if (f.size > max) return setError(`파일이 너무 커요(${sizeText(f.size)}). ${sizeText(max)} 이하만 올릴 수 있어요.`)
    setFile(f)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    pick(e.target.files?.[0])
    e.target.value = '' // 같은 파일을 다시 고를 수 있게, 그리고 입력에 파일 참조를 남기지 않게
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files?.[0])
  }

  async function submit() {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      let target = session
      let status: LabStatus
      try {
        status = await uploadLabFile(target.upload_id, file)
      } catch (err) {
        if (err instanceof ApiError && err.code === 'UPLOAD_ALREADY_USED') return onAlreadyUsed()
        // 업로드 시간이 지났거나 세션이 없어졌으면: 새 세션을 만들어 같은 파일로 한 번 더
        if (!(err instanceof ApiError) || !['UPLOAD_EXPIRED', 'NOT_FOUND'].includes(err.code)) throw err
        target = await onRenew()
        status = await uploadLabFile(target.upload_id, file)
      }
      setFile(null)
      onUploaded(status, target)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 올리지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen className="px-5 pt-3 pb-6">
      <LabHeader step={2} onBack={onBack} onLater={onLater} />

      <PageHeader
        className="mt-5"
        eyebrow="파일 올리기"
        title="내보낸 대화 파일을 올려 주세요"
        description={`대화방에 보이는 이름 '${session.target_name}'의 메시지를 분석해요.`}
      />

      <Card className="mt-6 p-0">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${
            dragging ? 'border-teal bg-teal-tint' : file ? 'border-teal/60' : 'border-line-strong hover:border-label'
          }`}
        >
          {file ? (
            <>
              <span className="flex size-10 items-center justify-center rounded-full bg-teal text-white">
                <CheckIcon className="size-5" strokeWidth={3} />
              </span>
              <span className="text-[15px] font-bold break-all text-teal-deep">{file.name}</span>
              <span className="text-xs text-muted">{sizeText(file.size)} · 다른 파일을 고르려면 누르세요</span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-bold text-teal-deep">.txt 파일 고르기</span>
              <span className="text-xs text-muted">휴대폰은 '파일'·'내 파일'에 저장한 파일을 고르면 돼요 · 최대 {sizeText(max)}</span>
            </>
          )}
        </button>
        <input ref={input} type="file" accept=".txt,text/plain" className="hidden" onChange={onChange} />
      </Card>

      <Notice className="mt-4">
        <p className="m-0 font-bold">대화 파일은 저장하지 않아요</p>
        <ul className="m-0 mt-1 pl-4">
          <li>서버는 파일을 디스크에 쓰지 않고 메모리에서만 분석한 뒤 바로 버려요. 분석 결과만 남아요.</li>
          <li>AI 서버로 보낼 때 참여자 이름은 가명으로 바꾸고, 이메일·링크·전화번호 같은 긴 숫자는 가려요.</li>
          <li>올린 뒤에는 휴대폰에 저장한 .txt 파일도 지워 주세요.</li>
        </ul>
      </Notice>

      <div className="mt-3">
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="min-h-6 flex-1" />
      <PrimaryButton className="w-full" disabled={!file} loading={loading} onClick={() => void submit()}>
        올리고 분석 시작
      </PrimaryButton>
    </Screen>
  )
}
