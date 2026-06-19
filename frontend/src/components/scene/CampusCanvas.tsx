import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type {
  ClimateDevice,
  FloorFilter,
  Room,
} from '../../types/campus'
import { Building } from './Building'

interface CampusCanvasProps {
  rooms: Room[]
  devices: ClimateDevice[]
  activeFloor: FloorFilter
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
  onCloseDevice: () => void
}

export function CampusCanvas({
  rooms,
  devices,
  activeFloor,
  selectedDeviceId,
  onSelectDevice,
  onCloseDevice,
}: CampusCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{
        position: [12.5, 9.5, 14.5],
        fov: 40,
        near: 0.1,
        far: 100,
      }}
      gl={{
        antialias: true,
        alpha: false,
      }}
      onPointerMissed={onCloseDevice}
    >
      <color attach="background" args={['#07111f']} />
      <fog attach="fog" args={['#07111f', 20, 38]} />

      <hemisphereLight
        intensity={0.8}
        color="#d9efff"
        groundColor="#07111f"
      />

      <directionalLight
        position={[8, 14, 10]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <pointLight
        position={[-8, 5, -4]}
        intensity={16}
        distance={20}
        color="#0ea5e9"
      />

      <Building
        rooms={rooms}
        devices={devices}
        activeFloor={activeFloor}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={onSelectDevice}
        onCloseDevice={onCloseDevice}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial
          color="#091525"
          roughness={0.95}
        />
      </mesh>

      <gridHelper
        args={[36, 36, '#28445e', '#122338']}
        position={[0, 0.01, 0]}
      />

      <OrbitControls
        makeDefault
        target={[0, 1.35, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={28}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.08}
        maxAzimuthAngle={Math.PI}
        minAzimuthAngle={-Math.PI}
      />
    </Canvas>
  )
}
