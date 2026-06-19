import { useState } from 'react'
import { Edges, Html, RoundedBox } from '@react-three/drei'
import type { Room } from '../../types/campus'
import {
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../utils/status'

interface RoomMeshProps {
  room: Room
  showLabel: boolean
}

export function RoomMesh({
  room,
  showLabel,
}: RoomMeshProps) {
  const [hovered, setHovered] = useState(false)
  const statusColor = STATUS_COLORS[room.status]
  const isCritical =
    room.status === 'at-risk' || room.status === 'fault'

  return (
    <group position={room.position}>
      <RoundedBox
        args={room.size}
        radius={0.1}
        smoothness={4}
        castShadow
        receiveShadow
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
      >
        <meshStandardMaterial
          color={statusColor}
          transparent
          opacity={hovered ? 0.32 : isCritical ? 0.25 : 0.16}
          roughness={0.55}
          metalness={0.05}
          emissive={statusColor}
          emissiveIntensity={isCritical ? 0.16 : 0.04}
          depthWrite={false}
        />
        <Edges
          scale={1.002}
          threshold={12}
          color={statusColor}
        />
      </RoundedBox>

      {showLabel && (
        <Html
          position={[0, room.size[1] / 2 + 0.13, 0]}
          center
          distanceFactor={12}
          zIndexRange={[4, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`room-label ${
              isCritical ? 'room-label--critical' : ''
            }`}
          >
            <div className="room-label__top">
              <strong>{room.id}</strong>
              <span
                className="status-dot"
                style={{ background: statusColor }}
              />
            </div>
            <div className="room-label__temperature">
              {room.currentTemperature.toFixed(1)}°
              <span> / {room.targetTemperature.toFixed(0)}°</span>
            </div>
            <div className="room-label__status">
              {STATUS_LABELS[room.status]} · {room.occupancy} people
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
