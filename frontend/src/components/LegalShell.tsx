import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Flame, ArrowLeft } from 'lucide-react';
import { springs, useMotionOK } from '../lib/motion';
import { LEGAL } from '../lib/legal';
import SiteFooter from './SiteFooter';

/**
 * The frame both legal documents sit in.
 *
 * This is a Read surface, not a Persuade one: nobody arrives here to be
 * convinced of anything. So it drops the landing page's cursor physics
 * and ambient motion entirely and spends its attention on measure,
 * heading hierarchy and scan-ability instead. The only thing carried
 * over is the palette, so it still looks like the same product.
 */
export default function LegalShell({
    title,
    summary,
    children,
}: {
    title: string;
    summary: string;
    children: ReactNode;
}) {
    const motionOK = useMotionOK();

    return (
        <div className="legal">
            <nav className="legal-nav">
                <div className="legal-wrap legal-nav-inner">
                    <Link to="/" className="lp-mark">
                        <Flame size={19} strokeWidth={1.75} color="var(--gold)" />
                        Zenith Catalyst
                    </Link>
                    <Link to="/" className="legal-back">
                        <ArrowLeft size={15} strokeWidth={2} />
                        Back to site
                    </Link>
                </div>
            </nav>

            <motion.main
                className="legal-wrap legal-body"
                initial={motionOK ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.settle}
            >
                <header className="legal-head">
                    <h1>{title}</h1>
                    <p className="legal-summary">{summary}</p>
                    <p className="legal-updated">Last updated {LEGAL.lastUpdated}</p>
                </header>

                {/* Each document closes with its own Contact section, so the
                    shell adds nothing here. Two contact lines in a row read
                    as a mistake, and one of them is. */}
                <div className="legal-prose">{children}</div>
            </motion.main>

            <SiteFooter />
        </div>
    );
}
