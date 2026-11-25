"use client";

import {
  Armchair,
  Baby,
  Bike,
  BookOpen,
  Building,
  Building2,
  Car,
  Dumbbell,
  Footprints,
  Gamepad2,
  Hammer,
  Home,
  LampDesk,
  Laptop,
  Map as MapIcon,
  Music,
  Package,
  Puzzle,
  Refrigerator,
  Shirt,
  Smartphone,
  Tag,
  Tent,
  Truck,
  Tv,
  Wrench,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphone,
  Laptop,
  Gamepad2,
  Tv,
  Car,
  Truck,
  Bike,
  Wrench,
  Home,
  Building2,
  Map: MapIcon,
  Building,
  Shirt,
  Footprints,
  Tag,
  Armchair,
  Refrigerator,
  LampDesk,
  Dumbbell,
  Tent,
  Hammer,
  Baby,
  Puzzle,
  Music,
  BookOpen,
  Package,
};

export function CategoryIcon({
  name,
  className = "w-4 h-4",
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICON_MAP[name]) || Package;
  return <Icon className={className} />;
}
