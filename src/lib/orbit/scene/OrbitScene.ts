import * as THREE from "three";
import { PLANETS, type BodyId, type PlanetConfig } from "../bodies";
import {
  MOON_PERIOD_YR,
  MOON_VISUAL_RADIUS_UNITS,
  RADIUS_UNITS,
  SWEEP_SECONDS,
  auToUnits,
} from "../constants";
import { beyondTip, fadeOverlappingLabels, type LabelBox } from "../labelLayout";
import { sceneBounds } from "../cameraFit";
import { advancePhase, axisExtension, helixFrame, orbitOffset, rescalePhase, sunX } from "../physics";
import { formatElapsed, INITIAL_PHASE_YEARS, isPlanetVisible, labelsVisible, type ViewState } from "../view";
import { decodeStars } from "../sky";
import { OrbitCameraController } from "./OrbitCameraController";
import { SkyField } from "./SkyField";
import {
  ParametricCurve,
  disposeTree,
  makeArrowHead,
  makeCurveLine,
  makeLine,
  makeTether,
  setLineResolution,
  setTether,
} from "./geometry";

const BACKGROUND = 0x050811;

/**
 * The prototype was written against Three.js r128, before physically based
 * lighting and sRGB colour management became the defaults. These settings
 * keep its colours: r128 multiplied light intensities by π. One difference
 * remains: r128's Sun light faded linearly to zero at 300 units, while the
 * current falloff stays near full strength for longer, so bodies far from
 * the Sun are lit somewhat more brightly than in the prototype.
 */
THREE.ColorManagement.enabled = false;
const LEGACY_LIGHT_SCALE = Math.PI;

type LabelElements = Partial<Record<BodyId, HTMLElement | null>>;

/** Page elements outside the canvas that the scene reads or writes. */
export interface SceneOverlays {
  /** The control bar: the scene is centred in the space above it. */
  bottomBar?: HTMLElement | null;
  /** Shows how far along the span the animation is, rewritten as it changes. */
  elapsed?: HTMLElement | null;
  /** Says where among the stars the arrow points; placed just past its tip. */
  apexLabel?: HTMLElement | null;
}

interface LabelSlot extends LabelBox {
  el: HTMLElement;
}

/** Opacity of a label that overlaps one that wins (see `fadeOverlappingLabels`). */
const FADED_LABEL_OPACITY = 0.2;
/** The apex label is hidden within this angle (as a cosine, about 20°) of looking along the arrow. */
const APEX_LABEL_HIDE_COS = Math.cos((20 * Math.PI) / 180);
/** How far the apex label keeps from the edges of the view, and from the control bar. */
const APEX_LABEL_MARGIN_PX = 12;

interface PlanetObjects {
  config: PlanetConfig;
  group: THREE.Group;
  tether: THREE.Line;
}

function helixInputsChanged(a: ViewState, b: ViewState): boolean {
  return (
    a.pitchAU !== b.pitchAU ||
    a.spanYears !== b.spanYears ||
    a.showMoon !== b.showMoon ||
    a.showInnerPlanets !== b.showInnerPlanets ||
    a.showOuterPlanets !== b.showOuterPlanets
  );
}

/**
 * Owns the renderer and everything drawn. Two update paths:
 * - `rebuildHelix()` recreates everything in `helixGroup` when the pitch, span
 *   or visibility changes. Anything added there must be disposable.
 * - `frame()` runs every animation frame and only moves existing objects.
 *   It must not allocate geometry.
 */
export class OrbitScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitCameraController;
  private readonly resizeObserver: ResizeObserver;
  private readonly labelObserver: ResizeObserver;
  private readonly labelSlots: LabelSlot[] = [];
  private readonly labelSlotById: Partial<Record<BodyId, LabelSlot>> = {};
  private readonly apexSlot: LabelSlot | null = null;
  /** Where the arrowhead's point is on the x axis, and a point a few arrowheads behind it. */
  private arrowTipX = 0;
  private arrowBackX = 0;

  private readonly helixGroup = new THREE.Group();
  private readonly sunGroup = new THREE.Group();
  private readonly sunLight: THREE.PointLight;
  private readonly earthGroup = new THREE.Group();
  private readonly moonGroup = new THREE.Group();
  private readonly moonTether: THREE.Line;
  private readonly earthTether: THREE.Line;
  private readonly movingPlaneRing: THREE.Mesh;
  private readonly planets: PlanetObjects[];
  private readonly sky = new SkyField();

  private view: ViewState;
  private phase = INITIAL_PHASE_YEARS;
  private frameId = 0;
  private lastTime: number | null = null;
  private disposed = false;
  private width = 1;
  private height = 1;
  private elapsedText = "";
  /** CSS pixels at the bottom of the view covered by the control bar. */
  private bottomInset = 0;
  private readonly tempVec = new THREE.Vector3();
  private readonly tempVec2 = new THREE.Vector3();
  /** The canvas size in CSS pixels, which line-mode orbit paths need for their width. */
  private readonly lineResolution = new THREE.Vector2(1, 1);

  constructor(
    private readonly container: HTMLElement,
    private readonly labels: LabelElements,
    initialView: ViewState,
    private readonly overlays: SceneOverlays = {},
  ) {
    this.view = initialView;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(BACKGROUND, 1);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30000);
    this.controls = new OrbitCameraController(this.camera, this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2(BACKGROUND, 0.000045);

    this.scene.add(new THREE.AmbientLight(0x334155, 1.4 * LEGACY_LIGHT_SCALE));
    this.sunLight = new THREE.PointLight(0xfff3c4, 2.8 * LEGACY_LIGHT_SCALE, 300, 0);
    this.scene.add(this.sunLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7 * LEGACY_LIGHT_SCALE);
    rimLight.position.set(20, 40, -30);
    this.scene.add(rimLight);
    this.sky.setFrame(initialView.skyFrame);
    this.scene.add(this.sky.group);
    this.loadStars();

    this.scene.add(this.helixGroup);

    this.sunGroup.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfde047 })),
      new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.28 }),
      ),
    );
    this.scene.add(this.sunGroup);

    this.earthGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 32, 32),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.45,
          roughness: 0.35,
          metalness: 0.1,
        }),
      ),
      new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.25 }),
      ),
    );
    this.scene.add(this.earthGroup);

    this.moonGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 20, 20),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          emissive: 0x64748b,
          emissiveIntensity: 0.45,
          roughness: 0.6,
          metalness: 0.05,
        }),
      ),
    );
    this.scene.add(this.moonGroup);
    this.moonTether = makeTether(new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.55 }));
    this.scene.add(this.moonTether);

    this.planets = PLANETS.map((config) => this.createPlanet(config));

    this.earthTether = makeTether(
      new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.7 }),
    );
    this.scene.add(this.earthTether);

    // The orbital plane moves with the Sun, perpendicular to its path (+X).
    this.movingPlaneRing = new THREE.Mesh(
      new THREE.RingGeometry(RADIUS_UNITS - 0.04, RADIUS_UNITS + 0.04, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }),
    );
    this.movingPlaneRing.rotation.y = Math.PI / 2;
    this.scene.add(this.movingPlaneRing);

    // Label sizes change only with their text, so they're measured on change, not every frame.
    const slotByElement = new Map<Element, LabelSlot>();
    this.labelObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const slot = slotByElement.get(entry.target)!;
        slot.width = entry.borderBoxSize[0].inlineSize;
        slot.height = entry.borderBoxSize[0].blockSize;
      }
    });
    const addSlot = (el: HTMLElement, priority: number): LabelSlot => {
      const slot: LabelSlot = { el, x: 0, y: 0, width: 0, height: 0, depth: 0, priority, shown: false, faded: false };
      this.labelSlots.push(slot);
      slotByElement.set(el, slot);
      this.labelObserver.observe(el);
      return slot;
    };
    for (const [id, el] of Object.entries(labels) as [BodyId, HTMLElement | null][]) {
      // Earth is what the page is read from, so its label wins any overlap (notably with the Sun's).
      if (el) this.labelSlotById[id] = addSlot(el, id === "earth" ? 1 : 0);
    }
    // Any body's label wins over the arrow's.
    if (overlays.apexLabel) this.apexSlot = addSlot(overlays.apexLabel, -1);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    if (overlays.bottomBar) this.resizeObserver.observe(overlays.bottomBar);
    this.resize();

    this.rebuildHelix();
    this.fitCamera();
    this.frameId = requestAnimationFrame(this.frame);
  }

  /** Applies a new view, rebuilding the helix only when its inputs changed. */
  update(next: ViewState) {
    const prev = this.view;
    if (next === prev) return;
    if (next.spanYears !== prev.spanYears) {
      this.phase = rescalePhase(this.phase, prev.spanYears, next.spanYears);
    }
    this.view = next;
    if (next.skyFrame !== prev.skyFrame) this.sky.setFrame(next.skyFrame);
    if (helixInputsChanged(prev, next)) this.rebuildHelix();
  }

  /** Reframes the camera around the whole visible helix. */
  fitCamera() {
    this.controls.fitTo(sceneBounds(this.view), {
      fovDeg: this.camera.fov,
      aspect: this.width / this.height,
      visibleFraction: (this.height - this.bottomInset) / this.height,
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.labelObserver.disconnect();
    this.controls.dispose();
    disposeTree(this.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  /** The sky stays empty until the catalogue arrives, and if it can't be loaded. */
  private async loadStars() {
    try {
      const response = await fetch("/stars.bin");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const catalog = decodeStars(await response.arrayBuffer());
      if (!this.disposed) this.sky.setCatalog(catalog);
    } catch (err) {
      console.warn("Couldn't load the star catalogue:", err);
    }
  }

  private createPlanet(config: PlanetConfig): PlanetObjects {
    const group = new THREE.Group();
    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(config.sphereRadius, 28, 28),
        new THREE.MeshStandardMaterial({
          color: config.color,
          emissive: config.emissive,
          emissiveIntensity: 0.45,
          roughness: 0.45,
          metalness: 0.1,
        }),
      ),
    );

    if (config.id === "jupiter") {
      const band = new THREE.Mesh(
        new THREE.RingGeometry(config.sphereRadius * 1.25, config.sphereRadius * 1.42, 48),
        new THREE.MeshBasicMaterial({ color: 0xfdba74, side: THREE.DoubleSide, transparent: true, opacity: 0.32 }),
      );
      band.rotation.x = Math.PI * 0.45;
      group.add(band);
    }

    if (config.id === "saturn") {
      const rings = new THREE.Mesh(
        new THREE.RingGeometry(config.sphereRadius * 1.35, config.sphereRadius * 2.35, 64),
        new THREE.MeshBasicMaterial({ color: 0xfde68a, side: THREE.DoubleSide, transparent: true, opacity: 0.62 }),
      );
      rings.rotation.x = Math.PI * 0.38;
      rings.rotation.y = 0.25;
      group.add(rings);
    }

    this.scene.add(group);
    const tether = makeTether(
      new THREE.LineDashedMaterial({ color: config.color, dashSize: 0.45, gapSize: 0.35, transparent: true, opacity: 0.4 }),
    );
    this.scene.add(tether);
    return { config, group, tether };
  }

  private rebuildHelix() {
    disposeTree(this.helixGroup);
    this.helixGroup.clear();

    const { spanYears, showMoon } = this.view;
    const frame = helixFrame(this.view.pitchAU, spanYears);
    const xEnd = frame.xStart + frame.totalLength;

    // The Sun's straight-line path.
    const { extend: axisExtend, arrowSize } = axisExtension(frame.totalLength);
    this.arrowTipX = xEnd + axisExtend + arrowSize / 2;
    this.arrowBackX = this.arrowTipX - arrowSize * 4;
    this.helixGroup.add(
      makeLine(
        [new THREE.Vector3(frame.xStart - axisExtend, 0, 0), new THREE.Vector3(xEnd + axisExtend, 0, 0)],
        0xfacc15,
        0.75,
        true,
      ),
      makeArrowHead(
        new THREE.Vector3(xEnd + axisExtend, 0, 0),
        new THREE.Vector3(1, 0, 0),
        0xfacc15,
        arrowSize,
      ),
    );

    const earthCurve = new ParametricCurve((t, target) => {
      const yr = t * spanYears;
      const [y, z] = orbitOffset(RADIUS_UNITS, yr, 1);
      return target.set(sunX(frame, yr), y, z);
    });
    this.helixGroup.add(
      makeCurveLine(earthCurve, clampSegments(spanYears * 48, 360, 4800), 0x38bdf8, 3, this.lineResolution),
    );

    if (showMoon) {
      const moonCurve = new ParametricCurve((t, target) => {
        const yr = t * spanYears;
        const [ey, ez] = orbitOffset(RADIUS_UNITS, yr, 1);
        const [my, mz] = orbitOffset(MOON_VISUAL_RADIUS_UNITS, yr, MOON_PERIOD_YR);
        return target.set(sunX(frame, yr), ey + my, ez + mz);
      });
      const moonSegments = clampSegments((spanYears / MOON_PERIOD_YR) * 22, 480, 8000);
      this.helixGroup.add(makeCurveLine(moonCurve, moonSegments, 0xe2e8f0, 1.5, this.lineResolution, 0.78));
    }

    for (const p of PLANETS) {
      if (!isPlanetVisible(this.view, p)) continue;
      const radiusUnits = auToUnits(p.radiusAU);
      const curve = new ParametricCurve((t, target) => {
        const yr = t * spanYears;
        const [y, z] = orbitOffset(radiusUnits, yr, p.periodYr, p.phaseOffset);
        return target.set(sunX(frame, yr), y, z);
      });
      const segments = clampSegments((spanYears / p.periodYr) * 36, 200, 6000);
      this.helixGroup.add(makeCurveLine(curve, segments, p.color, p.pathWidthPx, this.lineResolution, 0.85));
    }
  }

  private resize() {
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = this.width / this.height;
    const bar = this.overlays.bottomBar?.getBoundingClientRect();
    const bottom = this.container.getBoundingClientRect().bottom;
    this.bottomInset = bar ? Math.min(Math.max(0, bottom - bar.top), this.height / 2) : 0;
    // Render a window shifted down by half the inset, which moves the scene's centre up by as much.
    if (this.bottomInset > 0) {
      this.camera.setViewOffset(this.width, this.height, 0, this.bottomInset / 2, this.width, this.height);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.lineResolution.set(this.width, this.height);
    setLineResolution(this.helixGroup, this.lineResolution);
    // ResizeObserver fires after this frame rendered and setSize cleared it.
    this.renderer.render(this.scene, this.camera);
  }

  private frame = (now: number) => {
    this.frameId = requestAnimationFrame(this.frame);
    const dt = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.controls.tick(dt);
    this.sky.followCamera(this.camera);

    const view = this.view;
    if (view.isPlaying) {
      this.phase = advancePhase(this.phase, dt, view.spanYears, SWEEP_SECONDS);
    }
    const elapsed = formatElapsed(this.phase);
    if (elapsed !== this.elapsedText && this.overlays.elapsed) {
      this.overlays.elapsed.textContent = elapsed;
      this.elapsedText = elapsed;
    }

    const frame = helixFrame(view.pitchAU, view.spanYears);
    const x = sunX(frame, this.phase);
    const [ey, ez] = orbitOffset(RADIUS_UNITS, this.phase, 1);

    this.sunGroup.position.set(x, 0, 0);
    this.sunLight.position.set(x, 0, 0);
    this.earthGroup.position.set(x, ey, ez);
    this.movingPlaneRing.position.set(x, 0, 0);
    setTether(this.earthTether, x, 0, 0, x, ey, ez);

    this.moonGroup.visible = view.showMoon;
    this.moonTether.visible = view.showMoon;
    if (view.showMoon) {
      const [dy, dz] = orbitOffset(MOON_VISUAL_RADIUS_UNITS, this.phase, MOON_PERIOD_YR);
      const my = ey + dy;
      const mz = ez + dz;
      this.moonGroup.position.set(x, my, mz);
      setTether(this.moonTether, x, ey, ez, x, my, mz);
      this.placeLabel("moon", x, my + 0.45, mz);
    } else {
      this.hideLabel("moon");
    }

    for (const { config, group, tether } of this.planets) {
      const visible = isPlanetVisible(view, config);
      group.visible = visible;
      tether.visible = visible;
      if (!visible) {
        this.hideLabel(config.id);
        continue;
      }
      const [py, pz] = orbitOffset(auToUnits(config.radiusAU), this.phase, config.periodYr, config.phaseOffset);
      group.position.set(x, py, pz);
      setTether(tether, x, 0, 0, x, py, pz);
      this.placeLabel(config.id, x, py + config.sphereRadius + 0.65, pz);
    }

    this.placeLabel("sun", x, -1.75, 0);
    this.placeLabel("earth", x, ey + 1.05, ez);
    this.placeApexLabel();
    this.applyLabels();

    this.renderer.render(this.scene, this.camera);
  };

  private hideLabel(id: BodyId) {
    const slot = this.labelSlotById[id];
    if (slot) slot.shown = false;
  }

  /** Projects a world position to its label's centre; hides it behind the camera. */
  private placeLabel(id: BodyId, x: number, y: number, z: number) {
    const slot = this.labelSlotById[id];
    if (!slot) return;
    const p = this.tempVec.set(x, y, z).project(this.camera);
    slot.shown = labelsVisible(this.view) && p.z <= 1;
    slot.x = (p.x * 0.5 + 0.5) * this.width;
    slot.y = (-p.y * 0.5 + 0.5) * this.height;
    slot.depth = p.z;
  }

  /**
   * Puts the apex label just past the arrow's tip, along the arrow's direction on
   * screen, kept inside the view. Hidden when looking nearly along the arrow,
   * where its tip lies behind the Sun.
   */
  private placeApexLabel() {
    const slot = this.apexSlot;
    if (!slot) return;
    const toTip = this.tempVec.set(this.arrowTipX, 0, 0).sub(this.camera.position);
    const alongArrow = Math.abs(toTip.x) / toTip.length() > APEX_LABEL_HIDE_COS;
    const tip = this.tempVec.set(this.arrowTipX, 0, 0).project(this.camera);
    const back = this.tempVec2.set(this.arrowBackX, 0, 0).project(this.camera);
    slot.shown = labelsVisible(this.view) && !alongArrow && tip.z <= 1 && back.z <= 1;
    slot.depth = tip.z;
    const at = beyondTip(
      { x: (tip.x * 0.5 + 0.5) * this.width, y: (-tip.y * 0.5 + 0.5) * this.height },
      { x: (back.x * 0.5 + 0.5) * this.width, y: (-back.y * 0.5 + 0.5) * this.height },
      slot.width,
      slot.height,
    );
    const m = APEX_LABEL_MARGIN_PX;
    slot.x = clamp(at.x, slot.width / 2 + m, this.width - slot.width / 2 - m);
    slot.y = clamp(at.y, slot.height / 2 + m, this.height - this.bottomInset - slot.height / 2 - m);
  }

  /** Fades labels that overlap a winning one and stacks the winners on top. */
  private applyLabels() {
    fadeOverlappingLabels(this.labelSlots);
    const count = this.labelSlots.length;
    for (let i = 0; i < count; i++) {
      const { el, shown, faded, x, y } = this.labelSlots[i];
      el.style.opacity = !shown ? "0" : faded ? String(FADED_LABEL_OPACITY) : "1";
      if (!shown) continue;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.zIndex = String(count - i);
    }
  }
}

function clampSegments(n: number, min: number, max: number): number {
  return clamp(Math.round(n), min, max);
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
