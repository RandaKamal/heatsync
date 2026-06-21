import { Line } from '@react-three/drei'
import type { ClimateDevice, FloorFilter, Room } from '../../types/campus'
import { STATUS_COLORS } from '../../utils/status'
import { ClimateDevice as ClimateDeviceMesh } from './ClimateDevice'
import { RoomMesh } from './RoomMesh'

// ── Building constants ────────────────────────────────────────────────────────
//
//  Each room is the same 24 × 16 × 3.5 m box as the original single room.
//  Two rooms sit side-by-side (G01 left, G02 right) per floor.
//  A 2 m wall divider separates them at x = 0.
//
//  Total footprint: W = 50 m wide, D = 16 m deep, TH = 7 m tall (2 floors).

const W  = 50    // total width
const D  = 16    // total depth
const H  = 3.5   // single floor height
const TH = H * 2 // total height = 7.0
const T  = 0.18  // slab thickness

interface BuildingProps {
  rooms: Room[]
  devices: ClimateDevice[]
  activeFloor: FloorFilter
  selectedRoomId: string | null
  onSelectDevice: (id: string) => void
  onSelectRoom: (id: string) => void
}

// ── Structural elements ───────────────────────────────────────────────────────

function Slab({ y, color = '#172536' }: { y: number; color?: string }) {
  return (
    <mesh position={[0, y, 0]} receiveShadow castShadow>
      <boxGeometry args={[W + T, T, D + T]} />
      <meshStandardMaterial color={color} roughness={0.82} metalness={0.06} />
    </mesh>
  )
}

function Roof() {
  return (
    <mesh position={[0, TH + T / 2, 0]} receiveShadow>
      <boxGeometry args={[W + T, T, D + T]} />
      <meshStandardMaterial color="#1a2d40" roughness={0.78} metalness={0.1} />
    </mesh>
  )
}

function Walls() {
  const yMid = TH / 2
  const glassMat = (
    <meshStandardMaterial
      color="#1e3a52"
      transparent
      opacity={0.20}
      roughness={0.12}
      metalness={0.45}
      depthWrite={false}
    />
  )
  const backMat = (
    <meshStandardMaterial
      color="#1e3a52"
      transparent
      opacity={0.09}
      roughness={0.12}
      metalness={0.45}
      depthWrite={false}
    />
  )
  const dividerMat = (
    <meshStandardMaterial
      color="#223a50"
      transparent
      opacity={0.35}
      roughness={0.30}
      metalness={0.25}
      depthWrite={false}
    />
  )
  return (
    <group>
      {/* Outer front */}
      <mesh position={[0, yMid, -D / 2]}><boxGeometry args={[W, TH, T]} />{glassMat}</mesh>
      {/* Outer back — more transparent so camera can see through */}
      <mesh position={[0, yMid,  D / 2]}><boxGeometry args={[W, TH, T]} />{backMat}</mesh>
      {/* Outer left */}
      <mesh position={[-W / 2, yMid, 0]}><boxGeometry args={[T, TH, D]} />{glassMat}</mesh>
      {/* Outer right */}
      <mesh position={[ W / 2, yMid, 0]}><boxGeometry args={[T, TH, D]} />{glassMat}</mesh>
      {/* Centre vertical divider — full height, separates left/right rooms */}
      <mesh position={[0, yMid, 0]}><boxGeometry args={[T * 2, TH, D]} />{dividerMat}</mesh>
    </group>
  )
}

// Structural columns at the 4 corners + 2 centre (where divider meets front/back walls)
function Columns() {
  const h = TH
  const cols: [number, number, number][] = [
    [-W / 2 + 0.1,  h / 2, -D / 2 + 0.1],
    [ W / 2 - 0.1,  h / 2, -D / 2 + 0.1],
    [-W / 2 + 0.1,  h / 2,  D / 2 - 0.1],
    [ W / 2 - 0.1,  h / 2,  D / 2 - 0.1],
    [0,             h / 2, -D / 2 + 0.1],
    [0,             h / 2,  D / 2 - 0.1],
  ]
  return (
    <group>
      {cols.map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.24, h, 0.24]} />
          <meshStandardMaterial color="#2e4a62" metalness={0.42} roughness={0.50} />
        </mesh>
      ))}
    </group>
  )
}

// ── Duct line routing ─────────────────────────────────────────────────────────
//
//  Ground-floor HPs (y≈4.2) sit on top of the inter-floor slab.
//  Their duct drops straight down through the slab into G01/G02.
//
//  Upper-floor HPs (y≈7.5) sit on the roof.
//  Their duct drops through the top slab into F01/F02.

function ductPoints(
  device: ClimateDevice,
  room: Room,
): [[number,number,number],[number,number,number],[number,number,number]] {
  const [hx, hy, hz] = device.position
  const cx = room.position[0]       // -13 or +13

  if (room.floor === 0) {
    // HP hangs from ground-floor ceiling (y≈2.9, top flush with slab underside at 3.41).
    // Duct drops down from HP bottom toward room centre.
    return [
      [hx, hy - 0.53, hz],   // HP bottom
      [hx, H / 2,     hz],   // midpoint drop into room
      [cx, H / 2,      0],   // room mid-height centre
    ]
  } else {
    // HP sits on top roof at y≈7.5. Duct drops through roof into upper-floor room.
    return [
      [hx, hy - 0.53,  hz],  // HP base
      [hx, TH + T,     hz],  // roof top surface
      [cx, TH - 0.4,    0],  // room ceiling centre
    ]
  }
}

// ── Building component ────────────────────────────────────────────────────────

export function Building({ rooms, devices, activeFloor, selectedRoomId, onSelectDevice, onSelectRoom }: BuildingProps) {
  // When a room is selected show only it + its HPs; otherwise apply floor filter
  const visibleRooms = selectedRoomId
    ? rooms.filter((r) => r.id === selectedRoomId)
    : rooms.filter((r) => activeFloor === 'all' || r.floor === activeFloor)

  const visibleDevices = selectedRoomId
    ? devices.filter((d) => d.servedRoomIds.includes(selectedRoomId))
    : devices

  const ductLines = visibleDevices.flatMap((device) => {
    const servedRoom = rooms.find((r) => device.servedRoomIds.includes(r.id))
    if (!servedRoom) return []

    return [{
      key: device.id,
      color: STATUS_COLORS[device.status],
      points: ductPoints(device, servedRoom),
    }]
  })

  return (
    <group>
      {/* Ground slab */}
      <Slab y={0} />
      {/* Inter-floor slab (slightly darker to distinguish floors) */}
      <Slab y={H} color="#1c2f42" />
      {/* Top roof */}
      <Roof />
      {/* Outer glass walls + centre divider */}
      <Walls />
      {/* Structural columns */}
      <Columns />

      {/* Duct lines — each HP to its room's ceiling centre */}
      {ductLines.map((duct) => (
        <Line
          key={duct.key}
          points={duct.points}
          color={duct.color}
          lineWidth={1.5}
          transparent
          opacity={0.38}
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
      ))}

      {/* Room boxes (filtered by active floor) */}
      {visibleRooms.map((room) => (
        <RoomMesh key={room.id} room={room} onSelect={onSelectRoom} />
      ))}

      {visibleDevices.map((device) => (
        <ClimateDeviceMesh key={device.id} device={device} onSelect={onSelectDevice} />
      ))}
    </group>
  )
}
