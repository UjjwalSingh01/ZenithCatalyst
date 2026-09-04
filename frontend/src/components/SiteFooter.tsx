import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { LEGAL } from '../lib/legal';

/**
 * The footer shared by the landing page and both legal documents, so the
 * copyright and the policy links cannot drift apart between them.
 *
 * It carries no account actions. Sign-in and sign-up already appear in
 * the header and in the page's closing call, and a third copy of the
 * same two intents at the bottom of the page adds nothing. What belongs
 * here is the small print people come to the bottom of a page to find.
 */
export default function SiteFooter() {
    const now = new Date().getFullYear();
    /* A range only once there is a range to show, so a site published in
       its first year does not claim a span it does not have. */
    const years = now > LEGAL.copyrightSince ? `${LEGAL.copyrightSince}-${now}` : `${LEGAL.copyrightSince}`;

    return (
        <footer className="lp-foot">
            <div className="lp-wrap lp-foot-inner">
                <div className="lp-foot-brand">
                    <span className="lp-mark">
                        <Flame size={17} strokeWidth={1.75} color="var(--gold)" />
                        Zenith Catalyst
                    </span>
                    <span className="lp-foot-note">A habit is a fire. Feed it daily, or it goes out.</span>
                </div>

                <nav className="lp-foot-links" aria-label="Legal">
                    <Link to="/privacy" className="lp-nav-link">Privacy Policy</Link>
                    <Link to="/terms" className="lp-nav-link">Terms of Service</Link>
                </nav>

                <p className="lp-foot-copy">
                    &copy; {years} {LEGAL.entity}. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
