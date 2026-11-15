import { useEffect, useState } from 'react'
import { ApiError, getInsights, getPreferences, savePreferences } from '../api'
import { SOURCE_LABEL } from '../data/options'
import type { Insights, PreferenceItem, Preferences as Prefs } from '../types'
import { Card, ErrorText, Notice, PageHeader, PrimaryButton, Screen, SecondaryButton, Spinner, TopBar } from '../components/ui'

const IMPORTANCE = [
  { v: 1, label: '조금' },
  { v: 2, label: '보통' },
  { v: 3, label: '꼭' },
] as const

/** 내 취향: 직접 설정(학습으로 바뀌지 않음) + 착석 기록으로 파악한 취향 */
export default function Preferences({ onBack, onChanged }: { onBack: () => void; onChanged: () => void }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [draft, setDraft] = useState<Record<string, PreferenceItem>>({})
  const [laptop, setLaptop] = useState<boolean | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError('')
    Promise.all([getPreferences(), getInsights().catch(() => null)])
      .then(([p, ins]) => {
        if (cancelled) return
        setPrefs(p)
        setDraft(Object.fromEntries(p.items.map((i) => [i.featureId, i])))
        setLaptop(p.laptopRequired)
        setInsights(ins)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [reload])

  const choose = (featureId: string, choice: string) => {
    setSaved(false)
    setDraft((d) => {
      const next = { ...d }
      if (choice === '') delete next[featureId]
      else next[featureId] = { featureId, choice, importance: d[featureId]?.importance ?? 2 }
      return next
    })
  }
  const weigh = (featureId: string, importance: 1 | 2 | 3) => {
    setSaved(false)
    setDraft((d) => (d[featureId] ? { ...d, [featureId]: { ...d[featureId], importance } } : d))
  }

  async function save() {
    if (!prefs) return
    setSaving(true)
    setError('')
    try {
      const p = await savePreferences(prefs.revision, Object.values(draft), laptop)
      setPrefs(p)
      setSaved(true)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했어요.')
      if (e instanceof ApiError && e.code === 'REVISION_CONFLICT') setReload((k) => k + 1)
    } finally {
      setSaving(false)
    }
  }

  if (!prefs) {
    return (
      <Screen className="items-center justify-center gap-3 px-5">
        {error ? (
          <>
            <ErrorText>{error}</ErrorText>
            <SecondaryButton size="sm" onClick={() => setReload((k) => k + 1)}>
              다시 시도
            </SecondaryButton>
          </>
        ) : (
          <Spinner className="size-6 text-teal" />
        )}
      </Screen>
    )
  }

  const learned = insights?.items.filter((i) => i.status === 'learned') ?? []
  const others = insights?.items.filter((i) => i.status !== 'learned') ?? []

  return (
    <Screen wide className="gap-5 px-5 pt-3 pb-8">
      <div className="lg:hidden">
        <TopBar onBack={onBack} backLabel="메인으로 돌아가기" />
      </div>
      <PageHeader
        eyebrow="내 취향"
        title="이런 자리를 찾아 드릴게요"
        description="직접 정한 취향은 추천에 그대로 반영되고, 자리를 고를수록 앉은 기록에서 취향을 더 배워요."
      />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* 직접 설정 */}
        <section aria-labelledby="pref-edit" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="pref-edit" className="m-0 text-[15px] font-bold">
              직접 정하기
            </h2>
            <span className="text-xs text-muted">
              반영 중: {prefs.effective.sources.map((s) => SOURCE_LABEL[s] ?? s).join(' · ') || '없음'}
            </span>
          </div>

          <Card className="flex flex-col divide-y divide-line px-4">
            <div className="flex items-center justify-between gap-3 py-4">
              <div className="flex flex-col">
                <span className="text-[15px] font-bold">노트북 사용</span>
                <span className="text-xs text-muted">켜면 노트북 가능한 자리만 추천해요</span>
              </div>
              <div className="flex gap-1.5">
                {[
                  { v: true, l: '써요' },
                  { v: false, l: '안 써요' },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    aria-pressed={laptop === o.v}
                    onClick={() => {
                      setSaved(false)
                      setLaptop(laptop === o.v ? null : o.v)
                    }}
                    className={`h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                      laptop === o.v ? 'border-teal bg-teal text-white' : 'border-line-strong bg-cream text-ink-2 hover:border-label'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {prefs.catalog.map((c) => {
              const cur = draft[c.featureId]
              return (
                <div key={c.featureId} className="flex flex-col gap-2.5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">{c.label}</span>
                    {cur && cur.choice !== 'any' && (
                      <div className="flex items-center gap-1" role="group" aria-label={`${c.label} 중요도`}>
                        {IMPORTANCE.map((i) => (
                          <button
                            key={i.v}
                            type="button"
                            aria-pressed={cur.importance === i.v}
                            onClick={() => weigh(c.featureId, i.v)}
                            className={`h-7 rounded-full px-2.5 text-xs font-medium transition-colors ${
                              cur.importance === i.v ? 'bg-wood text-white' : 'bg-paper text-muted hover:text-ink'
                            }`}
                          >
                            {i.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      aria-pressed={!cur}
                      onClick={() => choose(c.featureId, '')}
                      className={`h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                        !cur ? 'border-teal bg-teal-tint text-teal-deep' : 'border-line-strong bg-cream text-muted hover:border-label'
                      }`}
                    >
                      자동(설문·기록)
                    </button>
                    {c.choices.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={cur?.choice === o.value}
                        onClick={() => choose(c.featureId, o.value)}
                        className={`h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                          cur?.choice === o.value ? 'border-teal bg-teal text-white' : 'border-line-strong bg-cream text-ink-2 hover:border-label'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </Card>
          {error && <ErrorText>{error}</ErrorText>}
          {saved && <Notice>저장했어요. 다음 추천부터 반영돼요.</Notice>}
          <PrimaryButton loading={saving} onClick={() => void save()} className="w-full lg:sticky lg:bottom-6">
            저장하기
          </PrimaryButton>
        </section>

        {/* 착석 기록으로 파악한 취향 */}
        <section aria-labelledby="pref-learned" className="flex flex-col gap-3 lg:sticky lg:top-6">
          <h2 id="pref-learned" className="m-0 text-[15px] font-bold">
            앉은 기록으로 파악한 취향
          </h2>
          <Card className="flex flex-col gap-4 p-4 lg:p-5">
            {!insights || insights.historySessions === 0 ? (
              <p className="m-0 text-sm leading-relaxed text-muted">
                아직 고른 자리가 없어요. 추천받은 자리나 좌석도에서 직접 고른 자리가 쌓이면, 어떤 자리를 좋아하는지 스스로 찾아내요.
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-[28px] font-bold text-teal-deep">{insights.historySessions}</span>
                  <span className="text-sm text-muted">번 고른 자리를 학습했어요</span>
                </div>
                {learned.length > 0 ? (
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {learned.map((i) => (
                      <li key={i.featureId} className="flex flex-col gap-1.5 rounded-xl bg-teal-tint/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[15px] font-bold text-teal-deep">{i.summary}</span>
                          <span className="text-xs font-medium text-teal">확신 {Math.round(i.confidence * 100)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-teal" style={{ width: `${Math.round(i.confidence * 100)}%` }} />
                        </div>
                        <span className="text-xs leading-relaxed text-ink-2">{i.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Notice>아직 뚜렷한 취향이 보이지 않아요. 3번 이상 고르면 경향이 드러나기 시작해요.</Notice>
                )}
                {others.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-[13px] font-medium text-muted">다른 항목 {others.length}개 보기</summary>
                    <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                      {others.map((i) => (
                        <li key={i.featureId} className="flex flex-col gap-0.5 border-t border-line pt-2">
                          <span className="text-[13px] font-bold">
                            {i.label} <span className="font-normal text-muted">· {i.summary}</span>
                          </span>
                          <span className="text-xs text-muted">{i.text}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
            {insights?.note && <p className="m-0 text-xs leading-relaxed text-muted">{insights.note}</p>}
          </Card>

          {prefs.effective.preferences.length > 0 && (
            <Card className="flex flex-col gap-2 p-4 lg:p-5">
              <h3 className="m-0 text-sm font-bold">지금 추천에 쓰는 기준</h3>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {prefs.effective.preferences.map((p) => (
                  <li key={p.featureId} className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-2">
                    {p.label} · {SOURCE_LABEL[p.source] ?? p.source}
                  </li>
                ))}
                {prefs.effective.laptopRequired && <li className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-2">노트북 가능 자리만</li>}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </Screen>
  )
}
