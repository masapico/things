import { pb } from '../../lib/pocketbase'
import type { ClipsResponse } from '../../lib/pb_types'

export async function getClips(): Promise<ClipsResponse[]> {
  const result = await pb.collection('clips').getFullList<ClipsResponse>({
    sort: '-created',
  })

  return result
}
