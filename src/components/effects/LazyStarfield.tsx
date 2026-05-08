"use client";

import dynamic from "next/dynamic";

const DynamicStarfield = dynamic(() => import("./Starfield").then((module) => module.Starfield), {
  ssr: false
});

type LazyStarfieldProps = {
  density?: number;
};

export function LazyStarfield({ density }: LazyStarfieldProps) {
  return <DynamicStarfield density={density} />;
}
