import * as THREE from 'three'

const TARGET = 22

export default function HeatMapOverlay({ rooms }) {
  return (
    <>
      {rooms.map(room => {
        const [cx, , cz] = room.position
        const [w, , d]   = room.size
        const diff  = room.temperature.current - TARGET
        const alpha = Math.min(0.20, Math.abs(diff) * 0.042)
        if (alpha < 0.015) return null
        const color = diff > 0 ? '#ff3300' : '#0066ff'

        return (
          <mesh key={room.id} position={[cx, 0.18, cz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - 1, d - 1]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={alpha}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </>
  )
}
