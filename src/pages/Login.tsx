import { useState, type FormEvent } from 'react'
import { login } from '../api'
import { BookIcon } from '../components/icons'
import { BookShelf, ErrorText, PasswordField, PrimaryButton, Screen, TextButton, TextField } from '../components/ui'

export default function Login({ onLoggedIn, onSignup, onForgot }: { onLoggedIn: () => void; onSignup: () => void; onForgot: () => void }) {
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
      <div className="flex flex-col gap-4 px-6 pt-16">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-teal text-white">
            <BookIcon className="size-6" />
          </div>
          <h1 className="m-0 font-serif text-[32px] font-bold tracking-[-0.02em] text-teal-deep">SeatCom</h1>
        </div>
        <p className="m-0 text-[15px] leading-relaxed text-muted">
          STadium 도서관 열람실에서
          <br />
          나에게 맞는 자리를 골라드려요.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-10 flex flex-col gap-4 px-6">
        <TextField
          id="login-nickname"
          label="닉네임"
          placeholder="닉네임 입력"
          autoComplete="username"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <PasswordField
          id="login-password"
          label="비밀번호"
          placeholder="비밀번호 입력"
          autoComplete="current-password"
          value={password}
          onValue={setPassword}
        />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton type="submit" loading={loading} className="mt-2 w-full">
          로그인
        </PrimaryButton>
        <div className="flex flex-col">
          <p className="m-0 flex items-center justify-center gap-1 text-sm text-muted">
            닉네임이나 비밀번호를 잊었나요?
            <TextButton onClick={onForgot} className="font-bold">
              찾기
            </TextButton>
          </p>
          <p className="m-0 flex items-center justify-center gap-1 text-sm text-muted">
            아직 회원증이 없나요?
            <TextButton onClick={onSignup} className="font-bold">
              회원가입
            </TextButton>
          </p>
        </div>
      </form>

      <div className="min-h-10 flex-1" />
      <div className="lg:hidden">
        <BookShelf scale={0.9} />
      </div>
    </Screen>
  )
}
