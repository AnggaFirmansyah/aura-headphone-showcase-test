"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { buildProduct, buildStudio, createPost, createRenderer } from "@/lib/aura";
import { CHAPTERS } from "@/lib/story";

const N = CHAPTERS.length;

// camera keyframes, one per scene
const KF = [
  { pos: [0, -0.2, 6.4], target: [0, -0.6, 0] }, // title card
  { pos: [4.6, -0.1, 1.1], target: [0, -0.35, 0] }, // near-profile silhouette
  { pos: [0.4, 1.75, 3.3], target: [0, 0.65, 0] }, // band, from above
  { pos: [1.5, 0.15, 4.5], target: [0.35, -0.7, 0] }, // the cups opening
  { pos: [0.6, -0.05, 4.3], target: [1.5, -0.7, 0] }, // the core, close in
  { pos: [0, 0.15, 7.0], target: [0, -0.45, 0] }, // the tuning, wide and open
  { pos: [0.9, 0.55, 5.3], target: [0, -0.35, 0] }, // reassembly
  { pos: [0, -0.45, 6.6], target: [0, -0.85, 0] }, // finale, the room warms
];

// explode amount per part group AT each scene; each scroll step tweens scene i -> i+1.
// staged reveal (band, then shells, then the core) and one reassembly beat near the end.
const OPEN = {
  band: [0, 0, 0.4, 0.4, 0.4, 0.4, 0, 0],
  yoke: [0, 0, 1, 1, 1, 1, 0, 0],
  shell: [0, 0, 0, 0.8, 1, 1, 0, 0],
  core: [0, 0, 0, 0, 1, 1, 0, 0],
};

const PANEL = {
  left: "inset-x-6 bottom-12 mx-auto max-w-sm lg:left-16 lg:right-auto lg:mx-0",
  center: "inset-x-6 bottom-12 mx-auto max-w-sm text-center",
  wide: "inset-x-6 bottom-12 mx-auto max-w-xl lg:left-16 lg:right-auto lg:mx-0",
};

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export default function StoryScene() {
  const stageRef = useRef(null);
  const barRef = useRef(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);

  const jump = (i) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTo({
      top: (i / (N - 1)) * max,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let cleanup;
    try {
      cleanup = boot(stage);
    } catch (err) {
      console.error(err);
      setFailed(true);
    }
    return () => cleanup?.();

    function boot(stage) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = createRenderer(stage);
      // the canvas covers the whole page, so it must not swallow touch scrolling
      renderer.domElement.style.touchAction = "auto";
      renderer.domElement.style.cursor = "default";

      const scene = new THREE.Scene();
      const { kicker } = buildStudio(renderer, scene);

      const camera = new THREE.PerspectiveCamera(
        34,
        stage.clientWidth / stage.clientHeight,
        0.1,
        60
      );

      const { product, parts } = buildProduct();
      scene.add(product);

      // document height is vh-based, so it only changes with the viewport: cache it and refresh on resize.
      // (reading scrollHeight inside the render loop forces layout every frame)
      let max = 1;
      let needsPaint = true;
      let post = null; // post chain on wide viewports; phones keep the plain pipeline
      const onResize = () => {
        renderer.setSize(stage.clientWidth, stage.clientHeight);
        camera.aspect = stage.clientWidth / stage.clientHeight;
        camera.updateProjectionMatrix();
        max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        needsPaint = true;
        post?.composer.setSize(stage.clientWidth, stage.clientHeight);
      };
      onResize();
      addEventListener("resize", onResize);
      if (innerWidth >= 1024) post = createPost(renderer, scene, camera, stage.clientWidth, stage.clientHeight);

      // deep link: /story?p=0.6 opens mid film; a plain refresh just resumes from the restored scroll
      const p0 = parseFloat(new URLSearchParams(location.search).get("p"));
      if (p0 >= 0 && p0 <= 1) scrollTo(0, p0 * max);
      let p = clamp01(scrollY / max); // damped progress: the film glides to the scroll, it does not step with the wheel

      const kf = KF.map((k) => ({
        pos: new THREE.Vector3(...k.pos),
        target: new THREE.Vector3(...k.target),
      }));
      // pull the camera back on narrow screens so close-ups keep their subject in frame
      const view = () => (innerWidth < 640 ? 1.45 : innerWidth < 1024 ? 1.2 : 1);
      const off = new THREE.Vector3();
      const A = { p: new THREE.Vector3(), t: new THREE.Vector3() };
      const B = { p: new THREE.Vector3(), t: new THREE.Vector3() };
      const fill = (into, i) => {
        const k = kf[i];
        into.p.copy(k.target).addScaledVector(off.subVectors(k.pos, k.target), view());
        into.t.copy(k.target);
      };
      const tgt = new THREE.Vector3();
      let lastChapter = -1;
      let lastBar = -1;
      const clock = new THREE.Clock();

      const frame = () => {
        // time-based ease toward the scroll position: wheel notches glide instead of snapping the camera
        const dt = Math.min(clock.getDelta(), 0.05);
        const target = clamp01(scrollY / max);
        const was = p;
        p = reduced ? target : p + (target - p) * (1 - Math.exp(-dt * 7.5));
        const moving = Math.abs(p - was) > 1e-6 || Math.abs(target - p) > 1e-4;

        let s = p * (N - 1);
        const ch = Math.min(N - 1, Math.round(s));
        if (reduced) {
          // no scrub: snap to each scene's keyframe
          s = ch;
        }
        if (ch !== lastChapter) {
          lastChapter = ch;
          setActive(ch);
        }

        // converged and nothing changed since the last paint: keep the frame, skip the GPU work
        if (!moving && !needsPaint) return;
        needsPaint = false;

        const i = Math.min(N - 2, Math.floor(s));
        const f = easeInOut(s - i);

        fill(A, i);
        fill(B, i + 1);
        camera.position.lerpVectors(A.p, B.p, f);
        tgt.lerpVectors(A.t, B.t, f);
        camera.lookAt(tgt);

        for (const part of parts) {
          const arr = OPEN[part.userData.group];
          if (!arr) continue;
          part.position.lerpVectors(
            part.userData.base,
            part.userData.to,
            arr[i] + (arr[i + 1] - arr[i]) * f
          );
        }
        // the room warms as the film closes
        kicker.intensity = 0.55 + clamp01(s - (N - 2));

        const bx = s / (N - 1);
        if (barRef.current && Math.abs(bx - lastBar) > 0.0005) {
          lastBar = bx;
          barRef.current.style.transform = `scaleX(${bx})`;
        }

        if (post) post.composer.render();
        else renderer.render(scene, camera);
      };

      // render once at boot: the first paint must match the scrolled position, deep links included
      frame();
      renderer.setAnimationLoop(frame);

      return () => {
        removeEventListener("resize", onResize);
        renderer.setAnimationLoop(null);
        post?.dispose();
        renderer.dispose();
        stage.removeChild(renderer.domElement);
      };
    }
  }, []);

  return (
    <>
      <div ref={stageRef} className="fixed inset-0 z-0" />

      {/* keeps the chapter rail legible when bright parts sweep under it */}
      <div className="pointer-events-none fixed inset-y-0 right-0 z-10 hidden w-56 bg-gradient-to-l from-base via-base/70 to-transparent lg:block" />

      {/* chapter copy sits on this bed while parts travel under it */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[38vh] bg-gradient-to-t from-base via-base/85 via-[80%] to-transparent" />

      <div
        ref={barRef}
        className="fixed left-0 top-0 z-40 h-px w-full origin-left bg-gold"
        style={{ transform: "scaleX(0)" }}
      />

      {/* chapter pathfinder: orientation, and the only way to skip the arc */}
      <nav
        aria-label="Chapters"
        className="fixed right-8 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex"
      >
        {CHAPTERS.map((c, i) => (
          <button
            key={c.title}
            type="button"
            onClick={() => jump(i)}
            aria-current={i === active ? "step" : undefined}
            className="group flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            <span
              className={`whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition ${
                i === active ? "text-gold" : "text-dim opacity-0 group-hover:opacity-100"
              }`}
            >
              {c.title}
            </span>
            <span
              className={`h-px transition-all duration-300 ${
                i === active ? "w-7 bg-gold" : "w-3.5 bg-line group-hover:w-7"
              }`}
            />
          </button>
        ))}
      </nav>

      {CHAPTERS.map((c, i) => (
        <div
          key={c.title}
          inert={i !== active}
          aria-hidden={i !== active}
          className={`pointer-events-none fixed z-20 transition-opacity duration-500 motion-reduce:transition-none ${PANEL[c.pos]} ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="font-mono text-[11px] text-gold">
            {String(i + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{c.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-dim">{c.body}</p>
          {c.stats && (
            <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
              {c.stats.map(([v, k]) => (
                <div key={k}>
                  <dt className="font-mono text-base text-gold">{v}</dt>
                  <dd className="mt-0.5 text-[11px] uppercase tracking-wider text-dim">{k}</dd>
                </div>
              ))}
            </dl>
          )}
          {c.cta && (
            <Link
              href="/specs"
              className="pointer-events-auto mt-6 inline-block bg-gold px-6 py-3.5 text-base font-semibold text-base transition hover:bg-gold-bright active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              See the numbers
            </Link>
          )}
          {c.hint && (
            <p className="mt-6 font-mono text-[10px] tracking-[0.35em] text-dim">SCROLL</p>
          )}
        </div>
      ))}

      {failed && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-base px-8 text-center">
          <p className="max-w-sm font-mono text-sm text-dim">
            This showcase needs WebGL. Try another browser, or enable hardware acceleration.
          </p>
        </div>
      )}
    </>
  );
}
