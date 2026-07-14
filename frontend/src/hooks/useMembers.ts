import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as membersApi from '../api/members'
import { keys } from '../lib/queryKeys'
import { t } from '../lib/i18n'
import { useUI } from '../stores/ui'

export function useMembersList() {
  return useQuery({ queryKey: keys.members, queryFn: membersApi.listMembers })
}

function useInvalidateMembers() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: keys.members })
    // タスクに担当者情報が埋め込まれているため合わせて更新
    qc.invalidateQueries({ queryKey: keys.tasks.all })
  }
}

export function useCreateMember() {
  const invalidate = useInvalidateMembers()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: (input: membersApi.MemberInput) => membersApi.createMember(input),
    onError: () => pushToast(t.toast.createFailed),
    onSettled: invalidate,
  })
}

export function useUpdateMember() {
  const invalidate = useInvalidateMembers()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<membersApi.MemberInput> }) =>
      membersApi.updateMember(id, patch),
    onError: () => pushToast(t.toast.updateFailed),
    onSettled: invalidate,
  })
}

export function useDeleteMember() {
  const invalidate = useInvalidateMembers()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: (id: number) => membersApi.deleteMember(id),
    onError: () => pushToast(t.toast.deleteFailed),
    onSettled: invalidate,
  })
}
