import { useMotionOK } from '../lib/motion';

/**
 * Embers lifting off the hero fire.
 *
 * Scoped to the hero rather than fixed behind the whole page: the sections
 * below paint their own backgrounds, so a page-wide field would be
 * invisible under them and would repaint on every scroll frame for
 * nothing. Here it stays where the fire actually is.
 *
 * Driven by CSS keyframes, not Motion. Eighteen elements looping forever
 * belong on the compositor, and base.css already collapses CSS animation
 * under reduced motion. The component still checks, because an ember that
 * merely holds still is better removed from the tree.
 */

/* Deterministic: no Math.random, so the field is identical on every
   render and every reload. The primes keep the columns from lining up
   into a visible lattice. */
const EMBERS = Array.from({ length: 18 }, (_, i) => ({
    left: (i * 37) % 100,
    size: 2 + ((i * 7) % 5) * 0.5,
    delay: ((i * 13) % 90) / 10,
    duration: 9 + ((i * 11) % 7),
    drift: ((i % 5) - 2) * 14,
    gold: i % 3 === 0,
}));

export default function EmberDrift() {
    const motionOK = useMotionOK();
    if (!motionOK) return null;

    return (
        <div className="lp-embers" aria-hidden>
            {EMBERS.map((e, i) => (
                <span
                    key={i}
                    style={{
                        left: `${e.left}%`,
                        width: e.size,
                        height: e.size,
                        background: e.gold ? 'var(--gold-lit)' : 'var(--copper-lit)',
                        animationDelay: `${e.delay}s`,
                        animationDuration: `${e.duration}s`,
                        ['--drift' as string]: `${e.drift}px`,
                    }}
                />
            ))}
        </div>
    );
}
