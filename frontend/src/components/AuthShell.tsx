import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { springs, useMotionOK } from '../lib/motion';
import { LEGAL } from '../lib/legal';
import { AuthHearth } from './Art';
/* A bed of glowing coals: the product's own metaphor, since a day here
   is a coal at its own temperature. Public domain (Jens Buurgaard
   Nielsen, Wikimedia Commons), so the page owes no credit line.
   1901x1269 native, against a panel that asks for roughly 735x950, so
   it is downscaled rather than stretched. The photo it replaced was
   444x794 and was being blown up about 166%, which is what made it
   look soft. Swap the import to change the picture. */
import authImage from '../assets/embers.jpg';

/**
 * The shell behind Login and Register.
 *
 * Split screen: the task on the left, the brand on the right. The old
 * version stacked a mark, a heading and a card down the middle of an
 * empty viewport, which spent the whole screen on one narrow column and
 * gave the eye nothing to rest against.
 *
 * Motion is deliberately restrained on this side of the fold. Someone
 * here is trying to get into their account, not watch a page arrive, so
 * the form fades once and is immediately usable. The image panel is
 * where the slow motion lives, because nothing there is in your way.
 */
export default function AuthShell({
    title,
    subtitle,
    children,
    footer,
    width = 400,
    panelHeading = 'Every day you keep becomes a coal.',
    panelBody = 'A habit is a fire. Feed it daily, or it goes out.',
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
    width?: number;
    panelHeading?: string;
    panelBody?: string;
}) {
    const motionOK = useMotionOK();
    const year = new Date().getFullYear();
    const years = year > LEGAL.copyrightSince ? `${LEGAL.copyrightSince}-${year}` : `${LEGAL.copyrightSince}`;

    return (
        <div className="auth">
            {/* ── The task ──────────────────────────────────────────── */}
            <div className="auth-pane">
                <div className="auth-col" style={{ maxWidth: width }}>
                    <motion.div
                        className="auth-form"
                        initial={motionOK ? { opacity: 0, y: 10 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={springs.settle}
                    >
                        {/* The fire and the name sit directly above the form
                            rather than off in the corner, so the page opens
                            with what it is before it asks for anything. It
                            still goes home. */}
                        <Link to="/" className="auth-brand">
                            <AuthHearth width={136} />
                            <span className="auth-brand-name">Zenith Catalyst</span>
                        </Link>

                        <h1 className="auth-title">{title}</h1>
                        <p className="auth-sub">{subtitle}</p>
                        {children}
                    </motion.div>

                    <p className="auth-alt">{footer}</p>

                    {/* Both documents are one tap from the point of signing
                        up, which is the moment they are actually relevant. */}
                    <div className="auth-fine">
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms of Service</Link>
                        <span>&copy; {years} {LEGAL.entity}</span>
                    </div>
                </div>
            </div>

            {/* ── The brand ─────────────────────────────────────────────
                Hidden below 980px rather than stacked: on a phone it would
                push the form under the fold, and the form is the point. */}
            <aside className="auth-panel" aria-hidden>
                <motion.img
                    src={authImage}
                    alt=""
                    className="auth-panel-img"
                    initial={motionOK ? { scale: 1.08 } : false}
                    animate={{ scale: 1 }}
                    transition={{ duration: 16, ease: [0.16, 1, 0.3, 1] }}
                />
                <div className="auth-panel-scrim" />

                <motion.div
                    className="auth-panel-copy"
                    initial={motionOK ? { opacity: 0, y: 14 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springs.settle, delay: 0.15 }}
                >
                    <p className="auth-panel-heading">{panelHeading}</p>
                    <p className="auth-panel-body">{panelBody}</p>
                </motion.div>
            </aside>
        </div>
    );
}
