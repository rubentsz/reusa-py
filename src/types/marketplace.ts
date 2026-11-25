export type Currency = "PYG" | "USD";
export type ListingStatus = "ACTIVE" | "RESERVED" | "SOLD" | "PAUSED";
export type VerticalType = "GENERAL" | "VEHICLE" | "REAL_ESTATE" | "APPAREL";

export interface NeighborhoodDTO {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
}

export interface CityDTO {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  departmentId: string;
  neighborhoods: NeighborhoodDTO[];
}

export interface DepartmentDTO {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  cities: CityDTO[];
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  icon: string;
  verticalType: VerticalType;
  order: number;
  parentId: string | null;
  children?: CategoryDTO[];
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  whatsappPhone: string | null;
  showWhatsappByDefault: boolean;
  role: "USER" | "ADMIN";
  departmentId: string | null;
  cityId: string | null;
  createdAt: string;
  department?: { id: string; name: string; slug: string } | null;
  city?: { id: string; name: string; slug: string } | null;
}

export interface SellerSummaryDTO {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  whatsappPhone: string | null;
  createdAt: string;
  city?: { name: string } | null;
  department?: { name: string } | null;
  avgRating: number;
  reviewCount: number;
}

export interface ListingImageDTO {
  id: string;
  url: string;
  order: number;
  isCover: boolean;
}

export interface ListingDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  sellerId: string;
  seller: SellerSummaryDTO;
  categoryId: string;
  category: { id: string; name: string; slug: string; icon: string; verticalType: VerticalType };
  subcategoryId: string | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  status: ListingStatus;
  condition: string;
  isFree: boolean;
  currency: Currency;
  price: number;
  previousPrice: number | null;
  referenceNewPrice: number | null;
  referenceNewUrl: string | null;
  savingsPercent: number | null;
  isNegotiable: boolean;
  acceptsTrade: boolean;
  pickupInPerson: boolean;
  publicMeetup: boolean;
  localDelivery: boolean;
  localDeliveryFree: boolean;
  nationalShipping: boolean;
  nationalShippingFree: boolean;
  scheduleVisitOnly: boolean;
  showWhatsapp: boolean;
  departmentId: string;
  department: { id: string; name: string; slug: string };
  cityId: string;
  city: { id: string; name: string; slug: string };
  neighborhoodId: string | null;
  neighborhood?: { id: string; name: string; slug: string } | null;
  approxLat: number;
  approxLng: number;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleMileageKm: number | null;
  vehicleFuel: string | null;
  vehicleTransmission: string | null;
  vehicleDocs: string | null;
  realEstateOperation: string | null;
  realEstateType: string | null;
  areaTotalM2: number | null;
  areaBuiltM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  furnished: boolean | null;
  apparelSize: string | null;
  apparelBrand: string | null;
  apparelGender: string | null;
  isFeatured: boolean;
  viewsCount: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  images: ListingImageDTO[];
  isFavorited?: boolean;
}

export interface ListingFilters {
  q?: string;
  category?: string;
  subcategory?: string;
  department?: string;
  city?: string;
  neighborhood?: string;
  currency?: "" | "PYG" | "USD";
  minPrice?: string;
  maxPrice?: string;
  minSavings?: string;
  condition?: string;
  isFree?: boolean;
  isNegotiable?: boolean;
  acceptsTrade?: boolean;
  delivery?: "" | "pickup" | "meetup" | "local" | "national" | "visit";
  vehicleBrand?: string;
  vehicleYearMin?: string;
  vehicleTransmission?: string;
  vehicleFuel?: string;
  realEstateOperation?: "" | "SALE" | "RENT";
  realEstateType?: string;
  bedroomsMin?: string;
  apparelSize?: string;
  sort?: "recent" | "savings" | "price_asc" | "price_desc";
}

export interface ConversationDTO {
  id: string;
  listingId: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    price: number;
    currency: Currency;
    isFree: boolean;
    status: ListingStatus;
    images: { url: string }[];
  };
  buyerId: string;
  sellerId: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
    whatsappPhone: string | null;
  };
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    readAt: string | null;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  listingId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SavedSearchDTO {
  id: string;
  name: string;
  queryJson: string;
  query: ListingFilters;
  matchCount: number;
  createdAt: string;
}

export interface ReviewDTO {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  listing?: {
    id: string;
    slug: string;
    title: string;
  } | null;
}

export interface ReportDTO {
  id: string;
  reason: string;
  details: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  moderatorNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  listing: {
    id: string;
    slug: string;
    title: string;
    status: ListingStatus;
    price: number;
    currency: Currency;
    isFree: boolean;
    seller: { id: string; name: string; email: string };
    images: { url: string }[];
  };
  reporter: {
    id: string;
    name: string;
    email: string;
  };
}
