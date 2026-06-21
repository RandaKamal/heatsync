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
      camera={{ position: [28, 20, 32], fov: 48, near: 0.5, far: 180 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#07111f']} />
      <fog attach="fog" args={['#07111f', 50, 110]} />

      <hemisphereLight intensity={0.8} color="#d9efff" groundColor="#07111f" />
      <directionalLight
        position={[16, 26, 16]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
      />
      <pointLight position={[-10,  8, -6]} intensity={30} distance={40} color="#0ea5e9" />
      <pointLight position={[ 10, 10,  6]} intensity={18} distance={35} color="#38bdf8" />

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

      <OrbitControls
        makeDefault
        target={[0, 3.5, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={14}
        maxDistance={60}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  )
}
