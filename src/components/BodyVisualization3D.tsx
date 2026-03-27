import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Float, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { OrganRisk, RiskLevel } from '@/lib/health-types';

const HUMAN_MODEL_URL = '/models/FinalBaseMesh.obj';
const ANGIOLOGY_MODEL_URL = '/models/angiology.glb';
const NEUROLOGY_MODEL_URL = '/models/neurology.glb';
const SPLANCHNOLOGY_MODEL_URL = '/models/splanchnology.glb';
const BODY_TARGET_HEIGHT = 2.08;
const BODY_YAW = 0.03;
const BODY_Y_OFFSET = -0.16;
const ANATOMY_TARGET_HEIGHT = 2.08;
const ANATOMY_YAW = 0.03;
const ANATOMY_POSITION_OFFSET: [number, number, number] = [0, -0.16, 0.008];
const ANATOMY_SCALE_TWEAK: [number, number, number] = [1.5, 1, 1.32];

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4ade80',
  moderate: '#facc15',
  high: '#f97316',
  critical: '#ef4444',
};

function classifyMaterial(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes('lung') || lower.includes('bronchi')) return 'lungs';
  if (lower.includes('brain') || lower.includes('cerebellum') || lower.includes('white_matter') || lower.includes('nucleus')) return 'brain';
  if (lower.includes('heart')) return 'heart';
  if (lower.includes('organ') || lower.includes('intestine') || lower.includes('gland') || lower.includes('mucosa') || lower.includes('ductus') || lower.includes('peritoneum')) return 'viscera';
  if (lower.includes('artery') || lower.includes('vein')) return 'vascular';
  if (lower.includes('nerve') || lower.includes('lcr')) return 'neural';
  if (lower.includes('bone') || lower.includes('cartilage') || lower.includes('ligament') || lower.includes('teeth') || lower.includes('suture')) return 'support';
  return 'default';
}

function setPointer(active: boolean) {
  document.body.style.cursor = active ? 'pointer' : 'default';
}

function HumanBodyModel() {
  const scene = useLoader(OBJLoader, HUMAN_MODEL_URL);

  const model = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.material = new THREE.MeshPhysicalMaterial({
        color: '#d9d6e8',
        transparent: true,
        opacity: 0.11,
        roughness: 0.62,
        metalness: 0.04,
        clearcoat: 0.18,
        clearcoatRoughness: 0.5,
        side: THREE.DoubleSide,
      });
    });

    return cloned;
  }, [scene]);

  const normalized = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = BODY_TARGET_HEIGHT / (size.y || 1);

    return {
      position: [-center.x * scale, -bounds.min.y * scale + BODY_Y_OFFSET, -center.z * scale] as [number, number, number],
      scale: [scale, scale, scale] as [number, number, number],
    };
  }, [model]);

  return (
    <group position={normalized.position} scale={normalized.scale} rotation={[0, BODY_YAW, 0]}>
      <primitive object={model} />
    </group>
  );
}

function AnatomyLayerModels() {
  const { scene: angiologyScene } = useGLTF(ANGIOLOGY_MODEL_URL);
  const { scene: neurologyScene } = useGLTF(NEUROLOGY_MODEL_URL);
  const { scene: splanchnologyScene } = useGLTF(SPLANCHNOLOGY_MODEL_URL);

  const referenceTransform = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(angiologyScene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = ANATOMY_TARGET_HEIGHT / (size.y || 1);

    return {
      position: [
        -center.x * scale + ANATOMY_POSITION_OFFSET[0],
        -bounds.min.y * scale + ANATOMY_POSITION_OFFSET[1],
        -center.z * scale + ANATOMY_POSITION_OFFSET[2],
      ] as [number, number, number],
      scale: [scale * ANATOMY_SCALE_TWEAK[0], scale * ANATOMY_SCALE_TWEAK[1], scale * ANATOMY_SCALE_TWEAK[2]] as [number, number, number],
      rotation: [0, ANATOMY_YAW, 0] as [number, number, number],
    };
  }, [angiologyScene]);

  const prepareLayer = useMemo(
    () =>
      (source: THREE.Object3D, options: { opacity: number; boost?: string }) => {
        const cloned = source.clone(true);

        cloned.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;

          const baseMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
          const nextMaterial = (baseMaterial?.clone?.() as THREE.MeshStandardMaterial | undefined) ?? new THREE.MeshStandardMaterial();
          const materialName = (baseMaterial?.name ?? '').trim();
          const category = classifyMaterial(materialName);

          nextMaterial.transparent = true;
          nextMaterial.opacity = options.opacity;
          nextMaterial.side = THREE.DoubleSide;
          nextMaterial.depthWrite = false;

          if ('roughness' in nextMaterial) nextMaterial.roughness = Math.min(nextMaterial.roughness ?? 0.6, 0.72);
          if ('metalness' in nextMaterial) nextMaterial.metalness = Math.min(nextMaterial.metalness ?? 0, 0.08);

          if (options.boost) {
            nextMaterial.emissive = new THREE.Color(options.boost);
            nextMaterial.emissiveIntensity = 0.08;
          }

          if (category === 'support') {
            nextMaterial.opacity = 0.08;
            nextMaterial.emissiveIntensity = 0;
          }

          if (category === 'vascular') {
            nextMaterial.opacity = 0.45;
            nextMaterial.emissive = new THREE.Color('#fb7185');
            nextMaterial.emissiveIntensity = 0.2;
          }

          if (category === 'neural') {
            nextMaterial.opacity = 0.62;
            nextMaterial.emissive = new THREE.Color('#7dd3fc');
            nextMaterial.emissiveIntensity = 0.24;
          }

          if (category === 'brain') {
            nextMaterial.opacity = 0.7;
            nextMaterial.emissive = new THREE.Color('#a78bfa');
            nextMaterial.emissiveIntensity = 0.18;
          }

          if (category === 'viscera') {
            nextMaterial.opacity = 0.58;
            nextMaterial.emissive = new THREE.Color('#f59e0b');
            nextMaterial.emissiveIntensity = 0.14;
          }

          if (category === 'lungs') {
            nextMaterial.opacity = 0.82;
            nextMaterial.color = new THREE.Color('#7dd3fc');
            nextMaterial.emissive = new THREE.Color('#38bdf8');
            nextMaterial.emissiveIntensity = 0.32;
            nextMaterial.roughness = 0.3;
          }

          object.material = nextMaterial;
        });

        return cloned;
      },
    [],
  );

  const angiologyModel = useMemo(() => prepareLayer(angiologyScene, { opacity: 0.28, boost: '#fb7185' }), [angiologyScene, prepareLayer]);
  const neurologyModel = useMemo(() => prepareLayer(neurologyScene, { opacity: 0.32, boost: '#7dd3fc' }), [neurologyScene, prepareLayer]);
  const splanchnologyModel = useMemo(() => prepareLayer(splanchnologyScene, { opacity: 0.34, boost: '#f59e0b' }), [splanchnologyScene, prepareLayer]);

  return (
    <group position={referenceTransform.position} scale={referenceTransform.scale} rotation={referenceTransform.rotation}>
      <primitive object={angiologyModel} />
      <primitive object={splanchnologyModel} />
      <primitive object={neurologyModel} />
    </group>
  );
}

function LungShape({
  risk,
  side,
  onClick,
}: {
  risk: OrganRisk;
  side: 'left' | 'right';
  onClick?: (r: OrganRisk) => void;
}) {
  const x = side === 'left' ? -0.098 : 0.098;
  const color = RISK_COLORS[risk.risk];
  const base = risk.risk === 'critical' ? 2.5 : risk.risk === 'high' ? 1.8 : risk.risk === 'moderate' ? 1.2 : 0.5;
  const [hovered, setHovered] = useState(false);
  const intensity = hovered ? base * 1.6 : base;
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.03);
  });

  return (
    <group
      ref={ref}
      position={[x, 1.165, 0.048]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onClick?.(risk);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
        setPointer(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        setPointer(false);
      }}
      renderOrder={10}
    >
      <mesh rotation={[0.06, 0.12 * (side === 'left' ? -1 : 1), 0.12 * (side === 'left' ? -1 : 1)]} scale={[0.082, 0.18, 0.074]}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} transparent opacity={0.52} roughness={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.062, -0.004]} rotation={[-0.04, 0, 0]} scale={[0.072, 0.115, 0.064]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity * 0.72} transparent opacity={0.4} roughness={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

function HeartShape({ risk, onClick }: { risk: OrganRisk; onClick?: (r: OrganRisk) => void }) {
  const color = RISK_COLORS[risk.risk];
  const base = risk.risk === 'critical' ? 2.5 : risk.risk === 'high' ? 1.8 : risk.risk === 'moderate' ? 1.2 : 0.5;
  const [hovered, setHovered] = useState(false);
  const intensity = hovered ? base * 1.6 : base;
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05 * (risk.risk === 'critical' ? 2 : 1);
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group
      ref={ref}
      position={[-0.03, 1.105, 0.082]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onClick?.(risk);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
        setPointer(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        setPointer(false);
      }}
      renderOrder={10}
    >
      <mesh position={[-0.025, 0.018, 0]} scale={[0.042, 0.056, 0.038]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} transparent opacity={0.8} roughness={0.3} depthWrite={false} />
      </mesh>
      <mesh position={[0.025, 0.018, 0]} scale={[0.042, 0.056, 0.038]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} transparent opacity={0.8} roughness={0.3} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.03, 0.003]} scale={[0.032, 0.042, 0.03]} rotation={[0.1, 0, Math.PI]}>
        <coneGeometry args={[1, 1.5, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity * 0.88} transparent opacity={0.78} roughness={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GlowOrgan({
  risk,
  position,
  scale,
  rotation,
  onClick,
}: {
  risk: OrganRisk;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  onClick?: (r: OrganRisk) => void;
}) {
  const color = RISK_COLORS[risk.risk];
  const base = risk.risk === 'critical' ? 2.5 : risk.risk === 'high' ? 1.8 : risk.risk === 'moderate' ? 1.2 : 0.5;
  const [hovered, setHovered] = useState(false);
  const intensity = hovered ? base * 1.6 : base;
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const pulse = risk.risk === 'critical' ? 0.06 : 0.02;
    const scalar = 1 + Math.sin(state.clock.elapsedTime * 1.5) * pulse;
    ref.current.scale.set(scale[0] * scalar, scale[1] * scalar, scale[2] * scalar);
  });

  return (
    <mesh
      ref={ref}
      position={position}
      rotation={rotation as unknown as THREE.Euler}
      scale={scale}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onClick?.(risk);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
        setPointer(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        setPointer(false);
      }}
      renderOrder={10}
    >
      <sphereGeometry args={[1, 18, 18]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} transparent opacity={hovered ? 0.8 : 0.58} roughness={0.35} depthWrite={false} />
    </mesh>
  );
}

function Scene({ risks, onOrganClick }: { risks: OrganRisk[]; onOrganClick?: (organ: OrganRisk) => void }) {
  const getRisk = (id: string) => risks.find((risk) => risk.organ === id)!;

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#100c19', 2.2, 6]} />

      <ambientLight intensity={0.36} />
      <hemisphereLight args={['#ece4ff', '#181224', 0.42]} />
      <directionalLight position={[3.6, 4.2, 2.6]} intensity={0.85} color="#fff7ed" />
      <directionalLight position={[-2.6, 3.8, -2.4]} intensity={0.35} color="#a78bfa" />
      <pointLight position={[0, 1.2, 1.8]} intensity={0.35} color="#7dd3fc" />
      <pointLight position={[0, 0.7, -1.5]} intensity={0.16} color="#f0abfc" />

      <Float speed={0.3} rotationIntensity={0.008} floatIntensity={0.06}>
        <group position={[0, -0.8, 0]}>
          <Suspense fallback={null}>
            <HumanBodyModel />
          </Suspense>

          <Suspense fallback={null}>
            <AnatomyLayerModels />
          </Suspense>

          <GlowOrgan risk={getRisk('brain')} position={[0, 1.73, 0.02]} scale={[0.095, 0.11, 0.11]} onClick={onOrganClick} />
          <LungShape risk={getRisk('lungs')} side="left" onClick={onOrganClick} />
          <LungShape risk={getRisk('lungs')} side="right" onClick={onOrganClick} />
          <HeartShape risk={getRisk('heart')} onClick={onOrganClick} />
          <GlowOrgan risk={getRisk('liver')} position={[0.11, 0.98, 0.055]} scale={[0.13, 0.075, 0.06]} rotation={[0.04, 0.08, -0.3]} onClick={onOrganClick} />
          <GlowOrgan risk={getRisk('body-fat')} position={[0, 0.9, 0.06]} scale={[0.17, 0.12, 0.09]} onClick={onOrganClick} />
        </group>
      </Float>

      <ContactShadows position={[0, -0.95, 0]} opacity={0.42} scale={3.1} blur={2.4} far={2.3} resolution={1024} color="#261c39" />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={1.5}
        maxDistance={5}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.9}
        autoRotate
        autoRotateSpeed={0.42}
      />
    </>
  );
}

export default function BodyVisualization3D({
  risks,
  onOrganClick,
}: {
  risks: OrganRisk[];
  onOrganClick?: (organ: OrganRisk) => void;
}) {
  return (
    <div className="relative h-full min-h-[460px] w-full">
      <Canvas camera={{ position: [0, 1, 3.05], fov: 36 }} style={{ background: 'transparent' }} gl={{ antialias: true, alpha: true }}>
        <Scene risks={risks} onOrganClick={onOrganClick} />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-primary/20" />
      <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-primary/20" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-primary/20" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-primary/20" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/50">
        Drag to rotate - Scroll to zoom - Click organs
      </div>
    </div>
  );
}

useGLTF.preload(ANGIOLOGY_MODEL_URL);
useGLTF.preload(NEUROLOGY_MODEL_URL);
useGLTF.preload(SPLANCHNOLOGY_MODEL_URL);
