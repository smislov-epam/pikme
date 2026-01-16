import { SessionJoinView } from '../components/session/join/SessionJoinView';
import { useSessionJoinController } from '../hooks/session/useSessionJoinController';

export function SessionJoinPage() {
  const controller = useSessionJoinController();
  return <SessionJoinView {...controller} />;
}
