"use client";

import SVGFloorPlanView from "./SVGFloorPlanView";
import { PathStep } from "@/lib/pathfinding";

interface Props {
  step: PathStep;
}

export default function FloorPlanView({ step }: Props) {
  return <SVGFloorPlanView step={step} />;
}
