import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { fetchHabits } from '../lib/queries';
import { StatCardsSkeleton } from '../components/Skeleton';
import RangeControl, { useLedgerWindow } from '../components/RangeControl';
import ChallengeGrid from '../components/ChallengeGrid';
import { UnlitKindling } from '../components/Art';

/**
 * Challenges are habits committed to for a fixed stretch — the same row in
 * the database, the same completions, the same reminders, flagged and given
 * an end date. So this is not a second habit system: it is the subset of
 * habits that have a finish line, and the ledger that tracks them.
 *
 * The window lives here rather than in the grid, because the header controls
 * and the grid have to agree on it.
 */
export default function Challenges() {
    const { win, setWin, from, to, today, atToday } = useLedgerWindow(15);

    const { data: challenges = [], isLoading } = useQuery({
        queryKey: ['habits', 'challenges'],
        queryFn: () => fetchHabits(false, true),
    });

    const running = challenges.filter((c: any) => !c.endDate || c.endDate >= today).length;
    const finished = challenges.length - running;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Challenges</h1>
                    <p>
                        {isLoading
                            ? 'Track your daily habits and build a better you.'
                            : challenges.length === 0
                                ? 'Track your daily habits and build a better you.'
                                : `${running} running · ${finished} finished`}
                    </p>
                </div>
                {challenges.length > 0 && (
                    <RangeControl win={win} setWin={setWin} from={from} to={to} today={today} atToday={atToday} />
                )}
            </div>

            {isLoading ? (
                <div className="grid-4">
                    <StatCardsSkeleton count={4} />
                </div>
            ) : challenges.length === 0 ? (
                <div className="card empty card--static">
                    <span className="empty-art"><UnlitKindling /></span>
                    <h3>No challenges yet</h3>
                    <p>
                        A challenge is a habit with a finish line — thirty days of it, then you
                        know. Mark any habit as a challenge and it takes its place here.
                    </p>
                    <Link className="btn btn--primary" to="/app/habits">
                        <Flag size={16} /> Mark a habit as a challenge
                    </Link>
                </div>
            ) : (
                <ChallengeGrid from={from} to={to} />
            )}
        </div>
    );
}
