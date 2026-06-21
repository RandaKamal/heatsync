import { DoubleSide } from 'three'
import type { ClimateDevice as ClimateDeviceData } from '../../types/campus'
import { STATUS_COLORS } from '../../utils/status'

interface ClimateDeviceProps {
  device: ClimateDeviceData
  onSelect: (id: string) => void
}

function Fan({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0.12, 1.08]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 0.07, 32]} />
        <meshStandardMaterial color="#142537" metalness={0.5} />
      </mesh>
      {[0, 1, 2, 3].map((blade) => (
        <mesh key={blade} rotation={[0, 0, (Math.PI / 2) * blade]}>
          <boxGeometry args={[0.38, 0.055, 0.035]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

export function ClimateDevice({ device, onSelect }: ClimateDeviceProps) {
  const statusColor = STATUS_COLORS[device.status]
  const fanPositions = [0]

  return (
    <group
      position={device.position}
      onClick={(e) => { e.stopPropagation(); onSelect(device.id) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}
    >
      {/* Unit body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.55, 1.05, 2.15]} />
        <meshStandardMaterial color="#d9e3e9" roughness={0.48} metalness={0.28} />
      </mesh>

      {/* Louvre panel */}
      <mesh position={[0, 0.16, -1.095]}>
        <boxGeometry args={[1.05, 0.42, 0.05]} />
        <meshStandardMaterial color="#1a2b3d" />
      </mesh>
      {[-0.34, -0.17, 0, 0.17, 0.34].map((y) => (
        <mesh key={y} position={[0, y + 0.16, -1.13]}>
          <boxGeometry args={[0.92, 0.04, 0.025]} />
          <meshStandardMaterial color={statusColor} />
        </mesh>
      ))}

      {/* Fans */}
      {fanPositions.map((x) => (
        <Fan key={x} x={x} color={statusColor} />
      ))}

      {/* Compressor stubs */}
      {([-0.42, 0.42] as number[]).map((ox) => (
        <mesh key={ox} position={[ox, -0.10, 1.08]}>
          <cylinderGeometry args={[0.18, 0.18, 0.24, 24]} />
          <meshStandardMaterial color="#8da4b4" metalness={0.35} />
        </mesh>
      ))}

      {/* Status halo ring on roof surface */}
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.08, 40]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={device.status === 'fault' || device.status === 'at-risk' ? 0.7 : 0.28}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

    </group>
  )
}
