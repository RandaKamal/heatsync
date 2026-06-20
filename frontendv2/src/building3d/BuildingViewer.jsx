import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Preload, Stars } from '@react-three/drei'
import { Suspense, useState } from 'react'
import BuildingModel from './BuildingModel'
import { PRESETS } from '../hooks/useTimeOfDay'

const ORDER = ['day', 'evening', 'night']

const ICONS = {
  day:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  evening: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg>,
  night:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
}

function LoadingFallback() {
  return (
    <mesh position={[0, 2, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#4fc3f7" wireframe />
    </mesh>
  )
}

function SceneLighting({ preset }) {
  const { sunPosition, ambient, dirLight, fillLight, period } = preset
  const sp = sunPosition
  const shadowPos = [sp[0] * 40, Math.max(sp[1] * 40, 6), sp[2] * 40]

  return (
    <>
      <ambientLight intensity={ambient.intensity} color={ambient.color} />
      <directionalLight
        position={shadowPos}
        intensity={dirLight.intensity}
        color={dirLight.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
      />
      <directionalLight
        position={[-sp[0] * 20, 12, -sp[2] * 20]}
        intensity={fillLight.intensity}
        color={fillLight.color}
      />
      <pointLight position={[0, -3, 0]} color="#0d2240" intensity={0.3} distance={50} decay={1} />
      {preset._period === 'night' && (
        <>
          <pointLight position={[-28, 14, -22]} color="#4fc3f7" intensity={0.5} distance={55} decay={2} />
          <pointLight position={[ 28, 10,  22]} color="#0055aa" intensity={0.35} distance={50} decay={2} />
        </>
      )}
    </>
  )
}

export default function BuildingViewer({ rooms, onUnitSelect, selectedUnitId }) {
  const [periodKey, setPeriod] = useState('day')

  function cycle() {
    setPeriod(cur => {
      const i = ORDER.indexOf(cur)
      return ORDER[(i + 1) % ORDER.length]
    })
  }

  const preset = { ...PRESETS[periodKey], _period: periodKey }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Mode toggle button */}
      <button
        onClick={cycle}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 13px',
          background: 'rgba(6,13,26,0.72)',
          border: '1px solid rgba(79,195,247,0.28)',
          borderRadius: 20,
          color: '#9ab8d0', fontSize: 12, fontFamily: 'inherit',
          cursor: 'pointer', backdropFilter: 'blur(8px)',
          textTransform: 'capitalize', userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,195,247,0.6)'; e.currentTarget.style.color = '#c8dcea' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(79,195,247,0.28)'; e.currentTarget.style.color = '#9ab8d0' }}
      >
        {ICONS[periodKey]}
        <span>{periodKey}</span>
      </button>

      <Canvas
        camera={{ position: [32, 28, 32], fov: 46, near: 0.1, far: 6000 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={[preset.bg]} />

        {preset.stars && (
          <Stars radius={80} depth={30} count={1000} factor={3} saturation={0} fade speed={0.3} />
        )}

        <SceneLighting preset={preset} />

        <Grid
          position={[0, -0.01, 0]}
          args={[120, 120]}
          cellSize={2} cellThickness={0.3}
          cellColor={periodKey === 'night' ? '#0a1e32' : '#1a3040'}
          sectionSize={10} sectionThickness={0.6}
          sectionColor={periodKey === 'night' ? '#143050' : '#2a5070'}
          fadeDistance={80} fadeStrength={2}
          infiniteGrid
        />

        <Suspense fallback={<LoadingFallback />}>
          <BuildingModel
            rooms={rooms}
            period={periodKey}
            onUnitSelect={onUnitSelect}
            selectedUnitId={selectedUnitId}
          />
          <Preload all />
        </Suspense>

        <OrbitControls
          target={[0, 3, 0]}
          enablePan enableZoom enableRotate
          minDistance={0.5} maxDistance={80}
          maxPolarAngle={Math.PI / 1.92}
          minPolarAngle={0.05}
          dampingFactor={0.06} enableDamping
          zoomSpeed={0.9} rotateSpeed={0.6} panSpeed={0.7}
        />
      </Canvas>
    </div>
  )
}
