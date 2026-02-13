export enum ItemStatus {
  LOST = 'LOST',
  FOUND = 'FOUND',
  RETURNED = 'RETURNED'
}

export enum ItemCategory {
  ELECTRONICS = 'Electronics',
  CARDS_WALLETS = 'Cards & Wallets',
  CLOTHING = 'Clothing',
  BOOKS_NOTES = 'Books & Notes',
  ACCESSORIES = 'Accessories',
  KEYS = 'Keys',
  OTHER = 'Other'
}

export interface UserProfile {
  name: string;
  studentId: string;
  contact: string;
  hostel: string;
  avatarSeed: string;
  heroPoints: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'MATCH' | 'CLAIM' | 'APPROVAL' | 'REWARD';
}

export interface ClaimRequest {
  id: string;
  itemId: string;
  claimantName: string;
  claimantContact: string;
  verificationAnswer: string;
  proofImageUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
}

export interface LostFoundItem {
  id: string;
  title: string;
  description: string;
  category: ItemCategory;
  location: string;
  specificSpot?: string;
  date: string;
  time?: string;
  status: ItemStatus;
  imageUrl?: string;
  reporterName: string;
  reporterContact: string;
  tags: string[];
  verificationQuestion?: string;
  isSecurityVerified?: boolean;
  expiryDate: string;
  hasBeenThanked?: boolean;
}

export const CAMPUS_LOCATIONS = [
  "Admin Block",
  "Auditorium",
  "Main Gate",
  "Silver Jubilee Block-1",
  "Silver Jubilee Block-2",
  "CV Raman Block",
  "Mechanical Block",
  "Playground",
  "Basketball Court",
  "Krishna Boys Hostel",
  "Tunga Boys Hostel",
  "Bhadra Boys Hostel",
  "Netravati Girls Hostel",
  "Kaveri Girls Hostel"
];