import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import {
  getMemberProfile,
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  type ProfileUpdate,
} from '@/services/profileService';

export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: getMyProfile,
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (updates: ProfileUpdate) => updateMyProfile(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}

export function useMemberProfile(profileId: string) {
  return useQuery({
    queryKey: queryKeys.profile.member(profileId),
    queryFn: () => getMemberProfile(profileId),
    enabled: Boolean(profileId),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (localUri: string) => uploadAvatar(localUri),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}
