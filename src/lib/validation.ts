import { z } from 'zod';

export const signUpSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  instagramHandle: z.string().optional(),
  favoriteRunSpot: z.string().optional(),
  runningLevel: z.string().optional(),
  typicalPace: z.string().optional(),
  inviteCode: z.string().optional(),
  acceptedTerms: z.boolean().refine(Boolean, 'You must accept the terms'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const profileEditSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,24}$/, 'Lowercase letters, numbers, underscores. 3-24 characters.')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(280, 'Keep it under 280 characters').optional(),
  phone: z.string().optional(),
  instagramHandle: z.string().optional(),
  favoriteRunSpot: z.string().optional(),
  runningLevel: z.string().optional(),
  typicalPace: z.string().optional(),
  favoriteDistance: z.string().optional(),
});

export type ProfileEditInput = z.infer<typeof profileEditSchema>;

export const createPostSchema = z
  .object({
    caption: z.string().max(2200, 'Keep it under 2,200 characters').optional(),
    locationName: z.string().optional(),
    eventId: z.string().uuid().optional(),
    imageUris: z.array(z.string()).max(4, 'Up to 4 photos per post'),
  })
  .refine((v) => Boolean(v.caption?.trim()) || v.imageUris.length > 0, {
    message: 'Add a caption or a photo',
    path: ['caption'],
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createEventSchema = z.object({
  title: z.string().min(3, 'Give the event a title'),
  description: z.string().optional(),
  eventType: z.string(),
  startsAt: z.string().min(1, 'Pick a start time'),
  endsAt: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  distanceMiles: z.number().positive().optional(),
  courseId: z.string().uuid().optional(),
  checkinMethod: z.string().optional(),
  checkinRadiusMeters: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  externalTicketUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const timeEntrySchema = z.object({
  courseId: z.string().uuid(),
  runDate: z.string().min(1, 'Pick a run date'),
  timeText: z
    .string()
    .regex(/^(\d+:)?[0-5]?\d:[0-5]\d$/, 'Use mm:ss or h:mm:ss'),
  notes: z.string().max(500).optional(),
  eventId: z.string().uuid().optional(),
});

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

export const sponsorLeadSchema = z.object({
  businessName: z.string().min(2, 'Enter the business name'),
  contactName: z.string().min(2, 'Enter a contact name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  category: z.string().optional(),
  proposedOffer: z.string().optional(),
  message: z.string().optional(),
});

export type SponsorLeadInput = z.infer<typeof sponsorLeadSchema>;
