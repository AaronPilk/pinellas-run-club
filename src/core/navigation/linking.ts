import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import type { RootStackParamList } from '@/types/navigation';

/**
 * Deep links (prc:// scheme):
 *   prc://event/:id -> Events tab -> EventDetail
 *   prc://post/:id  -> Feed tab -> PostDetail
 *   prc://perk/:id  -> Profile tab -> PartnerDetail
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'prc://'],
  config: {
    screens: {
      App: {
        screens: {
          EventsTab: {
            screens: {
              EventDetail: 'event/:eventId',
            },
          },
          FeedTab: {
            screens: {
              PostDetail: 'post/:postId',
            },
          },
          ProfileTab: {
            screens: {
              PartnerDetail: 'perk/:partnerId',
              CourseDetail: 'course/:courseId',
            },
          },
        },
      },
      Auth: {
        screens: {
          SignUp: 'invite/:inviteCode',
        },
      },
    },
  },
};
