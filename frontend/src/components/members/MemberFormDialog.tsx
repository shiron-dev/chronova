import { useState } from 'react'
import { Bot, User } from 'lucide-react'
import { clsx } from 'clsx'
import type { Member, MemberType } from '../../api/types'
import { t } from '../../lib/i18n'
import { MEMBER_COLORS } from '../../lib/labels'
import { useCreateMember, useUpdateMember } from '../../hooks/useMembers'
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ColorSwatches } from '../projects/ProjectFormDialog'

function TypeOption({
  type,
  selected,
  onSelect,
}: {
  type: MemberType
  selected: boolean
  onSelect: () => void
}) {
  const Icon = type === 'agent' ? Bot : User
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors',
        selected
          ? 'border-accent bg-accent/15 text-ink'
          : 'border-edge text-dim hover:bg-hover hover:text-ink',
      )}
    >
      <Icon size={14} />
      {t.memberType[type]}
    </button>
  )
}

function MemberForm({ member, onDone }: { member?: Member; onDone: () => void }) {
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const [name, setName] = useState(member?.name ?? '')
  const [type, setType] = useState<MemberType>(member?.type ?? 'human')
  const [color, setColor] = useState(member?.avatar_color ?? MEMBER_COLORS[0])

  const canSubmit = name.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    const input = { name: name.trim(), type, avatar_color: color }
    if (member) {
      updateMember.mutate({ id: member.id, patch: input })
    } else {
      createMember.mutate(input)
    }
    onDone()
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <DialogTitle>{member ? t.member.editTitle : t.actions.addMember}</DialogTitle>
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
          }}
          placeholder={t.member.namePlaceholder}
        />
        <div className="flex gap-2">
          <TypeOption type="human" selected={type === 'human'} onSelect={() => setType('human')} />
          <TypeOption type="agent" selected={type === 'agent'} onSelect={() => setType('agent')} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-dim">{t.fields.color}</span>
          <ColorSwatches colors={MEMBER_COLORS} value={color} onChange={setColor} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t.actions.cancel}
        </Button>
        <Button variant="primary" size="sm" disabled={!canSubmit} onClick={submit}>
          {member ? t.actions.save : t.actions.create}
        </Button>
      </div>
    </div>
  )
}

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: Member
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px]">
        <MemberForm member={member} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
