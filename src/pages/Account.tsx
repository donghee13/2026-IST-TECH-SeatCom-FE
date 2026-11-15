import { useEffect, useState, type FormEvent } from 'react'
import { deleteAccount, getMe, type Me } from '../api'
import { Card, ErrorText, Notice, PageHeader, PasswordField, PrimaryButton, Screen, SecondaryButton, Spinner, TopBar } from '../components/ui'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

/** 내 계정: 계정 정보, 로그아웃, 회원 탈퇴 */
export default function Account({ onBack, onLogout, onDeleted }: { onBack: () => void; onLogout: () => void; onDeleted: () => void }) {
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [delError, setDelError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((m) => !cancelled && setMe(m))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '계정 정보를 불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [])

  async function handleDelete(e: FormEvent) {
    e.preventDefault()
    if (!password) return setDelError('비밀번호를 입력해 주세요.')
    if (!agree) return setDelError('안내를 확인하고 체크해 주세요.')
    setDeleting(true)
    setDelError('')
    try {
      await deleteAccount(password)
      onDeleted()
    } catch (err) {
      setDelError(err instanceof Error ? err.message : '탈퇴하지 못했어요.')
      setDeleting(false)
    }
  }

  return (
    <Screen className="gap-5 px-5 pt-3 pb-8">
      <div className="lg:hidden">
        <TopBar onBack={onBack} backLabel="메인으로 돌아가기" />
      </div>
      <PageHeader eyebrow="내 계정" title="회원증 관리" />
      {error && <ErrorText>{error}</ErrorText>}
      {!me && !error && <Spinner className="size-6 text-teal" />}

      {me && (
        <Card className="flex flex-col gap-3 p-5">
          <dl className="m-0 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">닉네임</dt>
              <dd className="m-0 font-bold">{me.nickname}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">이메일</dt>
              <dd className="m-0 truncate font-medium">{me.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">가입한 날</dt>
              <dd className="m-0 font-medium">{fmtDate(me.createdAt)}</dd>
            </div>
          </dl>
          <SecondaryButton size="sm" onClick={onLogout}>
            로그아웃
          </SecondaryButton>
        </Card>
      )}
      <Notice>비밀번호를 잊으면 로그인 화면의 ‘찾기’에서 가입한 이메일로 새 비밀번호를 정할 수 있어요.</Notice>

      <section aria-labelledby="leave" className="flex flex-col gap-3">
        <h2 id="leave" className="m-0 text-[15px] font-bold">
          회원 탈퇴
        </h2>
        {!open ? (
          <Card className="flex flex-col gap-3 p-5">
            <p className="m-0 text-sm leading-relaxed text-muted">
              탈퇴하면 계정과 함께 설문 답, 취향, 추천·이용 기록, 카톡 분석 결과가 모두 지워지고 되돌릴 수 없어요.
            </p>
            <button type="button" onClick={() => setOpen(true)} className="self-start text-[13px] font-bold text-danger hover:underline">
              탈퇴하기
            </button>
          </Card>
        ) : (
          <Card className="border-danger/40 p-5">
            <form onSubmit={handleDelete} noValidate className="flex flex-col gap-4">
              <Notice tone="caution">
                계정과 모든 기록이 바로 지워져요. 같은 이메일로 다시 가입할 수는 있지만 지금까지의 기록은 돌아오지 않아요.
              </Notice>
              <PasswordField
                id="leave-password"
                label="비밀번호 확인"
                placeholder="지금 쓰는 비밀번호"
                autoComplete="current-password"
                value={password}
                onValue={setPassword}
              />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--color-danger)]"
                />
                모든 기록이 지워지는 것을 확인했어요.
              </label>
              <ErrorText>{delError}</ErrorText>
              <div className="flex gap-2">
                <SecondaryButton
                  className="flex-1"
                  disabled={deleting}
                  onClick={() => {
                    setOpen(false)
                    setPassword('')
                    setAgree(false)
                    setDelError('')
                  }}
                >
                  취소
                </SecondaryButton>
                <PrimaryButton type="submit" loading={deleting} className="flex-1 bg-danger! hover:bg-danger/90!">
                  탈퇴하기
                </PrimaryButton>
              </div>
            </form>
          </Card>
        )}
      </section>
    </Screen>
  )
}
