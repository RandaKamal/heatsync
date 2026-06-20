import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import * as THREE from 'three'

// W × H × D  (real IMBAT Orion ORIO-025: 1.2 × 2.08 × 2.17 m)
const W = 1.2
const H = 2.0
const D = 2.2

const STATUS_COLOR = {
  active:  '#00f5ff',
  idle:    '#3a6a8a',
  warning: '#ffa726',
  error:   '#ef5350',
}

// ── Spinning axial fan ───────────────────────────────────────────────────────
function AxialFan({ active, warning, error }) {
  const hub = useRef()

  useFrame(() => {
    if (!hub.current) return
    const spd = error ? 0.04 : warning ? 0.08 : active ? 0.22 : 0.01
    hub.current.rotation.y += spd
  })

  return (
    <group>
      {/* 5 fan blades — silver-gray so they're visible */}
      <group ref={hub}>
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18]}
              rotation={[0, a + 0.4, 0.15]}
            >
              <boxGeometry args={[0.07, 0.03, 0.32]} />
              <meshStandardMaterial color="#8aaabb" metalness={0.4} roughness={0.4} />
            </mesh>
          )
        })}
        {/* Center hub cap */}
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 14]} />
          <meshStandardMaterial color="#6a8898" metalness={0.45} roughness={0.3} />
        </mesh>
      </group>

      {/* Fan guard — concentric rings */}
      {[0.15, 0.27, 0.37].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.008, 6, 32]} />
          <meshStandardMaterial color="#7a9aaa" metalness={0.4} roughness={0.45} />
        </mesh>
      ))}
      {/* Guard cross-bars */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a, i) => (
        <mesh key={`bar-${i}`} rotation={[Math.PI / 2, 0, a]}>
          <boxGeometry args={[0.78, 0.008, 0.012]} />
          <meshStandardMaterial color="#7a9aaa" metalness={0.4} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

// ── Louvered vent panel (horizontal slats) ───────────────────────────────────
function VentPanel({ width, height }) {
  const count = Math.floor(height / 0.14)
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const y = -height / 2 + (i + 0.5) * (height / count)
        return (
          <mesh key={i} position={[0, y, 0.005]}>
            <boxGeometry args={[width - 0.06, 0.055, 0.04]} />
            <meshStandardMaterial color="#7a9aaa" metalness={0.3} roughness={0.55} />
          </mesh>
        )
      })}
    </>
  )
}

// ── Main unit ────────────────────────────────────────────────────────────────
export default function HeatPumpUnit({ unit, room, onSelect, isSelected }) {
  const groupRef = useRef()
  const glowRef  = useRef()
  const [hovered, setHovered] = useState(false)

  useCursor(hovered)

  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const t = clock.elapsedTime
    if (unit.status === 'active')  glowRef.current.intensity = 0.5 + Math.sin(t * 2.2) * 0.25
    if (unit.status === 'error')   glowRef.current.intensity = Math.sin(t * 7) > 0 ? 0.9 : 0.08
    if (unit.status === 'warning') glowRef.current.intensity = 0.35 + Math.sin(t * 1.5) * 0.18
    if (unit.status === 'idle')    glowRef.current.intensity = 0.08
  })

  const col = STATUS_COLOR[unit.status] ?? '#4fc3f7'

  return (
    <group position={unit.position} ref={groupRef}>
      <pointLight ref={glowRef} color={col} intensity={0.5} distance={6} decay={2} />

      {/* ── Main galvanized steel body — light gray, low metalness so daylight shows ── */}
      <mesh
        castShadow
        receiveShadow
        onClick={e => { e.stopPropagation(); onSelect() }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color="#c8d8e0" metalness={0.25} roughness={0.5} />
      </mesh>

      {/* ── Condenser fan housing (top-mounted) ── */}
      <mesh position={[0, H / 2 + 0.04, 0]}>
        <cylinderGeometry args={[0.46, 0.44, 0.08, 32]} />
        <meshStandardMaterial color="#a8bac4" metalness={0.30} roughness={0.45} />
      </mesh>
      <group position={[0, H / 2 + 0.05, 0]}>
        <AxialFan
          active={unit.status === 'active'}
          warning={unit.status === 'warning'}
          error={unit.status === 'error'}
        />
      </group>

      {/* ── Louvered intake vents — long sides (±X) ── */}
      <group position={[W / 2 + 0.005, -0.05, 0]}>
        <VentPanel width={D - 0.3} height={H * 0.55} />
      </group>
      <group position={[-(W / 2 + 0.005), -0.05, 0]} rotation={[0, Math.PI, 0]}>
        <VentPanel width={D - 0.3} height={H * 0.55} />
      </group>

      {/* ── Reinforced corner guards ── */}
      {[
        [-W / 2, 0, -D / 2],
        [ W / 2, 0, -D / 2],
        [-W / 2, 0,  D / 2],
        [ W / 2, 0,  D / 2],
      ].map(([x, , z], i) => (
        <mesh key={`cg-${i}`} position={[x, 0, z]}>
          <boxGeometry args={[0.06, H + 0.04, 0.06]} />
          <meshStandardMaterial color="#4a6070" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}

      {/* ── IP65 control panel (short front face) ── */}
      <mesh position={[0, -H * 0.18, D / 2 + 0.015]}>
        <boxGeometry args={[0.48, 0.28, 0.03]} />
        <meshStandardMaterial color="#2a3a48" metalness={0.35} roughness={0.6} />
      </mesh>
      {/* Panel display screen */}
      <mesh position={[-0.06, -H * 0.18, D / 2 + 0.032]}>
        <boxGeometry args={[0.22, 0.14, 0.01]} />
        <meshStandardMaterial
          color="#001a2a"
          emissive="#003355"
          emissiveIntensity={0.6}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>
      {/* Status LED */}
      <mesh position={[0.16, -H * 0.18, D / 2 + 0.032]}>
        <sphereGeometry args={[0.032, 10, 10]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>

      {/* ── Supply-air duct spigot (bottom, feeds through roof into room) ── */}
      <mesh position={[0, -H / 2 - 0.15, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.3, 16]} />
        <meshStandardMaterial color="#9aacb8" metalness={0.35} roughness={0.45} />
      </mesh>
      {/* Flexible duct collar */}
      <mesh position={[0, -H / 2 - 0.12, 0]}>
        <torusGeometry args={[0.24, 0.025, 8, 24]} />
        <meshStandardMaterial color="#5a7080" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* ── Lift points (4 corners on top) ── */}
      {[
        [-W / 2 + 0.1, H / 2 + 0.05, -D / 2 + 0.15],
        [ W / 2 - 0.1, H / 2 + 0.05, -D / 2 + 0.15],
        [-W / 2 + 0.1, H / 2 + 0.05,  D / 2 - 0.15],
        [ W / 2 - 0.1, H / 2 + 0.05,  D / 2 - 0.15],
      ].map(([x, y, z], i) => (
        <group key={`lift-${i}`} position={[x, y, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.055, 0.018, 6, 14]} />
            <meshStandardMaterial color="#8aaabb" metalness={0.45} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <boxGeometry args={[0.05, 0.07, 0.02]} />
            <meshStandardMaterial color="#6a8898" metalness={0.4} roughness={0.35} />
          </mesh>
        </group>
      ))}

      {/* ── Vibration-damping feet (4 corners) ── */}
      {[
        [-W / 2 + 0.12, -H / 2 - 0.06, -D / 2 + 0.18],
        [ W / 2 - 0.12, -H / 2 - 0.06, -D / 2 + 0.18],
        [-W / 2 + 0.12, -H / 2 - 0.06,  D / 2 - 0.18],
        [ W / 2 - 0.12, -H / 2 - 0.06,  D / 2 - 0.18],
      ].map(([x, y, z], i) => (
        <mesh key={`ft-${i}`} position={[x, y, z]}>
          <boxGeometry args={[0.16, 0.12, 0.16]} />
          <meshStandardMaterial color="#3a4e5a" metalness={0.4} roughness={0.55} />
        </mesh>
      ))}

      {/* ── Selection halo ── */}
      {isSelected && (
        <mesh position={[0, -H / 2 - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.3, 48]} />
          <meshBasicMaterial color={col} opacity={0.75} transparent side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── Hover tooltip ── */}
      {hovered && (
        <Html position={[0, H / 2 + 0.5, 0]} center distanceFactor={12}>
          <div style={{
            background: 'rgba(6,13,26,0.88)',
            border: `1px solid ${col}55`,
            borderRadius: 6,
            padding: '4px 8px',
            color: '#c8dce8',
            fontSize: 11,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            <strong style={{ color: col }}>{unit.id}</strong>
            <span style={{ marginLeft: 6, opacity: 0.7 }}>{room.temperature.current.toFixed(1)} °C</span>
          </div>
        </Html>
      )}
    </group>
  )
}
