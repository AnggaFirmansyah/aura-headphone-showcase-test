"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";
import SpecsScene from "./SpecsScene";

const SPECS = [
  ["driver", "40 mm beryllium"],
  ["frequency", "4 Hz / 40 kHz"],
  ["noise cancelling", "adaptive / 12 mics"],
  ["battery", "40 h / 6 h in 5 min"],
  ["codecs", "LDAC / aptX Lossless / AAC"],
  ["weight", "284 g"],
  ["price", "$329"],
];

export default function Specs() {
  const [exploded, setExploded] = useState(false);

  // deep link: /specs?explode=1 opens with the diagram apart
  useEffect(() => {
    if (new URLSearchParams(location.search).get("explode") === "1") setExploded(true);
  }, []);

  return (
    <div className="relative h-dvh overflow-hidden">
      <SpecsScene exploded={exploded} />
      <Nav />

      <main className="absolute inset-x-0 bottom-0 z-20 max-h-[75dvh] overflow-y-auto bg-gradient-to-t from-base via-base via-[86%] to-transparent px-6 pb-8 pt-16 lg:inset-x-auto lg:bottom-auto lg:left-16 lg:top-1/2 lg:max-h-none lg:w-[26rem] lg:-translate-y-1/2 lg:overflow-visible lg:bg-none lg:p-0">
        <h1 className="rv text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ "--d": ".15s" }}>
          Engineering
        </h1>
        <p className="rv mt-3 text-sm leading-relaxed text-dim" style={{ "--d": ".25s" }}>
          Every number measured on a production unit, not a prototype.
        </p>

        <dl className="rv mt-7 divide-y divide-line border-y border-line" style={{ "--d": ".35s" }}>
          {SPECS.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-6 py-2.5">
              <dt className="font-mono text-[11px] text-dim">{k}</dt>
              <dd className="text-right font-mono text-sm tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <button
          className="rv mt-7 w-full cursor-pointer border border-line px-6 py-3.5 font-semibold transition hover:bg-panel active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-auto"
          style={{ "--d": ".45s" }}
          onClick={() => setExploded((v) => !v)}
        >
          {exploded ? "Assemble" : "Exploded view"}
        </button>
      </main>
    </div>
  );
}
