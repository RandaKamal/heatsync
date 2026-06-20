import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import FloorLayer from './FloorLayer'
import HeatPumpUnit from './HeatPumpUnit'
import SensorMarkers from './SensorMarkers'
import HeatMapOverlay from './HeatMapOverlay'

const STATUS_COLOR = {
  optimal: '#00e676',
  warning: '#ffa726',
  error:   '#ef5350',
}

// ── Connecting corridor between the two rows of halls ────────────────────────
function Corridor() {
  // Runs along x = -22 to 22, at z = 0, width 4 (bridging the 4-unit gap)
  const W = 46, D = 4, H = 2.8
  return (
    <group position={[0, 0, 0]}>
      {/* Floor */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial color="#8090a0" metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Roof — glass canopy */}
      <mesh position={[0, H + 0.05, 0]}>
        <boxGeometry args={[W + 0.2, 0.1, D + 0.1]} />
        <meshStandardMaterial
          color="#aaccdd"
          transparent
          opacity={0.28}
          metalness={0.05}
          roughness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Structural supports every ~8 units */}
      {[-16, -8, 0, 8, 16].map((x, i) => (
        <group key={i} position={[x, H / 2, 0]}>
          {[-D / 2 + 0.1, D / 2 - 0.1].map((z, j) => (
            <mesh key={j} position={[0, 0, z]} castShadow>
              <boxGeometry args={[0.12, H, 0.12]} />
              <meshStandardMaterial color="#1a2838" metalness={0.92} roughness={0.15} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ── Campus ground: tarmac pad + walkways + green strips ─────────────────────
function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.15, 0.22, 2.4, 7]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.95} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <coneGeometry args={[1.2, 2.6, 8]} />
        {/* emissive so foliage stays visible even in evening shadows */}
        <meshStandardMaterial color="#2a7a14" emissive="#1a5a0a" emissiveIntensity={0.25} roughness={0.88} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <coneGeometry args={[0.8, 1.9, 8]} />
        <meshStandardMaterial color="#339922" emissive="#227711" emissiveIntensity={0.25} roughness={0.88} />
      </mesh>
    </group>
  )
}

function CampusGround() {
  return (
    <group>
      {/* Wide green lawn base — whole campus sits on grass */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[90, 0.14, 70]} />
        <meshStandardMaterial color="#2e7a18" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Tarmac pad under the buildings only */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[52, 0.06, 22]} />
        <meshStandardMaterial color="#3a3f44" metalness={0.05} roughness={0.92} />
      </mesh>

      {/* Service roads */}
      {[
        { pos: [0,  0, -16], size: [56, 0.04, 5] },
        { pos: [0,  0,  16], size: [56, 0.04, 5] },
        { pos: [-30, 0,  0], size: [5, 0.04, 30] },
        { pos: [ 30, 0,  0], size: [5, 0.04, 30] },
      ].map(({ pos, size }, i) => (
        <mesh key={`road-${i}`} position={pos}>
          <boxGeometry args={size} />
          <meshStandardMaterial color="#2e3338" metalness={0.08} roughness={0.90} />
        </mesh>
      ))}

      {/* Parking bay lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`park-${i}`} position={[-17.5 + i * 5, 0.01, 19]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 4.5]} />
          <meshBasicMaterial color="#555e66" />
        </mesh>
      ))}

      {/* Trees — more of them, spread around the campus */}
      {[
        [-32, 0, -22], [32, 0, -22], [-32, 0, 22], [32, 0, 22],
        [-32, 0,  -8], [-32, 0,   8], [32, 0,  -8], [32, 0,  8],
        [-20, 0, -28], [0,   0, -28], [20, 0, -28],
        [-20, 0,  28], [0,   0,  28], [20, 0,  28],
      ].map(([x,, z], i) => (
        <Tree key={`tree-${i}`} position={[x, 0, z]} />
      ))}
    </group>
  )
}

// ── Main scene ───────────────────────────────────────────────────────────────
export default function BuildingModel({ rooms, period = 'midday', onUnitSelect, selectedUnitId }) {
  return (
    <group>
      <CampusGround />
      <Corridor />

      {rooms.map(room => {
        const [cx, , cz] = room.position
        const scol = STATUS_COLOR[room.status] ?? '#4fc3f7'

        return (
          <group key={room.id}>
            <FloorLayer room={room} period={period} />
            <HeatMapOverlay rooms={[room]} />

            {/* Room labels — Billboard ensures they face camera from any angle */}
            <Billboard position={[cx, 7.5, cz]} follow lockX={false} lockY lockZ={false}>
              <Text
                fontSize={0.58}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.04}
                outlineColor="#000a18"
              >
                {room.name}
              </Text>
            </Billboard>
            <Billboard position={[cx, 6.88, cz]} follow lockX={false} lockY lockZ={false}>
              <Text
                fontSize={0.33}
                color={scol}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000a18"
              >
                {room.temperature.current.toFixed(1)} °C · {room.occupancy.current} ppl
              </Text>
            </Billboard>

            {/* Heat pump units on roof */}
            {room.heatPumps.map(unit => (
              <HeatPumpUnit
                key={unit.id}
                unit={unit}
                room={room}
                isSelected={selectedUnitId === unit.id}
                onSelect={() => onUnitSelect(unit, room)}
              />
            ))}
          </group>
        )
      })}

      <SensorMarkers rooms={rooms} />
    </group>
  )
}
