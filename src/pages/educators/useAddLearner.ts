import { useNavigate } from 'react-router';
import { useLearnerSession } from '../../session';

/**
 * "Add a learner", as the header's "I'm new here" does it: nobody is chosen
 * any more, and home opens straight on the new-learner form (/?new=1). The
 * form only exists on the "Who's learning today?" picker, so the current
 * learner has to be cleared first.
 */
export function useAddLearner(): () => void {
  const session = useLearnerSession();
  const navigate = useNavigate();
  return () => {
    void session.returnToPicker();
    void navigate('/?new=1');
  };
}
