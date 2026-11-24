import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ATTACKER_MASK_SRC } from '../assets/attackerMask';

export default function AttackerParticles() {
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
        p += settle * 0.004 * vec3(sin(uTime*1.3 + aRnd.x*40.0), cos(uTime*1.1 + aRnd.y*40.0), sin(uTime*0.9 + aRnd.z*40.0));
        vec3 dir = normalize(position + (aRnd - 0.5) * 0.9 + vec3(0.0, 0.0, 0.25));
        p += dir * uBoom * (1.2 + 5.0 * aRnd.y);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float pulse = 1.0 + aGlow * (0.22 * sin(uTime*2.2) + 0.1 * sin(uTime*5.3));
        float flight = 1.0 + (1.0 - e) * 0.6;
        float dark = 1.0 - smoothstep(0.0, 0.12, dot(aColor, vec3(0.333)));
        gl_PointSize = max(1.2, uSize * uScale / -mv.z * (0.95 + 0.2*aRnd.z) * (aGlow>0.0?1.25:1.0) * (1.0 + 1.8 * dark));
        vCol = aColor * uGain * pulse * flight;
        vA = uAlpha * uFade;
        vDark = dark;
      }
    `;

    const FS = `
      precision mediump float;
      varying vec3 vCol;
      varying float vA;
      varying float vDark;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, mix(0.36, 0.44, vDark), d);
        gl_FragColor = vec4(vCol, a * vA);
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

      const fitH = 1.04 / Math.tan((FOV * Math.PI) / 360);
      const fitW = 1.04 / (Math.tan((FOV * Math.PI) / 360) * camera.aspect);
      camera.position.set(0, 0, Math.max(fitH, fitW));
      uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((FOV * Math.PI) / 360));
    }

    window.addEventListener('resize', resize);
    resize();

    // Come together over 3s, then stay assembled
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
            uSize: { value: halo ? 16 * spacing : 1.9 * spacing },
            uAlpha: { value: halo ? 0.07 : 1.0 },
            uGain: { value: 1.0 }
          }
        ]),
        vertexShader: VS,
        fragmentShader: FS,
        transparent: true,
        depthWrite: false,
        depthTest: false,
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

      // ---- solid silhouette: fill the figure (even its black parts) with particles ----
      const inside = (function () {
        const R = 6, n = N * N, m = new Uint8Array(n), a = new Uint8Array(n), b = new Uint8Array(n);
        let x, y, k, v;
        for (k = 0; k < n; k++) m[k] = ((d[k * 4] + d[k * 4 + 1] + d[k * 4 + 2]) / 765 > 0.02) ? 1 : 0;
        function pass(src, dst, horiz, wantMax) {
          for (y = 0; y < N; y++) {
            for (x = 0; x < N; x++) {
              v = wantMax ? 0 : 1;
              for (let o = -R; o <= R; o++) {
                const xx = horiz ? x + o : x, yy = horiz ? y : y + o;
                let s;
                if (xx < 0 || yy < 0 || xx >= N || yy >= N) s = 0;
                else s = src[yy * N + xx];
                if (wantMax) {
                  if (s) { v = 1; break; }
                } else {
                  if (!s) { v = 0; break; }
                }
              }
              dst[y * N + x] = v;
            }
          }
        }
        pass(m, a, true, true);
        pass(a, b, false, true); // dilate
        pass(b, a, true, false);
        pass(a, b, false, false); // erode -> closed shape

        // flood the outside from the borders; whatever is not reached is inside the figure
        const out = new Uint8Array(n), st = [];
        function push(px, py) {
          const q = py * N + px;
          if (!out[q] && !b[q]) {
            out[q] = 1;
            st.push(q);
          }
        }
        for (let i = 0; i < N; i++) {
          push(i, 0);
          if (i < N * 0.55) {
            push(0, i);
            push(N - 1, i);
          }
        }
        while (st.length) {
          const q = st.pop(), qx = q % N, qy = (q / N) | 0;
          if (qx > 0) push(qx - 1, qy);
          if (qx < N - 1) push(qx + 1, qy);
          if (qy > 0) push(qx, qy - 1);
          if (qy < N - 1) push(qx, qy + 1);
        }
        const res = new Uint8Array(n);
        for (k = 0; k < n; k++) res[k] = out[k] ? 0 : 1;

        // lower body: fill each row between the figure's left and right edge
        let refLo = N, refHi = 0;
        for (y = Math.floor(N * 0.5); y < N; y++) {
          let lo = -1, hi = -1;
          for (x = 0; x < N; x++) {
            if (b[y * N + x]) {
              if (lo < 0) lo = x;
              hi = x;
            }
          }
          if (y >= N * 0.6 && y < N * 0.78 && lo >= 0) {
            refLo = Math.min(refLo, lo);
            refHi = Math.max(refHi, hi);
          }
          if (y >= N * 0.8) {
            lo = 0;
            hi = N - 1;
          }
          if (lo >= 0) {
            for (x = lo; x <= hi; x++) res[y * N + x] = 1;
          }
        }
        return res;
      })();

      const pos = [], start = [], col = [], dly = [], rnd = [], glw = [];
      const gpos = [], gstart = [], gcol = [], gdly = [];
      const spacing = 2 / N;

      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const i = (y * N + x) * 4;
            const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
            const l = (r + g + b) / 3;
            if (!inside[y * N + x] && l < 0.02) continue;
            if ((l < 0.12) !== (pass === 0)) continue; // dark particles first, bright ones on top

            const px = ((x + Math.random()) / N - 0.5) * 2;
            const py = -((y + Math.random()) / N - 0.5) * 2;
            const pz = l * 0.22 + rand(-0.01, 0.01); // slight depth from brightness
            pos.push(px, py, pz);

            // start: far random point on a wide shell, pulled around like a swarm
            const th = Math.random() * 6.2832, ph = Math.acos(rand(-1, 1)), R = rand(2.2, 6.5);
            start.push(R * Math.sin(ph) * Math.cos(th) * 1.4, R * Math.sin(ph) * Math.sin(th), R * Math.cos(ph) * 0.9);
            col.push(r, g, b);

            // delay: particles from the left/bottom arrive first, bright mask last
            const dd = 0.55 * Math.random() + 0.25 * (1 - (px + 1) / 2) + 0.2 * (l > 0.35 ? 1 : 0.3 * Math.random());
            dly.push(Math.min(dd, 1));
            rnd.push(Math.random(), Math.random(), Math.random());

            const red = Math.max(0, r - Math.max(g, b) * 0.6);
            glw.push(l > 0.3 ? Math.min(1, red * 1.4) : 0);

            // soft halo layer for the neon lines
            if (l > 0.35 && ((x + y) % 2 === 0)) {
              gpos.push(px, py, pz);
              gstart.push(start[start.length - 3], start[start.length - 2], start[start.length - 1]);
              gcol.push(r, g * 0.6, b * 0.7);
              gdly.push(Math.min(dd + 0.05, 1));
            }
          }
        }
      }

      const halo = mk(gpos, gstart, gcol, gdly, null, true, spacing);
      const main = mk(pos, start, col, dly, { rnd, glw }, false, spacing);
      group.add(halo);
      group.add(main);

      t0 = performance.now();

      function frame() {
        if (isDisposed) return;
        const now = performance.now();
        const t = (now - t0) / 1000;

        uniforms.uTime.value = t;
        // Forms together over 3s, then remains formed indefinitely
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

    img.src = ATTACKER_MASK_SRC;

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
