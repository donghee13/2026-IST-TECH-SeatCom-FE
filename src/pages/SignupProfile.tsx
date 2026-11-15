import { useState, type FormEvent } from 'react'
import { ErrorText, LibraryCard, PageHeader, PasswordField, PrimaryButton, Screen, TextField, TopBar } from '../components/ui'

/** 회원가입 1단계: 닉네임 + 비밀번호 (가입은 2단계 이메일 인증 뒤에 함) */
export default function SignupProfile({
  initialNickname = '',
  onBack,
  onNext,
}: {
  initialNickname?: string
  onBack: () => void
  onNext: (nickname: string, password: string) => void
}) {
  const [nickname, setNickname] = useState(initialNickname)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nickname.trim() || !password) {
      setError('닉네임과 비밀번호를 입력해 주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상으로 입력해 주세요.')
      return
    }
    setError('')
    onNext(nickname.trim(), password)
  }

  return (
    <Screen className="px-5 pt-3 pb-6">
      <TopBar onBack={onBack} step={1} total={2} backLabel="로그인으로 돌아가기" />

      <PageHeader className="mt-5" eyebrow="회원가입" title="회원증을 만들어요" description="로그인할 때 쓸 닉네임과 비밀번호를 정해 주세요." />

      <div className="mt-6">
        <LibraryCard name={nickname.trim() || '닉네임'} sub="이메일 인증 전" />
      </div>

      <form id="signup-form" onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <TextField
          id="signup-nickname"
          label="닉네임"
          placeholder="다른 사람과 겹치지 않는 이름"
          autoComplete="username"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          helper="로그인할 때 이 닉네임을 써요."
        />
        <PasswordField
          id="signup-password"
          label="비밀번호"
          placeholder="6자 이상"
          autoComplete="new-password"
          value={password}
          onValue={setPassword}
          helper="방금 친 글자는 잠깐 그대로 보여 드려요."
        />
        <ErrorText>{error}</ErrorText>
      </form>

      <div className="min-h-6 flex-1" />
      <PrimaryButton type="submit" form="signup-form" className="w-full">
        다음
      </PrimaryButton>
    </Screen>
  )
}
