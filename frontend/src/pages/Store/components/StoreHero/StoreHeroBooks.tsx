import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '../../animation/useReducedMotion';
import coverJames from '../../assets/images/book-cover-1.webp';     // James (Black & Gold)
import coverChuck from '../../assets/images/book-cover-2.webp';     // Chuck Tingle (Pink/Blue)
import coverAllison from '../../assets/images/book-cover-3.webp';   // Allison Saft (Dark & Drowning Tide)
import coverMasquerade from '../../assets/images/book-cover-4.webp';// Masquerade (Red/Gold)
import styles from './StoreHeroBooks.module.css';

interface BookConfig {
  textureUrl: string;
  spineColor: number;
  backColor: number;
  desktopPosition: [number, number, number];
  desktopRotation: [number, number, number];
  tabletPosition: [number, number, number];
  tabletRotation: [number, number, number];
  mobilePosition: [number, number, number];
  mobileRotation: [number, number, number];
  scale: number;
  floatSpeed: number;
  floatOffset: number;
  rotSpeed: number;
}

const BOOK_CONFIGS: BookConfig[] = [
  {
    // Book 1: Allison Saft — A Dark and Drowning Tide (Center-Left Foreground Focal Feature)
    textureUrl: coverAllison,
    spineColor: 0x243e36,
    backColor: 0x162420,
    desktopPosition: [0.9, 0.10, 1.0],
    desktopRotation: [-0.06, -0.28, 0.04],
    tabletPosition: [0.1, -0.1, 0.5],
    tabletRotation: [-0.05, -0.18, 0.03],
    mobilePosition: [-0.4, 0.5, 0.4],
    mobileRotation: [-0.06, -0.20, 0.04],
    scale: 1.02,
    floatSpeed: 1.1,
    floatOffset: 0.0,
    rotSpeed: 0.7,
  },
  {
    // Book 2: Percival Everett — James (Black & Gold Foil Feature) — Upper-Right Horizon Feature
    textureUrl: coverJames,
    spineColor: 0xd4a017,
    backColor: 0x1a1a1a,
    desktopPosition: [3.8, 1.55, 0.1],
    desktopRotation: [0.16, -0.44, -0.10],
    tabletPosition: [1.0, 0.9, 0.0],
    tabletRotation: [0.10, -0.30, -0.06],
    mobilePosition: [0.8, 1.2, -0.2],
    mobileRotation: [0.10, -0.30, -0.06],
    scale: 1.04,
    floatSpeed: 0.95,
    floatOffset: 1.8,
    rotSpeed: 0.65,
  },
  {
    // Book 3: Chuck Tingle — Bury Your Gays (Pink/Blue Pop) — Far-Right Perimeter Feature
    textureUrl: coverChuck,
    spineColor: 0xba2858,
    backColor: 0x1a1520,
    desktopPosition: [4.6, -0.50, -0.3],
    desktopRotation: [-0.12, -0.52, 0.14],
    tabletPosition: [1.9, -0.5, -0.2],
    tabletRotation: [-0.12, -0.50, 0.14],
    mobilePosition: [0.6, -0.7, -0.1],
    mobileRotation: [-0.08, -0.35, 0.10],
    scale: 0.95,
    floatSpeed: 1.25,
    floatOffset: 3.4,
    rotSpeed: 0.85,
  },
  {
    // Book 4: O.O. Sangoyomi — Masquerade (Red & Gold) — Lower Ground Anchor
    textureUrl: coverMasquerade,
    spineColor: 0x8a2b22,
    backColor: 0x241210,
    desktopPosition: [2.2, -2.05, 0.4],
    desktopRotation: [0.12, -0.26, -0.06],
    tabletPosition: [0.0, -1.3, 0.3],
    tabletRotation: [0.10, -0.22, -0.06],
    mobilePosition: [0.4, -0.6, 0.1],
    mobileRotation: [0.10, -0.22, -0.06],
    scale: 1.00,
    floatSpeed: 0.85,
    floatOffset: 4.8,
    rotSpeed: 0.5,
  },
];

export interface StoreHeroBooksProps {
  className?: string;
  onReady?: () => void;
}

export function StoreHeroBooks({ className = '', onReady }: StoreHeroBooksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Check WebGL availability
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect touch/coarse-pointer devices — disable animation on these
    const isTouch =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    // Should we run the continuous animation RAF loop?
    const shouldAnimate = !isTouch && !prefersReducedMotion;

    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (
        !gl ||
        typeof (gl as WebGLRenderingContext).getShaderPrecisionFormat !== 'function'
      ) {
        setWebglSupported(false);
        onReady?.();
        return;
      }
    } catch {
      setWebglSupported(false);
      onReady?.();
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 750;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 11);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      onReady?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff5e8, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(5, 8, 6);
    scene.add(sunLight);

    const goldRimLight = new THREE.PointLight(0xffd152, 1.8, 20);
    goldRimLight.position.set(-6, -4, 4);
    scene.add(goldRimLight);

    const fillLight = new THREE.DirectionalLight(0xbad2c8, 0.8);
    fillLight.position.set(-5, 2, -2);
    scene.add(fillLight);

    // 3. Texture Loader & Book Creation
    const textureLoader = new THREE.TextureLoader();
    const booksGroup = new THREE.Group();
    scene.add(booksGroup);

    // Book geometry: width=2.1, height=3.0, thickness=0.32
    const bookGeometry = new THREE.BoxGeometry(2.1, 3.0, 0.32);

    // Reusable page edge material
    const pageEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4eee1,
      roughness: 0.9,
      metalness: 0.05,
    });

    const bookMeshes: {
      mesh: THREE.Mesh;
      basePos: [number, number, number];
      baseRot: [number, number, number];
      floatSpeed: number;
      floatOffset: number;
      rotSpeed: number;
    }[] = [];

    // Static render function for touch/reduced-motion devices
    const renderStaticFrame = () => {
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    let loadedTexturesCount = 0;

    BOOK_CONFIGS.forEach((cfg) => {
      const coverTexture = textureLoader.load(
        cfg.textureUrl,
        () => {
          loadedTexturesCount++;
          if (!shouldAnimate) {
            renderStaticFrame();
          }
          if (loadedTexturesCount >= BOOK_CONFIGS.length) {
            onReady?.();
          }
        },
        undefined,
        () => {
          // Texture load error fallback
          loadedTexturesCount++;
          if (!shouldAnimate) {
            renderStaticFrame();
          }
          if (loadedTexturesCount >= BOOK_CONFIGS.length) {
            onReady?.();
          }
        }
      );
      coverTexture.colorSpace = THREE.SRGBColorSpace;

      const spineMaterial = new THREE.MeshStandardMaterial({
        color: cfg.spineColor,
        roughness: 0.45,
        metalness: 0.1,
      });

      const frontCoverMaterial = new THREE.MeshStandardMaterial({
        map: coverTexture,
        roughness: 0.35,
        metalness: 0.08,
      });

      const backCoverMaterial = new THREE.MeshStandardMaterial({
        color: cfg.backColor,
        roughness: 0.45,
        metalness: 0.1,
      });

      // Box materials: [right (pages), left (spine), top (pages), bottom (pages), front (cover), back]
      const materials = [
        pageEdgeMaterial,
        spineMaterial,
        pageEdgeMaterial,
        pageEdgeMaterial,
        frontCoverMaterial,
        backCoverMaterial,
      ];

      const mesh = new THREE.Mesh(bookGeometry, materials);
      mesh.scale.set(cfg.scale, cfg.scale, cfg.scale);

      // Initial placement for entrance
      mesh.position.set(
        cfg.desktopPosition[0],
        cfg.desktopPosition[1],
        cfg.desktopPosition[2]
      );
      mesh.rotation.set(
        cfg.desktopRotation[0],
        cfg.desktopRotation[1],
        cfg.desktopRotation[2]
      );

      booksGroup.add(mesh);

      bookMeshes.push({
        mesh,
        basePos: [...cfg.desktopPosition],
        baseRot: [...cfg.desktopRotation],
        floatSpeed: cfg.floatSpeed,
        floatOffset: cfg.floatOffset,
        rotSpeed: cfg.rotSpeed,
      });
    });

    // 4. Mouse interaction & parallax — only on non-touch devices
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetCameraX = x * 0.45;
      targetCameraY = y * 0.30;
    };

    if (shouldAnimate) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
    }

    // 5. Responsive Breakpoint Adaptation
    // isTabletLayout: treat 768–1200px as tablet layout when touch device OR viewport ≤ 1100px portrait
    const getBreakpoint = (w: number) => {
      if (w < 768) return 'mobile';
      // iPad Pro 13 is 1032px — treat up to 1100px as tablet layout consistently
      if (w < 1100) return 'tablet';
      if (w < 1280) return 'laptop';
      return 'desktop';
    };

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || 750;
      camera.aspect = width / height;

      const bp = getBreakpoint(width);

      if (bp === 'mobile') {
        camera.position.z = 12.0;
        booksGroup.position.set(0, -2.2, 0);
        booksGroup.scale.set(0.55, 0.55, 0.55);

        bookMeshes.forEach((item, idx) => {
          const cfg = BOOK_CONFIGS[idx];
          if (idx === 1 || idx === 2 || !cfg) {
            // Hide secondary books on small mobile to avoid text crowding
            item.mesh.visible = false;
          } else {
            item.mesh.visible = true;
            item.basePos = [...cfg.mobilePosition];
            item.baseRot = [...cfg.mobileRotation];
            item.mesh.position.set(...cfg.mobilePosition);
            item.mesh.rotation.set(...cfg.mobileRotation);
          }
        });
      } else if (bp === 'tablet') {
        // Tablet portrait layout — 3 books, well-contained in right half
        camera.position.z = 12.5;
        booksGroup.position.set(0.2, -1.6, 0);
        booksGroup.scale.set(0.68, 0.68, 0.68);

        bookMeshes.forEach((item, idx) => {
          const cfg = BOOK_CONFIGS[idx];
          if (idx === 2 || !cfg) {
            // Hide far-right perimeter book on tablet portrait
            item.mesh.visible = false;
          } else {
            item.mesh.visible = true;
            item.basePos = [...cfg.tabletPosition];
            item.baseRot = [...cfg.tabletRotation];
            item.mesh.position.set(...cfg.tabletPosition);
            item.mesh.rotation.set(...cfg.tabletRotation);
          }
        });
      } else if (bp === 'laptop') {
        camera.position.z = 11.4;
        booksGroup.position.set(0.1, 0, 0);
        booksGroup.scale.set(0.90, 0.90, 0.90);

        bookMeshes.forEach((item, idx) => {
          const cfg = BOOK_CONFIGS[idx];
          if (cfg) {
            item.mesh.visible = true;
            item.basePos = [...cfg.desktopPosition];
            item.baseRot = [...cfg.desktopRotation];
            item.mesh.position.set(...cfg.desktopPosition);
            item.mesh.rotation.set(...cfg.desktopRotation);
          }
        });
      } else {
        // Full Desktop Wide >= 1280px
        camera.position.z = 11.0;
        booksGroup.position.set(0, 0, 0);
        booksGroup.scale.set(1.0, 1.0, 1.0);

        bookMeshes.forEach((item, idx) => {
          const cfg = BOOK_CONFIGS[idx];
          if (cfg) {
            item.mesh.visible = true;
            item.basePos = [...cfg.desktopPosition];
            item.baseRot = [...cfg.desktopRotation];
            item.mesh.position.set(...cfg.desktopPosition);
            item.mesh.rotation.set(...cfg.desktopRotation);
          }
        });
      }

      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (!shouldAnimate) {
        renderStaticFrame();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 6. Animation Loop — only runs on non-touch, non-reduced-motion devices
    let animationFrameId: number;

    if (shouldAnimate) {
      const startTime = performance.now();

      const animate = () => {
        const elapsedTime = (performance.now() - startTime) * 0.001;

        // Smooth camera interpolation towards mouse target
        camera.position.x += (targetCameraX - camera.position.x) * 0.04;
        camera.position.y += (targetCameraY - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        // Gentle floating motion on individual books with safe bounded amplitudes
        bookMeshes.forEach((item) => {
          if (!item.mesh.visible) return;
          const t = elapsedTime * item.floatSpeed + item.floatOffset;
          const deltaY = Math.sin(t) * 0.08;
          const deltaX = Math.cos(t * 0.8) * 0.035;
          const deltaRotZ = Math.sin(t * item.rotSpeed) * 0.025;
          const deltaRotY = Math.cos(t * item.rotSpeed * 0.7) * 0.03;

          item.mesh.position.y = item.basePos[1] + deltaY;
          item.mesh.position.x = item.basePos[0] + deltaX;
          item.mesh.rotation.z = item.baseRot[2] + deltaRotZ;
          item.mesh.rotation.y = item.baseRot[1] + deltaRotY;
        });

        // Subtle group wobble for cohesive tactile feel
        booksGroup.rotation.y = mouseX * 0.06;
        booksGroup.rotation.x = -mouseY * 0.04;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();
    } else {
      // Static render — single frame only (touch/reduced-motion devices)
      renderStaticFrame();
    }

    // 7. Cleanup
    return () => {
      if (shouldAnimate) {
        window.removeEventListener('pointermove', handlePointerMove);
      }
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Dispose Three.js resources
      bookGeometry.dispose();
      pageEdgeMaterial.dispose();
      bookMeshes.forEach((item) => {
        const materials = item.mesh.material;
        if (Array.isArray(materials)) {
          materials.forEach((m) => {
            if ('map' in m && m.map instanceof THREE.Texture) {
              m.map.dispose();
            }
            m.dispose();
          });
        }
      });
      renderer.dispose();
    };
  }, [prefersReducedMotion, onReady]);

  if (!webglSupported) {
    // Graceful CSS 3D fallback
    return (
      <div className={`${styles.booksContainer} ${className}`} data-testid="store-hero-books-fallback">
        <div className={styles.fallbackContainer}>
          <div className={`${styles.fallbackBook} ${styles.fallbackBook1}`}>
            <img src={coverAllison} alt="Featured Book 1" />
          </div>
          <div className={`${styles.fallbackBook} ${styles.fallbackBook2}`}>
            <img src={coverJames} alt="Featured Book 2" />
          </div>
          <div className={`${styles.fallbackBook} ${styles.fallbackBook3}`}>
            <img src={coverChuck} alt="Featured Book 3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.booksContainer} ${className}`}
      data-testid="store-hero-books-container"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.webglCanvas} />
    </div>
  );
}

export default StoreHeroBooks;
