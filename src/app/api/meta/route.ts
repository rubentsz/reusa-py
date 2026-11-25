import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [categories, departments] = await Promise.all([
      prisma.category.findMany({
        where: { parentId: null },
        orderBy: { order: "asc" },
        include: {
          children: {
            orderBy: { order: "asc" },
          },
        },
      }),
      prisma.department.findMany({
        orderBy: { name: "asc" },
        include: {
          cities: {
            orderBy: { name: "asc" },
            include: {
              neighborhoods: {
                orderBy: { name: "asc" },
              },
            },
          },
        },
      }),
    ]);

    // Put Asunción and Central first for Paraguayan UX convenience
    const priorityOrder = ["asuncion", "central", "alto-parana", "itapua", "cordillera"];
    departments.sort((a, b) => {
      const ia = priorityOrder.indexOf(a.slug);
      const ib = priorityOrder.indexOf(b.slug);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.name.localeCompare(b.name, "es");
    });

    return NextResponse.json({ categories, departments });
  } catch (error) {
    console.error("GET /api/meta error:", error);
    return NextResponse.json({ error: "Error cargando metadatos" }, { status: 500 });
  }
}
