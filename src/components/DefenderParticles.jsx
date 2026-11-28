import React, { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  UniformsUtils,
  WebGLRenderer,
} from 'three';
import { DEFENDER_SHIELD_SRC } from '../assets/defenderShield';

const THREE = {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  UniformsUtils,
  WebGLRenderer,
};

export default function DefenderParticles() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    let animId = null;

    const N = 640;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const FOV = 30;
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    const group = new THREE.Group();
    group.position.y = 0.12;
    scene.add(group);

    const uniforms = {
      uP: { value: 0 },
      uFade: { value: 1 },
      uBoom: { value: 0 },
      uTime: { value: 0 },
      uScale: { value: 800 },
      uMix: { value: 0 }
    };

    const VS = `
      attribute vec3 aStart;
      attribute vec3 aColor;
      attribute float aDelay;
      attribute vec3 aRnd;
      attribute float aGlow;
      uniform float uP, uFade, uBoom, uTime, uScale, uSize, uGain, uAlpha;
      varying vec3 vCol;
      varying float vA;
      varying float vDark;
      float ease(float t){ return t<0.5 ? 4.0*t*t*t : 1.0-pow(-2.0*t+2.0,3.0)/2.0; }
      void main(){
        float t = clamp((uP - aDelay*0.55) / 0.45, 0.0, 1.0);
        float e = 1.0 - pow(1.0 - t, 3.0);
        vec3 p = mix(aStart, position, e);
        float sw = sin(3.14159*e) * (1.0 - e*0.2);
        float ang = sw * (1.6 + aRnd.x*1.4);
        float cs = cos(ang), sn = sin(ang);
        p.xz = mat2(cs, -sn, sn, cs) * p.xz;
        p.y += sw * (aRnd.y - 0.5) * 1.2;
        float settle = smoothstep(0.92, 1.0, e);
        p += settle * 0.0015 * vec3(sin(uTime*1.3 + aRnd.x*40.0), cos(uTime*1.1 + aRnd.y*40.0), sin(uTime*0.9 + aRnd.z*40.0));
        vec3 dir = normalize(position + (aRnd - 0.5) * 0.9 + vec3(0.0, 0.0, 0.25));
        p += dir * uBoom * (1.2 + 5.0 * aRnd.y);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float pulse = 1.0 + aGlow * (0.22 * sin(uTime*2.2) + 0.1 * sin(uTime*5.3));
        float flight = 1.0 + (1.0 - e) * 0.6;
        float dark = 1.0 - smoothstep(0.0, 0.12, dot(aColor, vec3(0.333)));
        gl_PointSize = max(1.8, uSize * uScale / -mv.z * (0.95 + 0.2*aRnd.z) * (aGlow>0.0?1.35:1.15) * (1.0 + 1.8 * dark));
        vCol = aColor * (aGlow > 0.0 ? uGain * pulse * flight : 1.0) * uFade;
        vA = uAlpha * uFade;
        vDark = dark;
      }
    `;

    const FS_MAIN = `
      precision mediump float;
      varying vec3 vCol;
      varying float vA;
      varying float vDark;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, mix(0.2, 0.44, vDark), d);
        gl_FragColor = vec4(vCol, a * vA);
      }
    `;

    const FS_HALO = `
      precision mediump float;
      varying vec3 vCol;
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vCol * a, 1.0) * vec4(vec3(1.0), 1.0);
        gl_FragColor.rgb *= vA;
      }
    `;

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    const createdGeometries = [];
    const createdMaterials = [];

    function resize() {
      if (!renderer.domElement) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const fitH = 1.22 / Math.tan((FOV * Math.PI) / 360);
      const fitW = 1.04 / (Math.tan((FOV * Math.PI) / 360) * camera.aspect);
      camera.position.set(0, 0, Math.max(fitH, fitW));
      uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((FOV * Math.PI) / 360));
    }

    window.addEventListener('resize', resize);
    resize();

    // Come together over 3s, then stay together indefinitely
    const FORM = 3.0;
    let t0 = performance.now();

    let mx = 0, my = 0, tx = 0, ty = 0;
    function handlePointerMove(e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener('pointermove', handlePointerMove);

    function mk(P, S, C, D, extra, halo, spacing) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute('aStart', new THREE.Float32BufferAttribute(S, 3));
      geo.setAttribute('aColor', new THREE.Float32BufferAttribute(C, 3));
      geo.setAttribute('aDelay', new THREE.Float32BufferAttribute(D, 1));

      if (extra) {
        geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(extra.rnd, 3));
        geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(extra.glw, 1));
      } else {
        const n = D.length;
        const z3 = new Float32Array(n * 3);
        const z1 = new Float32Array(n);
        for (let k = 0; k < n * 3; k++) z3[k] = Math.random();
        geo.setAttribute('aRnd', new THREE.BufferAttribute(z3, 3));
        geo.setAttribute('aGlow', new THREE.BufferAttribute(z1, 1));
      }

      const mat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          uniforms,
          {
            uSize: { value: halo ? 16 * spacing : 2.2 * spacing },
            uAlpha: { value: halo ? 0.08 : 0.98 },
            uGain: { value: halo ? 1.0 : 0.95 }
          }
        ]),
        vertexShader: VS,
        fragmentShader: halo ? FS_HALO : FS_MAIN,
        transparent: true,
        depthWrite: !halo,
        depthTest: !halo,
        blending: halo ? THREE.AdditiveBlending : THREE.NormalBlending
      });

      mat.uniforms.uP = uniforms.uP;
      mat.uniforms.uFade = uniforms.uFade;
      mat.uniforms.uBoom = uniforms.uBoom;
      mat.uniforms.uTime = uniforms.uTime;
      mat.uniforms.uScale = uniforms.uScale;
      mat.uniforms.uMix = uniforms.uMix;

      createdGeometries.push(geo);
      createdMaterials.push(mat);

      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      return pts;
    }

    const img = new Image();
    img.onload = function () {
      if (isDisposed) return;

      const cv = document.createElement('canvas');
      cv.width = cv.height = N;
      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0, N, N);
      const d = cx.getImageData(0, 0, N, N).data;

      // Detect subject silhouette via flood fill from top border
      const isSubject = new Uint8Array(N * N);
      isSubject.fill(1);
      const visited = new Uint8Array(N * N);
      const queue = [];
      const bgThresh = 8;

      for (let x = 0; x < N; x++) {
        const idx = x * 4;
        if (Math.max(d[idx], d[idx + 1], d[idx + 2]) <= bgThresh) {
          visited[x] = 1;
          isSubject[x] = 0;
          queue.push(x);
        }
      }
      for (let y = 1; y < 35; y++) {
        const leftCoord = y * N;
        const leftIdx = leftCoord * 4;
        if (Math.max(d[leftIdx], d[leftIdx + 1], d[leftIdx + 2]) <= bgThresh && !visited[leftCoord]) {
          visited[leftCoord] = 1;
          isSubject[leftCoord] = 0;
          queue.push(leftCoord);
        }
        const rightCoord = y * N + (N - 1);
        const rightIdx = rightCoord * 4;
        if (Math.max(d[rightIdx], d[rightIdx + 1], d[rightIdx + 2]) <= bgThresh && !visited[rightCoord]) {
          visited[rightCoord] = 1;
          isSubject[rightCoord] = 0;
          queue.push(rightCoord);
        }
      }

      let qHead = 0;
      while (qHead < queue.length) {
        const curr = queue[qHead++];
        const cellX = curr % N;
        const cellY = (curr / N) | 0;

        const neighbors = [
          cellX > 0 ? curr - 1 : -1,
          cellX < N - 1 ? curr + 1 : -1,
          cellY > 0 ? curr - N : -1,
          cellY < N - 1 ? curr + N : -1
        ];

        for (let k = 0; k < 4; k++) {
          const nIdx = neighbors[k];
          if (nIdx !== -1 && !visited[nIdx]) {
            const pIdx = nIdx * 4;
            if (Math.max(d[pIdx], d[pIdx + 1], d[pIdx + 2]) <= bgThresh) {
              visited[nIdx] = 1;
              isSubject[nIdx] = 0;
              queue.push(nIdx);
            }
          }
        }
      }

      // Dark points (face inside hood and deep shadows)
      const dpos = [], dstart = [], dcol = [], ddly = [], drnd = [], dglw = [];
      // Bright points (white jacket, cyan shield and trim)
      const bpos = [], bstart = [], bcol = [], bdly = [], brnd = [], bglw = [];
      // Additive halo points
      const gpos = [], gstart = [], gcol = [], gdly = [];
      const spacing = 2 / N;

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const coord = y * N + x;
          if (!isSubject[coord]) continue;

          const i = coord * 4;
          const r = d[i] / 255;
          const g = d[i + 1] / 255;
          const b = d[i + 2] / 255;
          const l = (r + g + b) / 3;

          const px = ((x + 0.5 + rand(-0.25, 0.25)) / N - 0.5) * 2;
          const py = -((y + 0.5 + rand(-0.25, 0.25)) / N - 0.5) * 2;
          const isDark = l < 0.08;
          const pz = (isDark ? 0.005 : l * 0.05) + rand(-0.004, 0.004);

          const th = Math.random() * 6.2832;
          const ph = Math.acos(rand(-1, 1));
          const R = rand(2.2, 6.5);
          const sx = R * Math.sin(ph) * Math.cos(th) * 1.4;
          const sy = R * Math.sin(ph) * Math.sin(th);
          const sz = R * Math.cos(ph) * 0.9;

          const dd =
            0.55 * Math.random() +
            0.25 * (1 - (px + 1) / 2) +
            0.2 * (l > 0.35 ? 1 : 0.3 * Math.random());
          const curDly = Math.min(dd, 1);
          const rx = Math.random(), ry = Math.random(), rz = Math.random();

          const mxc = Math.max(r, g, b);
          const mnc = Math.min(r, g, b);
          const sat = mxc > 0 ? (mxc - mnc) / mxc : 0;
          const curGlw = l > 0.3 && sat > 0.45 ? Math.min(1, sat) : 0;

          if (isDark) {
            dpos.push(px, py, pz);
            dstart.push(sx, sy, sz);
            // Solid matte black / dark obsidian cyber tone
            dcol.push(Math.max(r, 0.01), Math.max(g, 0.012), Math.max(b, 0.018));
            ddly.push(curDly);
            drnd.push(rx, ry, rz);
            dglw.push(0);
          } else {
            bpos.push(px, py, pz);
            bstart.push(sx, sy, sz);
            bcol.push(r, g, b);
            bdly.push(curDly);
            brnd.push(rx, ry, rz);
            bglw.push(curGlw);

            if (l > 0.35 && sat > 0.5 && (x + y) % 2 === 0) {
              gpos.push(px, py, pz + 0.01);
              gstart.push(sx, sy, sz);
              gcol.push(r * 0.7, g * 0.8, b);
              gdly.push(Math.min(dd + 0.05, 1));
            }
          }
        }
      }

      // Combine: dark particles drawn first, bright particles drawn on top
      const pos = dpos.concat(bpos);
      const start = dstart.concat(bstart);
      const col = dcol.concat(bcol);
      const dly = ddly.concat(bdly);
      const rnd = drnd.concat(brnd);
      const glw = dglw.concat(bglw);

      const main = mk(pos, start, col, dly, { rnd, glw }, false, spacing);
      const halo = mk(gpos, gstart, gcol, gdly, null, true, spacing);
      group.add(main);
      group.add(halo);

      t0 = performance.now();

      function frame() {
        if (isDisposed) return;
        const now = performance.now();
        const t = (now - t0) / 1000;

        uniforms.uTime.value = t;
        // Assembles together over 3s, then remains formed indefinitely
        uniforms.uP.value = Math.min(t / FORM, 1.0);

        // Explosion is driven smoothly by window scroll position
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const vh = window.innerHeight || 800;
        const scrollBoom = Math.min(1.8, Math.max(0, scrollY / (vh * 0.75)));

        uniforms.uBoom.value = scrollBoom * 2.0;
        uniforms.uFade.value = Math.max(0, 1.0 - scrollBoom * 1.3);

        mx += (tx - mx) * 0.05;
        my += (ty - my) * 0.05;
        group.rotation.y = mx * 0.22 + Math.sin(t * 0.3) * 0.03;
        group.rotation.x = my * 0.12;
        renderer.render(scene, camera);
        animId = requestAnimationFrame(frame);
      }

      frame();
    };

    img.src = DEFENDER_SHIELD_SRC;

    return () => {
      isDisposed = true;
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);

      createdGeometries.forEach((g) => g.dispose());
      createdMaterials.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-10 pointer-events-auto">
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
}
