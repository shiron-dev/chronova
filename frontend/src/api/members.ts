import { api } from './client'
import type { Member, MemberType } from './types'

export async function listMembers(): Promise<Member[]> {
  const res = await api.get<{ members: Member[] }>('/members')
  return res.members
}

export interface MemberInput {
  name: string
  type: MemberType
  avatar_color?: string
}

export function createMember(input: MemberInput): Promise<Member> {
  return api.post<Member>('/members', input)
}

export function updateMember(id: number, patch: Partial<MemberInput>): Promise<Member> {
  return api.patch<Member>(`/members/${id}`, patch)
}

export function deleteMember(id: number): Promise<void> {
  return api.delete(`/members/${id}`)
}
