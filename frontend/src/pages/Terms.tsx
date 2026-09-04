import LegalShell from '../components/LegalShell';
import { LEGAL } from '../lib/legal';

/** See lib/legal.ts before publishing. Not reviewed by a lawyer. */
export default function Terms() {
    return (
        <LegalShell
            title="Terms of Service"
            summary="The agreement between you and this service. Plain language, and it means what it says."
        >
            <section>
                <h2>Agreeing to these terms</h2>
                <p>
                    Using Zenith Catalyst means accepting these terms. If you do not accept
                    them, do not create an account. If you are using the service on behalf of an
                    organisation, you are confirming you may bind that organisation to this
                    agreement.
                </p>
            </section>

            <section>
                <h2>Your account</h2>
                <p>
                    You need an accurate email address to register, and you must be at least 13
                    years old. You are responsible for what happens under your account and for
                    keeping your password to yourself. Tell us promptly at{' '}
                    <a href={`mailto:${LEGAL.generalContact}`}>{LEGAL.generalContact}</a> if you
                    believe someone else has access to it. One person, one account; do not share
                    credentials.
                </p>
            </section>

            <section>
                <h2>Acceptable use</h2>
                <p>Do not use this service to:</p>
                <ul>
                    <li>break the law, or help anyone else break it;</li>
                    <li>
                        gain access to accounts, data or systems that are not yours, or attempt
                        to;
                    </li>
                    <li>
                        interfere with the service, including by overwhelming it with automated
                        traffic or circumventing the rate limits;
                    </li>
                    <li>
                        upload malware, or content that is unlawful, abusive, or infringes
                        somebody else&rsquo;s rights;
                    </li>
                    <li>resell or redistribute the service as though it were your own.</li>
                </ul>
                <p>
                    Automated access outside the app&rsquo;s own interface is not supported and
                    may be blocked.
                </p>
            </section>

            <section>
                <h2>What you write stays yours</h2>
                <p>
                    Your habits, notes, mood entries, uploaded picture and coaching messages
                    belong to you. No ownership of them is claimed. Permission is needed only to
                    store, process and display that content back to you, which is what running
                    the service consists of. That permission ends when you delete the content or
                    your account.
                </p>
            </section>

            <section>
                <h2>The AI coach is not an expert</h2>
                <p>
                    The coaching feature generates text with a language model. It can be
                    confidently wrong. Nothing it produces is medical, psychological, legal or
                    financial advice, and it must not be treated as a substitute for a qualified
                    professional. If you are struggling with your health or your mental health,
                    talk to a real practitioner. Decisions you make on the strength of anything
                    the coach says are your own.
                </p>
            </section>

            <section>
                <h2>Reminders</h2>
                <p>
                    Reminder emails depend on scheduling and on mail delivery, neither of which
                    is guaranteed. Messages may arrive late, or not at all, or land in a spam
                    folder. Do not rely on this service for anything where a missed notification
                    carries real consequences, such as taking medication.
                </p>
            </section>

            <section>
                <h2>Availability</h2>
                <p>
                    The service is provided as it is, without any warranty, express or implied,
                    including as to fitness for a particular purpose. No promise is made that it
                    will be uninterrupted, error-free, or that data will never be lost. Features
                    may change or be withdrawn. Keep your own copy of anything you cannot afford
                    to lose.
                </p>
            </section>

            <section>
                <h2>Limits on liability</h2>
                <p>
                    To the fullest extent the law allows, {LEGAL.entity} is not liable for
                    indirect, incidental, special or consequential damages, nor for lost
                    profits, lost data, or missed habits, arising from your use of the service.
                    Some jurisdictions do not allow these exclusions, in which case they apply
                    to you only as far as the law permits.
                </p>
            </section>

            <section>
                <h2>Ending the agreement</h2>
                <p>
                    You may stop using the service and delete your account at any time, for any
                    reason. Access may be suspended or ended where these terms are broken, or
                    where continuing would create a legal or security problem. The sections on
                    ownership, warranties and liability survive the end of this agreement.
                </p>
            </section>

            <section>
                <h2>Changes to these terms</h2>
                <p>
                    These terms may be updated. The date at the top of the page changes when
                    they do, and significant changes will be signalled in the app. Continuing to
                    use the service after a change means accepting the revised terms.
                </p>
            </section>

            <section>
                <h2>Governing law</h2>
                <p>
                    {LEGAL.jurisdiction
                        ? `This agreement is governed by the laws of ${LEGAL.jurisdiction}, and the courts there have exclusive jurisdiction over disputes arising from it.`
                        : 'The governing law and venue for this agreement have not yet been set for this deployment. Until they are, the operator has not made a choice of law, and any dispute is governed by whichever law would apply by default.'}
                </p>
            </section>

            <section>
                <h2>Contact</h2>
                <p>
                    Questions about these terms:{' '}
                    <a href={`mailto:${LEGAL.generalContact}`}>{LEGAL.generalContact}</a>.
                </p>
            </section>
        </LegalShell>
    );
}
