/**
 * ─────────────────────────────────────────────────────────────────────
 *  BEFORE YOU PUBLISH THESE PAGES, READ THIS.
 *
 *  The Privacy Policy and Terms of Service are written to describe what
 *  this codebase actually does: the fields in prisma/schema.prisma, the
 *  Google Gemini call in ai.service.ts, the SMTP send in
 *  email.service.ts, Google OAuth in routes/user.ts, and tokens kept in
 *  localStorage by lib/api.ts. They are accurate to the software.
 *
 *  They are NOT legal advice and they have not been reviewed by a
 *  lawyer. Two things are still required of you:
 *
 *    1. Replace every value below. `example.com` is the reserved
 *       placeholder domain, so nothing here can accidentally deliver
 *       mail to a real inbox.
 *    2. Have both documents reviewed against the law that actually
 *       applies to you and the people who use this. Which law that is
 *       depends on where you operate and where they live, which this
 *       file cannot know.
 * ─────────────────────────────────────────────────────────────────────
 */

export const LEGAL = {
    /** The person or company that is legally responsible for the service. */
    entity: 'Zenith Catalyst',

    /** Where privacy requests go. Must be a monitored inbox. */
    privacyContact: 'privacy@example.com',

    /** Where everything else goes. */
    generalContact: 'support@example.com',

    /**
     * The law and courts that govern the Terms. Left deliberately blank:
     * a guessed jurisdiction is worse than an obvious gap, because it
     * reads as settled when it is not.
     */
    jurisdiction: '',

    /** Shown on both documents. Update whenever the text changes. */
    lastUpdated: '4 September 2026',

    /** Rendered in the footer's copyright line. */
    copyrightSince: 2026,
} as const;
