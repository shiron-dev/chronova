import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import type { Member } from '../api/types'
import { t } from '../lib/i18n'
import { useDeleteMember, useMembersList } from '../hooks/useMembers'
import { useUI } from '../stores/ui'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { MemberAvatar } from '../components/members/MemberAvatar'
import { MemberTypeBadge } from '../components/members/MemberTypeBadge'
import { MemberFormDialog } from '../components/members/MemberFormDialog'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP')
}

function MemberRow({
  member,
  onEdit,
  onDelete,
}: {
  member: Member
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      data-testid="member-row"
      className="group flex h-12 items-center gap-3 border-b border-edge/60 px-6"
    >
      <MemberAvatar member={member} size={26} />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
        {member.name}
      </span>
      <MemberTypeBadge type={member.type} />
      <span className="hidden w-28 text-right text-xs tabular-nums text-dim sm:block">
        {formatDate(member.created_at)}
      </span>
      <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label={t.actions.edit}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t.actions.delete}>
          <Trash2 size={14} />
        </Button>
      </span>
    </div>
  )
}

export function MembersPage() {
  const { data: members = [], isLoading } = useMembersList()
  const deleteMember = useDeleteMember()
  const setVisibleTaskIds = useUI((s) => s.setVisibleTaskIds)
  const setSelectedTaskId = useUI((s) => s.setSelectedTaskId)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Member | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)

  // タスク系ショートカットの対象をクリアする
  useEffect(() => {
    setVisibleTaskIds([])
    setSelectedTaskId(null)
  }, [setVisibleTaskIds, setSelectedTaskId])

  const humans = members.filter((m) => m.type === 'human')
  const agents = members.filter((m) => m.type === 'agent')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-13 shrink-0 items-center gap-3 border-b border-edge px-6">
        <h1 className="text-sm font-semibold text-ink">{t.nav.members}</h1>
        <span className="text-xs tabular-nums text-dim">{members.length}</span>
        <span className="ml-auto" />
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={13} />
          {t.actions.addMember}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!isLoading && members.length === 0 && (
          <EmptyState icon={Users} title={t.empty.noMembers} />
        )}
        {[
          { label: t.memberType.human, list: humans },
          { label: t.memberType.agent, list: agents },
        ]
          .filter((section) => section.list.length > 0)
          .map((section) => (
            <section key={section.label}>
              <div className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-edge/60 bg-raise/95 px-6 backdrop-blur">
                <span className="text-[13px] font-medium text-ink">{section.label}</span>
                <span className="text-xs text-dim">{section.list.length}</span>
              </div>
              {section.list.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onEdit={() => setEditTarget(member)}
                  onDelete={() => setDeleteTarget(member)}
                />
              ))}
            </section>
          ))}
      </div>

      <MemberFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editTarget && (
        <MemberFormDialog
          key={editTarget.id}
          open
          onOpenChange={(o) => !o && setEditTarget(null)}
          member={editTarget}
        />
      )}
      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.member.deleteConfirmTitle}
        body={t.member.deleteConfirmBody}
        onConfirm={() => {
          if (deleteTarget) deleteMember.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}
