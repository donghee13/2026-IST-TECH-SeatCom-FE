import { useState, type FormEvent } from 'react'
import { login, signup } from '../api'
import { CheckIcon } from '../components/icons'
import { ErrorText, LibraryCard, PrimaryButton, Screen, Tag, TextField, Title, TopBar } from '../components/ui'

export default function SignupProfile({
  email,
  code,
  onBack,
  onDone,
}: {
  email: string
  code: string
  onBack: () => void
  onDone: () => void
}) {
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
      await signup({ email, code, nickname: nickname.trim(), password })
      await login(nickname.trim(), password) // 가입 후 바로 로그인
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen className="px-6 pt-4 pb-7">
      <TopBar onBack={onBack} step={2} total={2} tone="wood" backLabel="이메일 인증으로 돌아가기" />

      <div className="mt-[18px] flex flex-col gap-2">
        <Tag>MEMBERSHIP · 회원증 발급</Tag>
        <Title>회원증을 만들어요</Title>
      </div>

      <div className="mt-[18px]">
        <LibraryCard name={nickname.trim() || '[닉네임]'} sub={email} />
      </div>

      <div className="mt-3.5 flex items-center gap-1.5 self-start rounded-2xl bg-teal-tint px-3 py-1.5 text-[13px] font-medium text-teal-deep">
        <CheckIcon className="size-3.5" />
        이메일 인증 완료
      </div>

      <form id="signup-form" onSubmit={handleSubmit} className="mt-[22px] flex flex-col gap-4">
        <TextField
          id="signup-nickname"
          label="닉네임"
          placeholder="다른 사람과 겹치지 않는 이름"
          autoComplete="username"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          helper="로그인할 때 이 닉네임을 써요."
        />
        <TextField
          id="signup-password"
          label="비밀번호"
          type="password"
          placeholder="비밀번호 입력"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorText>{error}</ErrorText>
      </form>

      <div className="min-h-6 flex-1" />
      <PrimaryButton type="submit" form="signup-form" disabled={loading}>
        {loading ? '가입하는 중…' : '가입하기'}
      </PrimaryButton>
    </Screen>
  )
}