import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useMotionValue, useSpring, useTransform } from 'motion/react';
import { useMotionOK } from './motion';

/**
 * Cursor physics for the landing surface.
 *
 * One idea runs through all of it: the pointer is a hand near the fire.
 * It carries heat, so coals brighten as it passes over them, surfaces
 * bloom where it rests, and the flame leans toward it. That is why these
 * are here rather than a generic hover-lift: the effect is the world's
 * own physics, not decoration bolted onto it.
 *
 * Every value below is a MotionValue. Pointer position never touches
 * React state, so moving the cursor across the page costs zero renders
 * and stays smooth on a phone. Under reduced motion the handlers are
 * inert and everything rests at its neutral value.
 */

const HEAT_SPRING = { stiffness: 210, damping: 34, mass: 0.6 };
const MAGNET_SPRING = { stiffness: 250, damping: 20, mass: 0.5 };
const TILT_SPRING = { stiffness: 140, damping: 18, mass: 0.7 };

/** Gold, as the raw channels a gradient can interpolate. */
const EMBER_RGB = '242, 181, 68';

/**
 * A surface that warms where the cursor is. Returns a `background` motion
 * value for a pointer-events-none layer sitting over the real content.
 *
 * The layer is what warms, never the content underneath, so text keeps
 * its contrast and nothing reflows.
 */
export function useHeatSurface({
    radius = 320,
    intensity = 0.16,
    rgb = EMBER_RGB,
}: { radius?: number; intensity?: number; rgb?: string } = {}) {
    const motionOK = useMotionOK();

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const heat = useMotionValue(0);
    const eased = useSpring(heat, HEAT_SPRING);

    const background = useTransform(
        [x, y, eased],
        ([cx, cy, h]: number[]) =>
            `radial-gradient(${radius}px circle at ${cx}px ${cy}px, rgba(${rgb}, ${(intensity * h).toFixed(4)}), transparent 72%)`,
    );

    const onPointerMove = useCallback(
        (e: ReactPointerEvent<HTMLElement>) => {
            if (!motionOK || e.pointerType === 'touch') return;
            const r = e.currentTarget.getBoundingClientRect();
            x.set(e.clientX - r.left);
            y.set(e.clientY - r.top);
            heat.set(1);
        },
        [motionOK, x, y, heat],
    );

    const onPointerLeave = useCallback(() => heat.set(0), [heat]);

    return { background, onPointerMove, onPointerLeave, enabled: motionOK };
}

/**
 * Pulls an element toward the cursor while it is near. Used only on the
 * two primary actions: a page where everything chases the pointer reads
 * as a toy, so the pull is reserved for the thing we want pressed.
 */
export function useMagnetic(strength = 0.24) {
    const motionOK = useMotionOK();

    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const x = useSpring(rawX, MAGNET_SPRING);
    const y = useSpring(rawY, MAGNET_SPRING);

    const onPointerMove = useCallback(
        (e: ReactPointerEvent<HTMLElement>) => {
            if (!motionOK || e.pointerType === 'touch') return;
            const r = e.currentTarget.getBoundingClientRect();
            rawX.set((e.clientX - (r.left + r.width / 2)) * strength);
            rawY.set((e.clientY - (r.top + r.height / 2)) * strength);
        },
        [motionOK, rawX, rawY, strength],
    );

    const onPointerLeave = useCallback(() => {
        rawX.set(0);
        rawY.set(0);
    }, [rawX, rawY]);

    return { x, y, onPointerMove, onPointerLeave };
}

/**
 * Leans an element toward the cursor. On the hearth this reads as a
 * flame drawn toward a hand: the fire notices you before you touch it.
 *
 * `scale` stays out of this deliberately. A flame that grows when you
 * approach would be claiming something about the day's progress that is
 * not true; leaning claims nothing.
 */
export function useTilt(max = 10) {
    const motionOK = useMotionOK();

    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const rotateX = useSpring(rawX, TILT_SPRING);
    const rotateY = useSpring(rawY, TILT_SPRING);

    const onPointerMove = useCallback(
        (e: ReactPointerEvent<HTMLElement>) => {
            if (!motionOK || e.pointerType === 'touch') return;
            const r = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
            const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
            rawY.set(Math.max(-1, Math.min(1, nx)) * max);
            rawX.set(Math.max(-1, Math.min(1, -ny)) * max);
        },
        [motionOK, rawX, rawY, max],
    );

    const onPointerLeave = useCallback(() => {
        rawX.set(0);
        rawY.set(0);
    }, [rawX, rawY]);

    return { rotateX, rotateY, onPointerMove, onPointerLeave };
}
