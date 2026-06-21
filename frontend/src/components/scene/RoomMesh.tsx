import { Edges, Html, RoundedBox } from '@react-three/drei'
import type { Room } from '../../types/campus'
import { STATUS_COLORS } from '../../utils/status'

interface RoomMeshProps {
  room: Room
  onSelect: (id: string) => void
}

export function RoomMesh({ room, onSelect }: RoomMeshProps) {
  const statusColor = STATUS_COLORS[room.status]
  const isCritical = room.status === 'at-risk' || room.status === 'fault'

  return (
    <group position={room.position}>
      <RoundedBox
        args={room.size}
        radius={0.12}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect(room.id) }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        <meshStandardMaterial
          color={statusColor}
          transparent
          opacity={isCritical ? 0.22 : 0.12}
          roughness={0.55}
          metalness={0.05}
          emissive={statusColor}
          emissiveIntensity={isCritical ? 0.14 : 0.03}
          depthWrite={false}
        />
        <Edges scale={1.002} threshold={12} color={statusColor} />
      </RoundedBox>

      {/* Room label — shows only backend-available fields (name, status from /api/control/status) */}
      <Html
        position={[0, room.size[1] / 2 + 0.3, 0]}
        center
        distanceFactor={18}
        zIndexRange={[4, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`room-label ${isCritical ? 'room-label--critical' : ''}`}>
          <div className="room-label__top">
            <strong>{room.name}</strong>
            <span className="status-dot" style={{ background: statusColor }} />
          </div>
          <div className="room-label__temperature">
            {room.currentTemperature.toFixed(1)}°
            <span> / {room.targetTemperature.toFixed(0)}°</span>
          </div>
          <div className="room-label__status">
            {room.id} · {room.floor === 0 ? 'Ground' : 'Floor 1'} · {room.occupancy} ppl
          </div>
        </div>
      </Html>
    </group>
  )
}
