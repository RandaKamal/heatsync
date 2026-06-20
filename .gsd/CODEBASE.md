# Codebase Map

Generated: 2026-06-20T15:27:48Z | Files: 157 | Described: 0/157
<!-- gsd:codebase-meta {"generatedAt":"2026-06-20T15:27:48Z","fingerprint":"bfab4110dc66f890fd3cdd445cbdca648ad06ced","fileCount":157,"truncated":false} -->

### (root)/
- `.gitignore`
- `.pre-commit-config.yaml`
- `20260603_ChallengeTUMhackathon_LBenergy (1).pdf`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `pytest_err.txt`
- `README_FAILURE_SIMULATION.md`
- `README.md`
- `skills-lock.json`

### .github/
- `.github/PULL_REQUEST_TEMPLATE.md`

### .github/agents/
- `.github/agents/analysis-eval-engineer.agent.md`
- `.github/agents/code-reviewer.agent.md`
- `.github/agents/docs-maintainer.agent.md`
- `.github/agents/heatsync-detection-engineer.agent.md`
- `.github/agents/signal-processing-engineer.agent.md`
- `.github/agents/test-engineer.agent.md`

### .github/instructions/
- `.github/instructions/agent_maintenance_workflow.instructions.md`
- `.github/instructions/code_writing_behavior.instructions.md`
- `.github/instructions/delegation_policy.instructions.md`
- `.github/instructions/jules_queue_workflow.instructions.md`
- `.github/instructions/python_acoustic_vessel.instructions.md`
- `.github/instructions/python_quality_gates.instructions.md`
- `.github/instructions/qa_readonly.instructions.md`
- `.github/instructions/tests.instructions.md`

### .github/scripts/
- `.github/scripts/aps_tools_common.sh`
- `.github/scripts/bootstrap_dev_env.sh`
- `.github/scripts/crap_check.py`
- `.github/scripts/dry_check.py`
- `.github/scripts/install_aps_tools.sh`
- `.github/scripts/precommit_aps_gate.sh`
- `.github/scripts/precommit_coverage_gate.sh`
- `.github/scripts/precommit_gherkin_mutation_gate.sh`
- `.github/scripts/precommit_language_mutation_gate.py`
- `.github/scripts/resolve_gsd_slice.py`
- `.github/scripts/run_acceptance_mutation_worker.py`
- `.github/scripts/run_acceptance_mutation_worker.sh`

### .github/skills/python-linting/
- `.github/skills/python-linting/SKILL.md`

### .github/skills/python-testing/
- `.github/skills/python-testing/SKILL.md`

### .github/skills/vessel-contract-check/
- `.github/skills/vessel-contract-check/SKILL.md`

### .github/workflows/
- `.github/workflows/backend-ci.yml`
- `.github/workflows/ci-lint.yml`
- `.github/workflows/ci-slow-lane.yml`
- `.github/workflows/ci-structure.yml`
- `.github/workflows/ci-tests.yml`
- `.github/workflows/jules_auto_merge.yml`
- `.github/workflows/jules_next_task.yml`

### backend/
- `backend/.python-version`
- `backend/app.py`
- `backend/pyproject.toml`
- `backend/README.md`
- `backend/requirements.txt`

### backend/anomaly/
- `backend/anomaly/__init__.py`
- `backend/anomaly/detector.py`

### backend/api/
- `backend/api/__init__.py`
- `backend/api/routes.py`
- `backend/api/weather.py`

### backend/comfort/
- `backend/comfort/__init__.py`
- `backend/comfort/model.py`

### backend/control/
- `backend/control/__init__.py`
- `backend/control/controller.py`

### backend/data/
- `backend/data/__init__.py`
- `backend/data/.gitkeep`
- `backend/data/loader.py`

### backend/features/
- `backend/features/s01_data_preprocessing.feature`
- `backend/features/s02_statistical_forecasting.feature`
- `backend/features/s03_machine_learning_two_level_models.feature`
- `backend/features/s04_physical_grey_box_pinn_models.feature`
- `backend/features/s05_anomaly_detection_models.feature`
- `backend/features/s06_energy_controls_savings_optimization.feature`
- `backend/features/s07_automated_notebook_suite_integration.feature`

### backend/features/steps/
- `backend/features/steps/.gitkeep`

### backend/impact/
- `backend/impact/__init__.py`
- `backend/impact/calculator.py`

### backend/notebooks/
- `backend/notebooks/__init__.py`
- `backend/notebooks/01_preprocessing.ipynb`
- `backend/notebooks/02_forecasting_sarimax.ipynb`
- `backend/notebooks/03_forecasting_lstm.ipynb`
- `backend/notebooks/04_physical_modeling.ipynb`
- `backend/notebooks/05_anomaly_detection.ipynb`
- `backend/notebooks/py.typed`
- `backend/notebooks/utils.py`

### backend/prediction/
- `backend/prediction/__init__.py`
- `backend/prediction/predictor.py`

### backend/tests/
- `backend/tests/test_anomaly_detection.py`
- `backend/tests/test_anomaly.py`
- `backend/tests/test_api.py`
- `backend/tests/test_impact.py`
- `backend/tests/test_loader.py`
- `backend/tests/test_lstm.py`
- `backend/tests/test_physical.py`
- `backend/tests/test_sarimax.py`
- `backend/tests/test_utils.py`

### backups/ihl-twinguard-3d/
- `backups/ihl-twinguard-3d/.gitignore`
- `backups/ihl-twinguard-3d/eslint.config.js`
- `backups/ihl-twinguard-3d/index.html`
- `backups/ihl-twinguard-3d/package-lock.json`
- `backups/ihl-twinguard-3d/package.json`
- `backups/ihl-twinguard-3d/README.md`
- `backups/ihl-twinguard-3d/tsconfig.app.json`
- `backups/ihl-twinguard-3d/tsconfig.json`
- `backups/ihl-twinguard-3d/tsconfig.node.json`
- `backups/ihl-twinguard-3d/vite.config.ts`

### backups/ihl-twinguard-3d/src/
- `backups/ihl-twinguard-3d/src/App.css`
- `backups/ihl-twinguard-3d/src/App.tsx`
- `backups/ihl-twinguard-3d/src/index.css`
- `backups/ihl-twinguard-3d/src/main.tsx`

### frontend/
- `frontend/index.html`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/vite.config.ts`

### frontend/src/
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/styles.css`
- `frontend/src/tsconfig.json`

### frontend/src/api/
- `frontend/src/api/client.ts`

### frontend/src/building3d/
- `frontend/src/building3d/BuildingViewer.jsx`
- `frontend/src/building3d/FloorLayer.jsx`
- `frontend/src/building3d/HeatMapOverlay.jsx`
- `frontend/src/building3d/SensorMarkers.jsx`

### frontend/src/components/charts/
- `frontend/src/components/charts/AnalyticsCharts.tsx`

### frontend/src/components/scene/
- `frontend/src/components/scene/Building.tsx`
- `frontend/src/components/scene/CampusCanvas.tsx`
- `frontend/src/components/scene/ClimateDevice.tsx`
- `frontend/src/components/scene/DeviceCard.tsx`
- `frontend/src/components/scene/RoomMesh.tsx`

### frontend/src/components/ui/
- `frontend/src/components/ui/CampusSidebar.tsx`
- `frontend/src/components/ui/ControlTimeline.tsx`
- `frontend/src/components/ui/FailureSimulationPanel.tsx`
- `frontend/src/components/ui/TopBar.tsx`

### frontend/src/data/
- `frontend/src/data/mockCampus.ts`

### frontend/src/hooks/
- `frontend/src/hooks/useFailureSimulation.ts`
- `frontend/src/hooks/useLiveData.ts`

### frontend/src/simulation/
- `frontend/src/simulation/failureScenario.ts`
- `frontend/src/simulation/types.ts`

### frontend/src/types/
- `frontend/src/types/campus.ts`

### frontend/src/utils/
- `frontend/src/utils/status.ts`

### frontendv2/
- `frontendv2/index.html`
- `frontendv2/package-lock.json`
- `frontendv2/package.json`
- `frontendv2/vite.config.js`

### frontendv2/public/
- `frontendv2/public/catalog.html`

### frontendv2/src/
- `frontendv2/src/App.css`
- `frontendv2/src/App.jsx`
- `frontendv2/src/main.jsx`

### frontendv2/src/building3d/
- `frontendv2/src/building3d/BuildingModel.jsx`
- `frontendv2/src/building3d/BuildingViewer.jsx`
- `frontendv2/src/building3d/FloorLayer.jsx`
- `frontendv2/src/building3d/HeatMapOverlay.jsx`
- `frontendv2/src/building3d/HeatPumpUnit.jsx`
- `frontendv2/src/building3d/SensorMarkers.jsx`

### frontendv2/src/components/
- `frontendv2/src/components/AlertsPanel.jsx`
- `frontendv2/src/components/AlertToast.jsx`
- `frontendv2/src/components/TopBar.jsx`

### frontendv2/src/hooks/
- `frontendv2/src/hooks/useBackendStatus.js`
- `frontendv2/src/hooks/useTimeOfDay.js`

### frontendv2/src/panels/
- `frontendv2/src/panels/UnitDetailPanel.jsx`
