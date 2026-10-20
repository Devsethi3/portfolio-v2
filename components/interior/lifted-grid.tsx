"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Point = readonly [number, number];
type Rgb = readonly [number, number, number];

type TileSpec = {
    column: number;
    id: string;
    index: number;
    row: number;
    x: number;
    y: number;
};

type TileNodes = {
    left?: SVGPathElement;
    right?: SVGPathElement;
    top?: SVGPathElement;
};

type Ripple = {
    column: number;
    row: number;
    startedAt: number;
};

export type LiftedGridProps = {
    className?: string;
    lift?: number;
    onTileChange?: (id: string, raised: boolean) => void;
};

const GRID_SIZE = 10;
const TILE_WIDTH = 56;
const TILE_HEIGHT = 32;
const STEP_X = 30.5;
const STEP_Y = 17.25;
const CENTER_X = 350;
const START_Y = 73;
const BASE_HEIGHT = 6;
const LEAVE_GRACE_MS = 64;
const RIPPLE_DURATION_MS = 4200;
const MAX_RIPPLES = 4;

const LOW_TOP: Rgb = [46, 27, 91];
const MID_TOP: Rgb = [47, 157, 218];
const HIGH_TOP: Rgb = [151, 230, 250];
const LOW_LEFT: Rgb = [53, 20, 96];
const HIGH_LEFT: Rgb = [121, 48, 181];
const LOW_RIGHT: Rgb = [37, 29, 89];
const HIGH_RIGHT: Rgb = [40, 119, 202];
const LOW_STROKE: Rgb = [27, 17, 55];
const HIGH_STROKE: Rgb = [58, 157, 211];

const tiles: TileSpec[] = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const row = Math.floor(index / GRID_SIZE);
    const column = index % GRID_SIZE;

    return {
        column,
        id: `${row}-${column}`,
        index,
        row,
        x: CENTER_X + (column - row) * STEP_X,
        y: START_Y + (column + row) * STEP_Y,
    };
}).sort((first, second) =>
    (first.row + first.column) - (second.row + second.column) || first.row - second.row,
);
const tilesByIndex = [...tiles].sort((first, second) => first.index - second.index);

const tileAtPoint = (x: number, y: number) => {
    const projectedX = (x - CENTER_X) / STEP_X;
    const projectedY = (y - START_Y) / STEP_Y;
    const column = Math.round((projectedX + projectedY) / 2);
    const row = Math.round((projectedY - projectedX) / 2);

    if (row < 0 || row >= GRID_SIZE || column < 0 || column >= GRID_SIZE) return undefined;
    return tilesByIndex[row * GRID_SIZE + column];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const waveCrest = (distance: number, phase: number) =>
    Math.pow(0.5 + 0.5 * Math.cos(distance * 1.05 - phase), 1.28);

const mixColor = (from: Rgb, to: Rgb, amount: number) => {
    const t = clamp01(amount);
    return `rgb(${Math.round(from[0] + (to[0] - from[0]) * t)} ${Math.round(from[1] + (to[1] - from[1]) * t)} ${Math.round(from[2] + (to[2] - from[2]) * t)})`;
};

const waveTopColor = (height: number) => {
    const t = clamp01(height);
    return t < 0.55
        ? mixColor(LOW_TOP, MID_TOP, t / 0.55)
        : mixColor(MID_TOP, HIGH_TOP, (t - 0.55) / 0.45);
};

const lerp = (from: Point, to: Point, amount: number): Point => [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
];

const pointsFor = (x: number, y: number): Point[] => [
    [x, y - TILE_HEIGHT / 2],
    [x + TILE_WIDTH / 2, y],
    [x, y + TILE_HEIGHT / 2],
    [x - TILE_WIDTH / 2, y],
];

const roundedDiamondPath = (points: Point[], radius = 0.015) => {
    const corners = points.map((point, index) => {
        const previous = points[(index - 1 + points.length) % points.length];
        const next = points[(index + 1) % points.length];
        return {
            after: lerp(point, next, radius),
            before: lerp(point, previous, radius),
            point,
        };
    });

    return [
        `M ${corners[0].before[0]} ${corners[0].before[1]}`,
        ...corners.flatMap((corner, index) => {
            const nextCorner = corners[(index + 1) % corners.length];
            return [
                `Q ${corner.point[0]} ${corner.point[1]} ${corner.after[0]} ${corner.after[1]}`,
                `L ${nextCorner.before[0]} ${nextCorner.before[1]}`,
            ];
        }),
        "Z",
    ].join(" ");
};

const facePath = (first: Point, second: Point, height: number) => [
    `M ${first[0]} ${first[1] - height}`,
    `L ${second[0]} ${second[1] - height}`,
    `L ${second[0]} ${second[1]}`,
    `L ${first[0]} ${first[1]}`,
    "Z",
].join(" ");

/**
 * A radial isometric wave driven by a single requestAnimationFrame loop.
 * React owns interaction and accessibility; the hot animation path writes
 * directly to SVG attributes so the 100-cell simulation avoids frame renders.
 */
export function LiftedGrid({ className, lift = 38, onTileChange }: LiftedGridProps) {
    const reducedMotion = useReducedMotion() ?? false;
    const safeLift = Math.max(24, Math.min(64, lift));
    const nodesRef = useRef<TileNodes[]>([]);
    const surfaceRef = useRef<SVGSVGElement | null>(null);
    const visibleRef = useRef(true);
    const heightsRef = useRef(new Float32Array(tiles.length).fill(BASE_HEIGHT));
    const velocitiesRef = useRef(new Float32Array(tiles.length));
    const hoveredIndexRef = useRef(-1);
    const energyRef = useRef(0);
    const phaseRef = useRef(0);
    const ripplesRef = useRef<Ripple[]>([]);
    const frameRef = useRef<number | null>(null);
    const lastTimeRef = useRef(0);
    const tickRef = useRef<(time: number) => void>(() => undefined);
    const leaveTimerRef = useRef<number | null>(null);

    const scheduleFrame = () => {
        if (!visibleRef.current || frameRef.current !== null) return;
        lastTimeRef.current = 0;
        frameRef.current = window.requestAnimationFrame(tickRef.current);
    };

    const setInteraction = (tile: TileSpec, active: boolean) => {
        if (leaveTimerRef.current !== null) {
            window.clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }

        if (active && hoveredIndexRef.current === tile.index) return;

        onTileChange?.(tile.id, active);

        if (active) {
            hoveredIndexRef.current = tile.index;
            scheduleFrame();
            return;
        }

        leaveTimerRef.current = window.setTimeout(() => {
            if (hoveredIndexRef.current === tile.index) hoveredIndexRef.current = -1;
            leaveTimerRef.current = null;
            scheduleFrame();
        }, LEAVE_GRACE_MS);
    };

    const launchRipple = (tile: TileSpec) => {
        const startedAt = lastTimeRef.current;
        const activeRipples = ripplesRef.current.filter(
            (ripple) => startedAt - ripple.startedAt < RIPPLE_DURATION_MS,
        );
        ripplesRef.current = [
            ...activeRipples,
            { column: tile.column, row: tile.row, startedAt },
        ].slice(-MAX_RIPPLES);

        for (const affectedTile of tiles) {
            const distance = Math.hypot(
                affectedTile.row - tile.row,
                affectedTile.column - tile.column,
            );
            if (distance > 2.4) continue;
            velocitiesRef.current[affectedTile.index] += safeLift * 1.65
                * Math.exp(-(distance * distance) / 2.2);
        }
        scheduleFrame();
    };

    useEffect(() => {
        const paintTile = (tile: TileSpec, height: number) => {
            const nodes = nodesRef.current[tile.index];
            if (!nodes?.left || !nodes.right || !nodes.top) return;

            const points = pointsFor(tile.x, tile.y);
            const [, right, bottom, left] = points;
            const normalized = clamp01((height - BASE_HEIGHT) / safeLift);
            const easedColor = Math.pow(normalized, 0.9);
            const wallOpacity = String(clamp01(height / 3));

            nodes.left.setAttribute("d", facePath(left, bottom, height));
            nodes.right.setAttribute("d", facePath(bottom, right, height));
            nodes.top.setAttribute("transform", `translate(0 ${-height})`);
            nodes.top.setAttribute("fill", waveTopColor(easedColor));
            nodes.top.setAttribute("stroke", mixColor(LOW_STROKE, HIGH_STROKE, easedColor));
            nodes.left.setAttribute("fill", mixColor(LOW_LEFT, HIGH_LEFT, easedColor));
            nodes.right.setAttribute("fill", mixColor(LOW_RIGHT, HIGH_RIGHT, easedColor));
            nodes.left.setAttribute("opacity", wallOpacity);
            nodes.right.setAttribute("opacity", wallOpacity);
        };

        const fieldCenter = (GRID_SIZE - 1) / 2;
        for (const tile of tiles) {
            const distance = Math.hypot(tile.row - fieldCenter, tile.column - fieldCenter);
            const initialHeight = BASE_HEIGHT + safeLift * waveCrest(distance, phaseRef.current);
            heightsRef.current[tile.index] = initialHeight;
            paintTile(tile, initialHeight);
        }

        tickRef.current = (time: number) => {
            frameRef.current = null;
            const delta = lastTimeRef.current === 0
                ? 1 / 60
                : Math.min(0.034, Math.max(0.001, (time - lastTimeRef.current) / 1000));
            lastTimeRef.current = time;

            const hoveredIndex = hoveredIndexRef.current;
            const hoveredTile = hoveredIndex >= 0 ? tilesByIndex[hoveredIndex] : undefined;
            const targetEnergy = hoveredTile ? 1 : 0;
            const energyResponse = 1 - Math.exp(-delta * (targetEnergy ? 9 : 4.2));
            energyRef.current += (targetEnergy - energyRef.current) * energyResponse;

            ripplesRef.current = ripplesRef.current.filter(
                (ripple) => time - ripple.startedAt < RIPPLE_DURATION_MS,
            );

            if (!reducedMotion) phaseRef.current += delta * 1.85;

            let maxMotion = 0;
            const heights = heightsRef.current;
            const velocities = velocitiesRef.current;

            for (const tile of tiles) {
                const centerDistance = Math.hypot(tile.row - fieldCenter, tile.column - fieldCenter);
                let distortedDistance = centerDistance;
                let localDisplacement = 0;

                if (hoveredTile && !reducedMotion) {
                    const cursorDistance = Math.hypot(tile.row - hoveredTile.row, tile.column - hoveredTile.column);
                    const cursorFalloff = Math.exp(-(cursorDistance * cursorDistance) / 7.2) * energyRef.current;
                    distortedDistance += cursorFalloff * 0.95 * Math.sin(phaseRef.current * 1.35 + cursorDistance * 1.6);
                    localDisplacement = cursorFalloff * safeLift
                        * (0.3 + 0.08 * Math.sin(phaseRef.current * 1.8 - cursorDistance * 1.2));
                }

                let rippleDisplacement = 0;
                if (!reducedMotion) {
                    for (const ripple of ripplesRef.current) {
                        const age = (time - ripple.startedAt) / 1000;
                        const distance = Math.hypot(tile.row - ripple.row, tile.column - ripple.column);
                        const radius = age * 3.05;
                        const distanceFromCrest = distance - radius;
                        const envelope = Math.exp(-(distanceFromCrest * distanceFromCrest) / 1.65)
                            * Math.exp(-age * 0.48);
                        const wakeDistance = distance - Math.max(0, radius - 1.15);
                        const wake = Math.exp(-(wakeDistance * wakeDistance) / 1.5)
                            * Math.exp(-age * 0.62);
                        rippleDisplacement += envelope * safeLift * 0.76 - wake * safeLift * 0.12;
                    }
                }

                let targetHeight = BASE_HEIGHT
                    + safeLift * waveCrest(distortedDistance, phaseRef.current)
                    + localDisplacement
                    + rippleDisplacement;
                if (reducedMotion && hoveredTile?.index === tile.index) targetHeight += safeLift * 0.16;
                const maximumHeight = BASE_HEIGHT + safeLift * 1.5;
                targetHeight = Math.max(BASE_HEIGHT, Math.min(maximumHeight, targetHeight));

                const index = tile.index;
                const displacement = targetHeight - heights[index];
                velocities[index] += displacement * 74 * delta;
                velocities[index] *= Math.exp(-15.5 * delta);
                heights[index] += velocities[index] * delta;
                if (heights[index] < BASE_HEIGHT) {
                    heights[index] = BASE_HEIGHT;
                    if (velocities[index] < 0) velocities[index] = 0;
                } else if (heights[index] > maximumHeight) {
                    heights[index] = maximumHeight;
                    if (velocities[index] > 0) velocities[index] = 0;
                }
                maxMotion = Math.max(maxMotion, Math.abs(targetHeight - heights[index]), Math.abs(velocities[index]));
                paintTile(tile, heights[index]);
            }

            if (!reducedMotion || hoveredTile || ripplesRef.current.length > 0 || energyRef.current > 0.001 || maxMotion > 0.025) {
                frameRef.current = window.requestAnimationFrame(tickRef.current);
            } else {
                energyRef.current = 0;
            }
        };

        const observer = new IntersectionObserver(([entry]) => {
            visibleRef.current = entry.isIntersecting;
            if (entry.isIntersecting) {
                scheduleFrame();
            } else if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        }, { rootMargin: "100px" });

        if (surfaceRef.current) observer.observe(surfaceRef.current);
        scheduleFrame();

        return () => {
            observer.disconnect();
            if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
            if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
            frameRef.current = null;
            leaveTimerRef.current = null;
        };
    }, [reducedMotion, safeLift]);

    return (
        <svg
            aria-label="A ten by ten isometric wave field. Hover to bend the surface or press a cell to launch a ripple."
            className={cn("bg-background block aspect-[5/3] w-full cursor-crosshair touch-manipulation", className)}
            onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const tile = tileAtPoint(
                    ((event.clientX - bounds.left) / bounds.width) * 700,
                    ((event.clientY - bounds.top) / bounds.height) * 420,
                );
                if (!tile) return;
                launchRipple(tile);
            }}
            onPointerDown={(event) => {
                if (event.pointerType === "touch") {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const tile = tileAtPoint(
                        ((event.clientX - bounds.left) / bounds.width) * 700,
                        ((event.clientY - bounds.top) / bounds.height) * 420,
                    );
                    if (!tile) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setInteraction(tile, true);
                }
            }}
            onPointerLeave={() => {
                const hoveredIndex = hoveredIndexRef.current;
                if (hoveredIndex < 0) return;
                const tile = tilesByIndex[hoveredIndex];
                if (tile) setInteraction(tile, false);
            }}
            onPointerMove={(event) => {
                if (event.pointerType === "touch") return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const tile = tileAtPoint(
                    ((event.clientX - bounds.left) / bounds.width) * 700,
                    ((event.clientY - bounds.top) / bounds.height) * 420,
                );
                if (tile) {
                    setInteraction(tile, true);
                } else {
                    const hoveredIndex = hoveredIndexRef.current;
                    if (hoveredIndex >= 0) setInteraction(tilesByIndex[hoveredIndex], false);
                }
            }}
            onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }
                if (event.pointerType === "touch") {
                    const hoveredIndex = hoveredIndexRef.current;
                    if (hoveredIndex >= 0) setInteraction(tilesByIndex[hoveredIndex], false);
                }
            }}
            ref={surfaceRef}
            role="grid"
            viewBox="0 0 700 420"
        >
            <rect width="700" height="420" className="fill-background" />

            <g>
                {tiles.map((tile) => {
                    const points = pointsFor(tile.x, tile.y);
                    const [, right, bottom, left] = points;
                    const topPath = roundedDiamondPath(points);

                    return (
                        <g key={tile.id}>
                            <path
                                d={facePath(left, bottom, BASE_HEIGHT)}
                                pointerEvents="none"
                                ref={(node) => {
                                    if (node) nodesRef.current[tile.index] = { ...nodesRef.current[tile.index], left: node };
                                }}
                                stroke="#170d34"
                                strokeLinejoin="round"
                                strokeWidth="0.9"
                                vectorEffect="non-scaling-stroke"
                            />
                            <path
                                d={facePath(bottom, right, BASE_HEIGHT)}
                                pointerEvents="none"
                                ref={(node) => {
                                    if (node) nodesRef.current[tile.index] = { ...nodesRef.current[tile.index], right: node };
                                }}
                                stroke="#170d34"
                                strokeLinejoin="round"
                                strokeWidth="0.9"
                                vectorEffect="non-scaling-stroke"
                            />
                            <path
                                d={topPath}
                                pointerEvents="none"
                                ref={(node) => {
                                    if (node) nodesRef.current[tile.index] = { ...nodesRef.current[tile.index], top: node };
                                }}
                                strokeLinejoin="round"
                                strokeWidth="0.9"
                                vectorEffect="non-scaling-stroke"
                            />
                            <path
                                aria-label={`Wave cell ${tile.row + 1}, ${tile.column + 1}`}
                                className="outline-none focus-visible:stroke-cyan-200"
                                d={topPath}
                                fill="transparent"
                                onBlur={() => setInteraction(tile, false)}
                                onFocus={() => setInteraction(tile, true)}
                                onKeyDown={(event) => {
                                    if (event.key !== "Enter" && event.key !== " ") return;
                                    event.preventDefault();
                                    launchRipple(tile);
                                }}
                                pointerEvents="none"
                                role="gridcell"
                                stroke="transparent"
                                strokeWidth="4"
                                tabIndex={0}
                                vectorEffect="non-scaling-stroke"
                            />
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
