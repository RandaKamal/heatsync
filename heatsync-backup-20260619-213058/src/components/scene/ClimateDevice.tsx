import { useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import {
  useFrame,
  type ThreeEvent,
} from '@react-three/fiber'
import {
  DoubleSide,
  type MeshBasicMaterial,
} from 'three'
import type { ClimateDevice as ClimateDeviceData } from '../../types/campus'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TECHNOLOGY_ABBREVIATIONS,
} from '../../utils/status'
import { DeviceCard } from './DeviceCard'

interface ClimateDeviceProps {
  device: ClimateDeviceData
  selected: boolean
  onSelect: (deviceId: string) => void
  onClose: () => void
}

interface DeviceGeometryProps {
  technology: ClimateDeviceData['technology']
  color: string
}

function DeviceGeometry({
  technology,
  color,
}: DeviceGeometryProps) {
  if (technology === 'heat-pump') {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.15, 0.72, 0.82]} />
          <meshStandardMaterial
            color="#dce7ed"
            roughness={0.45}
            metalness={0.35}
          />
        </mesh>

        <mesh
          position={[0, 0, 0.43]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.27, 0.27, 0.08, 32]} />
          <meshStandardMaterial
            color="#152638"
            metalness={0.5}
          />
        </mesh>

        <group position={[0, 0, 0.49]}>
          {[0, 1, 2, 3].map((blade) => (
            <mesh
              key={blade}
              rotation={[0, 0, (Math.PI / 2) * blade]}
            >
              <boxGeometry args={[0.38, 0.055, 0.035]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}

          <mesh>
            <sphereGeometry args={[0.07, 20, 20]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      </group>
    )
  }

  if (technology === 'air-handler') {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.25, 0.55, 0.8]} />
          <meshStandardMaterial
            color="#c9d6df"
            roughness={0.55}
            metalness={0.25}
          />
        </mesh>

        {[-0.25, -0.08, 0.09, 0.26].map((y) => (
          <mesh key={y} position={[0, y, 0.415]}>
            <boxGeometry args={[0.86, 0.055, 0.035]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.52, 0.16]} />
        <meshStandardMaterial
          color="#dce7ed"
          roughness={0.5}
        />
      </mesh>

      <mesh position={[0, 0.05, 0.09]}>
        <boxGeometry args={[0.27, 0.18, 0.025]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
        />
      </mesh>

      <mesh position={[0, -0.16, 0.09]}>
        <circleGeometry args={[0.04, 20]} />
        <meshStandardMaterial color="#152638" />
      </mesh>
    </group>
  )
}

export function ClimateDevice({
  device,
  selected,
  onSelect,
  onClose,
}: ClimateDeviceProps) {
  const [hovered, setHovered] = useState(false)
  const haloMaterial =
    useRef<MeshBasicMaterial | null>(null)

  const statusColor = STATUS_COLORS[device.status]

  useFrame(({ clock }) => {
    if (!haloMaterial.current) {
      return
    }

    const pulse =
      0.26 + Math.sin(clock.elapsedTime * 3.2) * 0.1

    haloMaterial.current.opacity = selected
      ? 0.82
      : device.status === 'fault' ||
          device.status === 'at-risk'
        ? pulse + 0.15
        : 0.24
  })

  const handleClick = (
    event: ThreeEvent<MouseEvent>,
  ) => {
    event.stopPropagation()
    onSelect(device.id)
  }

  return (
    <group
      position={device.position}
      scale={selected ? 1.12 : hovered ? 1.06 : 1}
      onClick={handleClick}
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
      <DeviceGeometry
        technology={device.technology}
        color={statusColor}
      />

      <mesh
        position={[0, -0.43, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.61, 0.77, 40]} />
        <meshBasicMaterial
          ref={haloMaterial}
          color={statusColor}
          transparent
          opacity={0.3}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <Html
        position={[0, 0.72, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="device-tag"
          style={{ borderColor: statusColor }}
        >
          <span
            className="device-tag__type"
            style={{
              color: statusColor,
              background: `${statusColor}22`,
            }}
          >
            {TECHNOLOGY_ABBREVIATIONS[device.technology]}
          </span>

          <span>{device.id}</span>

          <span
            className="status-dot"
            style={{ background: statusColor }}
          />

          <span className="device-tag__status">
            {STATUS_LABELS[device.status]}
          </span>
        </div>
      </Html>

      {selected && (
        <Html
          position={[0, 1.75, 0]}
          center
          distanceFactor={10}
          zIndexRange={[200, 0]}
        >
          <DeviceCard
            device={device}
            onClose={onClose}
          />
        </Html>
      )}
    </group>
  )
}
