import { useEffect, useState, type FormEvent } from 'react'
import { resetPassword, sendEmailCode } from '../api'
import { CheckIcon } from '../components/icons'
import { Card, ErrorText, Notice, PageHeader, PasswordField, PrimaryButton, Screen, SecondaryButton, TextField, TopBar } from '../components/ui'

const CODE_SECONDS = 5 * 60
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 닉네임·비밀번호 찾기: 가입한 이메일로 코드 확인 → 새 비밀번호 → 닉네임 알려 주고 바로 로그인 */
export default function PasswordReset({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)

  useEffect(() => {
    if (!sent || seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [sent, seconds])

  const expired = sent && seconds <= 0
  const timeText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  async function handleSend() {
    if (!EMAIL_RE.test(email.trim())) return setError('이메일 형식을 확인해 주세요.')
    setSending(true)
    setError('')
    try {
      await sendEmailCode(email.trim(), 'reset')
      setSent(true)
      setSeconds(CODE_SECONDS)
      setCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '코드를 보내지 못했어요.')
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!sent) return setError('먼저 인증 코드를 받아 주세요.')
    if (expired) return setError('인증 코드 시간이 지났어요. 코드를 다시 받아 주세요.')
    if (!/^\d{6}$/.test(code)) return setError('인증 코드 6자리를 입력해 주세요.')
    if (password.length < 6) return setError('새 비밀번호는 6자 이상으로 입력해 주세요.')
    if (password !== password2) return setError('새 비밀번호가 서로 달라요.')
    setSaving(true)
    setError('')
    try {
      setNickname(await resetPassword({ email: email.trim(), code, password }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호를 바꾸지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  if (nickname) {
    return (
      <Screen className="px-5 pt-16 pb-6">
        <div className="flex flex-col gap-5">
          <span className="flex size-12 items-center justify-center rounded-full bg-teal text-white">
            <CheckIcon className="size-6" />
          </span>
          <PageHeader eyebrow="비밀번호 찾기" title="새 비밀번호로 바꿨어요" description="다음부터는 아래 닉네임과 새 비밀번호로 로그인해 주세요." />
          <Card className="flex flex-col gap-1 p-5">
            <span className="text-[13px] text-muted">내 닉네임</span>
            <span className="font-serif text-[22px] font-bold text-teal-deep">{nickname}</span>
          </Card>
          <Notice>다른 기기에서 로그인해 둔 곳은 모두 로그아웃됐어요.</Notice>
        </div>
        <div className="min-h-6 flex-1" />
        <PrimaryButton onClick={onDone} className="w-full">
          시작하기
        </PrimaryButton>
      </Screen>
    )
  }

  return (
    <Screen className="px-5 pt-3 pb-6">
      <TopBar onBack={onBack} backLabel="로그인으로 돌아가기" />
      <PageHeader
        className="mt-5"
        eyebrow="닉네임·비밀번호 찾기"
        title="가입한 이메일로 확인할게요"
        description="인증 코드를 확인하면 새 비밀번호를 정하고, 닉네임도 알려 드려요."
      />

      <form id="reset-form" onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <TextField
          id="reset-email"
          label="가입한 이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setSent(false)
          }}
          trailing={
            <SecondaryButton onClick={() => void handleSend()} loading={sending} className="shrink-0 px-4 text-sm">
              {sent ? '다시 받기' : '코드 받기'}
            </SecondaryButton>
          }
          helper={sent ? (expired ? '코드 시간이 지났어요. 다시 받아 주세요.' : `메일을 보냈어요. ${timeText} 안에 입력해 주세요.`) : undefined}
        />
        {sent && (
          <>
            <TextField
              id="reset-code"
              label="인증 코드 6자리"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="tracking-[0.3em]"
            />
            <PasswordField
              id="reset-password"
              label="새 비밀번호"
              placeholder="6자 이상"
              autoComplete="new-password"
              value={password}
              onValue={setPassword}
            />
            <PasswordField
              id="reset-password2"
              label="새 비밀번호 확인"
              placeholder="한 번 더 입력"
              autoComplete="new-password"
              value={password2}
              onValue={setPassword2}
            />
          </>
        )}
        <ErrorText>{error}</ErrorText>
      </form>

      <div className="min-h-6 flex-1" />
      <PrimaryButton type="submit" form="reset-form" loading={saving} disabled={!sent} className="w-full">
        비밀번호 바꾸기
      </PrimaryButton>
    </Screen>
  )
}
