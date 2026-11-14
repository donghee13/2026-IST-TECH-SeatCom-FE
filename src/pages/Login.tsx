import { useState, type FormEvent } from 'react'
import { login } from '../api'
import { BookIcon } from '../components/icons'
import { BookShelf, ErrorText, PrimaryButton, Screen, TextField } from '../components/ui'

export default function Login({ onLoggedIn, onSignup }: { onLoggedIn: () => void; onSignup: () => void }) {
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nickname.trim() || !password) {
      setError('닉네임과 비밀번호를 입력해 주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(nickname.trim(), password)
      onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <div className="flex flex-col gap-3.5 px-7 pt-16">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-teal text-white">
            <BookIcon className="size-7" />
          </div>
          <h1 className="m-0 font-serif text-[38px] font-bold tracking-tight text-teal-deep">SeatCom</h1>
        </div>
        <p className="m-0 text-[15px] leading-relaxed text-muted">
          오늘 나에게 맞는 열람실 자리를
          <br />
          골라드려요. 테스트
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-7 mt-9 flex flex-col gap-3.5">
        <TextField
          id="login-nickname"
          label="닉네임"
          placeholder="닉네임 입력"
          autoComplete="username"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <TextField
          id="login-password"
          label="비밀번호"
          type="password"
          placeholder="비밀번호 입력"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton type="submit" disabled={loading} className="mt-2">
          {loading ? '로그인 중…' : '로그인'}
        </PrimaryButton>
        <p className="m-0 mt-1 text-center text-sm text-muted">
          아직 회원증이 없나요?{' '}
          <button type="button" onClick={onSignup} className="font-bold text-wood underline underline-offset-2">
            회원가입
          </button>
        </p>
      </form>

      <div className="min-h-8 flex-1" />
      <BookShelf />
    </Screen>
  )
}