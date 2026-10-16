"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildProduct, buildStudio, createControls, createFitter, createPost, createRenderer } from "@/lib/aura";

export default function SpecsScene({ exploded }) {
  const stageRef = useRef(null);
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

      const { product, parts } = buildProduct();
      scene.add(product);

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

      let target = 0; // 0 assembled, 1 exploded
      let t = 0;
      let intro = reduced ? 1 : 0;
      const introDur = 1.4;
      const easeOut = (x) => 1 - (1 - x) ** 3;
      const clock = new THREE.Clock();

      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.05);

        if (intro < 1) {
          intro = Math.min(1, intro + dt / introDur);
          product.position.y = -0.15 - 1.1 * (1 - easeOut(intro));
        }

        t = reduced ? target : t + (target - t) * (1 - Math.exp(-dt * 5));

        // exploded diagram: shorter throw on wide keeps parts clear of the spec column;
        // the whole diagram shrinks as it opens (more on compact) so nothing clips
        const wide = innerWidth >= 1024;
        const spread = wide ? 0.62 : 0.55;
        for (const part of parts) {
          part.position.lerpVectors(part.userData.base, part.userData.to, t * spread);
        }
        product.position.x = t * (wide ? 0.16 : 0);
        product.scale.setScalar(1 - t * (wide ? 0.34 : 0.43));

        controls.update();
        if (post) post.composer.render();
        else renderer.render(scene, camera);
      });

      apiRef.current = {
        setExploded(v) {
          target = v ? 1 : 0;
        },
      };

      return () => {
        removeEventListener("resize", onResize);
        renderer.setAnimationLoop(null);
        controls.dispose();
        post?.dispose();
        renderer.dispose();
        stage.removeChild(renderer.domElement);
      };
    }
  }, []);

  useEffect(() => {
    apiRef.current?.setExploded(exploded);
  }, [exploded]);

  return (
    <>
      <div ref={stageRef} className="absolute inset-0 z-0" />
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
