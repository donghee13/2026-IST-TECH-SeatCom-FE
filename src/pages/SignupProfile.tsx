import { useState, type FormEvent } from 'react'
import { ErrorText, LibraryCard, PrimaryButton, Screen, Sub, Tag, TextField, Title, TopBar } from '../components/ui'

/** 회원가입 1단계: 닉네임 + 비밀번호 입력 (가입은 2단계 이메일 인증 후에 함) */
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
    setError('')
    onNext(nickname.trim(), password)
  }

  return (
    <Screen className="px-6 pt-4 pb-7">
      <TopBar onBack={onBack} step={1} total={2} tone="wood" backLabel="로그인으로 돌아가기" />

      <div className="mt-[18px] flex flex-col gap-2">
        <Tag>MEMBERSHIP · 회원증 발급</Tag>
        <Title>회원증을 만들어요</Title>
        <Sub>로그인할 때 쓸 닉네임과 비밀번호를 정해 주세요.</Sub>
      </div>

      <div className="mt-[18px]">
        <LibraryCard name={nickname.trim() || '[닉네임]'} sub="이메일 인증 전" />
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
      <PrimaryButton type="submit" form="signup-form">
        다음
      </PrimaryButton>
    </Screen>
  )
}