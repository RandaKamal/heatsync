import type {
  ClimateDevice,
  FloorFilter,
  Room,
} from '../../types/campus'
import { ClimateDevice as ClimateDeviceMesh } from './ClimateDevice'
import { RoomMesh } from './RoomMesh'

interface BuildingProps {
  rooms: Room[]
  devices: ClimateDevice[]
  activeFloor: FloorFilter
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
  onCloseDevice: () => void
}

interface FloorSlabProps {
  y: number
  highlighted: boolean
}

function FloorSlab({
  y,
  highlighted,
}: FloorSlabProps) {
  return (
    <mesh
      position={[0, y, -0.1]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[12.2, 0.12, 7.4]} />
      <meshStandardMaterial
        color={highlighted ? '#22354a' : '#172536'}
        roughness={0.78}
        metalness={0.08}
        transparent
        opacity={highlighted ? 0.95 : 0.7}
      />
    </mesh>
  )
}

export function Building({
  rooms,
  devices,
  activeFloor,
  selectedDeviceId,
  onSelectDevice,
  onCloseDevice,
}: BuildingProps) {
  const visibleRooms = rooms.filter(
    (room) =>
      activeFloor === 'all' ||
      room.floor === activeFloor,
  )

  const visibleDevices = devices.filter((device) => {
    if (activeFloor === 'all') {
      return true
    }

    if (device.floor === activeFloor) {
      return true
    }

    return activeFloor === 1 && device.floor === 'roof'
  })

  return (
    <group>
      <FloorSlab
        y={0.08}
        highlighted={
          activeFloor === 'all' || activeFloor === 0
        }
      />

      {(activeFloor === 'all' || activeFloor === 1) && (
        <FloorSlab
          y={1.72}
          highlighted={
            activeFloor === 'all' || activeFloor === 1
          }
        />
      )}

      {[
        [-5.85, 1.65, -3.55],
        [5.85, 1.65, -3.55],
        [-5.85, 1.65, 3.35],
        [5.85, 1.65, 3.35],
      ].map(([x, y, z]) => (
        <mesh
          key={`${x}-${z}`}
          position={[x, y, z]}
          castShadow
        >
          <boxGeometry args={[0.15, 3.2, 0.15]} />
          <meshStandardMaterial
            color="#40536a"
            metalness={0.35}
            roughness={0.55}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.76, 2.32]} receiveShadow>
        <boxGeometry args={[11.8, 1.28, 1]} />
        <meshStandardMaterial
          color="#18283a"
          transparent
          opacity={0.32}
          roughness={0.75}
          depthWrite={false}
        />
      </mesh>

      {visibleRooms.map((room) => (
        <RoomMesh key={room.id} room={room} />
      ))}

      {visibleDevices.map((device) => (
        <ClimateDeviceMesh
          key={device.id}
          device={device}
          selected={selectedDeviceId === device.id}
          onSelect={onSelectDevice}
          onClose={onCloseDevice}
        />
      ))}
    </group>
  )
}
