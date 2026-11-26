import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserFavoriteSet, LISTING_INCLUDE, serializeListing } from "@/lib/listings-query";
import { getActiveCommercialStores } from "@/lib/stores-query";
import type {
  CategoryDTO,
  CommercialStoreDTO,
  DepartmentDTO,
  ListingDTO,
  UserDTO,
} from "@/types/marketplace";

export async function getBootstrapData(): Promise<{
  initialUser: UserDTO | null;
  initialCategories: CategoryDTO[];
  initialDepartments: DepartmentDTO[];
  initialListings: ListingDTO[];
  initialCommercialStores: CommercialStoreDTO[];
}> {
  const [user, rawCategories, rawDepartments, rawListings, initialCommercialStores] =
    await Promise.all([
      getCurrentUser(),
      prisma.category.findMany({
        where: { parentId: null },
        orderBy: { order: "asc" },
        include: { children: { orderBy: { order: "asc" } } },
      }),
      prisma.department.findMany({
        orderBy: { name: "asc" },
        include: {
          cities: {
            orderBy: { name: "asc" },
            include: { neighborhoods: { orderBy: { name: "asc" } } },
          },
        },
      }),
      prisma.listing.findMany({
        where: { status: "ACTIVE" },
        include: LISTING_INCLUDE,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      getActiveCommercialStores(),
    ]);

  const favSet = await getUserFavoriteSet(user?.id);

  const priorityOrder = ["asuncion", "central", "alto-parana", "itapua", "cordillera"];
  rawDepartments.sort((a, b) => {
    const ia = priorityOrder.indexOf(a.slug);
    const ib = priorityOrder.indexOf(b.slug);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.name.localeCompare(b.name, "es");
  });

  const initialUser: UserDTO | null = user
    ? {
        ...user,
        role: user.role as "USER" | "ADMIN",
        createdAt: user.createdAt.toISOString(),
      }
    : null;

  const initialCategories: CategoryDTO[] = rawCategories.map((c) => ({
    ...c,
    verticalType: c.verticalType as CategoryDTO["verticalType"],
    children: c.children.map((ch) => ({
      ...ch,
      verticalType: ch.verticalType as CategoryDTO["verticalType"],
    })),
  }));

  const initialDepartments: DepartmentDTO[] = rawDepartments;
  const initialListings: ListingDTO[] = rawListings.map((l) => serializeListing(l, favSet));

  return {
    initialUser,
    initialCategories,
    initialDepartments,
    initialListings,
    initialCommercialStores,
  };
}
