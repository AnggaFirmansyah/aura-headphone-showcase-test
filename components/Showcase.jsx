"use client";

import { useEffect, useRef, useState } from "react";
import Nav from "./Nav";
import Scene from "./Scene";
import { COLORWAYS } from "./colorways";

export default function Showcase() {
  const [colorway, setColorway] = useState("midnight");
  const [added, setAdded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const addToBag = () => {
    if (added) return;
    setAdded(true);
    timerRef.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="relative h-dvh overflow-hidden">
      <Scene colorway={COLORWAYS[colorway]} />

      {/* depth: warm pool behind the product, then a vignette that sinks the edges */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_55%_45%_at_52%_44%,rgba(217,164,65,.09),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(11,12,14,.9)_100%)]" />

      <Nav />

      <main className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-base via-base via-[86%] to-transparent px-6 pb-6 pt-16 lg:inset-x-auto lg:bottom-auto lg:left-16 lg:top-1/2 lg:w-[26rem] lg:-translate-y-1/2 lg:bg-none lg:p-0">
        <h1 className="rv text-5xl font-extrabold tracking-tight sm:text-6xl" style={{ "--d": ".2s" }}>
          AURA One
        </h1>
        <p className="rv mt-4 max-w-sm text-sm leading-relaxed text-dim" style={{ "--d": ".3s" }}>
          Reference ANC headphones, machined from billet aluminium. Tuned in Berlin.
        </p>

        <div className="rv mt-8 flex items-baseline gap-4" style={{ "--d": ".4s" }}>
          <p className="font-mono text-2xl tabular-nums">$329</p>
          <p className="text-sm text-dim">free returns / 5 yr warranty</p>
        </div>

        <div className="rv mt-8" style={{ "--d": ".5s" }}>
          <p className="font-mono text-[11px] text-dim">
            colour / <span>{colorway}</span>
          </p>
          <div className="mt-3 flex items-center gap-3">
            {Object.entries(COLORWAYS).map(([key, cw]) => (
              <button
                key={key}
                className="sw"
                style={{ "--sw": cw.body }}
                aria-label={key[0].toUpperCase() + key.slice(1)}
                aria-pressed={colorway === key}
                onClick={() => setColorway(key)}
              />
            ))}
          </div>
        </div>

        <button
          id="cta"
          className="btn rv mt-8 w-full cursor-pointer bg-gold px-6 py-3.5 font-semibold text-base text-base transition hover:bg-gold-bright active:scale-[.98] sm:w-auto"
          style={{ "--d": ".6s" }}
          onClick={addToBag}
        >
          {added ? "Added to bag" : "Add to bag / $329"}
        </button>
        <p className="rv mt-3 font-mono text-[11px] text-dim" style={{ "--d": ".65s" }}>
          ships in 48 h
        </p>

        <ul
          className="rv mt-6 hidden grid-cols-2 gap-x-6 gap-y-1 font-mono text-[11px] text-dim lg:grid xl:hidden"
          style={{ "--d": ".7s" }}
        >
          <li>adaptive ANC / 12 mics</li>
          <li>40 h playback</li>
          <li>40 mm beryllium drivers</li>
          <li>USB-C + 3.5 mm</li>
        </ul>
      </main>

      <p
        id="hint"
        className="hint pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] text-dim lg:top-auto lg:bottom-5"
      >
        <span className="sm:hidden">drag to orbit / pinch to zoom</span>
        <span className="hidden sm:inline">drag to orbit / scroll to zoom</span>
      </p>
    </div>
  );
}
