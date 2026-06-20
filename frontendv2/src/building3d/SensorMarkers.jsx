import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const SENSOR_POSITIONS = [
  { roomId: 'hall-a',    pos: [-15, 1.2, -8]  },
  { roomId: 'hall-b',    pos: [0,   1.2, -8]  },
  { roomId: 'hall-c',    pos: [16,  1.2, -8]  },
  { roomId: 'hall-d',    pos: [-15, 1.2, 8]   },
  { roomId: 'hall-e',    pos: [0,   1.2, 8]   },
  { roomId: 'tech-room', pos: [16,  1.2, 8]   },
]

function PulsingSensor({ position, color }) {
  const ring1 = useRef()
  const ring2 = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ring1.current) ring1.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.3)
    if (ring2.current) ring2.current.scale.setScalar(1 + Math.sin(t * 2.5 + Math.PI) * 0.3)
    if (ring1.current) ring1.current.material.opacity = 0.4 + Math.sin(t * 2.5) * 0.25
    if (ring2.current) ring2.current.material.opacity = 0.4 + Math.sin(t * 2.5 + Math.PI) * 0.25
  })

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Core dot */}
      <mesh>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Pulse rings */}
      <mesh ref={ring1}>
        <ringGeometry args={[0.12, 0.16, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh ref={ring2}>
        <ringGeometry args={[0.22, 0.26, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function SensorMarkers({ rooms }) {
  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]))

  return (
    <>
      {SENSOR_POSITIONS.map(({ roomId, pos }) => {
        const room = roomMap[roomId]
        if (!room) return null
        const color =
          room.status === 'error'   ? '#ef5350' :
          room.status === 'warning' ? '#ffa726' :
          '#00e676'
        return <PulsingSensor key={roomId} position={pos} color={color} />
      })}
    </>
  )
}
