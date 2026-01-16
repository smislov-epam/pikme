import { useSessionJoinActions } from './useSessionJoinActions';
import { useSessionJoinData } from './useSessionJoinData';

export function useSessionJoinController() {
  const data = useSessionJoinData();
  const actions = useSessionJoinActions(data);

  return {
    ...data,
    ...actions,
  };
}
