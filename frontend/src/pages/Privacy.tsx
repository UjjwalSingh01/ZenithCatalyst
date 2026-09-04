import LegalShell from '../components/LegalShell';
import { LEGAL } from '../lib/legal';

/**
 * Written against the actual system, not from a template: the fields
 * listed here are the ones in prisma/schema.prisma, the processors are
 * the ones the backend really talks to, and the storage claims match
 * lib/api.ts. See lib/legal.ts before publishing.
 */
export default function Privacy() {
    return (
        <LegalShell
            title="Privacy Policy"
            summary="What this app stores about you, who else can see it, and how to get rid of it."
        >
            <section>
                <h2>The short version</h2>
                <p>
                    Zenith Catalyst keeps the habits you enter, the days you mark, and the
                    account details needed to sign you in. It shows no advertising, sets no
                    tracking cookies, and sells nothing to anybody. Two outside services see
                    some of your data because the product cannot work without them: Google,
                    which powers optional sign-in and the AI coach, and whichever mail server
                    is configured to send your reminders. Details below.
                </p>
            </section>

            <section>
                <h2>What is collected</h2>

                <h3>Account</h3>
                <p>
                    Your first name, an optional last name, and your email address. If you sign
                    up with a password, only a bcrypt hash of it is stored, never the password
                    itself. If you sign in with Google instead, the identifier Google gives us
                    for your account is stored and no password exists. You may optionally upload
                    a profile picture, which is stored as image data alongside your account.
                </p>

                <h3>What you track</h3>
                <p>
                    The habits and sub-habits you create, including their titles, categories,
                    colours and schedules; every completion record, which is the date and
                    whether that habit was kept; challenges you start; and any mood entries you
                    log. This is the substance of the product and it is stored for as long as
                    your account exists.
                </p>

                <h3>Progress</h3>
                <p>
                    Experience points, level, current streak, longest streak, and badges earned.
                    These are derived from your completion records.
                </p>

                <h3>Coaching conversations</h3>
                <p>
                    Messages you send to the AI coach and the replies it gives are stored so the
                    conversation persists between visits, along with any insights generated from
                    your habit history.
                </p>

                <h3>Reminders</h3>
                <p>
                    The schedule, timezone, destination email address and message text for each
                    reminder you create.
                </p>

                <h3>Sign-in tokens</h3>
                <p>
                    Refresh tokens are stored on the server so sessions can be ended. Access and
                    refresh tokens are also held in your browser&rsquo;s local storage. They are
                    not cookies, they are not sent to any third party, and clearing your browser
                    data removes them and signs you out.
                </p>
            </section>

            <section>
                <h2>What is not collected</h2>
                <p>
                    No advertising or analytics trackers, no third-party cookies, no location
                    data, no contact list, and no payment details. Nothing on this site profiles
                    you across other websites.
                </p>
            </section>

            <section>
                <h2>Who else sees it</h2>

                <h3>Google, for the AI coach</h3>
                <p>
                    The coaching feature is built on Google&rsquo;s Gemini model. When you ask
                    the coach something, your message and the relevant parts of your habit
                    history are sent to Google to generate a reply. If you would rather Google
                    never receive your habit data, do not use the coaching feature. Everything
                    else in the product works without it.
                </p>

                <h3>Google, for sign-in</h3>
                <p>
                    If you choose to sign in with Google, Google confirms your identity and
                    tells us your account identifier and email address. This only happens if you
                    use that button.
                </p>

                <h3>Email delivery</h3>
                <p>
                    Reminder emails are handed to a configured mail server for delivery, which
                    necessarily sees the recipient address and the message. Email is not an
                    encrypted medium, so treat reminder text as you would a postcard.
                </p>

                <h3>Hosting</h3>
                <p>
                    Data is held in a PostgreSQL database, with Redis used for transient
                    processing. Whoever hosts those systems for this deployment can technically
                    access the machines they run on.
                </p>

                <p>
                    Beyond the above, your data is disclosed only when the law compels it.
                </p>
            </section>

            <section>
                <h2>Security</h2>
                <p>
                    Passwords are hashed with bcrypt and never stored or logged in readable
                    form. Sign-in attempts are rate limited. Sessions can be revoked, which
                    invalidates every outstanding token for your account at once. No system is
                    perfectly secure, and this one makes no claim to be.
                </p>
            </section>

            <section>
                <h2>Keeping and deleting</h2>
                <p>
                    Your data is kept while your account exists. Deleting your account removes
                    your profile, habits, completion records, mood logs, coaching history,
                    badges, reminders and stored tokens; the database is set up so those records
                    are removed along with the account rather than left behind. Backups, if the
                    deployment keeps any, may retain copies for a short period before rotating
                    out.
                </p>
            </section>

            <section>
                <h2>Your choices</h2>
                <p>
                    You can view and edit your habits and profile at any time from inside the
                    app, delete individual habits or records, turn reminders off without
                    deleting them, decline the AI coach entirely, and delete your account. To
                    request a copy of your data or ask for its deletion by hand, write to{' '}
                    <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>.
                </p>
                <p>
                    Depending on where you live you may have further rights over your personal
                    data, including access, correction, portability, and objection. Requests go
                    to the same address.
                </p>
            </section>

            <section>
                <h2>Children</h2>
                <p>
                    This service is not directed at children under 13, and accounts should not
                    be created for them. If you believe a child has created an account, write to{' '}
                    <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a> and it
                    will be removed.
                </p>
            </section>

            <section>
                <h2>Changes</h2>
                <p>
                    If this policy changes, the date at the top of the page changes with it.
                    Material changes to how your data is handled will be signalled in the app
                    rather than made quietly.
                </p>
            </section>

            <section>
                <h2>Contact</h2>
                <p>
                    Privacy questions and requests:{' '}
                    <a href={`mailto:${LEGAL.privacyContact}`}>{LEGAL.privacyContact}</a>.
                </p>
            </section>
        </LegalShell>
    );
}
