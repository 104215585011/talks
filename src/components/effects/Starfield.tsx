"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils/cn";

type StarfieldProps = {
  className?: string;
  density?: number;
};

export function Starfield({ className, density = 900 }: StarfieldProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1000);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(density * 3);

    for (let index = 0; index < density; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 900;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 650;
      positions[index * 3 + 2] = Math.random() * -900;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: "#BFF7FF",
      opacity: 0.82,
      size: 1.35,
      transparent: true
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    camera.position.z = 160;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    mount.appendChild(renderer.domElement);

    let animationFrame = 0;

    function resize() {
      if (!mount) {
        return;
      }

      const { clientHeight, clientWidth } = mount;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    }

    function animate() {
      points.rotation.y += 0.0007;
      points.rotation.x += 0.00025;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    }

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [density]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden bg-cosmic-grid bg-[length:72px_72px] opacity-90",
        "before:absolute before:inset-0 before:animate-drift before:bg-[radial-gradient(circle_at_30%_20%,rgba(0,229,255,0.22),transparent_28rem),radial-gradient(circle_at_78%_18%,rgba(124,77,255,0.2),transparent_26rem)]",
        className
      )}
      ref={mountRef}
    />
  );
}
