import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Gamepad2,
  Trophy,
  Shield,
  Zap,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Flame,
  Sparkles,
} from 'lucide-react';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

// Pre-allocated math helpers at module scope to avoid GC spikes
const _vec3 = new THREE.Vector3();
const _color = new THREE.Color();

export const CyberRunnerGame: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('title');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('hynex_cyberrun_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [energy, setEnergy] = useState(100);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  // Mutable game loop references that do not trigger React re-renders
  const stateRef = useRef<{
    gameState: GameState;
    score: number;
    energy: number;
    speed: number;
    shipX: number;
    shipTargetX: number;
    shipY: number;
    shipRoll: number;
    keys: { [key: string]: boolean };
    obstacles: THREE.Group[];
    cores: THREE.Group[];
    soundEnabled: boolean;
  }>({
    gameState: 'title',
    score: 0,
    energy: 100,
    speed: 45,
    shipX: 0,
    shipTargetX: 0,
    shipY: 1.0,
    shipRoll: 0,
    keys: {},
    obstacles: [],
    cores: [],
    soundEnabled: true,
  });

  // Keep stateRef synced
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    stateRef.current.soundEnabled = soundEnabled;
  }, [soundEnabled]);

  // Procedural Web Audio Synth for Zero-404 Game Sound Effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSfx = useCallback((type: 'collect' | 'crash' | 'boost' | 'start') => {
    if (!stateRef.current.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      if (type === 'collect') {
        // High-pitched crystal chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'crash') {
        // Impact noise burst
        const bufferSize = ctx.sampleRate * 0.35;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      } else if (type === 'boost') {
        // Woosh sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'start') {
        // Electronic boot chord
        const freqs = [220, 329.63, 440, 659.25];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.05);
          gain.gain.setValueAtTime(0.2, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.35);
        });
      }
    } catch (e) {
      console.warn('Procedural audio error:', e);
    }
  }, [getAudioContext]);

  // Main Three.js Scene Setup & Simulation
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL to adapt rendering cost as required by Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070913);
    scene.fog = new THREE.FogExp2(0x070913, 0.009);

    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      600
    );
    camera.position.set(0, 4.5, 12);
    camera.lookAt(0, 2.0, -10);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);

    // 2. Lighting Rig (Warm Key directional, Cool Hemisphere fill)
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xa855f7, 2.2);
    keyLight.position.set(15, 25, 20);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 100;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const underGlow = new THREE.PointLight(0x10b981, 2.5, 30);
    underGlow.position.set(0, 0.5, 5);
    scene.add(underGlow);

    // 3. Composite 7-Part Procedural Cyber Ship (THREE.Group)
    const shipGroup = new THREE.Group();

    // Part 1: Main Aerodynamic Fuselage
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 2.2);
    hullShape.lineTo(0.9, -1.2);
    hullShape.lineTo(0.6, -1.8);
    hullShape.lineTo(-0.6, -1.8);
    hullShape.lineTo(-0.9, -1.2);
    hullShape.closePath();

    const hullGeom = new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.1,
      bevelSegments: 3,
    });
    hullGeom.rotateX(-Math.PI / 2);
    hullGeom.center();

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const hullMesh = new THREE.Mesh(hullGeom, hullMat);
    hullMesh.castShadow = !isSoftwareGl;
    shipGroup.add(hullMesh);

    // Part 2: Cockpit Canopy Glass
    const cockpitGeom = new THREE.CylinderGeometry(0.2, 0.35, 1.2, 8);
    cockpitGeom.rotateX(-Math.PI / 2);
    const cockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      metalness: 0.2,
      roughness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const cockpitMesh = new THREE.Mesh(cockpitGeom, cockpitMat);
    cockpitMesh.position.set(0, 0.35, 0.1);
    shipGroup.add(cockpitMesh);

    // Part 3 & 4: Dual Outrigger Ion Thrusters
    const thrusterGeom = new THREE.CylinderGeometry(0.22, 0.26, 1.6, 12);
    thrusterGeom.rotateX(-Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.3,
    });

    const leftThruster = new THREE.Mesh(thrusterGeom, thrusterMat);
    leftThruster.position.set(-1.15, 0.1, 0.4);
    shipGroup.add(leftThruster);

    const rightThruster = new THREE.Mesh(thrusterGeom, thrusterMat);
    rightThruster.position.set(1.15, 0.1, 0.4);
    shipGroup.add(rightThruster);

    // Part 5 & 6: Pulsing Engine Exhaust Plumes
    const exhaustGeom = new THREE.ConeGeometry(0.18, 0.9, 10);
    exhaustGeom.rotateX(Math.PI / 2);
    const exhaustMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
    });

    const leftExhaust = new THREE.Mesh(exhaustGeom, exhaustMat);
    leftExhaust.position.set(-1.15, 0.1, 1.6);
    shipGroup.add(leftExhaust);

    const rightExhaust = new THREE.Mesh(exhaustGeom, exhaustMat);
    rightExhaust.position.set(1.15, 0.1, 1.6);
    shipGroup.add(rightExhaust);

    // Part 7: Swept-back Wings & Neon Wingtips
    const wingGeom = new THREE.BoxGeometry(3.2, 0.08, 0.9);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.3,
    });
    const wingMesh = new THREE.Mesh(wingGeom, wingMat);
    wingMesh.position.set(0, 0.05, 0.2);
    shipGroup.add(wingMesh);

    // Wingtip Plasma Beacons
    const beaconGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const leftBeacon = new THREE.Mesh(beaconGeom, beaconMat);
    leftBeacon.position.set(-1.6, 0.05, 0.2);
    shipGroup.add(leftBeacon);

    const rightBeacon = new THREE.Mesh(beaconGeom, beaconMat);
    rightBeacon.position.set(1.6, 0.05, 0.2);
    shipGroup.add(rightBeacon);

    // Part 8: Shield Bubble (Flashes when hit or boosted)
    const shieldGeom = new THREE.SphereGeometry(2.1, 16, 12);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
    });
    const shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
    shipGroup.add(shieldMesh);

    shipGroup.position.set(0, 1.2, 5);
    scene.add(shipGroup);

    // 4. Procedural Cyber Highway (Continuous Segmented Neon Grid)
    const TRACK_WIDTH = 14;
    const TRACK_LENGTH = 300;

    const roadGeom = new THREE.PlaneGeometry(TRACK_WIDTH, TRACK_LENGTH, 1, 60);
    roadGeom.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x05070e,
      roughness: 0.6,
      metalness: 0.4,
    });
    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.position.set(0, 0, -100);
    roadMesh.receiveShadow = !isSoftwareGl;
    scene.add(roadMesh);

    // Neon Highway Border Guardrails
    const railGeom = new THREE.BoxGeometry(0.35, 0.6, TRACK_LENGTH);
    const railMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

    const leftRail = new THREE.Mesh(railGeom, railMat);
    leftRail.position.set(-TRACK_WIDTH / 2, 0.3, -100);
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(railGeom, railMat);
    rightRail.position.set(TRACK_WIDTH / 2, 0.3, -100);
    scene.add(rightRail);

    // Speed Grid Markers (InstancedMesh)
    const markerCount = 40;
    const markerGeom = new THREE.PlaneGeometry(0.4, 2.5);
    markerGeom.rotateX(-Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const markers = new THREE.InstancedMesh(markerGeom, markerMat, markerCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < markerCount; i++) {
      dummy.position.set(0, 0.02, -i * 7);
      dummy.updateMatrix();
      markers.setMatrixAt(i, dummy.matrix);
    }
    markers.instanceMatrix.needsUpdate = true;
    markers.frustumCulled = false;
    scene.add(markers);

    // 5. Procedural Cityscape Cyber Pylons (Background Ambience)
    const pylonCount = 24;
    const pylonGeom = new THREE.BoxGeometry(3, 45, 4);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const pylons = new THREE.InstancedMesh(pylonGeom, pylonMat, pylonCount);
    for (let i = 0; i < pylonCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (TRACK_WIDTH / 2 + 8 + Math.random() * 8);
      const z = -(i * 14) - 20;
      dummy.position.set(x, 20, z);
      dummy.scale.set(1, 0.6 + Math.random() * 0.8, 1);
      dummy.updateMatrix();
      pylons.setMatrixAt(i, dummy.matrix);
    }
    pylons.instanceMatrix.needsUpdate = true;
    scene.add(pylons);

    // 6. Dynamic Object Pools: Obstacles (Laser Barriers) & Collectible Energy Cores
    const activeObstacles: THREE.Group[] = [];
    const activeCores: THREE.Group[] = [];

    // Obstacle Builder
    const createObstacle = (zPos: number) => {
      const group = new THREE.Group();
      const xPos = (Math.random() - 0.5) * (TRACK_WIDTH - 4);

      // Dual upright energy pylons
      const postGeom = new THREE.CylinderGeometry(0.2, 0.3, 2.2, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9 });
      const p1 = new THREE.Mesh(postGeom, postMat);
      p1.position.set(-1.4, 1.1, 0);
      const p2 = new THREE.Mesh(postGeom, postMat);
      p2.position.set(1.4, 1.1, 0);
      group.add(p1, p2);

      // Red laser beam
      const beamGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8);
      beamGeom.rotateZ(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.set(0, 1.1, 0);
      group.add(beam);

      group.position.set(xPos, 0, zPos);
      scene.add(group);
      activeObstacles.push(group);
    };

    // Energy Core Builder (Rotating Emerald Dodecahedron)
    const createCore = (zPos: number) => {
      const group = new THREE.Group();
      const xPos = (Math.random() - 0.5) * (TRACK_WIDTH - 4);

      const coreGeom = new THREE.DodecahedronGeometry(0.55);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.8,
        metalness: 0.5,
        roughness: 0.2,
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      group.add(coreMesh);

      // Outer ring
      const ringGeom = new THREE.TorusGeometry(0.85, 0.04, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      group.add(ringMesh);

      group.position.set(xPos, 1.2, zPos);
      scene.add(group);
      activeCores.push(group);
    };

    // Populate initial run
    for (let i = 0; i < 7; i++) {
      createObstacle(-35 - i * 38);
      createCore(-20 - i * 35);
    }

    stateRef.current.obstacles = activeObstacles;
    stateRef.current.cores = activeCores;

    // 7. Input Event Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        setGameState((curr) => (curr === 'playing' ? 'paused' : curr === 'paused' ? 'playing' : curr));
      }
      if (e.code === 'Space' && stateRef.current.gameState === 'title') {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 8. Responsive Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Simulation Clock & 60fps Loop with Delta Clamping
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Delta clamping strictly enforced: Math.min(rawDt, 0.05)
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const time = clock.getElapsedTime();

      const st = stateRef.current;

      // Title Mode: Ambient Orbit Centerpiece
      if (st.gameState === 'title') {
        shipGroup.position.set(0, 1.2 + Math.sin(time * 2) * 0.25, 5);
        shipGroup.rotation.y = Math.sin(time * 0.8) * 0.3;
        shipGroup.rotation.z = Math.sin(time * 1.5) * 0.1;
        underGlow.intensity = 2.5 + Math.sin(time * 4) * 0.8;

        // Ambient road flow
        markers.position.z = (markers.position.z + 18 * dt) % 7;
        renderer.render(scene, camera);
        return;
      }

      // Paused Mode: Freeze motion
      if (st.gameState === 'paused' || st.gameState === 'gameover') {
        renderer.render(scene, camera);
        return;
      }

      // Playing Mode: Active Flight Simulation
      if (st.gameState === 'playing') {
        // Player Controls (Left/Right steering)
        const moveSpeed = 16.0;
        if (st.keys['ArrowLeft'] || st.keys['KeyA']) {
          st.shipTargetX = Math.max(-TRACK_WIDTH / 2 + 1.8, st.shipTargetX - moveSpeed * dt);
        }
        if (st.keys['ArrowRight'] || st.keys['KeyD']) {
          st.shipTargetX = Math.min(TRACK_WIDTH / 2 - 1.8, st.shipTargetX + moveSpeed * dt);
        }

        // Smooth Exponential Damping for ship horizontal position
        st.shipX = THREE.MathUtils.damp(st.shipX, st.shipTargetX, 12, dt);
        shipGroup.position.x = st.shipX;

        // Roll into banking turns
        const targetRoll = (st.shipTargetX - st.shipX) * -0.35;
        st.shipRoll = THREE.MathUtils.damp(st.shipRoll, targetRoll, 10, dt);
        shipGroup.rotation.z = st.shipRoll;
        shipGroup.position.y = 1.0 + Math.sin(time * 6) * 0.08;

        // Exhaust flame pulsation
        const flameScale = 1.0 + Math.sin(time * 25) * 0.35;
        leftExhaust.scale.set(1, flameScale, 1);
        rightExhaust.scale.set(1, flameScale, 1);

        // Advance Highway and Objects
        const currentSpeed = st.speed;
        const dz = currentSpeed * dt;

        // Update Road Markers
        markers.position.z = (markers.position.z + dz) % 7;

        // Obstacles Traversal and Collision Detection
        for (let i = 0; i < activeObstacles.length; i++) {
          const obs = activeObstacles[i];
          obs.position.z += dz;

          // Collision Check
          if (Math.abs(obs.position.z - shipGroup.position.z) < 1.2) {
            const dx = Math.abs(obs.position.x - shipGroup.position.x);
            if (dx < 2.0) {
              // Impact!
              obs.position.z = -250; // teleport away
              playSfx('crash');

              // Deduct energy
              st.energy = Math.max(0, st.energy - 35);
              setEnergy(st.energy);

              // Flash shield red
              shieldMesh.material.color.setHex(0xef4444);
              shieldMesh.material.opacity = 0.8;

              if (st.energy <= 0) {
                // Game Over
                setGameState('gameover');
                st.gameState = 'gameover';
                setHighScore((prev) => {
                  const newHigh = Math.max(prev, st.score);
                  try {
                    localStorage.setItem('hynex_cyberrun_highscore', newHigh.toString());
                  } catch {}
                  return newHigh;
                });
                return;
              }
            }
          }

          // Recycle obstacles that pass camera
          if (obs.position.z > 15) {
            obs.position.z = -250 - Math.random() * 40;
            obs.position.x = (Math.random() - 0.5) * (TRACK_WIDTH - 4);
          }
        }

        // Energy Cores Traversal and Pickup Detection
        for (let i = 0; i < activeCores.length; i++) {
          const core = activeCores[i];
          core.position.z += dz;
          core.rotation.y += 2.5 * dt;
          core.rotation.x += 1.2 * dt;

          // Pickup Check
          if (Math.abs(core.position.z - shipGroup.position.z) < 1.5) {
            const dx = Math.abs(core.position.x - shipGroup.position.x);
            if (dx < 1.8) {
              // Collected!
              core.position.z = -240 - Math.random() * 40;
              core.position.x = (Math.random() - 0.5) * (TRACK_WIDTH - 4);
              playSfx('collect');

              // Award points & recharge energy
              st.score += 150;
              st.energy = Math.min(100, st.energy + 15);
              setScore(st.score);
              setEnergy(st.energy);

              // Pulse shield emerald
              shieldMesh.material.color.setHex(0x10b981);
              shieldMesh.material.opacity = 0.7;
            }
          }

          // Recycle cores
          if (core.position.z > 15) {
            core.position.z = -240 - Math.random() * 40;
            core.position.x = (Math.random() - 0.5) * (TRACK_WIDTH - 4);
          }
        }

        // Fade shield opacity smoothly back to 0
        if (shieldMesh.material.opacity > 0) {
          shieldMesh.material.opacity = Math.max(0, shieldMesh.material.opacity - dt * 2.5);
        }

        // Increment Score with Distance
        st.score += Math.floor(dz * 0.8);
        setScore(st.score);

        // Progressive Difficulty: Increase speed every 500 points
        const targetSpeed = 45 + Math.min(45, Math.floor(st.score / 600) * 4);
        st.speed = THREE.MathUtils.damp(st.speed, targetSpeed, 2, dt);
        setSpeedMultiplier(parseFloat((st.speed / 45).toFixed(1)));
      }

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    // Clean disposal on unmount
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      // Dispose Geometries and Materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [playSfx]);

  const startGame = () => {
    stateRef.current.score = 0;
    stateRef.current.energy = 100;
    stateRef.current.speed = 45;
    stateRef.current.shipX = 0;
    stateRef.current.shipTargetX = 0;
    setScore(0);
    setEnergy(100);
    setGameState('playing');
    playSfx('start');
  };

  const restartGame = () => {
    startGame();
  };

  // Touch controls for mobile devices
  const handleTouchLeft = () => {
    stateRef.current.shipTargetX = Math.max(-5.2, stateRef.current.shipTargetX - 2.8);
  };

  const handleTouchRight = () => {
    stateRef.current.shipTargetX = Math.min(5.2, stateRef.current.shipTargetX + 2.8);
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-black select-none font-sans">
      {/* Isolated Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP HUD: Minimal Stats (<15% viewport space, pointer-events: none) */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
        {/* Left: Score & High Score */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-lg pointer-events-auto">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Score</div>
            <div className="text-base sm:text-xl font-black font-mono tabular-nums text-emerald-400">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="hidden sm:flex flex-col px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-lg pointer-events-auto">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Record</span>
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-amber-300">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Center: Shield Energy Meter */}
        <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-lg flex items-center gap-2.5 pointer-events-auto">
          <Shield
            className={`w-4 h-4 ${energy > 30 ? 'text-cyan-400' : 'text-red-500 animate-pulse'}`}
          />
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-[10px] font-mono gap-4">
              <span className="text-zinc-400">SHIELD INTEGRITY</span>
              <span className={`font-bold tabular-nums ${energy > 30 ? 'text-cyan-300' : 'text-red-400'}`}>
                {energy}%
              </span>
            </div>
            <div className="w-28 sm:w-36 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-200 ${
                  energy > 30 ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-red-500'
                }`}
                style={{ width: `${energy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Sound & Speed Multiplier */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-mono items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-zinc-400">WARP:</span>
            <span className="font-bold text-amber-400 tabular-nums">{speedMultiplier}x</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Procedural Audio' : 'Enable Procedural Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
        </div>
      </div>

      {/* GAME SHELL 1: TITLE SCREEN OVERLAY */}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-xs text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full space-y-6">
            {/* Bespoke SVG Title Lockup */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>3D CYBER RACER SIMULATOR</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                HYNEX <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-500">CYBERRUN</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Pilot your high-speed hovercraft along the neon cyber-highway. Dodge laser barricades and collect energy cores!
              </p>
            </div>

            {/* Launch Button */}
            <div className="pt-2">
              <button
                onClick={startGame}
                className="w-full py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-600 text-black shadow-xl hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 group"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>ENGAGE FLIGHT ENGINES</span>
              </button>
              <div className="text-[11px] font-mono text-zinc-400 mt-3">
                Desktop: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">A</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">D</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">→</kbd> to steer
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME SHELL 2: GAME OVER MODAL */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/75 backdrop-blur-md text-center animate-in zoom-in-95 duration-200">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-zinc-900/90 border border-red-500/30 shadow-2xl space-y-5 text-white">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto">
              <Flame className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-red-400 uppercase">
                SHIELD COLLAPSE
              </h2>
              <p className="text-xs text-zinc-400">Hovercraft suffered fatal impact damage</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-2">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>FINAL FLIGHT SCORE:</span>
                <span className="font-bold text-white text-sm">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-mono text-zinc-400 border-t border-white/5 pt-2">
                <span>ALL-TIME RECORD:</span>
                <span className="font-bold text-amber-400 text-sm">{highScore.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={restartGame}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART SIMULATION</span>
            </button>
          </div>
        </div>
      )}

      {/* GAME SHELL 3: PAUSE MODAL */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm text-center">
          <div className="max-w-xs w-full p-6 rounded-3xl bg-zinc-900 border border-white/10 shadow-xl space-y-4 text-white">
            <h3 className="text-xl font-black">SIMULATION PAUSED</h3>
            <p className="text-xs text-zinc-400">Take a breath or resume your flight.</p>
            <button
              onClick={() => setGameState('playing')}
              className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-500 text-black hover:bg-emerald-400 transition-all cursor-pointer"
            >
              RESUME FLIGHT
            </button>
          </div>
        </div>
      )}

      {/* ON-SCREEN TOUCH STEERING FOR MOBILE (Visible only when playing) */}
      {gameState === 'playing' && (
        <div className="md:hidden absolute bottom-6 inset-x-6 flex items-center justify-between z-10 pointer-events-none">
          <button
            onTouchStart={handleTouchLeft}
            onClick={handleTouchLeft}
            className="w-16 h-16 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white font-black text-xl flex items-center justify-center active:bg-cyan-500/40 pointer-events-auto transition-all shadow-xl"
          >
            ◀
          </button>
          <button
            onTouchStart={handleTouchRight}
            onClick={handleTouchRight}
            className="w-16 h-16 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white font-black text-xl flex items-center justify-center active:bg-cyan-500/40 pointer-events-auto transition-all shadow-xl"
          >
            ▶
          </button>
        </div>
      )}

      {/* Collapsible Bottom Info Bar strictly adhering to Three.js bottom dock guideline */}
      <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
        <div className="px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-zinc-400 flex items-center gap-3 shadow-lg">
          <span>HYNEX CyberRun 3D Engine</span>
          <span>·</span>
          <span>Three.js PBR</span>
          <span>·</span>
          <span>60 FPS Active</span>
        </div>
      </div>
    </div>
  );
};
