import { useState } from 'react';
import { Button } from '../../components/Button';
import { Stepper } from '../../components/Stepper';
import { DEFAULT_GOAL, DEFAULT_PLAN_BASE_MAX } from '../../domain/defaultPlan';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';
import { LanguageSwitch } from '../settings/LanguageSwitch';

export function Onboarding() {
  const { t } = useT();
  const completeOnboarding = useApp((s) => s.completeOnboarding);
  const [step, setStep] = useState<'max' | 'goal'>('max');
  const [max, setMax] = useState(DEFAULT_PLAN_BASE_MAX);
  const [goal, setGoal] = useState(DEFAULT_GOAL);

  return (
    <main className="onboarding">
      <div className="onboarding-top">
        <p className="eyebrow">{t('onboarding.eyebrow')}</p>
        <LanguageSwitch compact />
      </div>
      <div className="dots" aria-hidden="true">
        <span className={step === 'max' ? 'on' : ''} />
        <span className={step === 'goal' ? 'on' : ''} />
      </div>

      {step === 'max' ? (
        <section className="onboarding-step">
          <h1 className="display">{t('onboarding.maxTitle')}</h1>
          <p className="muted">{t('onboarding.maxBody')}</p>
          <Stepper label={t('onboarding.maxLabel')} value={max} min={1} max={100} suffix={t('common.reps')} onChange={setMax} />
          <Button size="xl" block onClick={() => setStep('goal')}>
            {t('common.next')}
          </Button>
        </section>
      ) : (
        <section className="onboarding-step">
          <h1 className="display">{t('onboarding.goalTitle')}</h1>
          <p className="muted">{t('onboarding.goalBody')}</p>
          <Stepper
            label={t('onboarding.goalLabel')}
            value={goal}
            min={Math.max(max + 1, 5)}
            max={200}
            step={5}
            suffix={t('common.reps')}
            onChange={setGoal}
          />
          <Button size="xl" block onClick={() => completeOnboarding(max, Math.max(goal, max + 1))}>
            {t('onboarding.startDay1')}
          </Button>
          <Button variant="ghost" block onClick={() => setStep('max')}>
            {t('common.back')}
          </Button>
        </section>
      )}
    </main>
  );
}
