import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Room, ClimateDevice, FloorFilter } from '../../types/campus'
import { Building } from './Building'

interface CampusCanvasProps {
  rooms: Room[]
  devices: ClimateDevice[]
  activeFloor: FloorFilter
  onSelectDevice: (id: string) => void
  onSelectRoom: (id: string) => void
}

export function CampusCanvas({ rooms, devices, activeFloor, onSelectDevice, onSelectRoom }: CampusCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [20, 14, 22], fov: 52, near: 0.5, far: 140 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#07111f']} />
      <fog attach="fog" args={['#07111f', 50, 110]} />

      <hemisphereLight intensity={0.8} color="#d9efff" groundColor="#07111f" />
      <directionalLight
        position={[14, 20, 14]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[-10, 6, -6]} intensity={30} distance={30} color="#0ea5e9" />

      <Building
        rooms={rooms}
        devices={devices}
        activeFloor={activeFloor}
        onSelectDevice={onSelectDevice}
        onSelectRoom={onSelectRoom}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#091525" roughness={0.95} />
      </mesh>
      <gridHelper args={[80, 40, '#1a3050', '#0d1f30']} position={[0, 0.01, 0]} />

      {/* Pan-only orbit controls — left-drag pans, no rotation, no zoom */}
      <OrbitControls
        enableRotate={false}
        enableZoom={false}
        enablePan={true}
        mouseButtons={{ LEFT: 2 }}
        target={[0, 1.75, 0]}
        panSpeed={0.8}
      />
    </Canvas>
  )
}
