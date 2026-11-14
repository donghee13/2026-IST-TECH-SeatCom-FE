import { TextButton, TopBar } from './ui'

/** 실험실 단계 화면 위쪽: 뒤로 + 진행 막대 + '나중에 할게요' */
export default function LabHeader({
  step,
  onBack,
  onLater,
  backLabel,
}: {
  step?: number // 1~3. 없으면 진행 막대 숨김
  onBack: () => void
  onLater: () => void
  backLabel?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <TopBar onBack={onBack} step={step} total={step ? 3 : undefined} backLabel={backLabel} />
      </div>
      <TextButton tone="muted" onClick={onLater} className="shrink-0 px-1 text-[13px]">
        나중에 할게요
      </TextButton>
    </div>
  )
}