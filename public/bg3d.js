/* =========================================================
   Фон сайта: сетка кубиков с волнами по следу курсора.
   Перенесено из открытого проекта "3D Wave Grid" (Franky Hung):
   https://github.com/franky-adl/3d-wave-grid  —  живое демо: projects.arkon.digital/threejs/wavy-cubes/

   MIT License. Copyright (c) 2026 franky-adl
   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
   associated documentation files (the "Software"), to deal in the Software without restriction, including
   without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
   following conditions: The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

   Что изменено под наш сайт: холст закреплен за страницей и не мешает кликам (курсор ловим по всему окну),
   добавлена темная тема, на телефоне сетка меньше и без теней (легче для батареи).
   ========================================================= */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const MAX_TRAIL = 128; // должно совпадать с "128" в шейдере

/* Цветовой сдвиг по краям экрана + легкое затемнение углов (как в оригинале) */
const VignetteRGBShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    shiftAmount: { value: 0.005 },
    vignetteRadius: { value: 0.3 },
    vignetteSoftness: { value: 0.3 },
    darkenAmount: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float shiftAmount;
    uniform float vignetteRadius;
    uniform float vignetteSoftness;
    uniform float darkenAmount;
    varying vec2 vUv;
    void main() {
      vec2 center = vec2(0.5);
      float dist = distance(vUv, center);
      float horzQuadrant = sign(vUv.x - center.x);
      float vertQuadrant = sign(vUv.y - center.y);
      float vignetteFactor = smoothstep(vignetteRadius, vignetteRadius + vignetteSoftness, dist);
      float currentShift = shiftAmount * vignetteFactor;
      float r = texture2D(tDiffuse, vUv + vec2(currentShift * horzQuadrant, currentShift * vertQuadrant)).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - vec2(currentShift * horzQuadrant, currentShift * vertQuadrant)).b;
      float darken = 1.0 - vignetteFactor * darkenAmount;
      gl_FragColor = vec4(vec3(r, g, b) * darken, 1.0);
    }`,
};

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

export function initCubesBg() {
  const canvas = document.getElementById('bg3d');
  if (!canvas || !webglOK()) return;

  const sizes = { width: window.innerWidth, height: window.innerHeight, pixelRatio: Math.min(window.devicePixelRatio || 1, touch ? 1 : 2) };

  /* ---------- Рендер (как в оригинале) ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.95;
  renderer.shadowMap.enabled = !touch;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // мягкие края теней
  renderer.setClearColor('#808080');
  renderer.setSize(sizes.width, sizes.height, false);
  renderer.setPixelRatio(sizes.pixelRatio);

  const scene = new THREE.Scene();

  /* ---------- Камера: сверху на сетку, чуть наклоняется за мышкой ---------- */
  const cam = {
    radius: 12,
    alphaRange: Math.PI * 0.03,
    betaRange: Math.PI * 0.05,
    mouse: new THREE.Vector2(0, 0),
    lerped: new THREE.Vector2(0, 0),
  };
  const camera = new THREE.PerspectiveCamera(40, sizes.width / sizes.height, 0.1, 200);
  const placeCamera = (mx, my) => {
    const alpha = my * cam.alphaRange;
    const beta = mx * cam.betaRange;
    camera.position.set(
      -cam.radius * Math.cos(alpha) * Math.sin(beta),
      cam.radius * Math.cos(alpha) * Math.cos(beta),
      cam.radius * Math.sin(alpha),
    );
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
  };
  placeCamera(0, 0);
  scene.add(camera);
  if (!touch) {
    window.addEventListener('mousemove', (e) => {
      cam.mouse.x = (e.clientX / sizes.width) * 2 - 1;
      cam.mouse.y = -(e.clientY / sizes.height) * 2 + 1;
    }, { passive: true });
  }

  /* ---------- Параметры сетки (как в оригинале) ---------- */
  const gridSize = touch ? 26 : 40;
  const cubeWidth = 0.8;
  const cubeHeight = 3;
  const params = {
    gap: 0.01,
    waveAmplitude: 0.36,
    waveSpeed: 4.6,
    waveFrequency: 1.05,
    waveWidth: 3.3,
    waveJitter: 0.2,
    waveMaxHeight: 0.36,
    colorBase: '#ffffff',
    colorHigh: '#6699ff', // оригинальный синий #0055ff, разбавленный белым - спокойнее // в оригинале синий #0055ff - у нас графитовый серый под цвета сайта
  };
  const bounds = gridSize * (cubeWidth + params.gap);

  /* ---------- Свет ---------- */
  const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
  scene.add(ambientLight);
  const dir = new THREE.DirectionalLight('#ffffff', 4.0);
  dir.position.set(-20, 10, 6);
  dir.castShadow = !touch;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.radius = 6;
  dir.shadow.camera.near = 0.1;
  dir.shadow.camera.far = 60;
  dir.shadow.camera.left = -22;
  dir.shadow.camera.right = 22;
  dir.shadow.camera.top = 22;
  dir.shadow.camera.bottom = -22;
  dir.shadow.bias = 0.0001;
  scene.add(dir);
  const dir2 = new THREE.DirectionalLight('#ffffff', 1.0);
  dir2.position.set(10, 5, -3);
  scene.add(dir2);

  /* ---------- След курсора: точки-источники волн (в текстуре для шейдера) ---------- */
  const trail = [];
  let lastPoint = null;
  const trailParams = { fadeTime: 2.4, trailSpacing: 0.2 }; // чуть плавнее оригинала (2.0 / 0.1)
  let timeSinceLastMove = 0, randomPointTimer = 0, isPlacingRandomPoints = true;
  const randomPointStrength = 0.7;
  const trailData = new Float32Array(MAX_TRAIL * 4);
  const trailTexture = new THREE.DataTexture(trailData, MAX_TRAIL, 1, THREE.RGBAFormat, THREE.FloatType);
  trailTexture.needsUpdate = true;
  const trailUniforms = {
    uTrailTexture: { value: trailTexture },
    uTrailCount: { value: 0 },
    uFadeTime: { value: trailParams.fadeTime },
  };
  const rayPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds, bounds),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false }),
  );
  rayPlane.rotation.x = -Math.PI / 2;
  rayPlane.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const mouseCoords = new THREE.Vector2();

  const onPointer = (clientX, clientY) => {
    mouseCoords.set((clientX / sizes.width) * 2 - 1, -(clientY / sizes.height) * 2 + 1);
    raycaster.setFromCamera(mouseCoords, camera);
    const hits = raycaster.intersectObject(rayPlane);
    if (hits.length === 0) return;
    const { x, z } = hits[0].point;
    let distDelta = 0;
    if (lastPoint) {
      const dx = x - lastPoint.x, dz = z - lastPoint.z;
      distDelta = Math.sqrt(dx * dx + dz * dz);
      if (distDelta < trailParams.trailSpacing) return;
    }
    if (trail.length >= MAX_TRAIL) trail.shift();
    trail.push({ x, z, age: 0, distDelta });
    lastPoint = { x, z };
    timeSinceLastMove = 0;
    isPlacingRandomPoints = false;
    randomPointTimer = 0;
  };
  window.addEventListener('pointermove', (e) => onPointer(e.clientX, e.clientY), { passive: true });

  const addRandomPoint = () => {
    const x = (Math.random() * 0.5 - 0.25) * bounds;
    const z = (Math.random() * 0.5 - 0.25) * bounds;
    if (trail.length >= MAX_TRAIL) trail.shift();
    trail.push({ x, z, age: 0, distDelta: randomPointStrength + Math.random() * 0.2 });
  };

  const updateTrail = (delta) => {
    const expiry = trailParams.fadeTime * 4;
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age += delta;
      if (trail[i].age > expiry) trail.splice(i, 1);
    }
    timeSinceLastMove += delta;
    if (timeSinceLastMove >= 3.0 && !isPlacingRandomPoints) { isPlacingRandomPoints = true; randomPointTimer = 0; }
    if (isPlacingRandomPoints) {
      randomPointTimer += delta;
      if (randomPointTimer >= 2.0) { addRandomPoint(); randomPointTimer = 0; }
    }
    const count = Math.min(trail.length, MAX_TRAIL);
    if (count > 0 || trailUniforms.uTrailCount.value > 0) {
      for (let i = 0; i < count; i++) {
        const ti = i * 4;
        trailData[ti] = trail[i].x;
        trailData[ti + 1] = trail[i].z;
        trailData[ti + 2] = trail[i].age;
        trailData[ti + 3] = trail[i].distDelta;
      }
      trailTexture.needsUpdate = true;
      trailUniforms.uTrailCount.value = count;
    }
  };

  /* ---------- Шейдер волны (общий для изображения и для теней) ---------- */
  const overrideVertexShader = (vs) => vs
    .replace('#include <common>', `#include <common>
      varying float vHeight;
      attribute vec2 aOffset;
      uniform sampler2D uTrailTexture;
      uniform int       uTrailCount;
      uniform float     uWaveSpeed;
      uniform float     uWaveFreq;
      uniform float     uWaveWidth;
      uniform float     uFadeTime;
      uniform float     uAmplitude;
      uniform float     uJitter;
      uniform float     uMaxHeight;
      vec2 hash2( vec2 p ) {
        p = vec2( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ) );
        return fract( sin( p ) * 43758.5453123 ) - 0.5;
      }`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vHeight = 0.0;
      if ( position.y > 0.0 ) {
        vec2 jitter  = hash2( aOffset ) * uJitter;
        vec2 worldXZ = aOffset + jitter;
        float waveHeight  = 0.0;
        float totalWeight = 0.0;
        for ( int i = 0; i < 128; i++ ) {
          if ( i >= uTrailCount ) break;
          vec4 td = texture2D( uTrailTexture, vec2( ( float(i) + 0.5 ) / 128.0, 0.5 ) );
          float dist      = length( worldXZ - td.rg );
          float wavefront = uWaveSpeed * td.b;
          float relDist   = dist - wavefront;
          float window = exp( -( relDist * relDist ) / ( uWaveWidth * uWaveWidth ) );
          float fade   = exp( -td.b / uFadeTime );
          float atten  = 1.0 / ( 1.0 + dist * 0.1 );
          float weight = fade * window * atten * td.a;
          waveHeight  += weight * cos( uWaveFreq * relDist );
          totalWeight += weight;
        }
        waveHeight /= max( totalWeight, 1.0 );
        float displacement = clamp( waveHeight * uAmplitude, -uMaxHeight, uMaxHeight );
        transformed.y += displacement;
        vHeight = displacement;
      }`);

  const colorBase = new THREE.Color(params.colorBase);
  const colorHigh = new THREE.Color(params.colorHigh);
  const sharedWaveUniforms = (shader) => {
    shader.uniforms.uTrailTexture = trailUniforms.uTrailTexture;
    shader.uniforms.uTrailCount = trailUniforms.uTrailCount;
    shader.uniforms.uFadeTime = trailUniforms.uFadeTime;
    shader.uniforms.uWaveSpeed = { value: params.waveSpeed };
    shader.uniforms.uWaveFreq = { value: params.waveFrequency };
    shader.uniforms.uWaveWidth = { value: params.waveWidth };
    shader.uniforms.uAmplitude = { value: params.waveAmplitude };
    shader.uniforms.uJitter = { value: params.waveJitter };
    shader.uniforms.uMaxHeight = { value: params.waveMaxHeight };
  };

  const count = gridSize * gridSize;
  const geometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeWidth);
  const offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
  geometry.setAttribute('aOffset', offsetAttribute);

  const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
  material.onBeforeCompile = (shader) => {
    sharedWaveUniforms(shader);
    shader.uniforms.uColorBase = { value: colorBase };
    shader.uniforms.uColorHigh = { value: colorHigh };
    shader.vertexShader = overrideVertexShader(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vHeight;
        uniform vec3  uColorBase;
        uniform vec3  uColorHigh;
        uniform float uMaxHeight;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float t = clamp( vHeight / uMaxHeight, 0.0, 1.0 );
        diffuseColor.rgb = mix( uColorBase, uColorHigh, t );`);
  };
  const depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.onBeforeCompile = (shader) => {
    sharedWaveUniforms(shader);
    shader.vertexShader = overrideVertexShader(shader.vertexShader);
  };

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.customDepthMaterial = depthMaterial;
  mesh.castShadow = !touch;
  mesh.receiveShadow = !touch;
  scene.add(mesh);
  {
    const dummy = new THREE.Object3D();
    const spacing = cubeWidth + params.gap;
    const offset = ((gridSize - 1) * spacing) / 2;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j;
        const x = i * spacing - offset;
        const z = j * spacing - offset;
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        offsetAttribute.setXY(index, x, z);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    offsetAttribute.needsUpdate = true;
  }

  /* ---------- Пост-обработка: цветной сдвиг и затемнение по краям ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const vignettePass = new ShaderPass(VignetteRGBShiftShader);
  composer.addPass(vignettePass);
  composer.addPass(new OutputPass());
  composer.setPixelRatio(sizes.pixelRatio);
  composer.setSize(sizes.width, sizes.height);

  /* ---------- Светлая / темная тема ---------- */
  const setTheme = (dark) => {
    // фон - половина базового цвета (как в оригинале), кубики - базовый цвет
    // Темная тема: мягкий приглушенный свет, низкий контраст - чтобы не резало глаза
    params.colorBase = dark ? '#2b2b30' : '#ffffff';
    colorBase.set(params.colorBase);
    colorHigh.set(dark ? '#2e4170' : '#6699ff'); // синий как в оригинале, но приглушенный // волна - чуть светлее кубиков, без ярких бликов
    scene.background = new THREE.Color(params.colorBase).multiplyScalar(0.5);
    renderer.toneMappingExposure = dark ? 0.85 : 1.8;
    dir.intensity = dark ? 0.9 : 3.0;         // основной свет слабее - меньше резких граней
    dir.shadow.intensity = dark ? 0.3 : 0.6; // тени мягче оригинала
    dir2.intensity = dark ? 0.5 : 1.0;
    ambientLight.intensity = dark ? 1.0 : 0.8; // больше рассеянного света - мягче тени
    vignettePass.uniforms.darkenAmount.value = dark ? 0.25 : 0.4;
    vignettePass.uniforms.shiftAmount.value = dark ? 0.0015 : 0.003; // цветная "радуга" по краям едва заметна
  };
  setTheme(document.documentElement.dataset.theme === 'dark');
  window.addEventListener('fb:theme', (e) => setTheme(e.detail.dark));

  /* ---------- Размер окна ---------- */
  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height, false);
      composer.setSize(sizes.width, sizes.height);
    }, 120);
  });

  /* ---------- Кадр ---------- */
  const clock = new THREE.Clock();
  const tick = () => {
    const delta = Math.min(clock.getDelta(), 0.1);
    if (!document.hidden) {
      cam.lerped.x += (cam.mouse.x - cam.lerped.x) * 0.03;
      cam.lerped.y += (cam.mouse.y - cam.lerped.y) * 0.03;
      placeCamera(cam.lerped.x, cam.lerped.y);
      updateTrail(delta);
      composer.render();
    }
    if (!reduceMotion) requestAnimationFrame(tick);
  };
  tick();
  document.documentElement.classList.add('has-cubes');
}
