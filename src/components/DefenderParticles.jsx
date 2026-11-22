import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DEFENDER_SHIELD_SRC } from '../assets/defenderShield';

export default function DefenderParticles() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    let animId = null;

    const N = 640;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 1);
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
        gl_PointSize = max(1.2, uSize * uScale / -mv.z * 1.0 * (aGlow>0.0?1.25:1.0));
        vCol = aColor * uGain * pulse * flight * uFade;
        vA = uAlpha;
      }
    `;

    const FS = `
      precision mediump float;
      varying vec3 vCol;
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.2, d);
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
            uSize: { value: halo ? 16 * spacing : 2.7 * spacing },
            uAlpha: { value: halo ? 0.07 : 1.0 },
            uGain: { value: halo ? 1.0 : 0.36 }
          }
        ]),
        vertexShader: VS,
        fragmentShader: FS,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
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

      const pos = [], start = [], col = [], dly = [], rnd = [], glw = [];
      const gpos = [], gstart = [], gcol = [], gdly = [];
      const spacing = 2 / N;

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          const r = d[i] / 255;
          const g = d[i + 1] / 255;
          const b = d[i + 2] / 255;
          const l = (r + g + b) / 3;
          if (l < 0.02) continue;

          const px = ((x + 0.5 + rand(-0.25, 0.25)) / N - 0.5) * 2;
          const py = -((y + 0.5 + rand(-0.25, 0.25)) / N - 0.5) * 2;
          const pz = l * 0.05;
          pos.push(px, py, pz);

          const th = Math.random() * 6.2832;
          const ph = Math.acos(rand(-1, 1));
          const R = rand(2.2, 6.5);
          start.push(
            R * Math.sin(ph) * Math.cos(th) * 1.4,
            R * Math.sin(ph) * Math.sin(th),
            R * Math.cos(ph) * 0.9
          );
          col.push(r, g, b);

          const dd =
            0.55 * Math.random() +
            0.25 * (1 - (px + 1) / 2) +
            0.2 * (l > 0.35 ? 1 : 0.3 * Math.random());
          dly.push(Math.min(dd, 1));
          rnd.push(Math.random(), Math.random(), Math.random());

          const mxc = Math.max(r, g, b);
          const mnc = Math.min(r, g, b);
          const sat = mxc > 0 ? (mxc - mnc) / mxc : 0;
          glw.push(l > 0.3 && sat > 0.45 ? Math.min(1, sat) : 0);

          if (l > 0.35 && sat > 0.5 && (x + y) % 2 === 0) {
            gpos.push(px, py, pz);
            gstart.push(start[start.length - 3], start[start.length - 2], start[start.length - 1]);
            gcol.push(r * 0.7, g * 0.8, b);
            gdly.push(Math.min(dd + 0.05, 1));
          }
        }
      }

      // ---- "Defender" written in particles (italic) ----
      (function () {
        const W = 1280;
        const H = 320;
        const tc = document.createElement('canvas');
        tc.width = W;
        tc.height = H;
        const c = tc.getContext('2d');
        const word = 'Defender';
        const fs = 86;
        const gap = fs * 0.16;

        c.font = 'italic 600 ' + fs + 'px Georgia, "Times New Roman", serif';
        c.fillStyle = '#fff';
        c.textBaseline = 'alphabetic';

        let total = -gap;
        for (let k = 0; k < word.length; k++) {
          total += c.measureText(word[k]).width + gap;
        }

        let cxp = (W - total) / 2;
        const base = 165;
        for (let k = 0; k < word.length; k++) {
          c.fillText(word[k], cxp, base);
          cxp += c.measureText(word[k]).width + gap;
        }

        const td = c.getImageData(0, 0, W, H).data;
        for (let yy = 0; yy < H; yy++) {
          for (let xx = 0; xx < W; xx++) {
            const al = td[(yy * W + xx) * 4 + 3] / 255;
            if (al < 0.3) continue;

            const px = ((xx + Math.random()) / W - 0.5) * 2;
            const py = -0.95 - ((yy + Math.random()) / W) * 2;
            pos.push(px, py, 0.03);

            const th = Math.random() * 6.2832;
            const ph = Math.acos(rand(-1, 1));
            const R = rand(2.2, 6.5);
            const sx = R * Math.sin(ph) * Math.cos(th) * 1.4;
            const sy = R * Math.sin(ph) * Math.sin(th);
            const sz = R * Math.cos(ph) * 0.9;
            start.push(sx, sy, sz);
            col.push(0.25 * al * 0.42, 0.8 * al * 0.42, 1.0 * al * 0.42);

            const dd = 0.75 + 0.25 * Math.random();
            dly.push(dd);
            rnd.push(Math.random(), Math.random(), Math.random());
            glw.push(0.7);

            if (Math.random() < 0.12) {
              gpos.push(px, py, 0.03);
              gstart.push(sx, sy, sz);
              gcol.push(0.2, 0.65, 1.0);
              gdly.push(Math.min(dd + 0.05, 1));
            }
          }
        }
      })();

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
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
}
