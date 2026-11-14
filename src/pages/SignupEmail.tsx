import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { login, sendEmailCode, signup, verifyEmailCode } from '../api'
import { CheckIcon } from '../components/icons'
import { ErrorText, Notice, PageHeader, PrimaryButton, Screen, SecondaryButton, TextButton, TextField, TopBar } from '../components/ui'

const CODE_LENGTH = 6
const CODE_SECONDS = 5 * 60

/** 회원가입 2단계: 이메일 인증 → 가입 → 바로 로그인 */
export default function SignupEmail({
  nickname,
  password,
  onBack,
  onDone,
}: {
  nickname: string
  password: string
  onBack: () => void
  onDone: () => void
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  // 남은 시간 타이머
  useEffect(() => {
    if (!sent || seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [sent, seconds])

  const code = digits.join('')
  const expired = sent && seconds <= 0
  const timeText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  async function handleSend() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('이메일 형식을 확인해 주세요.')
      return
    }
    setSending(true)
    setError('')
    try {
      await sendEmailCode(email)
      setSent(true)
      setSeconds(CODE_SECONDS)
      setDigits(Array(CODE_LENGTH).fill(''))
      setTimeout(() => inputs.current[0]?.focus(), 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '코드를 보내지 못했어요.')
    } finally {
      setSending(false)
    }
  }

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = v
      return next
    })
    if (v && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    e.preventDefault()
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? ''))
    inputs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  async function handleSubmit() {
    if (expired) {
      setError('시간이 지났어요. 코드를 다시 받아 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await verifyEmailCode(email, code)
      await signup({ email, code, nickname, password })
      await login(nickname, password)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입에 실패했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen className="px-5 pt-3 pb-6">
      <TopBar onBack={onBack} step={2} total={2} backLabel="닉네임 입력으로 돌아가기" />

      <PageHeader
        className="mt-5"
        eyebrow="회원가입"
        title="이메일로 인증해 주세요"
        description="인증은 처음 가입할 때 한 번만 해요. 로그인할 때는 닉네임과 비밀번호만 써요."
      />

      <div className="mt-6 flex flex-col gap-6">
        <TextField
          id="signup-email"
          label="이메일"
          type="email"
          inputMode="email"
          placeholder="이메일 입력"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          trailing={
            <SecondaryButton onClick={handleSend} loading={sending} className="shrink-0 px-4 text-sm">
              {sent ? '다시 받기' : '인증코드 받기'}
            </SecondaryButton>
          }
          helper={
            sent ? (
              <span className="inline-flex items-center gap-1.5 text-teal">
                <CheckIcon className="size-3.5" />
                인증코드를 보냈어요. 메일함을 확인해 주세요.
              </span>
            ) : undefined
          }
        />

        {sent && (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 flex w-full items-center justify-between p-0 text-[13px] font-medium text-ink-2">
              <span>인증코드 6자리</span>
              <span className={`tabular-nums ${expired ? 'text-danger' : 'text-muted'}`}>{expired ? '시간 초과' : timeText}</span>
            </legend>
            <div className="grid grid-cols-6 gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={d}
                  aria-label={`인증코드 ${i + 1}번째 자리`}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  className={`h-14 min-w-0 rounded-xl border text-center text-[22px] font-bold text-teal-deep tabular-nums transition-[border-color,box-shadow] outline-none focus:border-teal focus:ring-3 focus:ring-teal/15 ${
                    d ? 'border-teal bg-white' : 'border-line-strong bg-cream'
                  }`}
                />
              ))}
            </div>
          </fieldset>
        )}
        <ErrorText>{error}</ErrorText>
      </div>

      {sent && (
        <Notice className="mt-6 flex items-center justify-between gap-3">
          <span>메일이 오지 않으면 스팸함을 확인해 주세요.</span>
          <TextButton onClick={handleSend} disabled={sending} className="shrink-0 font-bold">
            다시 받기
          </TextButton>
        </Notice>
      )}

      <div className="min-h-6 flex-1" />
      <PrimaryButton onClick={handleSubmit} disabled={!sent || code.length < CODE_LENGTH} loading={submitting} className="w-full">
        인증하고 가입하기
      </PrimaryButton>
    </Screen>
  )
}