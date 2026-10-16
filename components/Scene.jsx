"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildProduct, buildStudio, createControls, createFitter, createPost, createRenderer } from "@/lib/aura";

export default function Scene({ colorway }) {
  const stageRef = useRef(null);
  const spotsRef = useRef(null);
  const yokeRef = useRef(null);
  const ancRef = useRef(null);
  const driversRef = useRef(null);
  const apiRef = useRef(null);
  const [failed, setFailed] = useState(false);

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
    return () => {
      apiRef.current = null;
      cleanup?.();
    };

    function boot(stage) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = createRenderer(stage);
      const scene = new THREE.Scene();
      buildStudio(renderer, scene);

      const camera = new THREE.PerspectiveCamera(
        34,
        stage.clientWidth / stage.clientHeight,
        0.1,
        60
      );
      const controls = createControls(camera, renderer.domElement, reduced);

      const { product, mats } = buildProduct();
      scene.add(product);

      /* ---- colour targets (swatches feed these through the api) ---- */
      const bodyTarget = new THREE.Color("#22262d");
      const metalTarget = new THREE.Color("#c9ced6");

      /* ---- hotspots track the product in screen space ---- */
      const spots = [
        { el: yokeRef.current, pos: new THREE.Vector3(0, 1.12, 0) },
        { el: ancRef.current, pos: new THREE.Vector3(-1.06, -0.62, 0) },
        { el: driversRef.current, pos: new THREE.Vector3(1.06, -0.62, 0) },
      ];
      const spotsEl = spotsRef.current;
      const v = new THREE.Vector3();

      function updateSpots() {
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        for (const s of spots) {
          v.copy(s.pos).applyMatrix4(product.matrixWorld).project(camera);
          s.el.style.visibility = v.z < 1 ? "" : "hidden";
          s.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
        }
      }

      const fit = createFitter(camera, controls);
      let post = null; // post chain on wide viewports; phones keep the plain pipeline
      const onResize = () => {
        renderer.setSize(stage.clientWidth, stage.clientHeight);
        fit(stage.clientWidth, stage.clientHeight);
        post?.composer.setSize(stage.clientWidth, stage.clientHeight);
      };
      onResize();
      addEventListener("resize", onResize);
      if (innerWidth >= 1024) post = createPost(renderer, scene, camera, stage.clientWidth, stage.clientHeight);

      /* ---- keyboard orbit + hint ---- */
      const hint = document.getElementById("hint");
      const hideHint = () => hint?.classList.add("gone");
      const sph = new THREE.Spherical();
      const off = new THREE.Vector3();
      const onKey = (e) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        off.subVectors(camera.position, controls.target);
        sph.setFromVector3(off);
        if (e.key === "ArrowLeft") sph.theta -= 0.12;
        if (e.key === "ArrowRight") sph.theta += 0.12;
        if (e.key === "ArrowUp") sph.phi -= 0.09;
        if (e.key === "ArrowDown") sph.phi += 0.09;
        sph.phi = THREE.MathUtils.clamp(sph.phi, controls.minPolarAngle, controls.maxPolarAngle);
        camera.position.copy(controls.target).add(off.setFromSpherical(sph));
        controls.update();
        hideHint();
      };
      addEventListener("keydown", onKey);
      renderer.domElement.addEventListener("pointerdown", hideHint, { once: true });
      const hintTimer = setTimeout(hideHint, 9000);

      /* ---- loop ---- */
      let intro = reduced ? 1 : 0;
      if (intro === 1) spotsEl.style.opacity = 1;
      const introDur = 1.6;
      const easeOut = (x) => 1 - (1 - x) ** 3;
      const clock = new THREE.Clock();

      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        if (intro < 1) {
          intro = Math.min(1, intro + dt / introDur);
          const e = easeOut(intro);
          product.position.y = -0.15 - 1.1 * (1 - e);
          product.rotation.y = -0.65 * (1 - e);
          spotsEl.style.opacity = e;
        } else if (!reduced) {
          product.position.y = -0.15 + Math.sin(t * 0.9) * 0.03;
        }

        const k = 1 - Math.exp(-dt * 6);
        mats.body.color.lerp(bodyTarget, k);
        mats.metal.color.lerp(metalTarget, k);

        controls.update();
        if (post) post.composer.render();
        else renderer.render(scene, camera);
        updateSpots();
      });

      apiRef.current = {
        setColors(body, metal) {
          bodyTarget.set(body);
          metalTarget.set(metal);
          if (reduced) {
            mats.body.color.copy(bodyTarget);
            mats.metal.color.copy(metalTarget);
          }
        },
      };

      return () => {
        removeEventListener("resize", onResize);
        removeEventListener("keydown", onKey);
        clearTimeout(hintTimer);
        renderer.setAnimationLoop(null);
        controls.dispose();
        post?.dispose();
        renderer.dispose();
        stage.removeChild(renderer.domElement);
      };
    }
  }, []);

  useEffect(() => {
    if (colorway) apiRef.current?.setColors(colorway.body, colorway.metal);
  }, [colorway]);

  return (
    <>
      <div ref={stageRef} className="absolute inset-0 z-0" />

      {/* hotspots: only where there is room for chips; below xl the spec list carries them */}
      <div
        ref={spotsRef}
        className="pointer-events-none absolute inset-0 z-10 hidden opacity-0 xl:block"
      >
        <div className="hs" ref={yokeRef}>
          <span className="dot" />
          <span className="chip">
            <span className="bg-base/70 border border-line backdrop-blur-sm px-2.5 py-1.5 font-mono text-[11px] text-ink">
              milled aluminium yoke
            </span>
          </span>
        </div>
        <div className="hs" ref={ancRef}>
          <span className="dot" />
          <span className="chip">
            <span className="bg-base/70 border border-line backdrop-blur-sm px-2.5 py-1.5 font-mono text-[11px] text-ink">
              adaptive ANC / 12 mics
            </span>
          </span>
        </div>
        <div className="hs" ref={driversRef}>
          <span className="dot" />
          <span className="chip">
            <span className="bg-base/70 border border-line backdrop-blur-sm px-2.5 py-1.5 font-mono text-[11px] text-ink">
              40 mm beryllium drivers
            </span>
          </span>
        </div>
      </div>

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
