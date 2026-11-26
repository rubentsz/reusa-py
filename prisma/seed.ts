import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addPrivacyJitter, computeSavingsPercent } from "../src/lib/format";

const prisma = new PrismaClient();

const DEPARTMENTS_DATA = [
  {
    name: "Asunción (Capital)",
    slug: "asuncion",
    lat: -25.2867,
    lng: -57.647,
    cities: [
      {
        name: "Asunción",
        slug: "asuncion-ciudad",
        lat: -25.2867,
        lng: -57.647,
        neighborhoods: [
          { name: "Villa Morra", slug: "asuncion-villa-morra", lat: -25.2948, lng: -57.5806 },
          { name: "Carmelitas", slug: "asuncion-carmelitas", lat: -25.2797, lng: -57.5718 },
          { name: "Las Mercedes", slug: "asuncion-las-mercedes", lat: -25.2845, lng: -57.6143 },
          { name: "Centro", slug: "asuncion-centro", lat: -25.2821, lng: -57.6351 },
          { name: "Sajonia", slug: "asuncion-sajonia", lat: -25.2912, lng: -57.6579 },
          { name: "Recoleta", slug: "asuncion-recoleta", lat: -25.2981, lng: -57.5892 },
          { name: "Ytay / Salvador del Mundo", slug: "asuncion-ytay", lat: -25.2721, lng: -57.5476 },
          { name: "Mburucuyá", slug: "asuncion-mburucuya", lat: -25.2683, lng: -57.5738 },
          { name: "San Cristóbal", slug: "asuncion-san-cristobal", lat: -25.3025, lng: -57.5735 },
          { name: "Trinidad", slug: "asuncion-trinidad", lat: -25.2584, lng: -57.5865 },
        ],
      },
    ],
  },
  {
    name: "Central",
    slug: "central",
    lat: -25.335,
    lng: -57.535,
    cities: [
      {
        name: "Luque",
        slug: "luque",
        lat: -25.2665,
        lng: -57.4872,
        neighborhoods: [
          { name: "Centro de Luque", slug: "luque-centro", lat: -25.2665, lng: -57.4872 },
          { name: "Loma Merlo", slug: "luque-loma-merlo", lat: -25.2491, lng: -57.5063 },
          { name: "Maka'i", slug: "luque-makai", lat: -25.2554, lng: -57.4762 },
          { name: "Laurelty", slug: "luque-laurelty", lat: -25.2925, lng: -57.5152 },
        ],
      },
      {
        name: "San Lorenzo",
        slug: "san-lorenzo",
        lat: -25.3426,
        lng: -57.5094,
        neighborhoods: [
          { name: "Centro / Campus UNA", slug: "san-lorenzo-centro", lat: -25.3426, lng: -57.5094 },
          { name: "Barcequillo", slug: "san-lorenzo-barcequillo", lat: -25.3518, lng: -57.5305 },
          { name: "Reducto", slug: "san-lorenzo-reducto", lat: -25.3774, lng: -57.5172 },
        ],
      },
      {
        name: "Fernando de la Mora",
        slug: "fernando-de-la-mora",
        lat: -25.3245,
        lng: -57.5542,
        neighborhoods: [
          { name: "Zona Norte", slug: "fdm-zona-norte", lat: -25.3121, lng: -57.5476 },
          { name: "Zona Sur", slug: "fdm-zona-sur", lat: -25.3364, lng: -57.5594 },
        ],
      },
      {
        name: "Lambaré",
        slug: "lambare",
        lat: -25.3455,
        lng: -57.6245,
        neighborhoods: [
          { name: "Yacht y Golf / Valle Apu'a", slug: "lambare-yacht", lat: -25.3672, lng: -57.6382 },
          { name: "Centro de Lambaré", slug: "lambare-centro", lat: -25.3455, lng: -57.6245 },
        ],
      },
      {
        name: "Mariano Roque Alonso",
        slug: "mariano-roque-alonso",
        lat: -25.2116,
        lng: -57.5352,
        neighborhoods: [
          { name: "La Concordia / Expo", slug: "mra-expo", lat: -25.2116, lng: -57.5352 },
          { name: "Surubi'i", slug: "mra-surubii", lat: -25.1842, lng: -57.5186 },
        ],
      },
      {
        name: "Ñemby",
        slug: "nemby",
        lat: -25.3949,
        lng: -57.5447,
        neighborhoods: [{ name: "Centro de Ñemby", slug: "nemby-centro", lat: -25.3949, lng: -57.5447 }],
      },
      {
        name: "Villa Elisa",
        slug: "villa-elisa",
        lat: -25.3676,
        lng: -57.5927,
        neighborhoods: [{ name: "Centro de Villa Elisa", slug: "villa-elisa-centro", lat: -25.3676, lng: -57.5927 }],
      },
      {
        name: "Capiatá",
        slug: "capiata",
        lat: -25.3552,
        lng: -57.4454,
        neighborhoods: [{ name: "Ruta 2 Km 20", slug: "capiata-centro", lat: -25.3552, lng: -57.4454 }],
      },
    ],
  },
  {
    name: "Alto Paraná",
    slug: "alto-parana",
    lat: -25.5097,
    lng: -54.6111,
    cities: [
      {
        name: "Ciudad del Este",
        slug: "ciudad-del-este",
        lat: -25.5097,
        lng: -54.6111,
        neighborhoods: [
          { name: "Microcentro", slug: "cde-microcentro", lat: -25.5097, lng: -54.6111 },
          { name: "Área 1", slug: "cde-area-1", lat: -25.5162, lng: -54.6331 },
          { name: "Área 4", slug: "cde-area-4", lat: -25.5245, lng: -54.6462 },
          { name: "Boquerón", slug: "cde-boqueron", lat: -25.5131, lng: -54.6214 },
        ],
      },
      {
        name: "Hernandarias",
        slug: "hernandarias",
        lat: -25.4055,
        lng: -54.6403,
        neighborhoods: [{ name: "Centro Hernandarias", slug: "hernandarias-centro", lat: -25.4055, lng: -54.6403 }],
      },
      {
        name: "Presidente Franco",
        slug: "presidente-franco",
        lat: -25.5638,
        lng: -54.611,
        neighborhoods: [{ name: "Centro Franco", slug: "franco-centro", lat: -25.5638, lng: -54.611 }],
      },
    ],
  },
  {
    name: "Itapúa",
    slug: "itapua",
    lat: -27.3306,
    lng: -55.8667,
    cities: [
      {
        name: "Encarnación",
        slug: "encarnacion",
        lat: -27.3306,
        lng: -55.8667,
        neighborhoods: [
          { name: "Costanera / San José", slug: "encarnacion-costanera", lat: -27.3408, lng: -55.8663 },
          { name: "Centro", slug: "encarnacion-centro", lat: -27.3306, lng: -55.8667 },
          { name: "Buena Vista", slug: "encarnacion-buena-vista", lat: -27.3195, lng: -55.8542 },
        ],
      },
      {
        name: "Cambyretá",
        slug: "cambyreta",
        lat: -27.353,
        lng: -55.821,
        neighborhoods: [{ name: "San Miguel", slug: "cambyreta-san-miguel", lat: -27.353, lng: -55.821 }],
      },
    ],
  },
  {
    name: "Cordillera",
    slug: "cordillera",
    lat: -25.386,
    lng: -57.141,
    cities: [
      {
        name: "Caacupé",
        slug: "caacupe",
        lat: -25.3858,
        lng: -57.1407,
        neighborhoods: [{ name: "Centro Caacupé", slug: "caacupe-centro", lat: -25.3858, lng: -57.1407 }],
      },
      {
        name: "San Bernardino",
        slug: "san-bernardino",
        lat: -25.3106,
        lng: -57.2963,
        neighborhoods: [{ name: "Zona Lago", slug: "sanber-lago", lat: -25.3106, lng: -57.2963 }],
      },
    ],
  },
  {
    name: "Caaguazú",
    slug: "caaguazu",
    lat: -25.4444,
    lng: -56.4403,
    cities: [
      {
        name: "Coronel Oviedo",
        slug: "coronel-oviedo",
        lat: -25.4444,
        lng: -56.4403,
        neighborhoods: [{ name: "Centro Oviedo", slug: "oviedo-centro", lat: -25.4444, lng: -56.4403 }],
      },
      {
        name: "Caaguazú",
        slug: "caaguazu-ciudad",
        lat: -25.471,
        lng: -56.016,
        neighborhoods: [{ name: "Centro Caaguazú", slug: "caaguazu-centro", lat: -25.471, lng: -56.016 }],
      },
    ],
  },
  {
    name: "Guairá",
    slug: "guaira",
    lat: -25.7806,
    lng: -56.4486,
    cities: [
      {
        name: "Villarrica",
        slug: "villarrica",
        lat: -25.7806,
        lng: -56.4486,
        neighborhoods: [{ name: "Centro Villarrica", slug: "villarrica-centro", lat: -25.7806, lng: -56.4486 }],
      },
    ],
  },
  {
    name: "Amambay",
    slug: "amambay",
    lat: -22.5472,
    lng: -55.7333,
    cities: [
      {
        name: "Pedro Juan Caballero",
        slug: "pedro-juan-caballero",
        lat: -22.5472,
        lng: -55.7333,
        neighborhoods: [{ name: "Centro PJC", slug: "pjc-centro", lat: -22.5472, lng: -55.7333 }],
      },
    ],
  },
  {
    name: "Concepción",
    slug: "concepcion",
    lat: -23.4064,
    lng: -57.4344,
    cities: [
      {
        name: "Concepción",
        slug: "concepcion-ciudad",
        lat: -23.4064,
        lng: -57.4344,
        neighborhoods: [{ name: "Centro Concepción", slug: "concepcion-centro", lat: -23.4064, lng: -57.4344 }],
      },
    ],
  },
  {
    name: "Paraguarí",
    slug: "paraguari",
    lat: -25.6208,
    lng: -57.1472,
    cities: [
      {
        name: "Paraguarí",
        slug: "paraguari-ciudad",
        lat: -25.6208,
        lng: -57.1472,
        neighborhoods: [{ name: "Centro Paraguarí", slug: "paraguari-centro", lat: -25.6208, lng: -57.1472 }],
      },
    ],
  },
  {
    name: "Misiones",
    slug: "misiones",
    lat: -26.6694,
    lng: -57.1458,
    cities: [
      {
        name: "San Juan Bautista",
        slug: "san-juan-bautista",
        lat: -26.6694,
        lng: -57.1458,
        neighborhoods: [{ name: "Centro", slug: "sjb-centro", lat: -26.6694, lng: -57.1458 }],
      },
    ],
  },
  {
    name: "Ñeembucú",
    slug: "neembucu",
    lat: -26.8688,
    lng: -58.3064,
    cities: [
      {
        name: "Pilar",
        slug: "pilar",
        lat: -26.8688,
        lng: -58.3064,
        neighborhoods: [{ name: "Centro Pilar", slug: "pilar-centro", lat: -26.8688, lng: -58.3064 }],
      },
    ],
  },
  {
    name: "San Pedro",
    slug: "san-pedro",
    lat: -24.0853,
    lng: -57.0875,
    cities: [
      {
        name: "San Estanislao (Santaní)",
        slug: "santani",
        lat: -24.6631,
        lng: -56.4406,
        neighborhoods: [{ name: "Centro Santaní", slug: "santani-centro", lat: -24.6631, lng: -56.4406 }],
      },
    ],
  },
  {
    name: "Canindeyú",
    slug: "canindeyu",
    lat: -24.0625,
    lng: -54.3069,
    cities: [
      {
        name: "Salto del Guairá",
        slug: "salto-del-guaira",
        lat: -24.0625,
        lng: -54.3069,
        neighborhoods: [{ name: "Centro", slug: "sdg-centro", lat: -24.0625, lng: -54.3069 }],
      },
    ],
  },
  {
    name: "Caazapá",
    slug: "caazapa",
    lat: -26.1958,
    lng: -56.3681,
    cities: [
      {
        name: "Caazapá",
        slug: "caazapa-ciudad",
        lat: -26.1958,
        lng: -56.3681,
        neighborhoods: [{ name: "Centro", slug: "caazapa-centro", lat: -26.1958, lng: -56.3681 }],
      },
    ],
  },
  {
    name: "Presidente Hayes",
    slug: "presidente-hayes",
    lat: -25.0931,
    lng: -57.5236,
    cities: [
      {
        name: "Villa Hayes",
        slug: "villa-hayes",
        lat: -25.0931,
        lng: -57.5236,
        neighborhoods: [{ name: "Centro Villa Hayes", slug: "villa-hayes-centro", lat: -25.0931, lng: -57.5236 }],
      },
    ],
  },
  {
    name: "Boquerón",
    slug: "boqueron",
    lat: -22.3394,
    lng: -60.0315,
    cities: [
      {
        name: "Filadelfia",
        slug: "filadelfia",
        lat: -22.3394,
        lng: -60.0315,
        neighborhoods: [{ name: "Centro Filadelfia", slug: "filadelfia-centro", lat: -22.3394, lng: -60.0315 }],
      },
    ],
  },
  {
    name: "Alto Paraguay",
    slug: "alto-paraguay",
    lat: -21.0415,
    lng: -57.8738,
    cities: [
      {
        name: "Fuerte Olimpo",
        slug: "fuerte-olimpo",
        lat: -21.0415,
        lng: -57.8738,
        neighborhoods: [{ name: "Centro", slug: "fuerte-olimpo-centro", lat: -21.0415, lng: -57.8738 }],
      },
    ],
  },
];

const CATEGORIES_DATA = [
  {
    name: "Tecnología",
    slug: "tecnologia",
    icon: "Smartphone",
    verticalType: "GENERAL",
    order: 1,
    children: [
      { name: "Celulares y Tablets", slug: "celulares", icon: "Smartphone" },
      { name: "Notebooks y PC", slug: "notebooks-pc", icon: "Laptop" },
      { name: "Consolas y Gaming", slug: "consolas-gaming", icon: "Gamepad2" },
      { name: "Audio, TV y Cámaras", slug: "audio-tv", icon: "Tv" },
    ],
  },
  {
    name: "Vehículos",
    slug: "vehiculos",
    icon: "Car",
    verticalType: "VEHICLE",
    order: 2,
    children: [
      { name: "Autos", slug: "autos", icon: "Car" },
      { name: "Camionetas y SUV", slug: "camionetas-suv", icon: "Truck" },
      { name: "Motos", slug: "motos", icon: "Bike" },
      { name: "Repuestos y Accesorios", slug: "repuestos-vehiculos", icon: "Wrench" },
    ],
  },
  {
    name: "Inmuebles",
    slug: "inmuebles",
    icon: "Home",
    verticalType: "REAL_ESTATE",
    order: 3,
    children: [
      { name: "Casas", slug: "casas", icon: "Home" },
      { name: "Departamentos", slug: "departamentos", icon: "Building2" },
      { name: "Terrenos", slug: "terrenos", icon: "Map" },
      { name: "Dúplex y Locales", slug: "duplex-locales", icon: "Building" },
    ],
  },
  {
    name: "Ropa y Calzado",
    slug: "ropa-calzado",
    icon: "Shirt",
    verticalType: "APPAREL",
    order: 4,
    children: [
      { name: "Ropa y Abrigos", slug: "ropa", icon: "Shirt" },
      { name: "Calzado y Zapatillas", slug: "calzado", icon: "Footprints" },
      { name: "Medias y Accesorios", slug: "medias-accesorios", icon: "Tag" },
    ],
  },
  {
    name: "Hogar y Muebles",
    slug: "hogar-muebles",
    icon: "Armchair",
    verticalType: "GENERAL",
    order: 5,
    children: [
      { name: "Muebles", slug: "muebles", icon: "Armchair" },
      { name: "Electrodomésticos", slug: "electrodomesticos", icon: "Refrigerator" },
      { name: "Oficina y Estudio", slug: "oficina-estudio", icon: "LampDesk" },
    ],
  },
  {
    name: "Deportes y Bicicletas",
    slug: "deportes",
    icon: "Bike",
    verticalType: "GENERAL",
    order: 6,
    children: [
      { name: "Bicicletas", slug: "bicicletas", icon: "Bike" },
      { name: "Fitness y Gimnasio", slug: "fitness", icon: "Dumbbell" },
      { name: "Camping y Aire Libre", slug: "camping", icon: "Tent" },
    ],
  },
  {
    name: "Herramientas",
    slug: "herramientas",
    icon: "Wrench",
    verticalType: "GENERAL",
    order: 7,
    children: [
      { name: "Herramientas Eléctricas", slug: "herramientas-electricas", icon: "Hammer" },
      { name: "Manuales y Jardín", slug: "manuales-jardin", icon: "Wrench" },
    ],
  },
  {
    name: "Bebés y Niños",
    slug: "bebes-ninos",
    icon: "Baby",
    verticalType: "GENERAL",
    order: 8,
    children: [
      { name: "Cochecitos y Sillas", slug: "cochecitos-sillas", icon: "Baby" },
      { name: "Juguetes", slug: "juguetes", icon: "Puzzle" },
    ],
  },
  {
    name: "Instrumentos y Hobbies",
    slug: "instrumentos-hobbies",
    icon: "Music",
    verticalType: "GENERAL",
    order: 9,
    children: [
      { name: "Instrumentos Musicales", slug: "instrumentos-musicales", icon: "Music" },
      { name: "Libros y Coleccionables", slug: "libros-coleccionables", icon: "BookOpen" },
    ],
  },
  {
    name: "Otros y Regalos",
    slug: "otros",
    icon: "Package",
    verticalType: "GENERAL",
    order: 10,
    children: [{ name: "Varios", slug: "varios", icon: "Package" }],
  },
];

async function main() {
  console.log("Seeding ReUsa PY database...");

  const country = await prisma.country.upsert({
    where: { code: "PY" },
    update: { name: "Paraguay" },
    create: { code: "PY", name: "Paraguay" },
  });

  const deptMap = new Map<string, string>();
  const cityMap = new Map<string, { id: string; lat: number; lng: number; deptId: string }>();
  const neighMap = new Map<string, { id: string; lat: number; lng: number }>();

  for (const d of DEPARTMENTS_DATA) {
    const dept = await prisma.department.upsert({
      where: { slug: d.slug },
      update: { name: d.name, lat: d.lat, lng: d.lng, countryId: country.id },
      create: { name: d.name, slug: d.slug, lat: d.lat, lng: d.lng, countryId: country.id },
    });
    deptMap.set(d.slug, dept.id);

    for (const c of d.cities) {
      const city = await prisma.city.upsert({
        where: { slug: c.slug },
        update: { name: c.name, lat: c.lat, lng: c.lng, departmentId: dept.id },
        create: { name: c.name, slug: c.slug, lat: c.lat, lng: c.lng, departmentId: dept.id },
      });
      cityMap.set(c.slug, { id: city.id, lat: city.lat, lng: city.lng, deptId: dept.id });

      for (const n of c.neighborhoods) {
        const neigh = await prisma.neighborhood.upsert({
          where: { slug: n.slug },
          update: { name: n.name, lat: n.lat, lng: n.lng, cityId: city.id },
          create: { name: n.name, slug: n.slug, lat: n.lat, lng: n.lng, cityId: city.id },
        });
        neighMap.set(n.slug, { id: neigh.id, lat: neigh.lat, lng: neigh.lng });
      }
    }
  }

  const catMap = new Map<string, string>();
  for (const cat of CATEGORIES_DATA) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, verticalType: cat.verticalType, order: cat.order },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, verticalType: cat.verticalType, order: cat.order },
    });
    catMap.set(cat.slug, parent.id);

    for (let i = 0; i < cat.children.length; i++) {
      const ch = cat.children[i];
      const child = await prisma.category.upsert({
        where: { slug: ch.slug },
        update: {
          name: ch.name,
          icon: ch.icon,
          verticalType: cat.verticalType,
          order: i + 1,
          parentId: parent.id,
        },
        create: {
          name: ch.name,
          slug: ch.slug,
          icon: ch.icon,
          verticalType: cat.verticalType,
          order: i + 1,
          parentId: parent.id,
        },
      });
      catMap.set(ch.slug, child.id);
    }
  }

  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("reusa123", 10);

  const asuCity = cityMap.get("asuncion-ciudad")!;
  const luqueCity = cityMap.get("luque")!;
  const cdeCity = cityMap.get("ciudad-del-este")!;
  const encCity = cityMap.get("encarnacion")!;
  const slCity = cityMap.get("san-lorenzo")!;

  const usersInput = [
    {
      email: "admin@reusa.py",
      name: "Admin ReUsa PY",
      passwordHash: adminHash,
      role: "ADMIN",
      whatsappPhone: "0981100200",
      bio: "Equipo de moderación y soporte de ReUsa PY.",
      departmentId: asuCity.deptId,
      cityId: asuCity.id,
    },
    {
      email: "camila@reusa.py",
      name: "Camila Benítez",
      passwordHash: userHash,
      role: "USER",
      whatsappPhone: "0981442210",
      bio: "Vendo cosas cuidadas que ya no uso en casa. Entregas por Villa Morra o delivery.",
      departmentId: asuCity.deptId,
      cityId: asuCity.id,
    },
    {
      email: "diego@reusa.py",
      name: "Diego Villalba",
      passwordHash: userHash,
      role: "USER",
      whatsappPhone: "0971883320",
      bio: "Particular de Luque. Todo con factura o documentación al día.",
      departmentId: luqueCity.deptId,
      cityId: luqueCity.id,
    },
    {
      email: "sofia@reusa.py",
      name: "Sofía Rojas",
      passwordHash: userHash,
      role: "USER",
      whatsappPhone: "0985667740",
      bio: "Encarnación y Asunción. Envíos a todo el país por encomienda.",
      departmentId: encCity.deptId,
      cityId: encCity.id,
    },
    {
      email: "mateo@reusa.py",
      name: "Mateo González",
      passwordHash: userHash,
      role: "USER",
      whatsappPhone: "0983551190",
      bio: "Fan de la tecnología y las bicis en Ciudad del Este.",
      departmentId: cdeCity.deptId,
      cityId: cdeCity.id,
    },
  ];

  const userMap = new Map<string, string>();
  for (const u of usersInput) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, whatsappPhone: u.whatsappPhone, bio: u.bio },
      create: u,
    });
    userMap.set(u.email, user.id);
  }

  const expiresIn60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const listingsSeed = [
    {
      slug: "pack-3-pares-medias-deportivas-algodon-sin-uso",
      title: "Pack x3 pares de medias deportivas algodón (sin uso)",
      description:
        "Compré el pack equivocado de talle y nunca las estrené, todavía tienen la faja original. Súper cómodas y gruesas para entrenar o usar todos los días. Incluye 1 par blanco, 1 azul marino y 1 gris melange.",
      sellerEmail: "camila@reusa.py",
      categorySlug: "ropa-calzado",
      subcategorySlug: "medias-accesorios",
      condition: "LIKE_NEW",
      isFree: false,
      currency: "PYG",
      price: 45000,
      referenceNewPrice: 85000,
      referenceNewUrl: "https://www.tiendamia.com",
      isNegotiable: false,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: true,
      localDeliveryFree: false,
      nationalShipping: true,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-villa-morra",
      apparelSize: "39-43 (L)",
      apparelBrand: "Athletic Cotton",
      apparelGender: "Unisex",
      image: "/uploads/seed/medias.jpg",
      hoursAgo: 2,
    },
    {
      slug: "toyota-corolla-2019-automatico-unico-dueno",
      title: "Toyota Corolla XEi 2019 Automático — Único dueño",
      description:
        "Impecable Toyota Corolla año 2019, del representante Toyotoshi. Mantenimientos al día en service oficial, cubiertas casi nuevas, cámara de reversa, aire congela y interior sin detalles. Título, Cédula Verde y habilitación al día listo para transferir. Escucho oferta contado o vehículo menor valor como parte de pago.",
      sellerEmail: "diego@reusa.py",
      categorySlug: "vehiculos",
      subcategorySlug: "autos",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "USD",
      price: 14800,
      referenceNewPrice: 26500,
      referenceNewUrl: "https://www.toyotoshi.com.py",
      isNegotiable: true,
      acceptsTrade: true,
      pickupInPerson: false,
      publicMeetup: false,
      localDelivery: false,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: true,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-carmelitas",
      vehicleBrand: "Toyota",
      vehicleModel: "Corolla XEi",
      vehicleYear: 2019,
      vehicleMileageKm: 64000,
      vehicleFuel: "Flex / Nafta",
      vehicleTransmission: "Automática",
      vehicleDocs: "Título y Cédula Verde al día",
      image: "/uploads/seed/corolla.jpg",
      hoursAgo: 5,
    },
    {
      slug: "casa-moderna-3-dormitorios-jardin-luque-loma-merlo",
      title: "Casa moderna de 2 plantas con 3 dormitorios y cochera doble",
      description:
        "Vendo hermosa residencia familiar a 10 minutos del eje corporativo. Planta baja: sala/comedor integrados, cocina amoblada, baño social, galería con quincho, patio empastado y cochera techada para 2 vehículos. Planta alta: 1 suite principal con balcón y vestidor + 2 dormitorios con baño compartido. Trato directo con propietario, sin comisión inmobiliaria.",
      sellerEmail: "diego@reusa.py",
      categorySlug: "inmuebles",
      subcategorySlug: "casas",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "USD",
      price: 185000,
      referenceNewPrice: 235000,
      referenceNewUrl: null,
      isNegotiable: true,
      acceptsTrade: true,
      pickupInPerson: false,
      publicMeetup: false,
      localDelivery: false,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: true,
      citySlug: "luque",
      neighSlug: "luque-loma-merlo",
      realEstateOperation: "SALE",
      realEstateType: "Casa",
      areaTotalM2: 360,
      areaBuiltM2: 220,
      bedrooms: 3,
      bathrooms: 3,
      parkingSpaces: 2,
      furnished: false,
      image: "/uploads/seed/casa.jpg",
      hoursAgo: 9,
    },
    {
      slug: "iphone-15-pro-128gb-titanio-negro-con-caja",
      title: "iPhone 15 Pro 128GB Titanio Negro — Batería 93%",
      description:
        "Liberado de fábrica para todas las operadoras, sin ningún golpe ni rayón (siempre usado con vidrio templado y funda). Viene con su caja original y cable USB-C trenzado original. Se puede probar con total tranquilidad en punto de encuentro público o en zona Villa Morra.",
      sellerEmail: "mateo@reusa.py",
      categorySlug: "tecnologia",
      subcategorySlug: "celulares",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "USD",
      price: 720,
      referenceNewPrice: 1090,
      referenceNewUrl: "https://nissei.com/py/",
      isNegotiable: true,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: true,
      localDeliveryFree: true,
      nationalShipping: true,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "ciudad-del-este",
      neighSlug: "cde-area-1",
      image: "/uploads/seed/iphone.jpg",
      hoursAgo: 4,
    },
    {
      slug: "macbook-air-m2-13-pulgadas-256gb-plata",
      title: "MacBook Air M2 13\" 8GB/256GB — Impecable con cargador",
      description:
        "Vendo por actualización a MacBook Pro. Solo 58 ciclos de batería (98% de salud), teclado en inglés, pantalla sin detalles y cargador MagSafe original. Ideal para universidad, diseño o programación.",
      sellerEmail: "camila@reusa.py",
      categorySlug: "tecnologia",
      subcategorySlug: "notebooks-pc",
      condition: "LIKE_NEW",
      isFree: false,
      currency: "PYG",
      price: 5800000,
      referenceNewPrice: 8900000,
      referenceNewUrl: "https://nissei.com/py/",
      isNegotiable: true,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: true,
      localDeliveryFree: true,
      nationalShipping: true,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-recoleta",
      image: "/uploads/seed/laptop.jpg",
      hoursAgo: 12,
    },
    {
      slug: "departamento-amoblado-2-dormitorios-las-mercedes-alquiler",
      title: "Departamento luminoso 2 dormitorios con balcón — Alquiler",
      description:
        "Alquilo directamente departamento de 82 m² en edificio tranquilo de Las Mercedes. Totalmente amoblado (sofá, mesa comedor, aires acondicionados en todos los ambientes, cocina equipada). Incluye 1 cochera y expensas básicas. A pasos de cafés y supermercados.",
      sellerEmail: "sofia@reusa.py",
      categorySlug: "inmuebles",
      subcategorySlug: "departamentos",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "PYG",
      price: 4200000,
      referenceNewPrice: null,
      referenceNewUrl: null,
      isNegotiable: false,
      acceptsTrade: false,
      pickupInPerson: false,
      publicMeetup: false,
      localDelivery: false,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: true,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-las-mercedes",
      realEstateOperation: "RENT",
      realEstateType: "Departamento",
      areaTotalM2: 88,
      areaBuiltM2: 82,
      bedrooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
      furnished: true,
      image: "/uploads/seed/depto.jpg",
      hoursAgo: 16,
    },
    {
      slug: "moto-honda-cb190r-2022-roja-documentos-al-dia",
      title: "Honda CB190R 2022 — 11.500 km, chapa y cédula verde",
      description:
        "Moto súper económica y ágil para moverse por ciudad sin tráfico. Inyección electrónica, tablero digital, frenos a disco en ambas ruedas. Service recién hecho y cubierta trasera nueva. Acepto permuta por notebook o celular de alta gama + diferencia.",
      sellerEmail: "diego@reusa.py",
      categorySlug: "vehiculos",
      subcategorySlug: "motos",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "PYG",
      price: 13500000,
      referenceNewPrice: 21500000,
      referenceNewUrl: "https://diesa.com.py",
      isNegotiable: true,
      acceptsTrade: true,
      pickupInPerson: false,
      publicMeetup: false,
      localDelivery: false,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: true,
      citySlug: "san-lorenzo",
      neighSlug: "san-lorenzo-centro",
      vehicleBrand: "Honda",
      vehicleModel: "CB190R",
      vehicleYear: 2022,
      vehicleMileageKm: 11500,
      vehicleFuel: "Nafta",
      vehicleTransmission: "Manual",
      vehicleDocs: "Chapa definitiva y Cédula Verde",
      image: "/uploads/seed/moto.jpg",
      hoursAgo: 19,
    },
    {
      slug: "zapatillas-saucony-jazz-running-talle-42",
      title: "Zapatillas Saucony Jazz '81 Talle 42 (US 10) con caja",
      description:
        "Usadas solo 4 veces para caminar, impecables por dentro y por fuera. Color blanco con detalle verde esmeralda. Las vendo porque me quedaron medio punto grandes. Entrega en mano o envío por motobolt.",
      sellerEmail: "camila@reusa.py",
      categorySlug: "ropa-calzado",
      subcategorySlug: "calzado",
      condition: "LIKE_NEW",
      isFree: false,
      currency: "PYG",
      price: 280000,
      referenceNewPrice: 690000,
      referenceNewUrl: "https://www.saucony.com",
      isNegotiable: true,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: true,
      localDeliveryFree: false,
      nationalShipping: true,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-villa-morra",
      apparelSize: "42 (US 10)",
      apparelBrand: "Saucony",
      apparelGender: "Unisex",
      image: "/uploads/seed/zapatillas.jpg",
      hoursAgo: 3,
    },
    {
      slug: "sofa-esquinero-gris-oscuro-3-cuerpos-chaise-longue",
      title: "Sofá esquinero gris oscuro 3 cuerpos + chaise longue",
      description:
        "Súper cómodo, tela antimanchas gris grafito y estructura de madera maciza. Sin roturas ni hundimientos, incluye los 4 almohadones decorativos. Se vende por mudanza. Retiro en planta baja en Fernando de la Mora Zona Norte.",
      sellerEmail: "sofia@reusa.py",
      categorySlug: "hogar-muebles",
      subcategorySlug: "muebles",
      condition: "GOOD",
      isFree: false,
      currency: "PYG",
      price: 1650000,
      referenceNewPrice: 3450000,
      referenceNewUrl: "https://www.tupi.com.py",
      isNegotiable: true,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: false,
      localDelivery: false,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "fernando-de-la-mora",
      neighSlug: "fdm-zona-norte",
      image: "/uploads/seed/sofa.jpg",
      hoursAgo: 25,
    },
    {
      slug: "bicicleta-mtb-aro-29-aluminio-frenos-hidraulicos",
      title: "Bicicleta MTB Aro 29 Aluminio — Frenos hidráulicos Shimano",
      description:
        "Cuadro talle M negro mate, suspensión delantera con bloqueo, transmisión 1x12 y cubiertas Maxxis en excelente estado. Regalo portacaramañola y bolsito bajo asiento. Envío a todo el país por encomienda bien embalada.",
      sellerEmail: "mateo@reusa.py",
      categorySlug: "deportes",
      subcategorySlug: "bicicletas",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "PYG",
      price: 2150000,
      referenceNewPrice: 3800000,
      referenceNewUrl: "https://www.chacomer.com.py",
      isNegotiable: true,
      acceptsTrade: true,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: true,
      localDeliveryFree: false,
      nationalShipping: true,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "encarnacion",
      neighSlug: "encarnacion-costanera",
      image: "/uploads/seed/bici.jpg",
      hoursAgo: 7,
    },
    {
      slug: "guitarra-electrica-stratocaster-sunburst-con-amplificador",
      title: "Guitarra eléctrica Stratocaster Sunburst + Amplificador Roland",
      description:
        "Combo completo listo para tocar: guitarra calibrada con cuerdas nuevas Ernie Ball, amplificador Roland Cube de práctica con efectos, cable plug de 3 metros y pie metálico. Todo funcionando al 100%.",
      sellerEmail: "sofia@reusa.py",
      categorySlug: "instrumentos-hobbies",
      subcategorySlug: "instrumentos-musicales",
      condition: "GOOD",
      isFree: false,
      currency: "PYG",
      price: 1450000,
      referenceNewPrice: 2700000,
      referenceNewUrl: null,
      isNegotiable: true,
      acceptsTrade: true,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: false,
      localDeliveryFree: false,
      nationalShipping: true,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "encarnacion",
      neighSlug: "encarnacion-centro",
      image: "/uploads/seed/guitarra.jpg",
      hoursAgo: 30,
    },
    {
      slug: "heladera-inverter-acero-inoxidable-doble-puerta",
      title: "Heladera Inverter Acero Inoxidable No Frost — Bajo consumo",
      description:
        "Funcionamiento silencioso y enfriamiento parejo. Dos años de uso doméstico muy cuidado, burletes impecables y todos los estantes de vidrio templado completos. Se entrega probada en Lambaré.",
      sellerEmail: "diego@reusa.py",
      categorySlug: "hogar-muebles",
      subcategorySlug: "electrodomesticos",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "PYG",
      price: 2750000,
      referenceNewPrice: 5200000,
      referenceNewUrl: "https://www.bristol.com.py",
      isNegotiable: true,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: false,
      localDelivery: true,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "lambare",
      neighSlug: "lambare-centro",
      image: "/uploads/seed/heladera.jpg",
      hoursAgo: 21,
    },
    {
      slug: "taladro-atornillador-dewalt-20v-brushless-maletin-completo",
      title: "Kit Taladro Atornillador 20V Brushless + 2 baterías y maletín",
      description:
        "Motor sin carbones con percutor, incluye 2 baterías de litio 2.0Ah, cargador rápido 220V, set de brocas/puntas y maletín rígido original. Usado en 2 proyectos de carpintería en casa. Delivery gratis en Asunción.",
      sellerEmail: "mateo@reusa.py",
      categorySlug: "herramientas",
      subcategorySlug: "herramientas-electricas",
      condition: "LIKE_NEW",
      isFree: false,
      currency: "PYG",
      price: 680000,
      referenceNewPrice: 1290000,
      referenceNewUrl: "https://www.ferrex.com.py",
      isNegotiable: false,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: true,
      localDeliveryFree: true,
      nationalShipping: true,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-sajonia",
      image: "/uploads/seed/taladro.jpg",
      hoursAgo: 6,
    },
    {
      slug: "cochecito-plegable-bebe-gris-regalo-retiro",
      title: "Cochecito plegable para bebé gris — ¡GRATIS para quien lo necesite!",
      description:
        "Mi bebé ya creció y queremos regalar este cochecito a otra familia que le dé buen uso. Se pliega con una mano, ruedas en buen estado, freno funcional y capota limpia. Único requisito: pasar a retirar por Barrio Centro o San Cristóbal.",
      sellerEmail: "camila@reusa.py",
      categorySlug: "bebes-ninos",
      subcategorySlug: "cochecitos-sillas",
      condition: "GOOD",
      isFree: true,
      currency: "PYG",
      price: 0,
      referenceNewPrice: null,
      referenceNewUrl: null,
      isNegotiable: false,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: true,
      localDelivery: false,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-san-cristobal",
      image: "/uploads/seed/cochecito.jpg",
      hoursAgo: 1,
    },
    {
      slug: "combo-escritorio-roble-minimalista-silla-ergonomica-mesh",
      title: "Combo Escritorio roble 120cm + Silla ergonómica mesh",
      description:
        "Set ideal para home office: escritorio de melamina roble con patas metálicas blancas súper firmes + silla ejecutiva con respaldo mesh respirable y regulación de altura. ¡Bajé el precio esta semana para vender rápido!",
      sellerEmail: "sofia@reusa.py",
      categorySlug: "hogar-muebles",
      subcategorySlug: "oficina-estudio",
      condition: "VERY_GOOD",
      isFree: false,
      currency: "PYG",
      price: 950000,
      previousPrice: 1150000,
      referenceNewPrice: 1980000,
      referenceNewUrl: "https://www.gonzalezgimenez.com.py",
      isNegotiable: true,
      acceptsTrade: false,
      pickupInPerson: true,
      publicMeetup: false,
      localDelivery: true,
      localDeliveryFree: false,
      nationalShipping: false,
      nationalShippingFree: false,
      scheduleVisitOnly: false,
      citySlug: "asuncion-ciudad",
      neighSlug: "asuncion-mburucuya",
      image: "/uploads/seed/escritorio.jpg",
      hoursAgo: 10,
    },
  ];

  const listingMap = new Map<string, string>();

  for (const item of listingsSeed) {
    const cityInfo = cityMap.get(item.citySlug)!;
    const neighInfo = item.neighSlug ? neighMap.get(item.neighSlug) : undefined;
    const baseLat = neighInfo?.lat ?? cityInfo.lat;
    const baseLng = neighInfo?.lng ?? cityInfo.lng;
    const jittered = addPrivacyJitter(baseLat, baseLng, item.slug);
    const savingsPercent = computeSavingsPercent(item.price, item.referenceNewPrice, item.isFree);
    const createdAt = new Date(Date.now() - item.hoursAgo * 3600 * 1000);

    const existing = await prisma.listing.findUnique({ where: { slug: item.slug } });
    if (existing) {
      listingMap.set(item.slug, existing.id);
      continue;
    }

    const created = await prisma.listing.create({
      data: {
        slug: item.slug,
        title: item.title,
        description: item.description,
        sellerId: userMap.get(item.sellerEmail)!,
        categoryId: catMap.get(item.categorySlug)!,
        subcategoryId: catMap.get(item.subcategorySlug)!,
        status: "ACTIVE",
        condition: item.condition,
        isFree: item.isFree,
        currency: item.currency,
        price: item.price,
        previousPrice: item.previousPrice ?? null,
        referenceNewPrice: item.referenceNewPrice ?? null,
        referenceNewUrl: item.referenceNewUrl ?? null,
        savingsPercent,
        isNegotiable: item.isNegotiable,
        acceptsTrade: item.acceptsTrade,
        pickupInPerson: item.pickupInPerson,
        publicMeetup: item.publicMeetup,
        localDelivery: item.localDelivery,
        localDeliveryFree: item.localDeliveryFree,
        nationalShipping: item.nationalShipping,
        nationalShippingFree: item.nationalShippingFree,
        scheduleVisitOnly: item.scheduleVisitOnly,
        showWhatsapp: true,
        departmentId: cityInfo.deptId,
        cityId: cityInfo.id,
        neighborhoodId: neighInfo?.id ?? null,
        approxLat: jittered.lat,
        approxLng: jittered.lng,
        vehicleBrand: item.vehicleBrand ?? null,
        vehicleModel: item.vehicleModel ?? null,
        vehicleYear: item.vehicleYear ?? null,
        vehicleMileageKm: item.vehicleMileageKm ?? null,
        vehicleFuel: item.vehicleFuel ?? null,
        vehicleTransmission: item.vehicleTransmission ?? null,
        vehicleDocs: item.vehicleDocs ?? null,
        realEstateOperation: item.realEstateOperation ?? null,
        realEstateType: item.realEstateType ?? null,
        areaTotalM2: item.areaTotalM2 ?? null,
        areaBuiltM2: item.areaBuiltM2 ?? null,
        bedrooms: item.bedrooms ?? null,
        bathrooms: item.bathrooms ?? null,
        parkingSpaces: item.parkingSpaces ?? null,
        furnished: item.furnished ?? null,
        apparelSize: item.apparelSize ?? null,
        apparelBrand: item.apparelBrand ?? null,
        apparelGender: item.apparelGender ?? null,
        viewsCount: Math.floor(24 + item.hoursAgo * 7),
        expiresAt: expiresIn60Days,
        createdAt,
        images: {
          create: [{ url: item.image, order: 0, isCover: true }],
        },
      },
    });
    listingMap.set(item.slug, created.id);
  }

  // Seed reviews
  const camilaId = userMap.get("camila@reusa.py")!;
  const diegoId = userMap.get("diego@reusa.py")!;
  const sofiaId = userMap.get("sofia@reusa.py")!;
  const mateoId = userMap.get("mateo@reusa.py")!;

  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    await prisma.review.createMany({
      data: [
        {
          authorId: diegoId,
          targetUserId: camilaId,
          listingId: listingMap.get("macbook-air-m2-13-pulgadas-256gb-plata"),
          rating: 5,
          comment: "Súper puntual en Villa Morra, el producto estaba exactamente como en las fotos. Recomendada!",
        },
        {
          authorId: sofiaId,
          targetUserId: camilaId,
          rating: 5,
          comment: "Excelente trato y respuesta rapidísima por chat.",
        },
        {
          authorId: camilaId,
          targetUserId: diegoId,
          listingId: listingMap.get("toyota-corolla-2019-automatico-unico-dueno"),
          rating: 5,
          comment: "Fuimos a ver el auto con mecánico, todo transparente y papeles en regla.",
        },
        {
          authorId: mateoId,
          targetUserId: sofiaId,
          rating: 5,
          comment: "Muy buena comunicación y embalaje perfecto para envío por encomienda.",
        },
        {
          authorId: camilaId,
          targetUserId: mateoId,
          rating: 4,
          comment: "Todo funcionando de 10, gran ahorro respecto al precio nuevo.",
        },
      ],
    });
  }

  // Seed initial conversation & messages for Camila so chat feels alive
  const iphoneId = listingMap.get("iphone-15-pro-128gb-titanio-negro-con-caja")!;
  const convExisting = await prisma.conversation.findUnique({
    where: { listingId_buyerId: { listingId: iphoneId, buyerId: camilaId } },
  });
  if (!convExisting) {
    await prisma.conversation.create({
      data: {
        listingId: iphoneId,
        buyerId: camilaId,
        sellerId: mateoId,
        messages: {
          create: [
            {
              senderId: camilaId,
              body: "Hola Mateo! ¿Sigue disponible el iPhone 15 Pro? ¿Hacés envío a Asunción?",
            },
            {
              senderId: mateoId,
              body: "¡Hola Camila! Sí, sigue disponible. El viernes viajo a Asunción o puedo enviártelo asegurado por encomienda.",
            },
          ],
        },
      },
    });
  }

  // Seed favorites, saved search, notification and 1 moderation report
  const deskId = listingMap.get("combo-escritorio-roble-minimalista-silla-ergonomica-mesh")!;
  const corollaId = listingMap.get("toyota-corolla-2019-automatico-unico-dueno")!;

  await prisma.favorite.upsert({
    where: { userId_listingId: { userId: camilaId, listingId: deskId } },
    update: {},
    create: { userId: camilaId, listingId: deskId, savedPrice: 1150000 },
  });
  await prisma.favorite.upsert({
    where: { userId_listingId: { userId: camilaId, listingId: corollaId } },
    update: {},
    create: { userId: camilaId, listingId: corollaId, savedPrice: 14800 },
  });

  const ssCount = await prisma.savedSearch.count();
  if (ssCount === 0) {
    await prisma.savedSearch.create({
      data: {
        userId: camilaId,
        name: "Ofertas con +40% de ahorro en Asunción",
        queryJson: JSON.stringify({ department: "asuncion", minSavings: 40 }),
      },
    });
  }

  const notifCount = await prisma.notification.count();
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: camilaId,
          type: "PRICE_DROP",
          title: "¡Bajó de precio un favorito!",
          body: '"Combo Escritorio roble 120cm + Silla ergonómica mesh" bajó de Gs. 1.150.000 a Gs. 950.000.',
          linkUrl: "/aviso/combo-escritorio-roble-minimalista-silla-ergonomica-mesh",
          listingId: deskId,
        },
        {
          userId: camilaId,
          type: "MESSAGE",
          title: "Nuevo mensaje de Mateo González",
          body: "Sí, sigue disponible. El viernes viajo a Asunción...",
          linkUrl: "/chat",
          listingId: iphoneId,
        },
      ],
    });
  }

  const reportCount = await prisma.report.count();
  if (reportCount === 0) {
    await prisma.report.create({
      data: {
        listingId: listingMap.get("zapatillas-saucony-jazz-running-talle-42")!,
        reporterId: mateoId,
        reason: "Verificar link de producto nuevo",
        details: "Reporte de ejemplo para probar el panel de moderación de administradores.",
        status: "OPEN",
      },
    });
  }

  // Seed 2 realistic Paraguayan Commercial Brand Stores (Avenida de Marcas 3D)
  const adminId = userMap.get("admin@reusa.py")!;
  const expiresIn90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const guaraniTechStore = await prisma.commercialStore.upsert({
    where: { slug: "guaranitech-store" },
    update: {},
    create: {
      slug: "guaranitech-store",
      name: "GuaraníTech Store",
      tagline: "Apple, Gaming & Outlet Certificado PY",
      description:
        "Showroom oficial de tecnología en Asunción. Equipos nuevos en caja sellada y línea Outlet certificado con garantía escrita de 6 meses y envíos a todo Paraguay.",
      ownerId: camilaId,
      categoryId: catMap.get("tecnologia")!,
      status: "ACTIVE",
      planTier: "FLAGSHIP",
      maxProducts: 250,
      monthlyPricePyg: 690000,
      expiresAt: expiresIn90Days,
      slotOrder: 10,
      logoUrl: "/uploads/seed/logo-guaranitech.svg",
      facadeColor: "#ecfeff",
      neonColor: "#00f0ff",
      secondaryNeon: "#ff2a9d",
      npcGreeting:
        "¡Bienvenido a GuaraníTech Store! Todos nuestros equipos tienen garantía escrita y delivery gratis en Gran Asunción. Sumá lo que te guste al carrito y te cerramos el pedido directo por WhatsApp.",
      departmentId: asuCity.deptId,
      cityId: asuCity.id,
      address: "Av. Mariscal López 3420 c/ Cruz del Chaco, Villa Morra, Asunción",
      openingHours: "Lun a Vie 09:00–19:30 · Sáb 09:30–16:00",
      whatsappPhone: "0981442210",
      instagramUrl: "https://instagram.com/guaranitechpy",
      websiteUrl: "https://reusa-py.vercel.app/tienda/guaranitech-store",
      approxLat: -25.2918,
      approxLng: -57.5812,
      visitsCount: 148,
      productClicksCount: 64,
      whatsappClicksCount: 19,
    },
  });

  const terereSportStore = await prisma.commercialStore.upsert({
    where: { slug: "terere-sport-py" },
    update: {},
    create: {
      slug: "terere-sport-py",
      name: "Tereré Sport & Outdoors",
      tagline: "Bicis MTB, Running & Camping Oficial",
      description:
        "Local especializado en ciclismo, zapatillas deportivas y equipamiento outdoor en San Lorenzo y envíos a todo el país. Nuevos con garantía y saldos de temporada.",
      ownerId: adminId,
      categoryId: catMap.get("deportes")!,
      status: "ACTIVE",
      planTier: "FEATURED",
      maxProducts: 60,
      monthlyPricePyg: 390000,
      expiresAt: expiresIn90Days,
      slotOrder: 20,
      logoUrl: "/uploads/seed/logo-tereresport.svg",
      facadeColor: "#ecfdf5",
      neonColor: "#34d399",
      secondaryNeon: "#fbbf24",
      npcGreeting:
        "¡Mba'éichapa! En Tereré Sport equipamos tus rodadas y entrenamientos con precios directo de importador. Elegí tus favoritos y pedilos juntos por WhatsApp.",
      departmentId: slCity.deptId,
      cityId: slCity.id,
      address: "Ruta Mcal. Estigarribia Km 11, Shopping Pinedo / San Lorenzo",
      openingHours: "Lun a Sáb 09:00–20:00",
      whatsappPhone: "0981100200",
      instagramUrl: "https://instagram.com/tereresportpy",
      websiteUrl: "https://reusa-py.vercel.app/tienda/terere-sport-py",
      approxLat: -25.3292,
      approxLng: -57.5194,
      visitsCount: 92,
      productClicksCount: 41,
      whatsappClicksCount: 12,
    },
  });

  const commercialListingsSeed = [
    {
      slug: "gt-iphone-16-pro-256gb-sellado-garantia",
      title: "iPhone 16 Pro 256GB Titanio Desierto — Nuevo Sellado",
      description:
        "Equipo 100% nuevo en caja sellada, libre de fábrica (eSIM + físico). Incluye factura legal y 1 año de garantía oficial. Delivery gratis en Asunción.",
      sellerId: camilaId,
      storeId: guaraniTechStore.id,
      categorySlug: "tecnologia",
      subcategorySlug: "celulares",
      condition: "BRAND_NEW",
      sku: "GT-IP16P-256",
      stockQuantity: 6,
      currency: "USD",
      price: 1090,
      referenceNewPrice: 1280,
      savingsPercent: 15,
      city: asuCity,
      images: ["/uploads/seed/iphone.jpg", "/uploads/seed/laptop.jpg"],
    },
    {
      slug: "gt-macbook-air-m3-16gb-outlet-exhibicion",
      title: "MacBook Air M3 13\" 16GB / 512GB — Outlet Exhibición",
      description:
        "Unidad de exhibición en vitrina con apenas 8 ciclos de batería, estética 10/10, caja y cargador MagSafe originales. Garantía escrita GuaraníTech 6 meses.",
      sellerId: camilaId,
      storeId: guaraniTechStore.id,
      categorySlug: "tecnologia",
      subcategorySlug: "notebooks",
      condition: "OUTLET",
      sku: "GT-MBA-M3-OUT",
      stockQuantity: 2,
      currency: "USD",
      price: 980,
      referenceNewPrice: 1350,
      savingsPercent: 27,
      city: asuCity,
      images: ["/uploads/seed/laptop.jpg", "/uploads/seed/escritorio.jpg"],
    },
    {
      slug: "gt-combo-home-office-pro-escritorio-silla",
      title: "Setup Home Office Pro — Escritorio + Silla Mesh (Nuevo)",
      description:
        "Combo oficial de oficina en casa: escritorio melamina roble 140cm + silla ergonómica lumbar regulable. Armado gratis en Gran Asunción.",
      sellerId: camilaId,
      storeId: guaraniTechStore.id,
      categorySlug: "hogar-muebles",
      subcategorySlug: "oficina-estudio",
      condition: "BRAND_NEW",
      sku: "GT-SETUP-PRO",
      stockQuantity: 9,
      currency: "PYG",
      price: 1490000,
      referenceNewPrice: 1850000,
      savingsPercent: 19,
      city: asuCity,
      images: ["/uploads/seed/escritorio.jpg"],
    },
    {
      slug: "ts-bicicleta-mtb-aro-29-shimano-deore-nueva",
      title: "Bicicleta MTB Aro 29 Aluminio Shimano Deore 12v — Nueva",
      description:
        "Cuadro aluminio hidroformado liviano, frenos hidráulicos Shimano MT200, suspensión bloqueable al manubrio. Incluye primer service gratis en local.",
      sellerId: adminId,
      storeId: terereSportStore.id,
      categorySlug: "deportes",
      subcategorySlug: "bicicletas",
      condition: "BRAND_NEW",
      sku: "TS-MTB29-DEORE",
      stockQuantity: 5,
      currency: "PYG",
      price: 3450000,
      referenceNewPrice: 4100000,
      savingsPercent: 16,
      city: slCity,
      images: ["/uploads/seed/bici.jpg"],
    },
    {
      slug: "ts-zapatillas-running-pro-outlet-talles-39-44",
      title: "Zapatillas Running Amortiguación Pro — Outlet Temporada",
      description:
        "Pares nuevos de liquidación de temporada, talles 39 al 44 en stock. Súper livianas para asfalto y costanera.",
      sellerId: adminId,
      storeId: terereSportStore.id,
      categorySlug: "ropa-calzado",
      subcategorySlug: "calzado",
      condition: "OUTLET",
      sku: "TS-RUN-PRO-OUT",
      stockQuantity: 14,
      currency: "PYG",
      price: 320000,
      referenceNewPrice: 540000,
      savingsPercent: 41,
      city: slCity,
      images: ["/uploads/seed/zapatillas.jpg", "/uploads/seed/medias.jpg"],
    },
    {
      slug: "ts-pack-6-medias-compresion-running-nuevas",
      title: "Pack x6 Medias Técnicas Compresión Running — Nuevas",
      description:
        "Tejido respirable anti-ampollas, ideales para ciclismo, running y gimnasio. Stock permanente en colores surtidos.",
      sellerId: adminId,
      storeId: terereSportStore.id,
      categorySlug: "ropa-calzado",
      subcategorySlug: "medias-accesorios",
      condition: "BRAND_NEW",
      sku: "TS-MED-6PK",
      stockQuantity: 32,
      currency: "PYG",
      price: 95000,
      referenceNewPrice: 135000,
      savingsPercent: 30,
      city: slCity,
      images: ["/uploads/seed/medias.jpg"],
    },
  ];

  for (const item of commercialListingsSeed) {
    const existing = await prisma.listing.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      await prisma.listing.create({
        data: {
          slug: item.slug,
          title: item.title,
          description: item.description,
          sellerId: item.sellerId,
          storeId: item.storeId,
          categoryId: catMap.get(item.categorySlug)!,
          subcategoryId: catMap.get(item.subcategorySlug) || null,
          status: "ACTIVE",
          condition: item.condition,
          sku: item.sku,
          stockQuantity: item.stockQuantity,
          isFree: false,
          currency: item.currency,
          price: item.price,
          referenceNewPrice: item.referenceNewPrice,
          savingsPercent: item.savingsPercent,
          isNegotiable: false,
          acceptsTrade: false,
          pickupInPerson: true,
          publicMeetup: false,
          localDelivery: true,
          localDeliveryFree: true,
          nationalShipping: true,
          nationalShippingFree: false,
          showWhatsapp: true,
          departmentId: item.city.deptId,
          cityId: item.city.id,
          approxLat: item.city.lat,
          approxLng: item.city.lng,
          isFeatured: true,
          expiresAt: expiresIn90Days,
          images: {
            create: item.images.map((url, idx) => ({
              url,
              order: idx,
              isCover: idx === 0,
            })),
          },
        },
      });
    }
  }

  const inquiryCount = await prisma.storeInquiry.count();
  if (inquiryCount === 0) {
    await prisma.storeInquiry.create({
      data: {
        businessName: "Casa Mbarete Herramientas",
        contactName: "Roberto Duarte",
        contactPhone: "0982334455",
        contactEmail: "roberto@casambarete.com.py",
        rubro: "Herramientas",
        cityName: "Luque",
        desiredPlan: "FEATURED",
        instagramOrWeb: "@casambaretepy",
        notes: "Queremos subir 45 productos de ferretería y herramientas eléctricas con nuestro logo en el mundo 3D.",
        status: "NEW",
      },
    });
  }

  console.log(
    `Seed complete: ${DEPARTMENTS_DATA.length} departments, ${CATEGORIES_DATA.length} root categories, ${listingsSeed.length + commercialListingsSeed.length} listings, 2 commercial stores.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
